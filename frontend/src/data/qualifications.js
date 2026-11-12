export const RICHFIELD_QUALIFICATIONS = [
  "Bachelor of Science in Information Technology (BSc IT)",
  "Bachelor of Commerce (BCom)",
];

export function getQualificationLabel(qualification) {
  if (qualification === RICHFIELD_QUALIFICATIONS[0]) return "BSc IT";
  if (qualification === RICHFIELD_QUALIFICATIONS[1]) return "BCOM";
  return qualification;
}
