import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Ear,
  Footprints,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Mic,
  Palette,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { getUserAccessibilityProfile, subscribeToAuth } from "../services/firebaseAuth";
import "./Dashboards.css";

const classes = [
  ["09:00", "Data Structures", "Room 101"],
  ["11:00", "Mathematics Tutorial", "Room 204"],
  ["14:00", "Computer Lab", "Lab 3"],
];

const profileViews = {
  "Visual Impairment": {
    eyebrow: "ACCESSIBILITY VIEW",
    title: "Your voice-first workspace",
    description:
      "A clear route to spoken guidance, accessible campus directions and the support tools you use most.",
    guidance:
      "Use spoken page guidance, read-aloud controls and accessible campus directions. Voice controls only listen when you activate them.",
    icon: Volume2,
    tools: [
      { title: "Voice and screen-reader support", description: "Review spoken guidance and accessibility preferences.", path: "/accessibility", icon: Mic },
      { title: "Accessible campus routes", description: "Open campus navigation and route guidance.", path: "/campus", icon: MapPin },
      { title: "Ask UniPal", description: "Get help with student information.", path: "/unipal", icon: MessageCircle },
    ],
  },
  "Hearing Impairment": {
    eyebrow: "ACCESSIBILITY VIEW",
    title: "Your visual communication workspace",
    description:
      "Keep important information visible and reach written student support without relying on audio.",
    guidance:
      "Use written instructions, visible notifications and text-based peer assistance for campus communication.",
    icon: Ear,
    tools: [
      { title: "Text-based peer assistance", description: "Request support and communicate in writing.", path: "/peer-assistance", icon: MessageSquareText },
      { title: "UniPal", description: "Access student information through text interaction.", path: "/unipal", icon: MessageCircle },
      { title: "My schedule", description: "Review classes and timetable information.", path: "/schedule", icon: CalendarDays },
    ],
  },
  "Mobility Support": {
    eyebrow: "ACCESSIBILITY VIEW",
    title: "Your accessible campus workspace",
    description:
      "Keep campus directions, assistance and emergency support within easy reach.",
    guidance:
      "Prioritise step-free routes where available and request peer assistance when you need help moving around campus.",
    icon: Footprints,
    tools: [
      { title: "Campus navigation", description: "Explore campus destinations and route guidance.", path: "/campus", icon: MapPin },
      { title: "Request peer assistance", description: "Ask for campus or mobility support.", path: "/peer-assistance", icon: MessageCircle },
      { title: "Emergency support", description: "Open the emergency support page.", path: "/emergency", icon: ShieldAlert },
    ],
  },
  "Speech Support": {
    eyebrow: "ACCESSIBILITY VIEW",
    title: "Your communication workspace",
    description:
      "Reach text-based communication, student assistance and emergency options from one place.",
    guidance:
      "Use written interaction and available text-to-speech tools when speaking is difficult or unavailable.",
    icon: MessageSquareText,
    tools: [
      { title: "Peer assistance", description: "Connect with peers using written details.", path: "/peer-assistance", icon: MessageCircle },
      { title: "UniPal", description: "Use text interaction for student information.", path: "/unipal", icon: MessageSquareText },
      { title: "Emergency support", description: "Review available emergency options.", path: "/emergency", icon: ShieldAlert },
    ],
  },
  "Colour Vision": {
    eyebrow: "ACCESSIBILITY VIEW",
    title: "Your clarity-first workspace",
    description:
      "Find key information through readable labels, clear contrast and consistent page structure.",
    guidance:
      "Important information should be identified by text and clear labels, never by colour alone.",
    icon: Palette,
    tools: [
      { title: "Accessibility settings", description: "Review display and accessibility preferences.", path: "/accessibility", icon: Accessibility },
      { title: "Campus navigation", description: "Open campus directions and navigation support.", path: "/campus", icon: MapPin },
      { title: "My schedule", description: "Review your classes and timetable.", path: "/schedule", icon: CalendarDays },
    ],
  },
  "Neurodiverse Support": {
    eyebrow: "ACCESSIBILITY VIEW",
    title: "Your focused study workspace",
    description:
      "A predictable starting point for your timetable, study support and personal accessibility settings.",
    guidance:
      "Use your schedule, straightforward campus directions and study tools at a pace that works for you.",
    icon: Brain,
    tools: [
      { title: "My schedule", description: "Keep track of classes and daily activities.", path: "/schedule", icon: CalendarDays },
      { title: "Study with UniPal", description: "Get help with student questions and study topics.", path: "/unipal", icon: BookOpen },
      { title: "Accessibility settings", description: "Review the support settings available to you.", path: "/accessibility", icon: Accessibility },
    ],
  },
  Other: {
    eyebrow: "PERSONALISED VIEW",
    title: "Your student workspace",
    description: "A straightforward starting point for campus services and student support.",
    guidance: "Review your accessibility settings and choose the tools that best support your day.",
    icon: Accessibility,
    tools: [
      { title: "Accessibility settings", description: "Review the support options available to you.", path: "/accessibility", icon: Accessibility },
      { title: "Peer assistance", description: "Connect with peers for support.", path: "/peer-assistance", icon: MessageCircle },
      { title: "UniPal", description: "Get help with student information.", path: "/unipal", icon: MessageCircle },
    ],
  },
  None: {
    eyebrow: "STUDENT OVERVIEW",
    title: "Your student workspace",
    description: "Your classes, campus services and student support in one organised place.",
    guidance: "Use the links below to review your schedule, navigate campus or access student support.",
    icon: BookOpen,
    tools: [
      { title: "Campus navigation", description: "Find campus destinations and route guidance.", path: "/campus", icon: MapPin },
      { title: "My schedule", description: "Review your classes and timetable.", path: "/schedule", icon: CalendarDays },
      { title: "Accessibility settings", description: "Choose or update your support preferences.", path: "/accessibility", icon: Accessibility },
    ],
  },
};

function formatToday(locale) {
  return new Intl.DateTimeFormat(locale || "en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { locale } = useSettings();
  const [studentName, setStudentName] = useState("");
  const [accessibilityProfile, setAccessibilityProfile] = useState(null);

  useEffect(() => {
    return subscribeToAuth((user) => {
      const name = user?.displayName?.trim() || "";
      setStudentName(name ? name.split(/\s+/)[0] : "");
    });
  }, []);

  useEffect(() => {
    let active = true;
    getUserAccessibilityProfile()
      .then((profile) => {
        if (active) setAccessibilityProfile(profile);
      })
      .catch((error) => {
        console.error("Unable to load accessibility profile:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedAccessibility = accessibilityProfile?.accessibility || "None";
  const view = useMemo(
    () => profileViews[selectedAccessibility] || profileViews.Other,
    [selectedAccessibility]
  );
  const ViewIcon = view.icon;

  return (
    <section className="page dashboard-page student-dashboard">
<div className="dashboard-page-heading">
        <div>
          <p className="dashboard-eyebrow">STUDENT PORTAL</p>
          <h1>{studentName ? `Welcome back, ${studentName}` : "Student dashboard"}</h1>
          <p className="dashboard-date">{formatToday(locale)}</p>
        </div>
        <button
          type="button"
          className="dashboard-outline-button"
          onClick={() => navigate("/accessibility")}
        >
          <Accessibility size={17} />
          Accessibility settings
        </button>
      </div>

      <section className="dashboard-welcome-panel" aria-labelledby="dashboard-view-title">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-eyebrow">{view.eyebrow}</p>
          <h2 id="dashboard-view-title">{view.title}</h2>
          <p>{view.description}</p>
          <div className="dashboard-welcome-actions">
            <button type="button" className="dashboard-primary-button" onClick={() => navigate("/schedule")}>
              View my schedule <ArrowRight size={17} />
            </button>
            <button type="button" className="dashboard-text-button" onClick={() => navigate("/campus")}>
              Campus navigation
            </button>
          </div>
        </div>
        <div className="dashboard-welcome-mark" aria-hidden="true">
          <ViewIcon size={34} strokeWidth={1.6} />
        </div>
      </section>

      <div className="dashboard-summary-grid" aria-label="Student services">
        <button type="button" className="dashboard-summary-item" onClick={() => navigate("/schedule")}>
          <span className="dashboard-summary-icon"><CalendarDays size={20} /></span>
          <span className="dashboard-summary-label">Today&apos;s classes</span>
          <strong>{classes.length}</strong>
          <span className="dashboard-summary-foot">Scheduled in your sample timetable</span>
        </button>
        <button type="button" className="dashboard-summary-item" onClick={() => navigate("/campus")}>
          <span className="dashboard-summary-icon"><MapPin size={20} /></span>
          <span className="dashboard-summary-label">Campus services</span>
          <strong>Navigation</strong>
          <span className="dashboard-summary-foot">Open campus directions</span>
        </button>
        <button type="button" className="dashboard-summary-item" onClick={() => navigate("/peer-assistance")}>
          <span className="dashboard-summary-icon"><MessageCircle size={20} /></span>
          <span className="dashboard-summary-label">Student support</span>
          <strong>Peer assistance</strong>
          <span className="dashboard-summary-foot">Request or view available support</span>
        </button>
        <button type="button" className="dashboard-summary-item dashboard-summary-emergency" onClick={() => navigate("/emergency")}>
          <span className="dashboard-summary-icon"><ShieldAlert size={20} /></span>
          <span className="dashboard-summary-label">Urgent help</span>
          <strong>Emergency support</strong>
          <span className="dashboard-summary-foot">Open emergency options</span>
        </button>
      </div>

      <div className="dashboard-content-grid">
        <section className="dashboard-section-panel" aria-labelledby="dashboard-classes-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">ACADEMIC PLANNER</p>
              <h2 id="dashboard-classes-title">Today&apos;s classes</h2>
            </div>
            <button type="button" className="dashboard-text-button" onClick={() => navigate("/schedule")}>
              Full timetable <ArrowRight size={16} />
            </button>
          </div>
          <div className="dashboard-class-list">
            {classes.map(([time, name, room]) => (
              <button
                type="button"
                className="dashboard-class-row"
                key={`${time}-${name}`}
                onClick={() => navigate("/schedule")}
                aria-label={`${name}, ${room}, ${time}`}
              >
                <span className="dashboard-class-time"><Clock3 size={15} />{time}</span>
                <span className="dashboard-class-details">
                  <strong>{name}</strong>
                  <small>{room}</small>
                </span>
                <ArrowRight size={17} className="dashboard-row-arrow" />
              </button>
            ))}
          </div>
          <p className="dashboard-data-note">Sample timetable entries are shown here. Your connected timetable can replace these entries when available.</p>
        </section>

        <section className="dashboard-section-panel" aria-labelledby="dashboard-support-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">YOUR SUPPORT</p>
              <h2 id="dashboard-support-title">Recommended tools</h2>
            </div>
            <span className="dashboard-profile-tag">{selectedAccessibility}</span>
          </div>
          <p className="dashboard-support-guidance">{view.guidance}</p>
          <div className="dashboard-tool-list">
            {view.tools.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <button
                  type="button"
                  className="dashboard-tool-row"
                  key={tool.title}
                  onClick={() => navigate(tool.path)}
                >
                  <span className="dashboard-tool-icon"><ToolIcon size={19} /></span>
                  <span className="dashboard-tool-copy">
                    <strong>{tool.title}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <ArrowRight size={16} className="dashboard-row-arrow" />
                </button>
              );
            })}
          </div>
          <button type="button" className="dashboard-secondary-button dashboard-full-button" onClick={() => navigate("/accessibility")}>
            Review support preferences
          </button>
        </section>
      </div>

      <section className="dashboard-announcement">
        <div className="dashboard-announcement-icon"><CheckCircle2 size={20} /></div>
        <div>
          <p className="dashboard-eyebrow">CAMPUS NOTICE</p>
          <h2>Stay informed</h2>
          <p>Check your institution&apos;s official channels for the latest library hours, campus notices and timetable changes.</p>
        </div>
      </section>
    </section>
  );
}


