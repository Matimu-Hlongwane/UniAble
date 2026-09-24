/* =========================================
   UNIABLE ACCESSIBILITY DETECTOR
   ========================================= */

export function detectAccessibility(text) {

    const answer = text.toLowerCase();


    /* VISUAL */

    if (
        answer.includes("visual") ||
        answer.includes("blind") ||
        answer.includes("eyesight") ||
        answer.includes("sight")
    ) {

        return "Visual Impairment";

    }


    /* HEARING */

    if (
        answer.includes("hearing") ||
        answer.includes("deaf") ||
        answer.includes("hard of hearing")
    ) {

        return "Hearing Impairment";

    }


    /* MOBILITY */

    if (
        answer.includes("mobility") ||
        answer.includes("wheelchair") ||
        answer.includes("walking") ||
        answer.includes("physical movement")
    ) {

        return "Mobility Support";

    }


    /* SPEECH */

    if (
        answer.includes("speech") ||
        answer.includes("speaking") ||
        answer.includes("communication")
    ) {

        return "Speech Support";

    }


    /* COLOUR VISION */

    if (
        answer.includes("colour blind") ||
        answer.includes("color blind") ||
        answer.includes("colour vision") ||
        answer.includes("color vision")
    ) {

        return "Colour Vision";

    }


    /* NEURODIVERSE */

    if (
        answer.includes("neurodiverse") ||
        answer.includes("neurodivergent") ||
        answer.includes("autism") ||
        answer.includes("adhd")
    ) {

        return "Neurodiverse Support";

    }


    /* NO ACCESSIBILITY REQUIREMENTS */

    if (
        answer === "no" ||
        answer.includes("no accessibility") ||
        answer.includes("none") ||
        answer.includes("nothing") ||
        answer.includes("i don't") ||
        answer.includes("i do not")
    ) {

        return "None";

    }


    /* ANYTHING WE DON'T RECOGNISE */

    return "Other";

}