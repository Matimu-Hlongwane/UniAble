import React, { useEffect, useState } from "react";
import { api } from "../services/api";

function PanelTable({ columns, rows, empty }) {
  return rows.length ? (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderBottom: "1px solid var(--border, #ddd)",
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    padding: 10,
                    borderBottom: "1px solid var(--border, #eee)",
                  }}
                >
                  {cell ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p>{empty}</p>
  );
}

function label(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function AdminWorkspacePanel({ section, search = "" }) {
  const [data, setData] = useState({
    users: [],
    departments: [],
    applications: [],
    settings: {},
    audit: [],
    analytics: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAdminData() {
      setLoading(true);
      setError("");

      try {
        const [
          usersResult,
          departmentsResult,
          applicationsResult,
          settingsResult,
          auditResult,
          analyticsResult,
        ] = await Promise.all([
          api.getAdminUsers(),
          api.getAdminDepartments(),
          api.getAccessibilityApplications(),
          api.getAdminSettings(),
          api.getAdminAuditLogs(100),
          api.getAdminAnalytics(),
        ]);

        if (!mounted) return;

        setData({
          users: usersResult.users || [],
          departments: departmentsResult.departments || [],
          applications: applicationsResult.applications || [],
          settings: settingsResult.settings || {},
          audit: auditResult.logs || [],
          analytics: analyticsResult || {},
        });
      } catch (err) {
        if (mounted) {
          setError(
            err.message || "Could not load administrator records."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAdminData();

    return () => {
      mounted = false;
    };
  }, []);

  const query = search.trim().toLowerCase();

  const filter = (rows) =>
    rows.filter(
      (row) =>
        !query ||
        JSON.stringify(row).toLowerCase().includes(query)
    );

  const users = filter(data.users);
  const departments = filter(data.departments);
  const applications = filter(data.applications);
  const audit = filter(data.audit);

  if (loading) {
    return (
      <section className="admin-panel">
        <p role="status">Loading secure administrator records…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-panel" role="alert">
        <strong>Administrator records unavailable</strong>
        <p>{error}</p>
      </section>
    );
  }

  if (section === "users") {
    return (
      <section className="admin-panel">
        <h2>User management</h2>
        <p>
          Account information retrieved through the protected
          administrator API. Account access changes are handled by
          the server.
        </p>
        <PanelTable
          columns={["Name", "Email", "Role", "Status", "Email verified"]}
          rows={users.map((user) => ({
            id: user.uid,
            cells: [
              label(user.displayName),
              label(user.email),
              label(user.role),
              user.isActive ? "Active" : "Disabled",
              user.emailVerified ? "Yes" : "No",
            ],
          }))}
          empty="No user records match this search."
        />
      </section>
    );
  }

  if (section === "departments") {
    return (
      <section className="admin-panel">
        <h2>Departments</h2>
        <p>
          Department records retrieved from the shared UniAble
          database.
        </p>
        <PanelTable
          columns={["Department", "Description", "Assigned staff", "Status"]}
          rows={departments.map((department) => ({
            id: department.id,
            cells: [
              label(department.name),
              label(department.description),
              Array.isArray(department.staffIds)
                ? department.staffIds.length
                : 0,
              department.isActive === false ? "Inactive" : "Active",
            ],
          }))}
          empty="No departments have been added."
        />
      </section>
    );
  }

  if (section === "approvals") {
    return (
      <section className="admin-panel">
        <h2>Accessibility applications</h2>
        <p>
          Student accessibility support applications retrieved
          through the protected administrator API.
        </p>
        <PanelTable
          columns={[
            "Application",
            "Student",
            "Email",
            "Submitted",
            "Status",
            "Description",
          ]}
          rows={applications.map((application) => ({
            id: application.id,
            cells: [
              label(application.accessibility),
              label(application.studentName),
              label(application.studentEmail),
              label(application.createdAt),
              label(application.status),
              label(application.description),
            ],
          }))}
          empty="There are no accessibility applications."
        />
      </section>
    );
  }

  if (section === "analytics") {
    const totals = data.analytics.totals || {};

    return (
      <section className="admin-panel">
        <h2>Analytics and reports</h2>
        <p>
          Aggregate platform statistics retrieved from the
          administrator API.
        </p>
        <PanelTable
          columns={["Metric", "Total"]}
          rows={Object.entries(totals).map(([name, value]) => ({
            id: name,
            cells: [
              name.replace(/([A-Z])/g, " $1").replace(/^./, (char) =>
                char.toUpperCase()
              ),
              label(value),
            ],
          }))}
          empty="No platform analytics are available."
        />

        <h3>Monthly activity</h3>
        <PanelTable
          columns={["Month", "New users", "Assistance requests"]}
          rows={(data.analytics.monthly || []).map((item) => ({
            id: item.month,
            cells: [
              label(item.month),
              label(item.users),
              label(item.requests),
            ],
          }))}
          empty="No monthly activity is available."
        />
      </section>
    );
  }

  if (section === "settings") {
    const settingLabels = {
      maintenanceMode: "Maintenance mode",
      allowStudentRegistration: "Student registration",
      allowVolunteerRegistration: "Volunteer registration",
      updatedAt: "Last updated",
    };

    const settings = Object.entries(data.settings)
      .filter(([key]) => Object.hasOwn(settingLabels, key));

    return (
      <section className="admin-panel">
        <h2>System settings</h2>
        <p>
          Current system configuration retrieved securely from
          the backend. These values are displayed here; editing
          remains subject to the server&apos;s supported settings.
        </p>
        <PanelTable
          columns={["Setting", "Value"]}
          rows={settings.map(([key, value]) => ({
            id: key,
            cells: [
              settingLabels[key],
              typeof value === "boolean"
                ? value
                  ? "Enabled"
                  : "Disabled"
                : label(value),
            ],
          }))}
          empty="No system settings are available."
        />
      </section>
    );
  }

  if (section === "audit") {
    return (
      <section className="admin-panel">
        <h2>Audit logs</h2>
        <p>
          Read-only administrative activity records. Sensitive
          supporting-document contents are not displayed here.
        </p>
        <PanelTable
          columns={["When", "Actor", "Action", "Target", "Outcome"]}
          rows={audit.map((item) => ({
            id: item.id,
            cells: [
              label(item.createdAt),
              label(item.actorEmail || item.actorId),
              label(item.action),
              label(
                [item.targetType, item.targetId]
                  .filter(Boolean)
                  .join(": ")
              ),
              "Recorded",
            ],
          }))}
          empty="No audit entries are available."
        />
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <h2>Administration</h2>
      <p>Select an administration module.</p>
    </section>
  );
}

