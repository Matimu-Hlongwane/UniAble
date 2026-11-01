import React from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Building2,
  Users,
  ArrowRight,
} from "lucide-react";
import "./StaffLanding.css";

const departments = [
  {
    role: "Admin",
    description: "Manage staff accounts, platform access and university-wide settings.",
    icon: ShieldCheck,
    path: "/login?portal=admin",
  },
  {
    role: "Lecturer",
    description: "Support students, manage learning information and accessibility needs.",
    icon: GraduationCap,
    path: "/login?portal=lecturer",
  },
  {
    role: "Volunteer",
    description: "Coordinate peer support and assist students around campus.",
    icon: HeartHandshake,
    path: "/login?portal=volunteer",
  },
  {
    role: "Disability Office",
    description: "Manage accessibility requests, accommodations and student support.",
    icon: Accessibility,
    path: "/login?portal=disability_office",
  },
  {
    role: "Security",
    description: "Monitor campus safety and respond to emergency assistance requests.",
    icon: ShieldCheck,
    path: "/login?portal=security",
  },
];

export default function StaffLanding() {
  return (
    <main className="staff-landing">
      <section className="staff-hero">
        <header className="staff-header">
          <Link to="/staff" className="staff-logo">
            <span className="staff-logo-icon">
              <Accessibility size={25} />
            </span>
            <span>UniAble <small>STAFF PORTAL</small></span>
          </Link>


        </header>

        <div className="staff-hero-content">
          <div className="staff-eyebrow">Supporting an accessible campus</div>

          <h1>
            Together, we make
            <br />
            <span>access possible.</span>
          </h1>

          <p>
            The UniAble staff portal brings university teams together to
            support students, coordinate services and build a more inclusive
            campus experience.
          </p>

          <a className="staff-hero-button" href="#staff-departments">
            Explore staff departments <ArrowRight size={18} />
          </a>
        </div>

        <div className="staff-hero-note">
          <Users size={18} />
          One campus community. Different roles. One shared purpose.
        </div>
      </section>

      <section className="staff-departments" id="staff-departments">
        <div className="staff-section-heading">
          <div>
            <span className="staff-eyebrow">STAFF ACCESS</span>
            <h2>Choose your department</h2>
            <p>Select your assigned role to continue to sign in.</p>
          </div>
        </div>

        <div className="staff-department-grid">
          {departments.map(({ role, description, icon: Icon, path }) => (
            <article className="staff-department-card" key={role}>
              <span className="staff-card-icon"><Icon size={23} /></span>
              <h3>{role}</h3>
              <p>{description}</p>
              <Link to={path}>
                Continue to sign in <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="staff-footer">
        UniAble · Accessible education through inclusive support.
      </footer>
    </main>
  );
}
