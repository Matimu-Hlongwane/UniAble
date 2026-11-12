import React from "react";
import { Link } from "react-router-dom";
import { FileUp } from "lucide-react";
import AccessibilitySettings from "./AccessibilitySettings";

export default function AccessibilityHub() {
  return (
    <>
      <section className="page" style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px 0" }}>
        <Link to="/accessibility-application" className="dashboard-primary-button" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <FileUp size={17} /> Apply for accessibility support / upload documents
        </Link>
      </section>
      <AccessibilitySettings />
    </>
  );
}
