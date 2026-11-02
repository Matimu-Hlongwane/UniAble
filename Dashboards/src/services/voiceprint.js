const ENROLLED_PHRASE = "hey uniable log me in";

function similarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) shared += 1;
  });
  return shared / Math.max(wordsA.size, wordsB.size);
}

export async function matchVoice(transcript) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const score = similarity(transcript, ENROLLED_PHRASE);
  const confidence = Math.round(Math.min(0.99, 0.55 + score * 0.44) * 100);
  const matched = score >= 0.4;
  return { matched, confidence };
}

export const VOICEPRINT_PROMPT = "Hey UniAble, log me in";
