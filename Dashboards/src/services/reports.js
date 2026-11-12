// Controlled reporting: aggregated, de-identified, small numbers suppressed.
// No report contains names, emails, locations, documents or free text.
// (Sample figures for the demo. This is primary suppression only — add
// secondary suppression and information-officer review before publishing.)

export const MIN_CELL = 5;

export function displayCount(n) {
  return n > 0 && n < MIN_CELL ? `<${MIN_CELL}` : String(n);
}

export const REPORTS = {
  registrations: {
    id: "registrations",
    title: "Accessibility registrations by category",
    columns: ["Category", "Registered", "Approved", "Pending"],
    rows: [
      ["Visual", 41, 36, 5],
      ["Hearing", 17, 14, 3],
      ["Mobility", 26, 22, 4],
      ["Speech", 3, 3, 0],
      ["Colour vision", 9, 8, 1],
      ["Neurodiverse", 34, 29, 5],
    ],
  },
  service: {
    id: "service",
    title: "Service usage, last 30 days",
    columns: ["Measure", "Count"],
    rows: [
      ["Peer assistance requests", 118],
      ["Peer assistance completed", 104],
      ["Emergency alerts raised", 6],
      ["Emergency alerts resolved on scene", 4],
      ["Voice logins", 1432],
    ],
  },
};

export function displayRows(report) {
  return report.rows.map((row) => row.map((cell) => (typeof cell === "number" ? displayCount(cell) : cell)));
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportToCsv(report) {
  return [report.columns, ...displayRows(report)].map((row) => row.map(csvCell).join(",")).join("\n");
}
