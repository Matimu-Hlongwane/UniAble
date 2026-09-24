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


    /* AT SYMBOL */

    email = email
        .replace(/\bat sign\b/g, "@")
        .replace(/\bat symbol\b/g, "@")
        .replace(/\bat\b/g, "@");


    /* DOT */

    email = email
        .replace(/\bdot\b/g, ".");


    /* UNDERSCORE */

    email = email
        .replace(/\bunderscore\b/g, "_");


    /* DASH / HYPHEN */

    email = email
        .replace(/\bhyphen\b/g, "-")
        .replace(/\bdash\b/g, "-");


    /* PLUS */

    email = email
        .replace(/\bplus\b/g, "+");


    /*
      Speech recognition sometimes places
      spaces between parts of an email.
  
      Remove them.
    */

    email = email.replace(/\s+/g, "");


    return email;
}