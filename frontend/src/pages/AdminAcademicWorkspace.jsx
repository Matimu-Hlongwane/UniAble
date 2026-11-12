import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { uploadAcademicMaterialFile } from "../services/firebaseAuth";
import { RICHFIELD_QUALIFICATIONS, getQualificationLabel } from "../data/qualifications";

export default function AdminAcademicWorkspace() {
  const [modules, setModules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [moduleForm, setModuleForm] = useState({ code: "", name: "", description: "", qualification: "", lecturerId: "" });
  const [materialForm, setMaterialForm] = useState({ moduleId: "", title: "", description: "", file: null });
  const [qualificationAssignments, setQualificationAssignments] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, staffResult] = await Promise.all([
        api.getAcademicModules(),
        api.getStaff().catch(() => ({ staff: [] })),
      ]);
      setModules(Array.isArray(result) ? result : result?.modules || []);
      const staff = Array.isArray(staffResult?.staff) ? staffResult.staff : [];
      setLecturers(staff.filter((person) => String(person.role || "").toLowerCase() === "lecturer"));
    } catch (err) {
      setError(err.message || "Could not load the qualification module catalogue.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createModule(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await api.createAcademicModule({ ...moduleForm, studentIds: [] });
      setModuleForm({ code: "", name: "", description: "", qualification: "", lecturerId: "" });
      setNotice("Module added to the selected qualification.");
      await load();
    } catch (err) { setError(err.message || "Could not create module."); }
    finally { setSaving(false); }
  }

  async function assignQualification(moduleId) {
    const qualification = qualificationAssignments[moduleId];
    if (!qualification) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await api.updateAcademicModule(moduleId, { qualification });
      setNotice("Module qualification updated. Students in that programme can now see this module.");
      await load();
    } catch (err) { setError(err.message || "Could not update module qualification."); }
    finally { setSaving(false); }
  }

  async function uploadMaterial(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true); setError(""); setNotice("");
    try {
      if (!materialForm.file) throw new Error("Choose a study material file first.");
      const uploaded = await uploadAcademicMaterialFile(materialForm.file, materialForm.moduleId);
      const created = await api.createAcademicMaterial({
        moduleId: materialForm.moduleId,
        title: materialForm.title,
        description: materialForm.description,
        fileName: uploaded.fileName,
        storagePath: uploaded.storagePath,
        contentType: uploaded.contentType,
      });
      const materialId = created?.material?.id || created?.id;
      if (materialId) await api.publishAcademicMaterial(materialId, true);
      setMaterialForm({ moduleId: "", title: "", description: "", file: null });
      formElement.reset();
      setNotice("Study material uploaded and published for the selected module.");
    } catch (err) { setError(err.message || "Could not upload study material."); }
    finally { setSaving(false); }
  }

  return (
    <section className="aw-panel">
      <div className="aw-panel-heading">
        <div><h2>Qualifications, modules and study materials</h2><p>Maintain the module catalogue and publish learning resources for each Richfield qualification.</p></div>
      </div>
      {error && <p className="aw-error" role="alert">{error}</p>}
      {notice && <p className="aw-notice" role="status">{notice}</p>}
      <form className="aw-form" onSubmit={createModule}>
        <h3>Add a module to a qualification</h3>
        <label>Qualification<select required value={moduleForm.qualification} onChange={(event) => setModuleForm({ ...moduleForm, qualification: event.target.value })}><option value="">Choose qualification</option>{RICHFIELD_QUALIFICATIONS.map((item) => <option key={item} value={item}>{getQualificationLabel(item)}</option>)}</select></label>
        <label>Assigned lecturer<select value={moduleForm.lecturerId} onChange={(event) => setModuleForm({ ...moduleForm, lecturerId: event.target.value })}><option value="">No lecturer assigned yet</option>{lecturers.map((person) => <option key={person.uid} value={person.uid}>{person.displayName || person.email}</option>)}</select></label>
        <label>Module code<input required value={moduleForm.code} onChange={(event) => setModuleForm({ ...moduleForm, code: event.target.value })} /></label>
        <label>Module name<input required value={moduleForm.name} onChange={(event) => setModuleForm({ ...moduleForm, name: event.target.value })} /></label>
        <label>Description<textarea value={moduleForm.description} onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })} /></label>
        <button type="submit" disabled={saving}>Add module</button>
      </form>
      <div className="aw-table-wrap"><table className="aw-table"><thead><tr><th>Qualification</th><th>Code</th><th>Module</th><th>Assign / update</th></tr></thead><tbody>{modules.map((item) => <tr key={item.id}><td>{getQualificationLabel(item.qualification) || "Not assigned"}</td><td>{item.code}</td><td>{item.name}</td><td><select aria-label={`Qualification for ${item.code}`} value={qualificationAssignments[item.id] ?? item.qualification ?? ""} onChange={(event) => setQualificationAssignments({ ...qualificationAssignments, [item.id]: event.target.value })}><option value="">Choose qualification</option>{RICHFIELD_QUALIFICATIONS.map((qualification) => <option key={qualification} value={qualification}>{getQualificationLabel(qualification)}</option>)}</select><button type="button" className="aw-button" disabled={saving || !(qualificationAssignments[item.id] ?? item.qualification)} onClick={() => assignQualification(item.id)}>Save</button></td></tr>)}</tbody></table>{!modules.length && !loading && <p>No modules have been added yet.</p>}{loading && <p>Loading module catalogue…</p>}</div>
      <form className="aw-form" onSubmit={uploadMaterial}>
        <h3>Upload and publish study material</h3>
        <p>Only upload materials Richfield has authorised UniAble to distribute. Private Moodle resources should remain in Moodle and be linked there instead.</p>
        <label>Qualification module<select required value={materialForm.moduleId} onChange={(event) => setMaterialForm({ ...materialForm, moduleId: event.target.value })}><option value="">Choose module</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.qualification} — {item.code} {item.name}</option>)}</select></label>
        <label>Material title<input required value={materialForm.title} onChange={(event) => setMaterialForm({ ...materialForm, title: event.target.value })} /></label>
        <label>Description<textarea value={materialForm.description} onChange={(event) => setMaterialForm({ ...materialForm, description: event.target.value })} /></label>
        <label>File<input required type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3" onChange={(event) => setMaterialForm({ ...materialForm, file: event.target.files?.[0] || null })} /></label>
        <button type="submit" disabled={saving || !modules.length}>Upload and publish</button>
      </form>
    </section>
  );
}
