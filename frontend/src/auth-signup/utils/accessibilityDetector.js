export function detectAccessibility(text) {
    const answer = String(text || "").toLowerCase();

    if (
        answer.includes("visual") ||
        answer.includes("blind") ||
        answer.includes("eyesight") ||
        answer.includes("sight")
    ) return "Visual Impairment";

    if (
        answer.includes("hearing") ||
        answer.includes("deaf") ||
        answer.includes("hard of hearing")
    ) return "Hearing Impairment";

    if (
        answer.includes("mobility") ||
        answer.includes("wheelchair") ||
        answer.includes("walking") ||
        answer.includes("physical movement")
    ) return "Mobility Support";

    if (
        answer.includes("speech") ||
        answer.includes("speaking") ||
        answer.includes("communication")
    ) return "Speech Support";

    if (
        answer.includes("colour blind") ||
        answer.includes("color blind") ||
        answer.includes("colour vision") ||
        answer.includes("color vision")
    ) return "Colour Vision";

    if (
        answer.includes("neurodiverse") ||
        answer.includes("neurodivergent") ||
        answer.includes("autism") ||
        answer.includes("adhd") ||
        answer.includes("dyslexia") ||
        answer.includes("down syndrome") ||
        answer.includes("down's syndrome")
    ) return "Neurodiverse Support";

    if (
        answer === "no" ||
        answer.includes("no accessibility") ||
        answer.includes("none") ||
        answer.includes("nothing") ||
        answer.includes("i don't") ||
        answer.includes("i do not")
    ) return "None";

    return "Other";
}