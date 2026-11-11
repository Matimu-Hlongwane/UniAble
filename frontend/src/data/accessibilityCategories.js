export const ACCESSIBILITY_NONE = "None";

export const ACCESSIBILITY_CATEGORIES = [
  "Visual",
  "Hearing",
  "Mobility",
  "Speech",
  "Neurodiverse",
];

export const ACCESSIBILITY_PROFILES = ACCESSIBILITY_CATEGORIES.map((value) => ({
  id: value.toLowerCase(),
  value,
}));

export function isSupportedAccessibilityCategory(value) {
  return value === ACCESSIBILITY_NONE || ACCESSIBILITY_CATEGORIES.includes(value);
}

export function normalizeAccessibilityCategory(value) {
  const category = String(value || "").trim().toLowerCase();

  if (!category || category === "none" || category.includes("no accessibility")) {
    return ACCESSIBILITY_NONE;
  }
  if (category.includes("visual") || category.includes("blind") || category.includes("colour") || category.includes("color")) {
    return "Visual";
  }
  if (category.includes("hearing") || category.includes("deaf")) {
    return "Hearing";
  }
  if (category.includes("mobility") || category.includes("hands-free") || category.includes("handsfree")) {
    return "Mobility";
  }
  if (category.includes("speech") || category.includes("non-verbal")) {
    return "Speech";
  }
  if (category.includes("neurodiverse") || category.includes("neurodivergent")) {
    return "Neurodiverse";
  }

  return ACCESSIBILITY_NONE;
}
