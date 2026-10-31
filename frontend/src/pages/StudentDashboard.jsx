import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, ShieldAlert, MessageCircle } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { getUserAccessibilityProfile, subscribeToAuth } from "../services/firebaseAuth";

const classes = [
  ["09:00", "Data Structures", "Room 101"],
  ["11:00", "Mathematics Tutorial", "Room 204"],
  ["14:00", "Computer Lab", "Lab 3"],
];

export default function StudentDashboard() {
  const [signedInFirstName, setSignedInFirstName] = useState("");

  useEffect(() => {
    return subscribeToAuth((user) => {
      const displayName = user?.displayName?.trim() || "";
      setSignedInFirstName(displayName ? displayName.split(/\s+/)[0] : "");
    });
  }, []);
  const navigate = useNavigate();
  const { t, locale } = useSettings();
  const [accessibilityProfile, setAccessibilityProfile] = useState(null);

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

  const selectedAccessibility = accessibilityProfile?.accessibility || "";

  const accessibilityGuidance = {
    "Visual Impairment":
      "Use voice commands, read-aloud tools and accessible campus directions.",
    "Hearing Impairment":
      "Use written instructions, visual information and text-based peer assistance.",
    "Mobility Support":
      "Prioritise step-free routes and request peer assistance when needed.",
    "Speech Support":
      "Use text-based assistance and the Emergency SOS options when speaking is difficult.",
    "Colour Vision":
      "Use readable text and clear contrast. Important information should not rely on colour alone.",
    "Neurodiverse Support":
      "Use your schedule, clear campus directions and study tools at your own pace.",
    "Other":
      "Explore the accessibility settings to choose the tools that work best for you."
  };

  const personalizedGuidance =
    accessibilityGuidance[selectedAccessibility] ||
    "Your campus navigation, schedule, peer assistance and emergency support are available here.";

  const adaptiveOptions = {
    "Visual Impairment": [
      { title: "Voice and screen-reader support", description: "Review accessibility tools and choose the support settings that work for you.", path: "/accessibility" },
      { title: "Accessible campus routes", description: "Explore campus navigation and available route guidance.", path: "/campus" },
      { title: "Ask UniPal", description: "Get help with student questions using the assistant.", path: "/unipal" }
    ],
    "Hearing Impairment": [
      { title: "Text-based peer assistance", description: "Connect with peers using written communication.", path: "/peer-assistance" },
      { title: "UniPal assistance", description: "Access student information through the assistant.", path: "/unipal" },
      { title: "My schedule", description: "Review your classes and timetable.", path: "/schedule" }
    ],
    "Mobility Support": [
      { title: "Campus navigation", description: "Explore campus routes and navigation support.", path: "/campus" },
      { title: "Request peer assistance", description: "Find support for campus and mobility needs.", path: "/peer-assistance" },
      { title: "Emergency SOS", description: "Open emergency support when you need urgent help.", path: "/emergency" }
    ],
    "Speech Support": [
      { title: "Peer assistance", description: "Connect with peers for support.", path: "/peer-assistance" },
      { title: "UniPal", description: "Use text-based interaction to get student information.", path: "/unipal" },
      { title: "Emergency SOS", description: "Open emergency support options.", path: "/emergency" }
    ],
    "Colour Vision": [
      { title: "Accessibility settings", description: "Review available accessibility profiles and settings.", path: "/accessibility" },
      { title: "Campus navigation", description: "Open campus directions and navigation support.", path: "/campus" },
      { title: "My schedule", description: "Review your classes and timetable.", path: "/schedule" }
    ],
    "Neurodiverse Support": [
      { title: "My schedule", description: "Keep track of classes and daily activities.", path: "/schedule" },
      { title: "Study with UniPal", description: "Get help with student questions and study topics.", path: "/unipal" },
      { title: "Accessibility settings", description: "Explore profiles designed for different support needs.", path: "/accessibility" }
    ],
    "Other": [
      { title: "Explore accessibility settings", description: "Choose a profile that better matches your needs.", path: "/accessibility" },
      { title: "Peer assistance", description: "Connect with peers for support.", path: "/peer-assistance" },
      { title: "UniPal", description: "Get help with student questions.", path: "/unipal" }
    ],
    "None": [
      { title: "Campus navigation", description: "Find campus routes and destinations.", path: "/campus" },
      { title: "My schedule", description: "Review your classes and timetable.", path: "/schedule" },
      { title: "Explore accessibility settings", description: "Change or review your accessibility preferences at any time.", path: "/accessibility" }
    ]
  };

  const recommendedTools =
    adaptiveOptions[selectedAccessibility] || adaptiveOptions["None"];


  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p>
            {new Date().toLocaleDateString(locale || "en-ZA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1>Dashboard</h1>
          <p className="muted">{t("assistQuestion")}</p>
        </div>
      </div>

      <div className="hero-card">
        <div>
          <span className="status-dot">{t("listeningReady")}</span>
          <h2>{t("heyUniAble")}</h2>
          <p>{t("voiceHelp")}</p>
        </div>
      </div>

      {selectedAccessibility && selectedAccessibility !== "None" && (
        <div className="panel accessibility-personalized-panel">
          <h2>Your personalised support</h2>
          <p>
            Selected accessibility need: <strong>{selectedAccessibility}</strong>
          </p>
          <p>{personalizedGuidance}</p>
        </div>
      )}

      <section className="panel adaptive-tools-panel">
        <div className="panel-title">
          <h2>Recommended tools for you</h2>
        </div>
        <p className="muted">
          Based on your selected accessibility need:{" "}
          <strong>{selectedAccessibility || "Not set"}</strong>
        </p>
        <div className="quick-grid">
          {recommendedTools.map((tool) => (
            <button
              key={tool.title}
              className="quick-card quick-card-button"
              type="button"
              onClick={() => navigate(tool.path)}
            >
              <strong>{tool.title}</strong>
              <span>{tool.description}</span>
              
            </button>
          ))}
        </div>
      </section>
      <div className="quick-grid">
        <button className="quick-card quick-card-button" type="button" onClick={() => navigate("/campus")}>
          <MapPin />
          <strong>{t("navigateCampus")}</strong>
          <span>{t("accessibleRoutes")}</span>
        </button>

        <button className="quick-card quick-card-button" type="button" onClick={() => navigate("/schedule")}>
          <CalendarDays />
          <strong>{t("mySchedule")}</strong>
          <span>{t("threeClassesToday")}</span>
        </button>

        <button className="quick-card quick-card-button" type="button" onClick={() => navigate("/accessibility")}>
          <ShieldAlert />
          <strong>{t("supportOptions")}</strong>
          <span>{t("accessibilityDescriptionShort")}</span>
        </button>

        <button className="quick-card quick-card-button danger" type="button" onClick={() => navigate("/emergency")}>
          <ShieldAlert />
          <strong>{t("emergency")}</strong>
          <span>{t("securityPeers")}</span>
        </button>

        <button className="quick-card quick-card-button unipal-quick-card" type="button" onClick={() => navigate("/unipal")}>
          <MessageCircle />
          <strong>{t("unipal")}</strong>
          <span>{t("unipalMotto")}</span>
        </button>
      </div>

      <div className="section-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>{t("todaysClasses")}</h2>
            <button className="text-btn" type="button" onClick={() => navigate("/schedule")}>
              {t("viewAll")}
            </button>
          </div>

          {classes.map(([time, name, room]) => (
            <button
              className="list-row list-row-button"
              key={time}
              type="button"
              onClick={() => navigate("/schedule")}
              aria-label={`${name}, ${room}`}
            >
              <div className="time">{time}</div>
              <div>
                <strong>{name}</strong>
                <small>{room}</small>
              </div>
              
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">
            <h2>{t("recentAnnouncement")}</h2>
          </div>

          <div className="notice">{t("libraryAnnouncement")}</div>

          <div className="access-state">
            <span>{t("screenReader")}</span>
            <strong>{t("on")}</strong>
            <span>{t("highContrast")}</span>
            <strong>{t("on")}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}



