import React from "react";
import { Phone, ShieldCheck } from "lucide-react";

const contactPhone = (import.meta.env.VITE_CAMPUS_SECURITY_PHONE || "").trim();
const dialablePhone = contactPhone.replace(/[^\d+]/g, "");
const phoneIsConfigured = /^\+?\d{7,15}$/.test(dialablePhone);

export default function CampusSecurityCall() {
  return (
    <section className="campus-security-call" aria-labelledby="campus-security-call-title">
      <div className="campus-security-call-copy">
        <span className="campus-security-call-icon" aria-hidden="true">
          <ShieldCheck size={21} />
        </span>
        <div>
          <h2 id="campus-security-call-title">Campus Security</h2>
          <p>
            {phoneIsConfigured
              ? "Contact Campus Security for emergency assistance."
              : "The university's official campus security number has not been configured."}
          </p>
        </div>
      </div>
      {phoneIsConfigured ? (
        <a className="campus-security-call-button" href={`tel:${dialablePhone}`}>
          <Phone size={17} aria-hidden="true" />
          Call Campus Security
        </a>
      ) : (
        <button className="campus-security-call-button" type="button" disabled>
          <Phone size={17} aria-hidden="true" />
          Number not configured
        </button>
      )}
    </section>
  );
}
