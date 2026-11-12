import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import ListeningRing from "../components/ListeningRing.jsx";
import "./WelcomeScreen.css";

export default function WelcomeScreen() {
  return (
    <AuthShell footer="Built for the University of Venda pilot. Available in 11 South African languages.">
      <div className="welcome">
        <ListeningRing state="idle" />

        <h1 className="welcome__title">
          Navigation. Communication.
          <br />
          Independence for all.
        </h1>
        <p className="welcome__subtitle">
          Sign up your way — speak your details or type them. UniAble adapts to how you work
          best.
        </p>

        <Link to="/sign-up" className="welcome__cta">
          Create your UniAble account
        </Link>

        <p className="welcome__switch">
          Already have an account?{" "}
          <Link to="/login" className="welcome__link">
            Log in
          </Link>
        </p>

        <p className="welcome__voice-hint">
          <Link to="/voice-activation" className="welcome__voice-hint-link">
            See how &ldquo;Hey UniAble&rdquo; works from the lock screen →
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
