import { Router } from "express";
import { requireFirebaseUser } from "../middleware/authMiddleware.js";

const router = Router();

// Features this backend supports. The mobile/web app reads this to check compatibility.
const FEATURES = { multilingualReplies: true, replyLanguageField: true };
const DEFAULT_LOCALE = "en-ZA";

// Language names and locales are forwarded to the AI prompt, so accept plain values only.
const cleanLanguage = (value) =>
  /^[A-Za-z\u00C0-\u024F]{2,30}( [A-Za-z\u00C0-\u024F]{2,30})?$/.test(String(value || "").trim())
    ? String(value).trim()
    : "English";
const cleanLocale = (value) =>
  /^[A-Za-z0-9-]{2,20}$/.test(String(value || "").trim()) ? String(value).trim() : DEFAULT_LOCALE;

router.get("/capabilities", async (_req, res) => {
  const aiServiceUrl = String(process.env.AI_SERVICE_URL || "").replace(/\/$/, "");
  const result = { ok: true, features: { ...FEATURES }, aiService: "not-configured", aiConfigured: false };

  if (aiServiceUrl) {
    try {
      const response = await fetch(`${aiServiceUrl}/health`, { signal: AbortSignal.timeout(3000) });
      const health = await response.json().catch(() => ({}));
      result.aiService = response.ok ? "online" : "error";
      result.aiConfigured = Boolean(health?.capabilities?.aiConfigured);
      if (!result.aiConfigured) {
        result.features.multilingualReplies = false;
      }
      // An older AI service cannot return replyLanguage/replyLocale or answer in other languages.
      if (response.ok && !health?.capabilities?.multilingualReplies) {
        result.features = { multilingualReplies: false, replyLanguageField: false };
      }
    } catch (error) {
      result.aiService = "offline";
      result.features.multilingualReplies = false;
    }
  }

  if (!result.aiConfigured) {
    result.features.multilingualReplies = false;
  }

  res.json(result);
});

const SAFE_PROFILE_KEYS = ["firstName", "accessibility", "preferences"];
const MAX_HISTORY = 10;

router.post("/chat", requireFirebaseUser, async (req, res) => {
  const {
    message,
    profile = {},
    messages = [],
  } = req.body || {};
  const language = cleanLanguage(req.body?.language);
  const locale = cleanLocale(req.body?.locale);

  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    return res.status(400).json({ message: "Please enter a question for UniPal." });
  }
  if (cleanMessage.length > 1000) {
    return res.status(413).json({ message: "Please keep your UniPal question under 1,000 characters." });
  }

  const safeProfile = {};
  for (const key of SAFE_PROFILE_KEYS) {
    if (key === "accessibility" && profile.accessibility && typeof profile.accessibility === "object") {
      safeProfile.accessibility = profile.accessibility;
    } else if (key === "firstName") {
      safeProfile.firstName = String(profile.firstName || "").slice(0, 80);
    } else if (key === "preferences" && profile.preferences && typeof profile.preferences === "object") {
      safeProfile.preferences = {
        theme: profile.preferences.theme === "dark" ? "dark" : "light",
        fontSize: ["small", "medium", "large"].includes(profile.preferences.fontSize)
          ? profile.preferences.fontSize
          : "medium",
      };
    }
  }

  const cleanHistory = Array.isArray(messages)
    ? messages
        .slice(-MAX_HISTORY)
        .filter((item) => item && ["user", "assistant"].includes(item.role))
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").slice(0, 1500),
        }))
    : [];

  const aiServiceUrl = String(process.env.AI_SERVICE_URL || "").replace(/\/$/, "");

  if (!aiServiceUrl) {
    return res.json({
      message: localFallback(cleanMessage),
      source: "demo",
      replyLanguage: "English",
      replyLocale: DEFAULT_LOCALE,
    });
  }

  try {
    const response = await fetch(`${aiServiceUrl}/unipal/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        message: cleanMessage,
        language,
        locale,
        profile: safeProfile,
        messages: cleanHistory,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        message: data.detail || data.message || "UniPal is temporarily unavailable. Please try again.",
      });
    }

    // Older AI services do not send replyLanguage/replyLocale; omit them so the app can decide.
    const hasMessage = Boolean(data.message);
    return res.json({
      message: data.message || localFallback(cleanMessage),
      source: hasMessage ? data.source || "ai" : "demo-fallback",
      replyLanguage: hasMessage ? data.replyLanguage : "English",
      replyLocale: hasMessage ? data.replyLocale : DEFAULT_LOCALE,
    });
  } catch (error) {
    console.error("UniPal AI service error:", error.message);
    return res.json({
      message: localFallback(cleanMessage),
      source: "demo-fallback",
      replyLanguage: "English",
      replyLocale: DEFAULT_LOCALE,
    });
  }
});

export function localFallback(text) {
  const q = text.toLowerCase();

  if (/(^|\s)(hi|hello|hey|good morning|good afternoon|good evening)(\s|!|$)/.test(q)) {
    return "Hi! I'm UniPal, your UniAble Companion. I can guide you through app features, accessibility settings, your schedule, campus navigation, peer support and emergency options. What would you like help with?";
  }

  if (q.includes("emergency") || q.includes("sos") || q.includes("urgent")) {
    return "For an immediate safety concern, open Emergency SOS in UniAble and use the options shown there. If there is immediate danger, contact campus security or local emergency services.";
  }

  if (q.includes("announcement") || q.includes("notice")) {
    if (q.includes("lecturer") || q.includes("post") || q.includes("publish") || q.includes("make")) {
      return "In the Lecturer workspace, open Announcements, choose one of your assigned modules, add a title and message, then publish. Only students enrolled in that module can see it.";
    }
    return "Module announcements appear on your student dashboard. They are limited to modules you are enrolled in; contact your lecturer if you are missing a module update.";
  }

  if (q.includes("schedule") || q.includes("timetable") || q.includes("class") || q.includes("lecture time")) {
    return "Open My Schedule in UniAble to review classes assigned to your account. If it is empty, check that your modules have been assigned to your student profile or contact the lecturer.";
  }

  if (q.includes("accessibility") || q.includes("text size") || q.includes("font") || q.includes("contrast")) {
    return "Open Settings to change text size, appearance and voice preferences. Open Accessibility to review or update your support profile.";
  }

  if (q.includes("voice") || q.includes("microphone") || q.includes("hands-free") || q.includes("hands free")) {
    return "Select the microphone beside the message box and allow microphone access. UniPal will transcribe what you say into the message box; review or edit the text, then select Send. Voice is only captured after you activate the microphone.";
  }

  if (q.includes("campus") || q.includes("navigate") || q.includes("route") || q.includes("map")) {
    return "Open Campus Navigation, choose a destination and review the route guidance. If you need a person to accompany you, submit a request through Peer Assistance.";
  }

  if (q.includes("peer") || q.includes("volunteer") || q.includes("assistance")) {
    return "Open Peer Assistance, describe the help you need and submit the request. You can return there to review its status.";
  }

  if (q.includes("study") || q.includes("focus") || q.includes("reading") || q.includes("assignment")) {
    return "Try one short study block: choose a single task, work for 20 minutes, then take a 5-minute break. Use read-aloud or text-size controls if they make the material easier to access.";
  }

  if (q.includes("sign up") || q.includes("signup") || q.includes("register") || q.includes("account") || q.includes("login") || q.includes("sign in")) {
    return "Use Sign Up to create an account or Sign In to access an existing one. If you cannot sign in, use Forgot password rather than creating a duplicate account.";
  }

  if (q.includes("help") || q.includes("what can you do") || q.includes("how do i use")) {
    return "I can guide you through schedules, accessibility settings, campus navigation, module announcements, peer assistance and Emergency SOS. Tell me which feature you are trying to use and what is happening.";
  }

  return "I don't have enough information to answer that confidently. I can guide you through schedules, accessibility, campus navigation, announcements, peer assistance and Emergency SOS. Which UniAble feature is your question about?";
}

export default router;
