import React from "react";
import { useParams } from "react-router-dom";
export default function RoleDashboard() {
  const {role} = useParams();
  const titles = {admin:"Administrator", lecturer:"Lecturer", disability:"Disability Office", security:"Campus Security", volunteer:"Volunteer"};
  return <section className="page"><p className="eyebrow">Role dashboard</p><h1>{titles[role] || role}</h1><p className="muted">This route is ready for the team's role-specific module.</p><div className="panel"><h2>Integration point</h2><p>Connect this dashboard to Firestore, authentication and role-based permissions when the shared backend is configured.</p></div></section>
}
