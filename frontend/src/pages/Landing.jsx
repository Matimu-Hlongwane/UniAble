import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  Mic,
  Volume2,
  Mail,
  Eye,
  Ear,
  Accessibility as MobilityIcon,
  MessageCircle,
  Palette,
  Brain,
  ShieldAlert,
  Users,
  Globe,
  ArrowRight,
  MapPin,
  CalendarDays,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import "./LandingPrototype.css";

const dashboardTypes = [
  {
    title: "Visual",
    description: "For students with visual impairments: use screen-reader-friendly content, text-to-speech, OCR to read printed material, large text and high-contrast settings to access learning and campus information.",
    icon: Eye,
    className: "visual",
    features: ["Screen reader support", "Large text", "High contrast"],
  },
  {
    title: "Hearing",
    description: "For students who are deaf or hard of hearing: access visual notifications, captions, transcripts and written emergency alerts so important information is not communicated through sound alone.",
    icon: Ear,
    className: "hearing",
    features: ["Live captions", "Visual alerts", "Transcripts"],
  },
  {
    title: "Mobility",
    description: "For students with mobility disabilities: find accessible campus routes and buildings, reduce unnecessary physical interaction, and use voice controls or assistance requests where available.",
    icon: MobilityIcon,
    className: "mobility",
    features: ["Accessible routes", "Building access", "Route planning"],
  },
  {
    title: "Speech",
    description: "For students with speech disabilities: communicate through text, quick responses and alternative help requests without having to rely on spoken communication.",
    icon: MessageCircle,
    className: "speech",
    features: ["Voice alternatives", "Quick responses", "Communication tools"],
  },
  {
    title: "Colour vision",
    description: "For students with colour-vision deficiencies: use strong contrast, readable labels and clear visual indicators so information is not communicated through colour alone.",
    icon: Palette,
    className: "colour",
    features: ["Colour filters", "Contrast options", "Clear visual labels"],
  },
  {
    title: "Neurodiverse",
    description: "For students with dyslexia, ADHD, autism and Down syndrome: access reading support, text-to-speech, structured tasks, predictable navigation, clear instructions and adjustable layouts.",
    icon: Brain,
    className: "neuro",
    features: ["Reduced distractions", "Reading support", "Personalised layout"],
  },
  {
    title: "Dyslexia",
    description: "Support reading and understanding with text-to-speech, read-aloud content, clear text presentation, adjustable reading options and AI-generated summaries.",
    icon: Brain,
    className: "dyslexia",
    features: ["Text-to-speech", "Readable content options", "AI summaries"],
  },
  {
    title: "ADHD",
    description: "Help students organise their studies with structured tasks, reminders, clear priorities, manageable information and progress tracking.",
    icon: Brain,
    className: "adhd",
    features: ["Task organisation", "Study reminders", "Progress tracking"],
  },
  {
    title: "Autism",
    description: "Offer a predictable and customisable experience through consistent navigation, clear instructions, reduced visual distractions and personal settings.",
    icon: Brain,
    className: "autism",
    features: ["Consistent layouts", "Clear instructions", "Reduced distractions"],
  },
  {
    title: "Down syndrome",
    description: "Make learning and campus tasks easier to follow with simple navigation, step-by-step guidance, visual information and read-aloud support.",
    icon: Brain,
    className: "down-syndrome",
    features: ["Step-by-step guidance", "Visual support", "Read-aloud tools"],
  },
  {
    title: "Multiple disabilities",
    description: "Allow students with more than one disability to combine accessibility tools and personalise settings to suit their individual requirements.",
    icon: Brain,
    className: "multiple",
    features: ["Combined accessibility tools", "Personalised settings", "Flexible support"],
  },];

function DashboardPreview({ item }) {
  const Icon = item.icon;

  return (
    <li className={`landing-disability-item landing-disability-${item.className}`}>
      <div className="landing-disability-card-heading">
        <span className="landing-disability-icon" aria-hidden="true">
          <Icon size={25} />
        </span>
        <h3>{item.title}</h3>
      </div>

      <p className="landing-disability-description">{item.description}</p>

      <ul className="landing-disability-features">
        {item.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </li>
  );
}
export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="landing-page" id="main-content">
      <a className="landing-skip-link" href="#landing-actions">
        Skip to main content
      </a>

      <section className="landing-hero">
        <header className="landing-header">
          <Link to="/" className="landing-logo" aria-label="UniAble home">
            <span className="landing-logo-icon">
              <Accessibility size={25} aria-hidden="true" />
            </span>
            <span>UniAble</span>
          </Link>

          <button
            className="landing-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>

          <nav
            className={`landing-nav ${mobileMenuOpen ? "is-open" : ""}`}
            aria-label="Main navigation"
          >
            
            <a href="#dashboards" onClick={() => setMobileMenuOpen(false)}>Disability Dashboards</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
          </nav>


        </header>

        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            
            Inclusion starts with access
          </div>

          <h1>
            Campus life that
            <br />
            <span>works for you,</span> your way.
          </h1>

          <p className="landing-hero-description">
            Voice-first support for students with every kind of need.
            Navigate campus, connect with peers and talk to UniPal in
            your own language.
          </p>

          <div
            className="landing-entry-actions"
            id="landing-actions"
            aria-label="Choose how to access UniAble"
          >
            <Link className="landing-action-button landing-action-primary" to="/signup">
              <Mic size={19} aria-hidden="true" />
              Voice sign-up
            </Link>

            <Link className="landing-action-button landing-action-outline" to="/voice-login">
              <Volume2 size={19} aria-hidden="true" />
              Voice login
            </Link>

            <Link className="landing-action-button landing-action-outline" to="/login">
              <Mail size={19} aria-hidden="true" />
              Email login
            </Link>
          </div>

          <p className="landing-hero-note">
            Accessible tools. Personalised support. One campus community.
          </p>
        </div>

        <div className="landing-hero-bottom">
          <div className="landing-hero-benefit">
            <MapPin size={19} aria-hidden="true" />
            <span>Campus navigation</span>
          </div>
          <div className="landing-hero-benefit">
            <CalendarDays size={19} aria-hidden="true" />
            <span>Smart schedule</span>
          </div>
          <div className="landing-hero-benefit">
            <Users size={19} aria-hidden="true" />
            <span>Peer assistance</span>
          </div>
          <div className="landing-hero-benefit">
            <MessageCircle size={19} aria-hidden="true" />
            <span>UniPal companion</span>
          </div>
        </div>
      </section>

      <section className="landing-dashboards" id="dashboards">
        <div className="landing-section-heading">
          <span className="landing-section-kicker">Designed around you</span>
          <h2>Disability Dashboards</h2>
          <p>
            UniAble adapts its layout, colours, text and support tools
            to your accessibility preferences.
          </p>
        </div>

        <div className="landing-dashboard-grid">
          {dashboardTypes.map((item) => (
            <DashboardPreview item={item} key={item.title} />
          ))}
        </div>
      </section>


      <section className="landing-about" id="about">
        
          <div className="landing-about-brand" aria-label="UniAble app logo">
            <span className="landing-about-brand-icon">
              <Accessibility size={58} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="landing-about-brand-name">UniAble</span>
            <span className="landing-about-brand-tagline">Access without limits</span>
          </div><div className="landing-section-heading">
          <span className="landing-section-kicker">About UniAble</span>
          <h2>Access without limits. Education for everyone.</h2>
          <p>
            UniAble is an accessibility support platform designed to make higher
            education more inclusive, accessible and supportive for every student.
            It brings together accessible communication, campus navigation, peer
            assistance, emergency support and personalised learning tools in one place.
            The platform supports students with visual, hearing, mobility, speech,
            colour-vision and neurodiverse accessibility needs. Students can use
            accessible features to communicate their needs, access information,
            navigate campus services and request assistance more independently.
            UniAble also aims to connect students with lecturers, disability support
            offices, peers and campus security. By bringing these services together,
            UniAble seeks to reduce barriers to participation and help create a
            higher education environment where every student has the opportunity
            to learn, participate and succeed.
          </p>
        </div>
      </section>
            <section className="landing-language-strip" aria-labelledby="landing-language-title">
        <span className="landing-language-symbol">
          <Globe size={25} aria-hidden="true" />
        </span>
        <div>
          <strong id="landing-language-title">Support in your language</strong>
          <p>UniAble recognises South Africa's 11 official languages.</p>
          <ul className="landing-language-list">
            <li>isiZulu</li>
            <li>isiXhosa</li>
            <li>Afrikaans</li>
            <li>English</li>
            <li>Sepedi</li>
            <li>Setswana</li>
            <li>Sesotho</li>
            <li>siSwati</li>
            <li>Xitsonga</li>
            <li>Tshivenda</li>
            <li>isiNdebele</li>
          </ul>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-footer-brand">
          <Accessibility size={19} aria-hidden="true" />
          UniAble
        </Link>
        <p>Designed for access. Built for everyone.</p>
      </footer>
    </main>
  );
}





