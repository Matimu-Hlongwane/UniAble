function normalizeCommand(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function includesPhrase(command, phrases) {
  return phrases.some((phrase) => ` ${command} `.includes(` ${phrase} `));
}

export function resolveVoiceNavigationCommand(spokenText) {
  const command = normalizeCommand(spokenText);
  if (!command) return null;

  if (["go back", "back", "previous page"].includes(command)) {
    return { action: "back" };
  }

  if (includesPhrase(command, ["read this page", "read page", "repeat instructions"])) {
    return { action: "read" };
  }

  const destinations = [
    { path: "/emergency", label: "emergency support", phrases: ["emergency", "sos", "help me"] },
    { path: "/campus", label: "campus navigation", phrases: ["campus", "campus navigation", "map", "navigation"] },
    { path: "/schedule", label: "your schedule", phrases: ["schedule", "timetable", "classes"] },
    { path: "/peer-assistance", label: "peer assistance", phrases: ["peer assistance", "peer help", "peer support"] },
    { path: "/unipal", label: "UniPal", phrases: ["unipal", "uni pal", "companion"] },
    { path: "/accessibility", label: "accessibility settings", phrases: ["accessibility", "accessibility settings"] },
    { path: "/scan-read", label: "Scan and Read", phrases: ["scan and read", "scan read", "scan document", "read document", "ocr"] },
    { path: "/settings", label: "settings", phrases: ["settings", "profile settings"] },
    { path: "/dashboard", label: "dashboard", phrases: ["home", "dashboard", "student home"] },
  ];

  const destination = destinations.find(({ phrases }) => includesPhrase(command, phrases));
  return destination
    ? { path: destination.path, label: destination.label }
    : null;
}
