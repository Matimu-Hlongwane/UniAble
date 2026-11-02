import { useState } from "react";
import DashboardShell from "../DashboardShell.jsx";
import { Notice } from "../ui.jsx";
import { useAdminState } from "../../services/adminStore.js";
import UsersPanel from "./UsersPanel.jsx";
import ApprovalsPanel from "./ApprovalsPanel.jsx";
import ConfigPanel from "./ConfigPanel.jsx";
import ReportsPanel from "./ReportsPanel.jsx";
import AuditPanel from "./AuditPanel.jsx";

export default function AdminDashboard() {
  const [active, setActive] = useState("users");
  const { approvals } = useAdminState();
  const pending = approvals.filter((a) => a.status === "pending").length;

  const nav = [
    { id: "users", label: "Accounts and roles", title: "Accounts and roles" },
    { id: "approvals", label: "Approvals", title: "Pending approvals", badge: pending || undefined },
    { id: "config", label: "Service configuration", title: "Service configuration" },
    { id: "reports", label: "Reports", title: "Controlled reports" },
    { id: "audit", label: "Audit trail", title: "Audit trail" },
  ];

  return (
    <DashboardShell nav={nav} active={active} onSelect={setActive}>
      <Notice>
        Administrators manage accounts, settings and oversight. This console cannot open student
        registrations, disability documents, incident locations or assistance requests.
      </Notice>
      {active === "users" && <UsersPanel />}
      {active === "approvals" && <ApprovalsPanel />}
      {active === "config" && <ConfigPanel />}
      {active === "reports" && <ReportsPanel />}
      {active === "audit" && <AuditPanel />}
    </DashboardShell>
  );
}
