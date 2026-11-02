// Sample content for the demo dashboards (replace with Firestore data).

export const TIMETABLE = [
  { day: "Today", time: "10:00–12:00", course: "Database Systems", room: "Room B201" },
  { day: "Today", time: "14:00–16:00", course: "Artificial Intelligence", room: "Room C301" },
  { day: "Tomorrow", time: "09:00–11:00", course: "Data Structures", room: "Room B204" },
  { day: "Tomorrow", time: "13:00–15:00", course: "Web Development", room: "Room D402" },
];

export const DEADLINES = [{ course: "Database Systems", title: "Assignment 3", due: "Tomorrow, 23:59" }];

export const LECTURER_FEEDBACK = {
  module: "Database Systems",
  stats: [
    { label: "Speech clarity", value: "4.2/5" },
    { label: "Content readability", value: "3.6/5" },
    { label: "Pacing", value: "3.9/5" },
    { label: "Captions used", value: "87%" },
  ],
  suggestion:
    "Several students found slide 14 onward difficult to follow — slow the pace after complex diagrams. Enable captioning for the full lecture, not just Q&A. Provide slides in high-contrast format.",
  trend: [3.9, 4.1, 3.5, 4.4, 3.8, 4.5, 3.7],
};

export const MATERIALS = [
  { id: "m1", name: "Lecture 6 — Normalisation.pptx", formats: ["Captioned", "Audio"], pending: false, views: 212 },
  { id: "m2", name: "Lecture 7 — Indexing.pdf", formats: [], pending: true, views: 184 },
];
