// Role and permission model.
//
// Principle: least privilege. Each role gets only the permissions its job
// needs. Notably, the administrator role manages accounts, configuration
// and audit — it has NO permission to read registrations, disability
// documents, incident locations or assistance requests. Administrative
// convenience is not a reason for broad access to student information.

export const ROLES = {
  STUDENT: "student",
  LECTURER: "lecturer",
  DISABILITY_OFFICE: "disability_office",
  SECURITY: "security",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  student: "Student",
  lecturer: "Lecturer",
  disability_office: "Disability Office",
  security: "Security",
  admin: "Administrator",
};

export const ROLE_HOME = {
  student: "/student",
  lecturer: "/lecturer",
  disability_office: "/disability-office",
  security: "/security",
  admin: "/admin",
};

// Granting or removing these roles needs approval from a second administrator.
export const PRIVILEGED_ROLES = [ROLES.ADMIN, ROLES.SECURITY, ROLES.DISABILITY_OFFICE];

const PERMISSIONS = {
  student: ["student.dashboard", "assistance.request", "sos.trigger"],
  lecturer: ["materials.manage", "feedback.view.aggregate", "announcements.send"],
  disability_office: [
    "registrations.review",
    "documents.verify",
    "accommodations.manage",
    "reports.disability.aggregate",
  ],
  security: ["incidents.view", "incidents.respond"],
  admin: [
    "users.manage.metadata",
    "roles.assign",
    "accounts.status",
    "config.manage",
    "reports.aggregate",
    "audit.view",
    "approvals.decide",
  ],
};

export function can(role, permission) {
  return Boolean(role && PERMISSIONS[role]?.includes(permission));
}
