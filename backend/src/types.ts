export const ROLES = [
  "student",
  "admin",
  "volunteer",
  "disability_office",
  "security",
  "lecturer",
] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["volunteer", "disability_office", "security", "lecturer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** ISO-8601 timestamp string. The app stores dates as strings, not Firestore Timestamps. */
export type IsoString = string;

export interface UserProfile {
  role?: string;
  email?: string | null;
  displayName?: string;
  fullName?: string;
  name?: string;
  studentName?: string;
  qualification?: string;
  accessibility?: string;
  isActive?: boolean;
  accessStatus?: "active" | "disabled";
  accountVerificationRequired?: boolean;
  accountVerified?: boolean;
  verificationMethod?: "email" | "sms";
  verificationStatus?: string;
  verifiedAt?: IsoString;
  roleAssignedAt?: IsoString;
  roleAssignedBy?: string;
  createdAt?: IsoString;
  updatedAt?: IsoString;
  updatedBy?: string;
}

export type PeerPriority = "Normal" | "Urgent";
export type PeerStatus = "open" | "accepted" | "declined" | "completed";

export interface PeerRequest {
  studentId: string;
  student: string;
  type: string;
  detail: string;
  location: string;
  priority: PeerPriority;
  status: PeerStatus;
  assignedVolunteerId: string | null;
  createdAt: IsoString;
  updatedAt: IsoString;
}

export interface Volunteer {
  name: string;
  available: boolean;
  active: boolean;
  userId: string;
  createdAt?: IsoString;
  updatedAt: IsoString;
}

export type SosStatus = "active" | "acknowledged" | "resolved" | "cancelled";

/** How a closed alert ended. A false alarm is kept on record, never deleted. */
export type SosResolution = "resolved" | "false_alarm";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A reported position. Accuracy is the radius in metres the device reported, when known. */
export interface SosLocation extends GeoPoint {
  accuracyMeters?: number;
  capturedAt: IsoString;
}

/** Why the student's device could not provide GPS when the SOS was sent. */
export type SosLocationIssue = "denied" | "unavailable" | "timeout" | "unsupported" | "unknown";

export type DeliveryStatus = "pending" | "no_registered_devices" | "sent" | "partial" | "failed";

export interface NotificationDelivery {
  status: DeliveryStatus;
  targetUsers: number;
  targetRoles: string[];
  registeredDevices: number;
  sent: number;
  failed: number;
  attemptedAt: IsoString;
  invalidTokensRemoved?: number;
  errors?: string[];
  error?: string;
}

export type SosEventType =
  | "created"
  | "acknowledged"
  | "location_updated"
  | "resolved"
  | "false_alarm"
  | "cancelled";

/** One entry of the audit trail kept on every alert. Entries are only ever appended. */
export interface SosTimelineEvent {
  type: SosEventType;
  at: IsoString;
  actorId: string;
  actorRole: string;
  actorName: string;
  note?: string;
  location?: GeoPoint;
}

export interface SosResponder {
  uid: string;
  name: string;
  role: Role;
}

export interface SosAlert {
  studentId: string;
  student: string;
  location: SosLocation | null;
  locationStatus: "available" | "unavailable";
  locationIssue?: SosLocationIssue | null;
  locationUpdatedAt: IsoString | null;
  source: string;
  status: SosStatus;
  createdAt: IsoString;
  updatedAt?: IsoString;
  acknowledgedBy: string | null;
  acknowledgedRole?: Role;
  acknowledgedAt?: IsoString | null;
  assignedResponder?: SosResponder | null;
  resolvedAt: IsoString | null;
  resolvedBy?: string;
  resolvedByName?: string;
  resolution?: SosResolution;
  resolutionNote?: string;
  cancelledAt?: IsoString | null;
  cancelReason?: string;
  notificationDelivery: Partial<NotificationDelivery> & { status: DeliveryStatus };
  notificationSentAt?: IsoString | null;
  timeline?: SosTimelineEvent[];
}

export interface AccessibilityProfile {
  highContrast?: boolean;
  largeText?: boolean;
  screenReader?: boolean;
  voiceFirst?: boolean;
  reduceMotion?: boolean;
  voiceCommands?: boolean;
  fontSize?: "small" | "medium" | "large";
  theme?: "light" | "dark";
  language?: string;
  updatedAt?: IsoString;
  updatedBy?: string;
}

export interface CourseModule {
  code: string;
  name: string;
  description: string;
  qualification: string;
  lecturerId: string;
  studentIds: string[];
  createdAt: IsoString;
  updatedAt: IsoString;
}

export interface TimetableEntry {
  moduleId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  createdBy: string;
  createdAt: IsoString;
  updatedAt: IsoString;
}

export interface StudyMaterial {
  moduleId: string;
  title: string;
  description: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  published: boolean;
  uploadedBy: string;
  createdAt: IsoString;
  updatedAt: IsoString;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  moduleId: string;
  timetableId: string;
  studentId: string;
  status: AttendanceStatus;
  notes: string;
  recordedBy: string;
  updatedAt: IsoString;
}

export type ApplicationStatus = "pending" | "approved" | "rejected" | "needs_information";

export interface ApplicationDocument {
  storagePath: string;
  fileName: string;
  contentType: string;
}

export interface AccessibilityApplication {
  studentId: string;
  studentName: string;
  studentEmail: string;
  accessibility: string;
  description: string;
  documents: ApplicationDocument[];
  status: ApplicationStatus;
  reviewNote: string;
  reviewedBy?: string;
  reviewedAt?: IsoString;
  createdAt: IsoString;
  updatedAt: IsoString;
}

export interface Department {
  name: string;
  description: string;
  staffIds: string[];
  isActive: boolean;
  createdAt: IsoString;
  updatedAt: IsoString;
  createdBy: string;
  updatedBy?: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowStudentRegistration: boolean;
  allowVolunteerRegistration: boolean;
  updatedAt: IsoString | null;
  updatedBy?: string;
}

/** A Firestore document with its id merged in. */
export type WithId<T> = T & { id: string };

export interface EmailOtpChallenge {
  digest: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  email: string;
}
