import { useState } from "react";
import DashboardShell from "./DashboardShell.jsx";
import { Badge, Notice, Panel, StatGrid, formatDateTime } from "./ui.jsx";
import { LECTURER_FEEDBACK, MATERIALS } from "../data/sampleData.js";

const NAV = [
  { id: "modules", label: "My modules", title: "My modules — edit later" },
  { id: "attendance", label: "Attendance", title: "Student attendance — present / not present" },
  { id: "materials", label: "Course materials", title: "Course materials & study guides" },
  { id: "feedback", label: "Accessibility feedback", title: `${LECTURER_FEEDBACK.module} — accessibility feedback` },
  { id: "materials", label: "Course materials", title: "Course materials" },
  { id: "announcements", label: "Announcements", title: "Announcements" },
];

export default function LecturerDashboard() {
  const [active, setActive] = useState("modules");
  return (
    <DashboardShell nav={NAV} active={active} onSelect={setActive}>
      {active === "modules" && <Modules />}
      {active === "attendance" && <Attendance />}
      {active === "feedback" && <Feedback />}
      {active === "materials" && <Materials />}
      {active === "announcements" && <Announcements />}
    </DashboardShell>
  );
}
function Modules() {
  const [modules, setModules] = useState([
    { id: "mod1", code: "CS101", name: "Intro to Computing", desc: "Year 1" },
    { id: "mod2", code: "CS201", name: "Data Structures", desc: "Year 2" },
  ]);
  const [editingId, setEditingId] = useState(null);

  function saveModule(id, newName) {
    setModules(m => m.map(x => x.id === id ? { ...x, name: newName } : x));
    setEditingId(null);
    // TODO: save to Firebase -> updateDoc(doc(db, "modules", id), { name: newName })
  }

  return (
    <Panel title="My modules — click Edit to change later" id="modules">
      <ul className="list">
        {modules.map(mod => (
          <li key={mod.id} className="list__item">
            {editingId === mod.id ? (
              <div className="field">
                <input defaultValue={mod.name} id={`edit-${mod.id}`} />
                <button className="btn btn--primary" onClick={() => saveModule(mod.id, document.getElementById(`edit-${mod.id}`).value)}>Save</button>
              </div>
            ) : (
              <>
                <strong>{mod.code} — {mod.name}</strong>
                <span className="muted">{mod.desc}</span>
                <button className="btn" onClick={() => setEditingId(mod.id)}>Edit module</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Attendance() {
  const [students, setStudents] = useState([
    { id: "s1", name: "Thabo M.", present: null },
    { id: "s2", name: "Aisha K.", present: null },
    { id: "s3", name: "John D.", present: null },
  ]);

  function mark(id, status) {
    setStudents(s => s.map(st => st.id === id ? { ...st, present: status } : st));
    // TODO: Firebase -> setDoc(doc(db, "attendance", `${id}_${new Date().toISOString().slice(0,10)}`), { present: status })
  }

  return (
    <Panel title="Attendance — click Present / Not present" subtitle="No typing needed, just click" id="attendance">
      <div className="table-wrap">
        <table className="dash-table">
          <thead><tr><th>Student</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.present === null ? <Badge tone="warning">Not marked</Badge> : s.present ? <Badge tone="success">Present</Badge> : <Badge tone="danger">Not present</Badge>}</td>
                <td>
                  <button className="btn btn--primary" onClick={() => mark(s.id, true)}>Present</button>{" "}
                  <button className="btn" onClick={() => mark(s.id, false)}>Not present</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function Feedback() {
  const { stats, suggestion, trend } = LECTURER_FEEDBACK;
  const max = 5;
  return (
    <>
      <Notice>
        Feedback is anonymous and aggregated. You see how the class rated accessibility, never which
        student said what.
      </Notice>
      <StatGrid items={stats.map((s) => ({ label: s.label, value: s.value }))} />

      <Panel title="AI improvement suggestions" subtitle="Sample text — generated from aggregated ratings." id="ai">
        <p>{suggestion}</p>
      </Panel>

      <Panel title="Ratings trend" subtitle="Average rating per lecture week (out of 5)" id="trend">
        <ol className="trend" aria-label="Weekly average rating">
          {trend.map((value, i) => (
            <li key={i} style={{ height: `${(value / max) * 100}%` }}>
              <span className="sr-only">Week {i + 1}: {value} out of 5</span>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}

function Materials() {
  const [items, setItems] = useState(MATERIALS);

  function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setItems((current) => [
      { id: `m-${Date.now()}`, name: file.name, formats: [], pending: true, views: 0 },
      ...current,
    ]);
    // TODO: const storageRef = ref(storage, `studyGuides/${file.name}`); await uploadBytes(storageRef, file); const url = await getDownloadURL(storageRef);
    event.target.value = "";
  }

  return (
    <Panel
      title="Uploaded materials"
      id="materials"
      subtitle="Demo: file names are listed but files aren’t uploaded anywhere yet."
      actions={
  <div style={{display:'flex', gap:8}}>
    <label className="btn btn--primary" style={{ cursor: "pointer" }}>
      Upload study guide (attachment)
      <input type="file" accept=".pdf,.docx" onChange={onFile} className="sr-only" />
    </label>
  </div>
}
    >
      <div className="table-wrap">
        <table className="dash-table">
          <caption className="sr-only">Uploaded materials and their accessible formats</caption>
          <thead>
            <tr><th scope="col">File</th><th scope="col">Accessible formats</th><th scope="col">Views</th></tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>
                  {m.formats.length > 0 && <Badge tone="success">{m.formats.join(" · ")}</Badge>}{" "}
                  {m.pending && <Badge tone="warning">Accessible versions pending</Badge>}
                </td>
                <td>{m.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Announcements() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState([]);

  function submit(event) {
    event.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSent((s) => [{ id: Date.now(), subject: subject.trim(), body: body.trim(), at: new Date().toISOString() }, ...s]);
    setSubject("");
    setBody("");
  }

  return (
    <>
      <Panel title="Message your class" subtitle="Send venue changes, reading lists and reminders." id="compose">
        <form onSubmit={submit} className="field" style={{ gap: 16 }}>
          <div className="field">
            <label htmlFor="ann-subject">Subject</label>
            <input id="ann-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ann-body">Message</label>
            <textarea id="ann-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div><button type="submit" className="btn btn--primary">Send to {LECTURER_FEEDBACK.module}</button></div>
        </form>
        <Notice tone="warning">Delivery to students needs push notifications (Firebase Cloud Messaging), which isn’t connected yet.</Notice>
      </Panel>

      {sent.length > 0 && (
        <Panel title="Sent this session" id="sent">
          <ul className="list">
            {sent.map((m) => (
              <li key={m.id} className="list__item">
                <strong>{m.subject}</strong>
                <span>{m.body}</span>
                <span className="muted">{formatDateTime(m.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
