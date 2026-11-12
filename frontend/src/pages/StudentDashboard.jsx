import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accessibility, ArrowRight, BookOpen, CalendarDays, CheckCircle2,
  Clock3, GraduationCap, LayoutDashboard, MapPin, Megaphone, Menu,
  MessageCircle, Settings, ShieldAlert, Users, Volume2, Bell, X
} from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { api } from "../services/api";
import { getUserAccessibilityProfile, subscribeToAuth } from "../services/firebaseAuth";
import "./StudentDashboard.css";

const navigation = [
  ["Overview", LayoutDashboard, "/dashboard"],
  ["My schedule", CalendarDays, "/schedule"],
  ["Campus navigation", MapPin, "/campus"],
  ["Peer assistance", Users, "/peer-assistance"],
  ["UniPal", MessageCircle, "/unipal"],
];

const profiles = {
  "Visual Impairment": {
    title: "Your voice-first workspace",
    description: "Your essential student tools, accessible guidance and campus support in one place.",
    guidance: "Use your available spoken guidance and accessibility preferences.",
    icon: Volume2,
    tools: [
      ["Voice and accessibility settings", "Review your accessibility preferences.", "/accessibility", Accessibility],
      ["Campus directions", "Find campus destinations and routes.", "/campus", MapPin],
      ["Ask UniPal", "Get help with student information.", "/unipal", MessageCircle],
    ],
  },
  "Hearing Impairment": {
    title: "Your visual communication workspace",
    description: "Keep important information visible and access written student support.",
    guidance: "Use written instructions, visible notifications and text-based peer assistance.",
    icon: MessageCircle,
    tools: [
      ["Text-based peer assistance", "Request support using written details.", "/peer-assistance", MessageCircle],
      ["UniPal", "Access student information through text.", "/unipal", MessageCircle],
      ["My schedule", "Review your timetable and classes.", "/schedule", CalendarDays],
    ],
  },
  "Mobility Support": {
    title: "Your accessible campus workspace",
    description: "Keep campus directions, assistance and emergency support within easy reach.",
    guidance: "Use campus navigation and request peer assistance when you need support.",
    icon: MapPin,
    tools: [
      ["Campus navigation", "Explore campus destinations.", "/campus", MapPin],
      ["Request peer assistance", "Ask for campus or mobility support.", "/peer-assistance", Users],
      ["Emergency support", "Open emergency support options.", "/emergency", ShieldAlert],
    ],
  },
  "Speech Support": {
    title: "Your communication workspace",
    description: "Reach text-based communication, student assistance and emergency options.",
    guidance: "Use written interaction and available text-to-speech tools when speaking is difficult.",
    icon: MessageCircle,
    tools: [
      ["Peer assistance", "Connect with peers using written details.", "/peer-assistance", Users],
      ["UniPal", "Use text interaction for student information.", "/unipal", MessageCircle],
      ["Emergency support", "Review available emergency options.", "/emergency", ShieldAlert],
    ],
  },
  "Colour Vision": {
    title: "Your clarity-first workspace",
    description: "Find key information through readable labels and consistent page structure.",
    guidance: "Important information should be identified by text and clear labels, never by colour alone.",
    icon: Accessibility,
    tools: [
      ["Accessibility settings", "Review your display preferences.", "/accessibility", Accessibility],
      ["Campus navigation", "Open campus directions.", "/campus", MapPin],
      ["My schedule", "Review your classes and timetable.", "/schedule", CalendarDays],
    ],
  },
  "Neurodiverse Support": {
    title: "Your focused study workspace",
    description: "A predictable starting point for your timetable, study support and accessibility settings.",
    guidance: "Use your schedule, campus directions and study tools at a pace that works for you.",
    icon: BookOpen,
    tools: [
      ["My schedule", "Keep track of classes and activities.", "/schedule", CalendarDays],
      ["Study with UniPal", "Get help with questions and study topics.", "/unipal", BookOpen],
      ["Accessibility settings", "Review your available support settings.", "/accessibility", Accessibility],
    ],
  },
};

const neuroGuidance = {
  dyslexia: ["Break reading into manageable sections", "Use read-aloud tools where available", "Keep study tasks clearly organised"],
  adhd: ["Break larger tasks into smaller steps", "Use your schedule to plan study periods", "Keep important tasks visible"],
  autism: ["Review your schedule before travelling", "Use clear written instructions", "Keep useful support options easy to find"],
  down: ["Follow activities one step at a time", "Use visual and written guidance", "Reach out to student support when needed"],
};

function arraysFrom(response, keys) {
  if (Array.isArray(response)) return response;
  for (const key of keys) if (Array.isArray(response?.[key])) return response[key];
  return [];
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayTime(value) {
  if (!value) return "Time TBC";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { locale } = useSettings();
  const [studentName, setStudentName] = useState("");
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => subscribeToAuth((user) => {
    const name = user?.displayName?.trim() || "";
    setStudentName(name ? name.split(/\s+/)[0] : "");
  }), []);

  useEffect(() => {
    let active = true;
    getUserAccessibilityProfile()
      .then((value) => { if (active) setProfile(value); })
      .catch((error) => console.error("Unable to load accessibility profile:", error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([api.getAcademicTimetable(), api.getAcademicModules()])
      .then(([timetableResponse, modulesResponse]) => {
        if (!active) return;
        const entries = arraysFrom(timetableResponse, ["timetable", "entries", "classes"]);
        const modules = arraysFrom(modulesResponse, ["modules"]);
        const names = new Map(modules.map((module) => [String(module.id), module.name || module.title || "Class"]));
        const today = dateKey();
        const todaysClasses = entries
          .filter((entry) => String(entry.date || "").slice(0, 10) === today)
          .map((entry) => ({
            id: entry.id || `${entry.startTime || ""}-${entry.moduleId || entry.title || ""}`,
            time: displayTime(entry.startTime),
            title: entry.title || names.get(String(entry.moduleId)) || "Class",
            venue: String(entry.venue || entry.location || entry.room || "").trim() || "Venue not specified",
            sortTime: String(entry.startTime || ""),
          }))
          .sort((a, b) => a.sortTime.localeCompare(b.sortTime));
        setClasses(todaysClasses);
      })
      .catch((error) => { if (active) setClassesError(error.message || "Your timetable could not be loaded."); })
      .finally(() => { if (active) setClassesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.getAcademicAnnouncements()
      .then((response) => { if (active) setAnnouncements(arraysFrom(response, ["announcements"])); })
      .catch((error) => { if (active) setAnnouncementsError(error.message || "Announcements could not be loaded."); })
      .finally(() => { if (active) setAnnouncementsLoading(false); });
    return () => { active = false; };
  }, []);

  const selected = profile?.accessibility || "None";
  const profileId = String(profile?.accessibilityProfile?.id || "").toLowerCase();
  const view = useMemo(() => profiles[selected] || {
    title: "Your student workspace",
    description: "Your classes, campus services and student support in one organised place.",
    guidance: "Choose the tools that best support your day.",
    icon: GraduationCap,
    tools: [
      ["Campus navigation", "Find campus destinations and routes.", "/campus", MapPin],
      ["My schedule", "Review your classes and timetable.", "/schedule", CalendarDays],
      ["Accessibility settings", "Choose or update your preferences.", "/accessibility", Accessibility],
    ],
  }, [selected]);

  const neuroTips = neuroGuidance[profileId];
  const ViewIcon = view.icon;
  const today = new Intl.DateTimeFormat(locale || "en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  const go = (path) => { setMenuOpen(false); navigate(path); };

  return (
    <main className="student-hub">
      <a className="student-hub-skip" href="#student-hub-main">Skip to dashboard content</a>

      <aside className={`student-hub-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="student-hub-brand">
          <div className="student-hub-brand-mark"><GraduationCap size={25} /></div>
          <div><strong>UniAble</strong><span>STUDENT PORTAL</span></div>
          <button className="student-hub-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="student-hub-nav-label">WORKSPACE</div>
        <nav className="student-hub-nav" aria-label="Student navigation">
          {navigation.map(([label, Icon, path], index) => (
            <button key={path} className={`student-hub-nav-item ${index === 0 ? "active" : ""}`} onClick={() => go(path)} aria-current={index === 0 ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>{index === 0 && <span className="student-hub-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="student-hub-sidebar-spacer" />
        <div className="student-hub-help-card">
          <div className="student-hub-help-icon"><ShieldAlert size={20} /></div>
          <strong>Need urgent help?</strong>
          <p>Access emergency support whenever you need it.</p>
          <button onClick={() => go("/emergency")}>Emergency support <ArrowRight size={15} /></button>
        </div>
        <button className="student-hub-settings" onClick={() => go("/accessibility")}><Settings size={18} /> Accessibility preferences</button>
        <div className="student-hub-sidebar-footer">UniAble · Student experience</div>
      </aside>

      {menuOpen && <button className="student-hub-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <div className="student-hub-main" id="student-hub-main">
        <header className="student-hub-topbar">
          <button className="student-hub-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="student-hub-breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="student-hub-topbar-right">
            <span className="student-hub-date">{today}</span>
            <button className="student-hub-icon-button" onClick={() => go("/accessibility")} aria-label="Accessibility settings"><Bell size={19} /></button>
            <div className="student-hub-avatar" aria-label="Student account">{(studentName || "S").charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="student-hub-content">
          <section className="student-hub-heading">
            <div>
              <p className="student-hub-eyebrow">YOUR CAMPUS, YOUR WAY</p>
              <h1>{studentName ? `Welcome back, ${studentName}` : "Welcome to UniAble"}</h1>
              <p>Here&apos;s what&apos;s happening in your student workspace today.</p>
            </div>
            <button className="student-hub-outline-button" onClick={() => go("/accessibility")}><Accessibility size={17} /> Accessibility settings</button>
          </section>

          <section className="student-hub-hero">
            <div className="student-hub-hero-copy">
              <span className="student-hub-hero-tag">YOUR PERSONAL WORKSPACE</span>
              <h2>{view.title}</h2>
              <p>{view.description}</p>
              <div className="student-hub-hero-actions">
                <button className="student-hub-primary-button" onClick={() => go("/schedule")}>View my schedule <ArrowRight size={17} /></button>
                <button className="student-hub-hero-link" onClick={() => go("/campus")}>Explore campus</button>
              </div>
            </div>
            <div className="student-hub-hero-art" aria-hidden="true">
              <div className="student-hub-hero-orbit orbit-one" />
              <div className="student-hub-hero-orbit orbit-two" />
              <div className="student-hub-hero-icon"><ViewIcon size={48} strokeWidth={1.5} /></div>
            </div>
          </section>

          <section className="student-hub-stats" aria-label="Student quick links">
            <button className="student-hub-stat" onClick={() => go("/schedule")}>
              <span className="student-hub-stat-icon purple"><CalendarDays size={21} /></span>
              <span className="student-hub-stat-label">TODAY&apos;S CLASSES</span>
              <strong>{classesLoading ? "—" : classes.length}</strong><small>{classes.length === 1 ? "Class scheduled" : "Classes scheduled"}</small>
            </button>
            <button className="student-hub-stat" onClick={() => go("/campus")}>
              <span className="student-hub-stat-icon blue"><MapPin size={21} /></span>
              <span className="student-hub-stat-label">CAMPUS SERVICES</span><strong>Explore</strong><small>Directions and destinations</small>
            </button>
            <button className="student-hub-stat" onClick={() => go("/peer-assistance")}>
              <span className="student-hub-stat-icon green"><Users size={21} /></span>
              <span className="student-hub-stat-label">STUDENT SUPPORT</span><strong>Peer help</strong><small>Request or offer assistance</small>
            </button>
            <button className="student-hub-stat" onClick={() => go("/emergency")}>
              <span className="student-hub-stat-icon orange"><ShieldAlert size={21} /></span>
              <span className="student-hub-stat-label">URGENT HELP</span><strong>Emergency</strong><small>Access emergency options</small>
            </button>
          </section>

          <div className="student-hub-columns">
            <section className="student-hub-panel">
              <div className="student-hub-panel-heading">
                <div><p className="student-hub-eyebrow">YOUR ACADEMICS</p><h2>Today&apos;s classes</h2></div>
                <button className="student-hub-view-link" onClick={() => go("/schedule")}>Full timetable <ArrowRight size={15} /></button>
              </div>
              {classesLoading && <p className="student-hub-message" role="status">Loading your timetable...</p>}
              {classesError && <p className="student-hub-message error" role="alert">{classesError}</p>}
              {!classesLoading && !classesError && classes.length === 0 && (
                <div className="student-hub-empty"><CalendarDays size={27} /><strong>No classes scheduled today</strong><span>Your timetable will appear here when classes are scheduled.</span></div>
              )}
              {!classesLoading && !classesError && classes.map((item) => (
                <button className="student-hub-class" key={item.id} onClick={() => go("/schedule")}>
                  <span className="student-hub-class-time"><Clock3 size={15} />{item.time}</span>
                  <span className="student-hub-class-info"><strong>{item.title}</strong><small><MapPin size={13} />{item.venue}</small></span>
                  <ArrowRight size={17} className="student-hub-row-arrow" />
                </button>
              ))}
            </section>

            <section className="student-hub-panel student-hub-tools-panel">
              <div className="student-hub-panel-heading">
                <div><p className="student-hub-eyebrow">BUILT AROUND YOU</p><h2>Recommended tools</h2></div>
                <span className="student-hub-profile-label">{selected}</span>
              </div>
              <p className="student-hub-guidance">{view.guidance}</p>
              <div className="student-hub-tools">
                {view.tools.map(([title, description, path, Icon]) => (
                  <button className="student-hub-tool" key={title} onClick={() => go(path)}>
                    <span className="student-hub-tool-icon"><Icon size={19} /></span>
                    <span><strong>{title}</strong><small>{description}</small></span>
                    <ArrowRight size={16} className="student-hub-row-arrow" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {neuroTips && (
            <section className="student-hub-panel student-hub-study-panel">
              <div className="student-hub-panel-heading">
                <div><p className="student-hub-eyebrow">PERSONALISED STUDY GUIDANCE</p><h2>Study support ideas</h2></div>
                <span className="student-hub-profile-label">{selected}</span>
              </div>
              <ul>{neuroTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </section>
          )}

          <section className="student-hub-announcements">
            <div className="student-hub-panel-heading">
              <div><p className="student-hub-eyebrow">STAY INFORMED</p><h2>Latest announcements</h2></div>
              <span className="student-hub-announcement-icon"><Megaphone size={20} /></span>
            </div>
            {announcementsLoading && <p className="student-hub-message" role="status">Loading announcements...</p>}
            {announcementsError && <p className="student-hub-message error" role="alert">{announcementsError}</p>}
            {!announcementsLoading && !announcementsError && announcements.length === 0 && (
              <div className="student-hub-empty announcement-empty"><CheckCircle2 size={26} /><strong>You&apos;re all caught up</strong><span>Announcements from your enrolled modules will appear here.</span></div>
            )}
            {announcements.map((item) => (
              <article className={`student-hub-announcement ${item.importance === "important" ? "important" : ""}`} key={item.id}>
                <div className="student-hub-announcement-mark"><Megaphone size={18} /></div>
                <div>
                  <p className="student-hub-announcement-meta">{item.importance === "important" ? "IMPORTANT UPDATE" : "MODULE ANNOUNCEMENT"}{item.moduleName ? ` · ${item.moduleName}` : ""}</p>
                  <h3>{item.title}</h3><p>{item.message}</p>
                  {item.createdAt && <small>{new Date(item.createdAt).toLocaleString(locale || "en-ZA")}</small>}
                </div>
              </article>
            ))}
          </section>

          <footer className="student-hub-footer"><span>UniAble Student Portal</span><button onClick={() => go("/accessibility")}>Accessibility and support</button></footer>
        </div>
      </div>
    </main>
  );
}
