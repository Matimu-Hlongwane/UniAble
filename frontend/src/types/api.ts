/**
 * Shapes of the JSON returned by the UniAble backend (backend/src/types.ts).
 * Dates are ISO-8601 strings. Keep in sync with the backend when routes change.
 */

export type Role =
  | "student"
  | "admin"
  | "volunteer"
  | "disability_office"
  | "security"
  | "lecturer";

export type StaffRole = Exclude<Role, "student" | "admin">;

export type WithId<T> = T & { id: string };

// ---- Peer assistance -------------------------------------------------------

export type PeerPriority = "Normal" | "Urgent";
export type PeerStatus = "open" | "accepted" | "declined" | "completed";

export interface PeerRequest {
  id: string;
  studentId: string;
  student: string;
  type: string;
  detail: string;
  location: string;
  priority: PeerPriority;
  status: PeerStatus;
  assignedVolunteerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePeerRequestPayload {
  type: string;
  detail: string;
  location: string;
  priority: PeerPriority;
}

export interface Volunteer {
  id: string;
  name: string;
  available: boolean;
  active: boolean;
  userId: string;
  createdAt?: string;
  updatedAt: string;
}

// ---- Emergency -------------------------------------------------------------

export type SosStatus = "active" | "acknowledged" | "resolved" | "cancelled";
export type SosResolution = "resolved" | "false_alarm";
export type SosLocationIssue = "denied" | "unavailable" | "timeout" | "unsupported" | "unknown";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A position as sent to the server. Accuracy is the radius in metres, when the device reports it. */
export interface DeviceLocation extends GeoPoint {
  accuracyMeters?: number;
}

export interface SosLocation extends GeoPoint {
  accuracyMeters?: number;
  capturedAt?: string;
}

export interface NotificationDelivery {
  status: "pending" | "no_registered_devices" | "sent" | "partial" | "failed";
  targetUsers?: number;
  targetRoles?: string[];
  registeredDevices?: number;
  sent: number;
  failed: number;
  attemptedAt?: string;
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

export interface SosTimelineEvent {
  type: SosEventType;
  at: string;
  actorRole: string;
  actorName: string;
  note?: string;
  location?: GeoPoint;
}

export interface SosResponderSummary {
  name: string;
  role: Role;
}

/** An alert as a student sees it: their own record, with the responder's name but no internal ids. */
export interface StudentSosAlert {
  id: string;
  status: SosStatus;
  source: string;
  location: SosLocation | null;
  locationStatus: "available" | "unavailable";
  locationIssue: SosLocationIssue | null;
  locationUpdatedAt: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  assignedResponder: SosResponderSummary | null;
  resolvedAt: string | null;
  resolution: SosResolution | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  notificationDelivery: Pick<NotificationDelivery, "status" | "sent" | "failed">;
  timeline: SosTimelineEvent[];
}

/** An alert as a responder sees it. */
export interface SosAlert {
  id: string;
  studentId: string;
  student: string;
  location: SosLocation | null;
  locationStatus: "available" | "unavailable";
  locationIssue?: SosLocationIssue | null;
  locationUpdatedAt: string | null;
  source: string;
  status: SosStatus;
  createdAt: string;
  updatedAt?: string;
  acknowledgedBy: string | null;
  acknowledgedRole?: Role;
  acknowledgedAt?: string | null;
  assignedResponder?: { uid: string; name: string; role: Role } | null;
  resolvedAt: string | null;
  resolvedBy?: string;
  resolvedByName?: string;
  resolution?: SosResolution;
  resolutionNote?: string;
  cancelledAt?: string | null;
  cancelReason?: string;
  notificationDelivery: NotificationDelivery;
  timeline?: Array<SosTimelineEvent & { actorId?: string }>;
}

export interface CreateSosPayload {
  location: DeviceLocation | null;
  /** Why GPS is missing, so responders know whether to expect a location update later. */
  locationIssue?: SosLocationIssue;
  source: string;
}

export interface CreateSosResponse {
  message: string;
  alreadyOpen: boolean;
  alert: StudentSosAlert;
  delivery: NotificationDelivery;
  notified: string[];
}

export interface ResolveSosPayload {
  resolution: SosResolution;
  note?: string;
}

// ---- Accessibility ---------------------------------------------------------

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
  updatedAt?: string;
  updatedBy?: string;
}

export type ApplicationStatus = "pending" | "approved" | "rejected" | "needs_information";

export interface ApplicationDocument {
  storagePath: string;
  fileName: string;
  contentType: string;
}

export interface AccessibilityApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  accessibility: string;
  description: string;
  documents: ApplicationDocument[];
  status: ApplicationStatus;
  reviewNote: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Academics -------------------------------------------------------------

export interface CourseModule {
  id: string;
  code: string;
  name: string;
  description: string;
  qualification: string;
  lecturerId: string;
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateModulePayload {
  code: string;
  name: string;
  description?: string;
  qualification?: string;
  lecturerId?: string;
  studentIds?: string[];
}

export type UpdateModulePayload = Partial<Omit<CreateModulePayload, never>>;

export interface TimetableEntry {
  id: string;
  moduleId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimetablePayload {
  moduleId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
}

export interface StudyMaterial {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  published: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialPayload {
  moduleId: string;
  title: string;
  description?: string;
  fileName: string;
  storagePath: string;
  contentType?: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  moduleId: string;
  timetableId: string;
  studentId: string;
  status: AttendanceStatus;
  notes: string;
  recordedBy: string;
  updatedAt: string;
}

export interface RecordAttendancePayload {
  moduleId: string;
  timetableId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

// ---- Administration --------------------------------------------------------

export interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  accessibility: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminUserFilters {
  role?: string;
  status?: string;
  search?: string;
}

export interface StaffMember {
  uid: string;
  email: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string | null;
  roleAssignedAt: string | null;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  staffIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowStudentRegistration: boolean;
  allowVolunteerRegistration: boolean;
  updatedAt: string | null;
  updatedBy?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminOverview {
  stats: {
    totalUsers: number;
    students: number;
    staff: number;
    departments: number;
    pendingApprovals: number;
    totalRequests: number;
    openRequests: number;
    activeSOS: number;
    accessibilityProfiles: number;
    modules: number;
    volunteers: number;
  };
}

export interface AdminAnalytics {
  totals: Record<string, number>;
  monthly: { month: string; users: number; requests: number }[];
  accessibility: { category: string; count: number }[];
  applicationsByStatus: { status: ApplicationStatus; count: number }[];
}

export interface ActivityItem {
  id: string;
  kind: "peer_request" | "sos_alert";
  description: string;
  status: string;
  createdAt: string | null;
}

/** Role-specific dashboard payload. Which optional fields are present depends on `role`. */
export interface DashboardResponse {
  role: Role;
  stats: Record<string, number>;
  staffCounts?: Record<string, number>;
  recentActivity?: ActivityItem[];
  requests?: PeerRequest[];
  alerts?: SosAlert[];
  availability?: boolean;
  volunteerRegistered?: boolean;
  accessibilityProfiles?: (AccessibilityProfile & { studentId: string; displayName?: string })[];
}

// ---- UniPal ----------------------------------------------------------------

export interface UniPalMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UniPalChatPayload {
  message: string;
  language: string;
  locale: string;
  profile?: Record<string, unknown>;
  messages?: UniPalMessage[];
}

export interface UniPalChatResponse {
  message: string;
  source?: "ai" | "demo" | "demo-fallback";
  replyLanguage?: string;
  replyLocale?: string;
}

export interface UniPalCapabilities {
  ok: boolean;
  features: { multilingualReplies: boolean; replyLanguageField: boolean };
  aiService: "not-configured" | "online" | "error" | "offline";
  aiConfigured: boolean;
}
