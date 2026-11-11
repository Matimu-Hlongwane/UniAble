const spokenDigits = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9",
};

export function normalizeSpokenOtp(transcript) {
  const text = String(transcript || "").toLowerCase().trim();
  const directDigits = text.replace(/\D/g, "");
  if (directDigits.length === 6) return directDigits;

  const tokens = text.match(/[a-z]+|[0-9]+/g) || [];
  const digits = tokens.map((token) => {
    if (/^\d+$/.test(token)) return token;
    return spokenDigits[token] || "";
  }).join("");

  return digits.length === 6 ? digits : "";
}
