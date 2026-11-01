import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, UserPlus, RefreshCw, ShieldCheck, UserCog, Users,
  Mail, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { api } from "../services/api";
import "./StaffManagement.css";

const ROLE_OPTIONS = [
  { value: "lecturer", label: "Lecturer" },
  { value: "volunteer", label: "Volunteer" },
  { value: "disability_office", label: "Disability Office" },
  { value: "security", label: "Security" }
];

function roleLabel(role) {
  return ROLE_OPTIONS.find(item => item.value === role)?.label || role;
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("lecturer");
  const [submitting, setSubmitting] = useState(false);
  const [updatingUid, setUpdatingUid] = useState("");

  const loadStaff = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const result = await api.getStaff();
      setStaff(Array.isArray(result.staff) ? result.staff : []);
    } catch (err) {
      setError(err.message || "Unable to load staff accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();

    return staff.filter(person => {
      const matchesRole =
        roleFilter === "all" || person.role === roleFilter;

      const matchesSearch =
        !term ||
        person.email?.toLowerCase().includes(term) ||
        person.displayName?.toLowerCase().includes(term);

      return matchesRole && matchesSearch;
    });
  }, [staff, search, roleFilter]);

  async function handleProvision(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter the staff member's email address.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await api.provisionStaff(cleanEmail, newRole);

      setMessage(result.message || "Staff role assigned successfully.");
      setEmail("");

      await loadStaff(true);
    } catch (err) {
      setError(err.message || "Could not assign the staff role.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccessChange(person) {
    const nextStatus = !person.isActive;

    const confirmed = window.confirm(
      `${nextStatus ? "Enable" : "Disable"} access for ${person.email}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      setUpdatingUid(person.uid);

      const result = await api.setStaffAccess(person.uid, nextStatus);

      setMessage(result.message || "Staff access updated.");

      setStaff(current =>
        current.map(item =>
          item.uid === person.uid
            ? { ...item, isActive: nextStatus }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Could not update staff access.");
    } finally {
      setUpdatingUid("");
    }
  }

  return (
    <section className="staff-management">
      <div className="staff-management-summary">
        <article>
          <span>Total registered staff</span>
          <strong>{staff.length}</strong>
        </article>
        <article>
          <span>Active accounts</span>
          <strong>{staff.filter(person => person.isActive).length}</strong>
        </article>
        <article>
          <span>Disabled accounts</span>
          <strong>{staff.filter(person => !person.isActive).length}</strong>
        </article>
      </div>

      <section className="staff-management-panel">
        <div className="staff-panel-heading">
          <div>
            <span className="staff-eyebrow">ACCOUNT PROVISIONING</span>
            <h2><UserPlus size={21} /> Assign a staff role</h2>
            <p>
              Assign an authorised role to someone who already has a UniAble
              Firebase account.
            </p>
          </div>
        </div>

        <form className="staff-add-form" onSubmit={handleProvision}>
          <label>
            Staff email address
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="staff@university.ac.za"
              required
            />
          </label>

          <label>
            Assign role
            <select
              value={newRole}
              onChange={event => setNewRole(event.target.value)}
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={submitting}>
            <UserPlus size={17} />
            {submitting ? "Assigning..." : "Assign staff role"}
          </button>
        </form>

        <p className="staff-provision-note">
          <ShieldCheck size={16} />
          This operation does not create a login account. The email address
          must already be registered in Firebase Authentication.
        </p>
      </section>

      <section className="staff-management-panel">
        <div className="staff-directory-heading">
          <div>
            <span className="staff-eyebrow">UNIABLE PERSONNEL</span>
            <h2><UserCog size={21} /> Registered staff</h2>
            <p>View staff accounts and manage their platform access.</p>
          </div>

          <button
            type="button"
            className="staff-refresh-button"
            onClick={() => loadStaff(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="staff-directory-filters">
          <label className="staff-search">
            <Search size={17} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search name or email"
            />
          </label>

          <select
            aria-label="Filter staff by role"
            value={roleFilter}
            onChange={event => setRoleFilter(event.target.value)}
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="staff-feedback staff-feedback-error" role="alert">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        {message && (
          <div className="staff-feedback staff-feedback-success" role="status">
            <CheckCircle2 size={17} /> {message}
          </div>
        )}

        {loading ? (
          <div className="staff-empty">
            <RefreshCw size={22} />
            <span>Loading staff accounts...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="staff-empty">
            <Users size={25} />
            <strong>No staff accounts found</strong>
            <span>
              {staff.length === 0
                ? "Staff accounts assigned through the provisioning process will appear here."
                : "Try changing your search or role filter."}
            </span>
          </div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Role</th>
                  <th>Account access</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(person => (
                  <tr key={person.uid}>
                    <td>
                      <div className="staff-person">
                        <div className="staff-person-avatar">
                          {(person.displayName || person.email || "S")
                            .charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{person.displayName || "Staff member"}</strong>
                          <span><Mail size={13} /> {person.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="staff-role-label">
                        {roleLabel(person.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`staff-status ${person.isActive ? "active" : "inactive"}`}>
                        {person.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`staff-access-button ${person.isActive ? "disable" : "enable"}`}
                        onClick={() => handleAccessChange(person)}
                        disabled={updatingUid === person.uid}
                      >
                        {updatingUid === person.uid
                          ? "Updating..."
                          : person.isActive
                            ? "Disable access"
                            : "Enable access"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="staff-directory-footer">
          Showing {filteredStaff.length} of {staff.length} staff accounts
        </div>
      </section>
    </section>
  );
}
