import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, CalendarDays, ClipboardCheck, FileText,
  Megaphone, MessageSquare, RefreshCw, Users, LogOut
} from "lucide-react";
import { api } from "../services/api";
import { getCurrentUser, signOutAccount } from "../services/firebaseAuth";
import "./LecturerDashboard.css";

const sections = [
  { id: "modules", label: "Modules", icon: BookOpen },
  { id: "timetable", label: "Timetable", icon: CalendarDays },
  { id: "classes", label: "Classes", icon: Users },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "materials", label: "Learning materials", icon: FileText },
  { id: "support", label: "Student support", icon: MessageSquare },
  { id: "announcements", label: "Announcements", icon: Megaphone },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function LecturerDashboard({ requests = [], onRefreshRequests }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [section, setSection] = useState("modules");
  const [modules, setModules] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [moduleForm, setModuleForm] = useState({
    code: "", name: "", description: "",
  });
  const [timetableForm, setTimetableForm] = useState({
    moduleId: "", title: "", date: today(),
    startTime: "08:00", endTime: "09:00", venue: "",
  });
  const [materialForm, setMaterialForm] = useState({
    moduleId: "", title: "", description: "",
    fileName: "", storagePath: "", contentType: "",
  });
  const [attendanceForm, setAttendanceForm] = useState({
    timetableId: "", studentId: "", status: "present",
  });

  const loadAcademicData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [moduleRows, timetableRows, materialRows, attendanceRows] =
        await Promise.all([
          api.getAcademicModules(),
          api.getAcademicTimetable(),
          api.getAcademicMaterials(),
          api.getAcademicAttendance(),
        ]);

      setModules(Array.isArray(moduleRows) ? moduleRows : moduleRows?.modules || []);
      setTimetable(Array.isArray(timetableRows) ? timetableRows : timetableRows?.timetable || []);
      setMaterials(Array.isArray(materialRows) ? materialRows : materialRows?.materials || []);
      setAttendance(Array.isArray(attendanceRows) ? attendanceRows : attendanceRows?.attendance || []);
    } catch (err) {
      setError(err.message || "Could not load academic information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  useEffect(() => {
    if (!timetableForm.moduleId && modules.length) {
      setTimetableForm((form) => ({ ...form, moduleId: modules[0].id }));
    }
    if (!materialForm.moduleId && modules.length) {
      setMaterialForm((form) => ({ ...form, moduleId: modules[0].id }));
    }
  }, [modules, timetableForm.moduleId, materialForm.moduleId]);

  async function submitAction(action, successMessage) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await loadAcademicData();
    } catch (err) {
      setError(err.message || "The action could not be completed.");
    } finally {
      setSaving(false);
    }
  }

  function moduleName(id) {
    return modules.find((item) => item.id === id)?.name || "Module";
  }

  function renderModules() {
    return (
      <>
        <form className="lecturer-form" onSubmit={(event) => {
          event.preventDefault();
          submitAction(async () => {
            const user = getCurrentUser();
            if (!user) throw new Error("Please sign in again.");
            await api.createAcademicModule({
              ...moduleForm,
              lecturerId: user.uid,
              studentIds: [],
            });
            setModuleForm({ code: "", name: "", description: "" });
          }, "Module created.");
        }}>
          <h3>Create module</h3>
          <div className="lecturer-form-grid">
            <label>Module code
              <input required value={moduleForm.code}
                onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })} />
            </label>
            <label>Module name
              <input required value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })} />
            </label>
          </div>
          <label>Description
            <textarea value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} />
          </label>
          <button disabled={saving}>Create module</button>
        </form>

        <div className="lecturer-card-grid">
          {modules.map((item) => (
            <article className="lecturer-card" key={item.id}>
              <span className="lecturer-card-code">{item.code || "MODULE"}</span>
              <h3>{item.name || "Untitled module"}</h3>
              <p>{item.description || "No description provided."}</p>
              <small>{item.studentIds?.length || 0} enrolled students</small>
            </article>
          ))}
          {!modules.length && !loading && (
            <div className="lecturer-empty-state lecturer-empty-state-compact">
              <BookOpen size={28} />
              <h3>No modules yet</h3>
              <p>Use the Create module form above to add your first module. It will then become available in your timetable, attendance and learning-material sections.</p>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderTimetable() {
    if (!modules.length) {
      return (
        <div className="lecturer-empty-state">
          <BookOpen size={34} />
          <h2>Create your first module</h2>
          <p>You need at least one module before you can create its timetable.</p>
          <button type="button" onClick={() => setSection("modules")}>Go to module management</button>
        </div>
      );
    }

    return (
      <>
        <form className="lecturer-form" onSubmit={(event) => {
          event.preventDefault();
          submitAction(() => api.createAcademicTimetable(timetableForm),
            "Timetable entry created.");
        }}>
          <h3>Add timetable entry</h3>
          <div className="lecturer-form-grid">
            <label>Module
              <select required value={timetableForm.moduleId}
                onChange={(e) => setTimetableForm({ ...timetableForm, moduleId: e.target.value })}>
                <option value="">Select module</option>
                {modules.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
              </select>
            </label>
            <label>Class title
              <input required value={timetableForm.title}
                onChange={(e) => setTimetableForm({ ...timetableForm, title: e.target.value })} />
            </label>
            <label>Date
              <input type="date" required value={timetableForm.date}
                onChange={(e) => setTimetableForm({ ...timetableForm, date: e.target.value })} />
            </label>
            <label>Venue
              <input required value={timetableForm.venue}
                onChange={(e) => setTimetableForm({ ...timetableForm, venue: e.target.value })} />
            </label>
            <label>Start time
              <input type="time" required value={timetableForm.startTime}
                onChange={(e) => setTimetableForm({ ...timetableForm, startTime: e.target.value })} />
            </label>
            <label>End time
              <input type="time" required value={timetableForm.endTime}
                onChange={(e) => setTimetableForm({ ...timetableForm, endTime: e.target.value })} />
            </label>
          </div>
          <button disabled={saving || !modules.length}>Add timetable entry</button>
        </form>
        <div className="lecturer-list">
          {timetable.map((item) => (
            <article className="lecturer-list-row" key={item.id}>
              <div><strong>{item.title || moduleName(item.moduleId)}</strong>
                <p>{moduleName(item.moduleId)} · {item.date} · {item.startTime}–{item.endTime}</p>
              </div>
              <span>{item.venue || "Venue not set"}</span>
            </article>
          ))}
          {!timetable.length && <p className="lecturer-empty">No timetable entries found.</p>}
        </div>
      </>
    );
  }

  function renderClasses() {
    return (
      <div className="lecturer-card-grid">
        {modules.map((item) => (
          <article className="lecturer-card" key={item.id}>
            <span className="lecturer-card-code">{item.code || "MODULE"}</span>
            <h3>{item.name}</h3>
            <p>{item.description || "No class description provided."}</p>
            <strong>{item.studentIds?.length || 0} enrolled students</strong>
          </article>
        ))}
        {!modules.length && <p className="lecturer-empty">No classes are available for your assigned modules.</p>}
      </div>
    );
  }

  function renderAttendance() {
    if (!modules.length) {
      return (
        <div className="lecturer-empty-state">
          <BookOpen size={34} />
          <h2>No modules available</h2>
          <p>Create a module first, then add a timetable session before recording attendance.</p>
          <button type="button" onClick={() => setSection("modules")}>Create a module</button>
        </div>
      );
    }

    if (!timetable.length) {
      return (
        <div className="lecturer-empty-state">
          <CalendarDays size={34} />
          <h2>No class sessions available</h2>
          <p>Create a timetable entry for one of your modules before recording attendance.</p>
          <button type="button" onClick={() => setSection("timetable")}>Create a timetable entry</button>
        </div>
      );
    }

    return (
      <>
        <form className="lecturer-form" onSubmit={(event) => {
          event.preventDefault();
          submitAction(() => api.recordAcademicAttendance(attendanceForm),
            "Attendance recorded.");
        }}>
          <h3>Record attendance</h3>
          <div className="lecturer-form-grid">
            <label>Class session
              <select required value={attendanceForm.timetableId}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, timetableId: e.target.value })}>
                <option value="">Select class</option>
                {timetable.map((item) => <option key={item.id} value={item.id}>
                  {item.title || moduleName(item.moduleId)} — {item.date}
                </option>)}
              </select>
            </label>
            <label>Student ID
              <input required value={attendanceForm.studentId}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, studentId: e.target.value })} />
            </label>
            <label>Attendance status
              <select value={attendanceForm.status}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                {["present", "absent", "late", "excused"].map((status) =>
                  <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <button disabled={saving || !timetable.length}>Record attendance</button>
        </form>
        <div className="lecturer-list">
          {attendance.map((item) => (
            <article className="lecturer-list-row" key={item.id}>
              <div><strong>{item.studentId}</strong>
                <p>{moduleName(item.moduleId)} · {item.date || "Date not set"}</p>
              </div>
              <span className={`lecturer-status ${item.status}`}>{item.status}</span>
            </article>
          ))}
          {!attendance.length && <p className="lecturer-empty">No attendance records found.</p>}
        </div>
      </>
    );
  }

  function renderMaterials() {
    if (!modules.length) {
      return (
        <div className="lecturer-empty-state">
          <BookOpen size={34} />
          <h2>Create a module first</h2>
          <p>Learning materials must be associated with one of your modules.</p>
          <button type="button" onClick={() => setSection("modules")}>Go to module management</button>
        </div>
      );
    }

    return (
      <>
        <form className="lecturer-form" onSubmit={(event) => {
          event.preventDefault();
          submitAction(() => api.createAcademicMaterial(materialForm),
            "Learning material metadata saved.");
        }}>
          <h3>Add learning material</h3>
          <p className="lecturer-form-note">
            This form saves material details. Actual file uploading is not connected yet.
          </p>
          <div className="lecturer-form-grid">
            <label>Module
              <select required value={materialForm.moduleId}
                onChange={(e) => setMaterialForm({ ...materialForm, moduleId: e.target.value })}>
                <option value="">Select module</option>
                {modules.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
              </select>
            </label>
            <label>Material title
              <input required value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} />
            </label>
            <label>File name
              <input value={materialForm.fileName}
                onChange={(e) => setMaterialForm({ ...materialForm, fileName: e.target.value })} />
            </label>
            <label>Content type
              <input placeholder="e.g. application/pdf" value={materialForm.contentType}
                onChange={(e) => setMaterialForm({ ...materialForm, contentType: e.target.value })} />
            </label>
          </div>
          <label>Description
            <textarea value={materialForm.description}
              onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} />
          </label>
          <label>Storage path
            <input value={materialForm.storagePath}
              onChange={(e) => setMaterialForm({ ...materialForm, storagePath: e.target.value })} />
          </label>
          <button disabled={saving || !modules.length}>Save material details</button>
        </form>
        <div className="lecturer-list">
          {materials.map((item) => (
            <article className="lecturer-list-row" key={item.id}>
              <div><strong>{item.title}</strong>
                <p>{moduleName(item.moduleId)} · {item.fileName || "No file name"}</p>
                <small>{item.published ? "Published" : "Draft"}</small>
              </div>
              {!item.published && (
                <button disabled={saving}
                  onClick={() => submitAction(
                    () => api.publishAcademicMaterial(item.id, true),
                    "Material published."
                  )}>Publish</button>
              )}
            </article>
          ))}
          {!materials.length && <p className="lecturer-empty">No learning materials found.</p>}
        </div>
      </>
    );
  }

  function renderSupport() {
    return (
      <div className="lecturer-list">
        {requests.map((item) => (
          <article className="lecturer-list-row" key={item.id}>
            <div><strong>{item.type || "Student assistance request"}</strong>
              <p>{item.detail || "No additional details supplied."}</p>
              <small>Student: {item.student || item.studentId || "Not supplied"} · Status: {item.status || "unknown"}</small>
            </div>
          </article>
        ))}
        {!requests.length && <p className="lecturer-empty">No student support requests found.</p>}
        {onRefreshRequests && <button onClick={onRefreshRequests}>Refresh support requests</button>}
      </div>
    );
  }

  function renderAnnouncements() {
    return (
      <div className="lecturer-placeholder">
        <Megaphone size={30} />
        <h3>Announcements are not connected yet</h3>
        <p>The current backend does not have an announcements endpoint. No announcements are being fabricated.</p>
      </div>
    );
  }

  const sectionContent = {
    modules: renderModules,
    timetable: renderTimetable,
    classes: renderClasses,
    attendance: renderAttendance,
    materials: renderMaterials,
    support: renderSupport,
    announcements: renderAnnouncements,
  };

  const activeSection = sections.find((item) => item.id === section);

  return (
    <div className="lecturer-shell">
      <aside className="lecturer-sidebar">
        <div className="lecturer-brand">
          <span>UA</span>
          <div><strong>UniAble</strong><small>Lecturer workspace</small></div>
        </div>
        <nav aria-label="Lecturer dashboard navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? "active" : ""}
              onClick={() => setSection(id)}>
              <Icon size={18} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="lecturer-sidebar-bottom">
          <button onClick={loadAcademicData} disabled={loading}>
            <RefreshCw size={17} /> Refresh academic data
          </button>
        </div>
      </aside>

      <main className="lecturer-main">
        <header className="lecturer-header">
          <div><p>UNIABLE STAFF SERVICES</p><h1>{activeSection?.label || "Lecturer dashboard"}</h1></div>
          <div className="lecturer-header-actions">
            <span>Lecturer</span>
            <button
              type="button"
              className="lecturer-logout-button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  sessionStorage.setItem("uniableStaffLogout", "1");
                  navigate("/staff", { replace: true });
                } catch (err) {
                  setError(err.message || "Could not log out. Please try again.");
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut size={16} />
              {loggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>
        </header>

        {error && <div className="lecturer-message error" role="alert">{error}</div>}
        {notice && <div className="lecturer-message success" role="status">{notice}</div>}
        {loading && <p role="status">Loading academic data...</p>}

        {!loading && !error && (
          <section className="lecturer-content">
            {sectionContent[section]?.()}
          </section>
        )}
      </main>
    </div>
  );
}
