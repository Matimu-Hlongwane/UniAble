import { Router } from "express";

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
      // An older AI service cannot return replyLanguage/replyLocale or answer in other languages.
      if (response.ok && !health?.capabilities?.multilingualReplies) {
        result.features = { multilingualReplies: false, replyLanguageField: false };
      }
    } catch (error) {
      result.aiService = "offline";
    }
  }

  res.json(result);
});

const SAFE_PROFILE_KEYS = ["firstName", "accessibility", "preferences"];
const MAX_HISTORY = 10;

router.post("/chat", async (req, res) => {
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

function localFallback(text) {
  const q = text.toLowerCase();

  if (/(^|\s)(hi|hello|hey|good morning|good afternoon|good evening)(\s|!|$)/.test(q)) {
    return "Hi! I’m UniPal, your UniAble Companion. I can help with UniAble, accessibility and student disability support.";
  }

  if (q.includes("accessibility") || q.includes("text size") || q.includes("font")) {
    return "You can open Settings to adjust your accessibility preferences, including text size and appearance. You can also open the Accessibility area to choose a support profile.";
  }

  if (q.includes("emergency") || q.includes("sos")) {
    return "For an immediate safety concern, open Emergency SOS in UniAble. Use the emergency options shown there and contact your campus or local emergency services when appropriate.";
  }

  if (q.includes("campus") || q.includes("navigate") || q.includes("route") || q.includes("map")) {
    return "Open Campus Navigation in UniAble to choose a destination and view an accessible route.";
  }

  if (q.includes("peer") || q.includes("volunteer")) {
    return "Open Peer Assistance to request support or review available peer assistance options.";
  }

  return "I’m UniPal, your UniAble Companion. I can help with UniAble, accessibility, campus navigation, study support for students with disabilities, peer assistance and emergency features.";
}

export default router;
