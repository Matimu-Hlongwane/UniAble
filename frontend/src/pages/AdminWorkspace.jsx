import React, { useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, Plus, Download, CheckCircle2, XCircle,
  Clock3, FileText, ExternalLink, Building2,
  AlertCircle, Save, ShieldCheck
} from "lucide-react";
import { api } from "../services/api";
import "./AdminWorkspace.css";

function Message({ error, success }) {
  if (!error && !success) return null;

  return (
    <div className={`aw-message ${error ? "aw-error" : "aw-success"}`} role="status">
      {error || success}
    </div>
  );
}

function Empty({ children }) {
  return <div className="aw-empty">{children}</div>;
}

function Loading() {
  return <div className="aw-empty">Loading records from UniAble...</div>;
}

function Table({ headers, children }) {
  return (
    <div className="aw-table-wrap">
      <table className="aw-table">
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder = "Search records..." }) {
  return (
    <label className="aw-search">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function DownloadReports({ onError }) {
  const [downloading, setDownloading] = useState("");

  async function download(type) {
    try {
      setDownloading(type);
      const blob = await api.downloadAdminReport(type);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `uniable-${type}-report.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error.message);
    } finally {
      setDownloading("");
    }
  }

  return (
    <div className="aw-report-grid">
      {[
        ["users", "All user accounts", "Student and staff account records"],
        ["staff", "Staff directory", "Registered non-student accounts"],
        ["applications", "Accessibility applications", "Application status and document counts"],
        ["activity", "Service activity", "Peer assistance requests and SOS activity"],
      ].map(([type, title, description]) => (
        <article className="aw-report-card" key={type}>
          <FileText size={23} />
          <div><strong>{title}</strong><span>{description}</span></div>
          <button className="aw-button" disabled={!!downloading} onClick={() => download(type)}>
            <Download size={15} />
            {downloading === type ? "Preparing..." : "Download CSV"}
          </button>
        </article>
      ))}
    </div>
  );
}

function UsersWorkspace({ search, onError }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      onError("");
      const result = await api.getAdminUsers({ role, status, search });
      setUsers(result.users || []);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [role, status, search]);

  async function changeAccess(user) {
    const action = user.isActive ? "disable" : "enable";
    if (!window.confirm(`Are you sure you want to ${action} ${user.displayName || user.email || "this account"}?`)) return;

    try {
      setBusy(user.uid);
      setMessage("");
      await api.setAdminUserAccess(user.uid, !user.isActive);
      setMessage(`Account ${action}d successfully.`);
      await load();
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="aw-panel">
      <div className="aw-toolbar">
        <div>
          <h2>User accounts</h2>
          <p>Search registered accounts and manage platform access.</p>
        </div>
        <button className="aw-button aw-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="aw-filters">
        <SearchBox value={search} onChange={() => {}} placeholder="Use the dashboard search above..." />
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="admin">Admin</option>
          <option value="lecturer">Lecturer</option>
          <option value="volunteer">Volunteer</option>
          <option value="disability_office">Disability office</option>
          <option value="security">Security</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All account statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <Message success={message} />
      {loading ? <Loading /> : users.length === 0 ? (
        <Empty>No user accounts match these filters.</Empty>
      ) : (
        <Table headers={["Name", "Email", "Role", "Status", "Email verified", "Action"]}>
          {users.map((user) => (
            <tr key={user.uid}>
              <td><strong>{user.displayName || "Unnamed user"}</strong><small>{user.uid}</small></td>
              <td>{user.email || "Not available"}</td>
              <td><span className="aw-role">{user.role.replaceAll("_", " ")}</span></td>
              <td><span className={`aw-status ${user.isActive ? "active" : "disabled"}`}>{user.isActive ? "Active" : "Disabled"}</span></td>
              <td>{user.emailVerified ? "Yes" : "No"}</td>
              <td>
                <button className={`aw-button ${user.isActive ? "aw-danger" : "aw-secondary"}`} disabled={busy === user.uid} onClick={() => changeAccess(user)}>
                  {busy === user.uid ? "Updating..." : user.isActive ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

function DepartmentsWorkspace({ search, onError }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const result = await api.getAdminDepartments();
      setDepartments(result.departments || []);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => departments.filter((item) =>
    `${item.name || ""} ${item.description || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [departments, search]);

  async function create(event) {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      setBusy(true);
      setMessage("");
      await api.createAdminDepartment({ name: name.trim(), description: description.trim() });
      setName("");
      setDescription("");
      setMessage("Department created successfully.");
      await load();
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    try {
      await api.updateAdminDepartment(item.id, { isActive: item.isActive === false });
      setMessage("Department status updated.");
      await load();
    } catch (error) {
      onError(error.message);
    }
  }

  async function assignStaff(item) {
    const current = (item.staffIds || []).join(", ");
    const answer = window.prompt("Enter staff user IDs separated by commas. Leave blank to remove all assignments.", current);
    if (answer === null) return;

    const staffIds = answer.split(",").map((value) => value.trim()).filter(Boolean);

    try {
      await api.updateAdminDepartment(item.id, { staffIds });
      setMessage("Department staff assignments updated.");
      await load();
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <section className="aw-panel">
      <div className="aw-toolbar">
        <div><h2>Institutional departments</h2><p>Create departments, manage status and assign registered staff by user ID.</p></div>
        <button className="aw-button aw-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>

      <form className="aw-create-form" onSubmit={create}>
        <label>Department name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required placeholder="e.g. Disability Support Office" /></label>
        <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Department responsibilities" /></label>
        <button className="aw-button" disabled={busy}><Plus size={16} /> {busy ? "Creating..." : "Add department"}</button>
      </form>

      <Message success={message} />
      {loading ? <Loading /> : filtered.length === 0 ? <Empty>No departments found. Add a department above to get started.</Empty> : (
        <div className="aw-card-list">
          {filtered.map((item) => (
            <article className="aw-department-card" key={item.id}>
              <div className="aw-round-icon"><Building2 size={20} /></div>
              <div className="aw-grow">
                <strong>{item.name}</strong>
                <p>{item.description || "No description provided."}</p>
                <small>{(item.staffIds || []).length} assigned staff member(s)</small>
              </div>
              <span className={`aw-status ${item.isActive === false ? "disabled" : "active"}`}>{item.isActive === false ? "Inactive" : "Active"}</span>
              <button className="aw-button aw-secondary" onClick={() => assignStaff(item)}>Assign staff</button>
              <button className="aw-button aw-secondary" onClick={() => toggle(item)}>{item.isActive === false ? "Activate" : "Deactivate"}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ApprovalsWorkspace({ search, onError }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const result = await api.getAccessibilityApplications();
      setApplications(result.applications || []);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => applications.filter((item) =>
    `${item.studentName || ""} ${item.studentEmail || ""} ${item.accessibility || ""} ${item.status || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [applications, search]);

  async function review(item, status) {
    const label = status.replaceAll("_", " ");
    if (!window.confirm(`Confirm that this application should be marked "${label}"?`)) return;

    try {
      setBusy(item.id);
      setMessage("");
      await api.reviewAccessibilityApplication(item.id, status, notes[item.id] || "");
      setMessage(`Application ${label}.`);
      await load();
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy("");
    }
  }

  async function openDocument(item, index) {
    try {
      const result = await api.getAccessibilityDocumentLink(item.id, index);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <section className="aw-panel">
      <div className="aw-toolbar">
        <div><h2>Student accessibility applications</h2><p>Review student submissions and securely open their supporting documents.</p></div>
        <button className="aw-button aw-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      <Message success={message} />
      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty><ClipboardCheckIcon />No student accessibility applications have been submitted yet.</Empty>
      ) : (
        <div className="aw-application-list">
          {filtered.map((item) => (
            <article className="aw-application-card" key={item.id}>
              <div className="aw-application-head">
                <div><strong>{item.studentName || "Student"}</strong><span>{item.studentEmail || item.studentId}</span></div>
                <span className={`aw-status ${item.status === "approved" ? "active" : item.status === "rejected" ? "disabled" : "pending"}`}>{(item.status || "pending").replaceAll("_", " ")}</span>
              </div>
              <div className="aw-application-meta">
                <span><b>Support category:</b> {item.accessibility}</span>
                <span><b>Submitted:</b> {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Not recorded"}</span>
              </div>
              {item.description && <p className="aw-description">{item.description}</p>}
              <div className="aw-documents">
                <strong>Supporting documents ({(item.documents || []).length})</strong>
                {(item.documents || []).length === 0 ? <span>No documents attached.</span> : item.documents.map((doc, index) => (
                  <button className="aw-document" key={`${doc.storagePath}-${index}`} onClick={() => openDocument(item, index)}>
                    <FileText size={16} />{doc.fileName || `Document ${index + 1}`}<ExternalLink size={14} />
                  </button>
                ))}
              </div>
              <label className="aw-note">Review note
                <textarea value={notes[item.id] ?? item.reviewNote ?? ""} onChange={(event) => setNotes((old) => ({ ...old, [item.id]: event.target.value }))} rows={2} maxLength={2000} placeholder="Add a note for the student..." />
              </label>
              <div className="aw-actions">
                <button className="aw-button" disabled={busy === item.id} onClick={() => review(item, "approved")}><CheckCircle2 size={15} /> Approve</button>
                <button className="aw-button aw-secondary" disabled={busy === item.id} onClick={() => review(item, "needs_information")}><Clock3 size={15} /> Request information</button>
                <button className="aw-button aw-danger" disabled={busy === item.id} onClick={() => review(item, "rejected")}><XCircle size={15} /> Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ClipboardCheckIcon() {
  return <ClipboardIcon />;
}

function ClipboardIcon() {
  return <ShieldCheck size={24} />;
}

function MiniBars({ title, data, labelKey, valueKey }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey]) || 0));

  return (
    <article className="aw-chart-card">
      <h3>{title}</h3>
      {data.length === 0 ? <Empty>No data available yet.</Empty> : (
        <div className="aw-bars">
          {data.map((item, index) => {
            const value = Number(item[valueKey]) || 0;
            return (
              <div className="aw-bar-column" key={`${item[labelKey]}-${index}`}>
                <strong>{value}</strong>
                <div className="aw-bar-track"><div className="aw-bar-fill" style={{ height: `${Math.max(3, (value / max) * 100)}%` }} /></div>
                <span>{item[labelKey]}</span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function AnalyticsWorkspace({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const result = await api.getAdminAnalytics();
      setData(result);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Loading />;
  if (!data) return <Empty>Analytics could not be loaded.</Empty>;

  const totals = data.totals || {};
  const cards = [
    ["Total users", totals.users], ["Students", totals.students],
    ["Staff", totals.staff], ["Peer requests", totals.requests],
    ["SOS alerts", totals.sosAlerts], ["Accessibility applications", totals.applications],
  ];

  return (
    <>
      <div className="aw-toolbar"><div><h2>Platform analytics</h2><p>Live summaries calculated from UniAble records.</p></div><button className="aw-button aw-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button></div>
      <div className="aw-metric-grid">
        {cards.map(([label, value]) => <article className="aw-metric" key={label}><span>{label}</span><strong>{value ?? 0}</strong></article>)}
      </div>
      <div className="aw-chart-grid">
        <MiniBars title="New users and peer requests — six months" data={(data.monthly || []).map((item) => ({ ...item, label: item.month, value: item.users }))} labelKey="label" valueKey="value" />
        <MiniBars title="Accessibility applications by status" data={(data.applicationsByStatus || []).map((item) => ({ ...item, label: item.status.replaceAll("_", " "), value: item.count }))} labelKey="label" valueKey="value" />
        <MiniBars title="Accessibility categories" data={(data.accessibility || []).map((item) => ({ ...item, label: item.category, value: item.count }))} labelKey="label" valueKey="value" />
        <MiniBars title="Peer requests by month" data={(data.monthly || []).map((item) => ({ ...item, label: item.month, value: item.requests }))} labelKey="label" valueKey="value" />
      </div>
      <DownloadReports onError={onError} />
    </>
  );
}

function SettingsWorkspace({ onError }) {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowStudentRegistration: true,
    allowVolunteerRegistration: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getAdminSettings()
      .then((result) => setSettings((old) => ({ ...old, ...(result.settings || {}) })))
      .catch((error) => onError(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      const result = await api.updateAdminSettings({
        maintenanceMode: settings.maintenanceMode,
        allowStudentRegistration: settings.allowStudentRegistration,
        allowVolunteerRegistration: settings.allowVolunteerRegistration,
      });
      setSettings((old) => ({ ...old, ...(result.settings || {}) }));
      setMessage("System settings saved.");
    } catch (error) {
      onError(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  const options = [
    ["maintenanceMode", "Maintenance mode", "Flag the platform as under maintenance."],
    ["allowStudentRegistration", "Student registration", "Allow new student accounts to register."],
    ["allowVolunteerRegistration", "Volunteer registration", "Allow new volunteer registrations."],
  ];

  return (
    <section className="aw-panel">
      <div className="aw-toolbar"><div><h2>System configuration</h2><p>Manage the platform-wide settings stored in Firestore.</p></div></div>
      <div className="aw-settings-list">
        {options.map(([key, title, description]) => (
          <label className="aw-setting" key={key}>
            <div><strong>{title}</strong><span>{description}</span></div>
            <input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => setSettings((old) => ({ ...old, [key]: event.target.checked }))} />
          </label>
        ))}
      </div>
      <Message success={message} />
      <button className="aw-button" onClick={save} disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save settings"}</button>
      <p className="aw-hint"><AlertCircle size={15} /> These settings are saved centrally. Other registration and application flows must read them to enforce the selected restrictions.</p>
    </section>
  );
}

function AuditWorkspace({ search, onError }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const result = await api.getAdminAuditLogs(200);
      setLogs(result.logs || []);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter((item) =>
    `${item.actorEmail || ""} ${item.actorId || ""} ${item.action || ""} ${item.targetType || ""} ${item.targetId || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="aw-panel">
      <div className="aw-toolbar"><div><h2>Administrative audit trail</h2><p>Recent actions recorded by the secured Admin API.</p></div><button className="aw-button aw-secondary" onClick={load}><RefreshCw size={15} /> Refresh</button></div>
      {loading ? <Loading /> : filtered.length === 0 ? <Empty>No audit entries match your search.</Empty> : (
        <Table headers={["Date and time", "Administrator", "Action", "Target", "Record ID"]}>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Not recorded"}</td>
              <td>{item.actorEmail || item.actorId || "System"}</td>
              <td>{String(item.action || "").replaceAll("_", " ")}</td>
              <td>{item.targetType || "—"}</td>
              <td><small>{item.targetId || "—"}</small></td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

export default function AdminWorkspace({ section, search = "", onError = () => {} }) {
  if (section === "users") return <UsersWorkspace search={search} onError={onError} />;
  if (section === "departments") return <DepartmentsWorkspace search={search} onError={onError} />;
  if (section === "approvals") return <ApprovalsWorkspace search={search} onError={onError} />;
  if (section === "analytics") return <AnalyticsWorkspace onError={onError} />;
  if (section === "settings") return <SettingsWorkspace onError={onError} />;
  if (section === "audit") return <AuditWorkspace search={search} onError={onError} />;

  return <Empty>Select an administration section.</Empty>;
}
