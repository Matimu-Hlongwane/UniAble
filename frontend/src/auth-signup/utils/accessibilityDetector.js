import { ACCESSIBILITY_NONE } from "../../data/accessibilityCategories";

export function detectAccessibility(text) {
    const answer = String(text || "").toLowerCase();

    if (
        answer.includes("visual") ||
        answer.includes("blind") ||
        answer.includes("eyesight") ||
        answer.includes("sight")
    ) return "Visual";

    if (
        answer.includes("hearing") ||
        answer.includes("deaf") ||
        answer.includes("hard of hearing")
    ) return "Hearing";

    if (
        answer.includes("mobility") ||
        answer.includes("wheelchair") ||
        answer.includes("walking") ||
        answer.includes("physical movement")
    ) return "Mobility";

    if (
        answer.includes("speech") ||
        answer.includes("speaking") ||
        answer.includes("communication")
    ) return "Speech";

    if (answer.includes("colour") || answer.includes("color")) return "Visual";

    if (
        answer.includes("neurodiverse") ||
        answer.includes("neurodivergent") ||
        answer.includes("autism") ||
        answer.includes("adhd") ||
        answer.includes("dyslexia") ||
        answer.includes("down syndrome") ||
        answer.includes("down's syndrome")
    ) return "Neurodiverse";

    if (
        answer === "no" ||
        answer.includes("no accessibility") ||
        answer.includes("none") ||
        answer.includes("nothing") ||
        answer.includes("i don't") ||
        answer.includes("i do not")
    ) return ACCESSIBILITY_NONE;

    return null;
}