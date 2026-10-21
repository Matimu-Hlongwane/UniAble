import React from "react";
import { Link } from "react-router-dom";
import { Accessibility, ArrowRight, Brain, HeartHandshake, MapPin, ShieldAlert, Volume2, Users } from "lucide-react";

const features = [
  [Accessibility, "Personalised accessibility", "Interfaces adapt to visual, hearing, mobility, speech and neurodiverse needs."],
  [Brain, "Learning support", "Lecture summaries, smart assistance and personalised guidance help students stay independent."],
  [MapPin, "Accessible campus navigation", "Step-free routes, accessible facilities and indoor navigation support safer movement."],
  [HeartHandshake, "Peer assistance network", "Students can request or provide trusted peer support when they need it."],
  [ShieldAlert, "Emergency SOS", "A simple emergency action can share the student's last known location with authorised responders and volunteers."],
  [Volume2, "Voice-first interaction", "Voice commands and visible alternatives make core actions easier to access."],
];

export default function Landing() {
  return <main className="landing-page">
    <nav className="landing-nav">
      <div className="brand landing-brand">UniAble <span>●</span></div>
      <div className="landing-links"><a href="#features">Features</a><a href="#impact">Impact</a><Link to="/dashboard">Open demo</Link></div>
    </nav>

    <section className="landing-hero">
      <div className="hero-copy">
        <span className="proposal-badge"><Accessibility size={15}/> Accessible student platform for higher education</span>
        <h1>Access without limits.<br/><span>Education for everyone.</span></h1>
        <p>UniAble is a student-centred accessibility platform designed to improve learning, communication, campus navigation, safety and independence for students with disabilities.</p>
        <div className="landing-actions"><Link className="primary-btn" to="/dashboard">Explore student dashboard <ArrowRight size={18}/></Link><Link className="secondary-btn" to="/accessibility">Accessibility settings</Link></div>
        <div className="hero-proof"><Users size={18}/><span>Built for students, lecturers, disability offices, security teams and peer volunteers.</span></div>
      </div>
      <div className="hero-preview">
        <div className="preview-top"><span>UniAble Student Experience</span><span className="live-pill">● Live demo</span></div>
        <div className="preview-main"><div className="preview-avatar">R</div><div><strong>Good morning, Relebohile</strong><p>How can UniAble assist you today?</p></div></div>
        <div className="preview-card"><div className="preview-icon"><Accessibility/></div><div><strong>Adaptive Mode</strong><p>Personalised to your accessibility preferences</p></div><span className="preview-toggle">ON</span></div>
        <div className="preview-grid"><div><MapPin/><strong>Navigate</strong><small>Step-free route</small></div><div><HeartHandshake/><strong>Peer Help</strong><small>Request assistance</small></div><div><ShieldAlert/><strong>Emergency</strong><small>One-tap SOS</small></div></div>
      </div>
    </section>

    <section id="features" className="landing-section"><div className="section-intro"><span className="eyebrow">Core solution</span><h2>One platform, personalised to the student.</h2><p>Instead of forcing every student into the same interface, UniAble changes the experience around individual accessibility needs.</p></div><div className="feature-grid">{features.map(([Icon,title,desc])=><article className="feature-card" key={title}><div className="feature-icon"><Icon size={22}/></div><h3>{title}</h3><p>{desc}</p></article>)}</div></section>

    <section id="impact" className="impact-section"><div><span className="eyebrow">Project proposal</span><h2>Designed around inclusion, independence and safety.</h2><p>UniAble combines accessible UX, AI personalisation, campus services and peer support into one connected student experience. The prototype demonstrates the front-end journey while leaving clear integration points for the shared team backend.</p></div><div className="impact-list"><div><strong>10+</strong><span>adaptive accessibility experiences</span></div><div><strong>5</strong><span>key stakeholder groups</span></div><div><strong>1</strong><span>connected student platform</span></div></div></section>

    <section className="landing-cta"><div><h2>See UniAble from every student's perspective.</h2><p>Choose accessibility preferences and personalise the UniAble experience.</p></div><Link className="primary-btn" to="/accessibility">Choose an accessibility profile <ArrowRight size={18}/></Link></section>
    <footer className="landing-footer">UniAble • Inclusive higher education technology • Prototype</footer>
  </main>;
}
