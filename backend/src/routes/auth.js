import { Router } from "express";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { getAdminAuth, getAdminDb } from "../services/firebase.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";

const router = Router();
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const EMAIL_OTP_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function otpDigest(uid, code) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error("OTP_SECRET is not configured on the backend.");
  return createHmac("sha256", secret).update(`${uid}:${code}`).digest("hex");
}

function safeEqualHex(left, right) {
  const a = Buffer.from(String(left || ""), "hex");
  const b = Buffer.from(String(right || ""), "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

async function setVerified(uid, method) {
  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  const claims = { ...(user.customClaims || {}), accountVerificationRequired: true, accountVerified: true, verificationMethod: method };
  await auth.setCustomUserClaims(uid, claims);
  await getAdminDb().collection("users").doc(uid).set({
    accountVerificationRequired: true,
    accountVerified: true,
    verificationMethod: method,
    verifiedAt: new Date().toISOString(),
  }, { merge: true });
}

router.use(requireFirebaseUser);

router.post("/registration/start", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const auth = getAdminAuth();
    const user = await auth.getUser(uid);
    if (!user.email) return res.status(400).json({ error: "Your Firebase account does not have an email address." });
    const claims = { ...(user.customClaims || {}), accountVerificationRequired: true, accountVerified: false };
    delete claims.verificationMethod;
    await auth.setCustomUserClaims(uid, claims);
    await getAdminDb().collection("users").doc(uid).set({
      accountVerificationRequired: true,
      accountVerified: false,
      verificationStatus: "pending",
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return res.json({ required: true, verified: false, email: user.email });
  } catch (error) {
    console.error("Could not start account verification:", error);
    return res.status(500).json({ error: error.message || "Could not start account verification." });
  }
});

router.get("/verification-status", async (req, res) => {
  const claims = req.firebaseToken;
  return res.json({
    required: claims.accountVerificationRequired === true,
    verified: claims.accountVerified === true,
    method: claims.verificationMethod || null,
  });
});

router.post("/email-otp/send", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const user = await getAdminAuth().getUser(uid);

    if (!user.email) {
      return res.status(400).json({
        error: "No email address is associated with this account."
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !sender) {
      return res.status(503).json({
        error: "Email verification is not configured. Check the Resend settings in backend/.env."
      });
    }

    const db = getAdminDb();
    const ref = db.collection("emailOtpChallenges").doc(uid);
    const existing = await ref.get();

    const lastSentAt = existing.exists
      ? Number(existing.data().lastSentAt || 0)
      : 0;

    if (Date.now() - lastSentAt < EMAIL_OTP_COOLDOWN_MS) {
      return res.status(429).json({
        error: "Please wait one minute before requesting another code."
      });
    }

    const code = String(randomInt(100000, 1000000));
    const expiresAt = Date.now() + OTP_LIFETIME_MS;

    await ref.set({
      digest: otpDigest(uid, code),
      expiresAt,
      attempts: 0,
      lastSentAt: Date.now(),
      email: user.email
    });

    try {
      const resend = new Resend(apiKey);

      const { error: resendError } = await resend.emails.send({
        from: sender,
        to: user.email,
        subject: "Your UniAble verification code",
        text:
          `Your UniAble verification code is ${code}.\n\n` +
          "It expires in 10 minutes. If you did not request this code, you can ignore this email.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #202124;">
            <h2 style="color: #172554;">Verify your UniAble account</h2>
            <p>Use the verification code below to complete your UniAble registration.</p>
            <div style="margin: 24px 0; padding: 18px; background: #f3f4f6; border-radius: 8px; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
            </div>
            <p>This code expires in <strong>10 minutes</strong>.</p>
            <p>If you did not request this code, you can safely ignore this email.</p>
            <p style="margin-top: 28px; color: #6b7280; font-size: 13px;">UniAble — Access without limits. Education for everyone.</p>
          </div>
        `
      });

      if (resendError) {
        throw new Error(resendError.message || "Resend could not send the email.");
      }
    } catch (emailError) {
      await ref.delete();

      console.error("Resend email delivery failed:", emailError.message);

      return res.status(502).json({
        error: "The verification email could not be sent. Please try again shortly."
      });
    }

    return res.json({
      sent: true,
      destination: user.email,
      expiresInSeconds: 600
    });
  } catch (error) {
    console.error("Email OTP send failed:", error);

    return res.status(500).json({
      error: error.message || "Could not send the verification code."
    });
  }
});
router.post("/email-otp/verify", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "Enter the six-digit code from your email." });

    const ref = getAdminDb().collection("emailOtpChallenges").doc(uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(400).json({ error: "Request a new email verification code first." });
    const challenge = snapshot.data();
    if (Date.now() > Number(challenge.expiresAt || 0)) {
      await ref.delete();
      return res.status(400).json({ error: "That code has expired. Request a new one." });
    }
    if (Number(challenge.attempts || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many incorrect attempts. Wait one minute, then request a new code." });
    }

    const matches = safeEqualHex(challenge.digest, otpDigest(uid, code));
    if (!matches) {
      await ref.update({ attempts: Number(challenge.attempts || 0) + 1 });
      return res.status(400).json({ error: "That code is incorrect. Check the email and try again." });
    }

    await getAdminAuth().updateUser(uid, { emailVerified: true });
    await setVerified(uid, "email");
    await ref.delete();
    return res.json({ verified: true, method: "email" });
  } catch (error) {
    console.error("Email OTP verification failed:", error);
    return res.status(500).json({ error: error.message || "Could not verify the email code." });
  }
});

router.post("/phone/verified", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const phoneNumber = String(req.body?.phoneNumber || "").trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) return res.status(400).json({ error: "Enter a valid phone number in international format, for example +27821234567." });
    const user = await getAdminAuth().getUser(uid);
    if (!user.phoneNumber || user.phoneNumber !== phoneNumber) {
      return res.status(400).json({ error: "Firebase has not confirmed this phone number on your account. Please complete the SMS code first." });
    }
    await setVerified(uid, "sms");
    return res.json({ verified: true, method: "sms" });
  } catch (error) {
    console.error("Phone verification confirmation failed:", error);
    return res.status(500).json({ error: error.message || "Could not confirm phone verification." });
  }
});


router.post("/staff/provision", requireRole("admin"), async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = String(req.body?.role || "").trim().toLowerCase();

    const allowedRoles = new Set([
      "volunteer",
      "disability_office",
      "security"
    ]);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid staff email address." });
    }

    if (!allowedRoles.has(role)) {
      return res.status(400).json({
        error: "Invalid staff role. Administrator assignment requires the secure bootstrap process."
      });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    const staffUser = await auth.getUserByEmail(email);

    const existingClaims = staffUser.customClaims || {};

    await db.collection("users").doc(staffUser.uid).set({
      role,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: req.firebaseToken.uid,
      email: staffUser.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await auth.setCustomUserClaims(staffUser.uid, {
      ...existingClaims,
      role
    });

    return res.json({
      success: true,
      message: "Staff role assigned successfully.",
      staff: {
        uid: staffUser.uid,
        email: staffUser.email,
        role
      }
    });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        error: "No Firebase Authentication account exists for that email."
      });
    }

    console.error("Staff provisioning failed:", error);
    return res.status(500).json({
      error: "Could not provision the staff account."
    });
  }
});

// --------------------------------------------------
// ADMIN STAFF MANAGEMENT
// --------------------------------------------------

const MANAGED_STAFF_ROLES = new Set([
  "lecturer",
  "volunteer",
  "disability_office",
  "security"
]);

router.get("/staff", requireRole("admin"), async (req, res) => {
  try {
    const auth = getAdminAuth();
    const db = getAdminDb();

    const snapshot = await db.collection("users").get();

    const staff = await Promise.all(
      snapshot.docs.map(async (document) => {
        const profile = document.data() || {};
        const role = String(profile.role || "").toLowerCase();

        if (!MANAGED_STAFF_ROLES.has(role)) {
          return null;
        }

        let account = null;

        try {
          account = await auth.getUser(document.id);
        } catch (error) {
          if (error.code !== "auth/user-not-found") {
            throw error;
          }
        }

        const isActive =
          account?.disabled !== true &&
          profile.isActive !== false &&
          profile.accessStatus !== "disabled";

        return {
          uid: document.id,
          email: account?.email || profile.email || "",
          displayName:
            account?.displayName ||
            profile.displayName ||
            profile.fullName ||
            profile.name ||
            "",
          role,
          isActive,
          createdAt: account?.metadata?.creationTime || null,
          roleAssignedAt: profile.roleAssignedAt || null
        };
      })
    );

    const results = staff
      .filter(Boolean)
      .sort((a, b) => a.email.localeCompare(b.email));

    return res.json({
      success: true,
      total: results.length,
      staff: results
    });
  } catch (error) {
    console.error("Staff listing failed:", error);
    return res.status(500).json({
      error: "Could not retrieve staff accounts."
    });
  }
});

router.patch(
  "/staff/:uid/access",
  requireRole("admin"),
  async (req, res) => {
    try {
      const uid = String(req.params.uid || "").trim();
      const isActive = req.body?.isActive;

      if (!uid || typeof isActive !== "boolean") {
        return res.status(400).json({
          error: "A staff account and valid access status are required."
        });
      }

      if (uid === req.firebaseToken.uid && !isActive) {
        return res.status(400).json({
          error: "You cannot deactivate your own administrator account."
        });
      }

      const auth = getAdminAuth();
      const db = getAdminDb();

      const profileRef = db.collection("users").doc(uid);
      const profileSnapshot = await profileRef.get();

      if (!profileSnapshot.exists) {
        return res.status(404).json({
          error: "Staff profile was not found."
        });
      }

      const profile = profileSnapshot.data() || {};
      const role = String(profile.role || "").toLowerCase();

      if (!MANAGED_STAFF_ROLES.has(role)) {
        return res.status(400).json({
          error: "Only authorised staff accounts can be managed here."
        });
      }

      const account = await auth.getUser(uid);

      // Update Firebase Authentication first.
      await auth.updateUser(uid, {
        disabled: !isActive
      });

      try {
        await profileRef.set({
          isActive,
          accessStatus: isActive ? "active" : "disabled",
          accessUpdatedAt: new Date().toISOString(),
          accessUpdatedBy: req.firebaseToken.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (databaseError) {
        // Restore the previous Authentication status if Firestore fails.
        await auth.updateUser(uid, {
          disabled: account.disabled === true
        });
        throw databaseError;
      }

      return res.json({
        success: true,
        message: isActive
          ? "Staff access has been enabled."
          : "Staff access has been disabled.",
        staff: {
          uid,
          email: account.email,
          role,
          isActive
        }
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return res.status(404).json({
          error: "Firebase Authentication account was not found."
        });
      }

      console.error("Staff access update failed:", error);
      return res.status(500).json({
        error: "Could not update staff account access."
      });
    }
  }
);

export default router;
