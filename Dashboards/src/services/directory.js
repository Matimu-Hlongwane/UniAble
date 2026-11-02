import { createStore } from "../lib/createStore.js";

// Account directory (metadata only: name, email, role, status).
// Disability information is deliberately NOT stored here — it lives in
// the registrations collection, which administrators cannot read.

const SEED = [
  { uid: "u-student", email: "student@uniable.ac.za", name: "Nande Mtsi", role: "student", status: "active" },
  { uid: "u-student2", email: "naledi@uniable.ac.za", name: "Naledi K.", role: "student", status: "active" },
  { uid: "u-lecturer", email: "lecturer@uniable.ac.za", name: "Dr M. Mulaudzi", role: "lecturer", status: "active" },
  { uid: "u-disability", email: "disability@uniable.ac.za", name: "N. Ravele", role: "disability_office", status: "active" },
  { uid: "u-security", email: "security@uniable.ac.za", name: "T. Nemavhola", role: "security", status: "active" },
  { uid: "u-admin", email: "admin@uniable.ac.za", name: "A. Sibanda", role: "admin", status: "active" },
  { uid: "u-admin2", email: "admin2@uniable.ac.za", name: "K. Maluleke", role: "admin", status: "active" },
];

export const directoryStore = createStore("uniable.directory.v2", { users: SEED });

export const useDirectory = () => directoryStore.use();

export function findByEmail(email) {
  const needle = email.trim().toLowerCase();
  return directoryStore.get().users.find((u) => u.email.toLowerCase() === needle) ?? null;
}

export function findByUid(uid) {
  return directoryStore.get().users.find((u) => u.uid === uid) ?? null;
}

export function setRole(uid, role) {
  directoryStore.set((s) => ({ users: s.users.map((u) => (u.uid === uid ? { ...u, role } : u)) }));
}

export function setStatus(uid, status) {
  directoryStore.set((s) => ({ users: s.users.map((u) => (u.uid === uid ? { ...u, status } : u)) }));
}

export function addStudent(email, name) {
  const account = {
    uid: `u-${Date.now().toString(36)}`,
    email: email.trim().toLowerCase(),
    name,
    role: "student",
    status: "active",
  };
  directoryStore.set((s) => ({ users: [...s.users, account] }));
  return account;
}
