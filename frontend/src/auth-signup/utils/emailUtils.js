/* =========================================
   UNIABLE EMAIL UTILITIES
   ========================================= */


/*
  Convert a spoken email address into
  a normal email address.

  Example:

  "matimu at gmail dot com"

  becomes:

  "matimu@gmail.com"
*/

export function normalizeSpokenEmail(spokenText) {
    if (!spokenText) {
        return "";
    }

    let email = spokenText
        .toLowerCase()
        .trim();

    email = email
        .replace(/\bat the rate\b|\bat sign\b|\bat symbol\b|\bat\b/g, " @ ")
        .replace(/\b(dot|period)\b/g, " . ")
        .replace(/\bunderscore\b/g, "_")
        .replace(/\b(hyphen|dash)\b/g, "-")
        .replace(/\bplus\b/g, "+")
        .replace(/\b(zero|oh)\b/g, "0")
        .replace(/\bone\b/g, "1")
        .replace(/\btwo\b/g, "2")
        .replace(/\bthree\b/g, "3")
        .replace(/\bfour\b/g, "4")
        .replace(/\bfive\b/g, "5")
        .replace(/\bsix\b/g, "6")
        .replace(/\bseven\b/g, "7")
        .replace(/\beight\b/g, "8")
        .replace(/\bnine\b/g, "9")
        .replace(/\s*@\s*/g, "@")
        .replace(/\s*\.\s*/g, ".")
        .replace(/[.,!?;:]+$/g, "")
        .replace(/\s+/g, "");
    return email;
}