import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import CampusSecurityCall from "../components/CampusSecurityCall";
import LocationMap from "../components/LocationMap";
import SosTimeline from "../components/SosTimeline";
import { api } from "../services/api";
import {
  SOS_CHANGED_EVENT,
  cancelSos,
  formatDateTime,
  isOpen,
  locationSummary,
  refreshSosLocation,
  responderLabel,
  sendSos,
  statusHeadline,
} from "../services/emergencyService";
import { describeLocationIssue } from "../services/locationService";
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import { MapPin, Phone, RefreshCw, ShieldAlert, Users, X } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import type { StudentSosAlert } from "../types/api";
import { formatAccuracy } from "../utils/geo";
import { errorMessage } from "../utils/errors";
import { speak } from "../services/speechService";

type Step = "idle" | "confirm-send" | "sending" | "confirm-cancel" | "cancelling";

const CANCEL_REASONS = ["Pressed by mistake", "I am safe now", "Help is no longer needed"];
const POLL_INTERVAL_MS = 8000;
const CONNECTION_PROBLEM = "The UniAble server could not be reached. Please try again.";

export default function Emergency() {
  const { t, locale, language, spokenResponses } = useSettings();
  const gps = useDeviceLocation({ watch: true });

  const [alerts, setAlerts] = useState<StudentSosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0] ?? "");
  const [uniPalQuestion, setUniPalQuestion] = useState("");
  const [uniPalReply, setUniPalReply] = useState("");
  const [askingUniPal, setAskingUniPal] = useState(false);
  const previousSpokenStatusRef = useRef("");
  const confirmRef = useRef<HTMLDivElement>(null);

  const openAlert = alerts.find(isOpen) ?? null;
  const previousAlerts = alerts.filter((alert) => alert.id !== openAlert?.id);
  const hasOpenAlert = openAlert !== null;

  const load = useCallback(async (quiet = false) => {
    try {
      const result = await api.getMySOS();
      setAlerts(result.alerts);
    } catch (err) {
      if (!quiet) setError(errorMessage(err, CONNECTION_PROBLEM));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load, plus a reload whenever the voice assistant sends or cancels an SOS.
  useEffect(() => {
    void load();
    const reload = () => void load(true);
    window.addEventListener(SOS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(SOS_CHANGED_EVENT, reload);
  }, [load]);

  // While an SOS is open, keep its status (acknowledged, resolved) fresh.
  useEffect(() => {
    if (!hasOpenAlert) return undefined;
    const timer = window.setInterval(() => void load(true), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasOpenAlert, load]);

  // Speak meaningful SOS status changes without repeating every polling update.
  useEffect(() => {
    if (!openAlert) {
      previousSpokenStatusRef.current = "";
      return;
    }

    const statusKey = [
      openAlert.id,
      statusHeadline(openAlert),
      openAlert.assignedResponder?.name ?? "",
      openAlert.acknowledgedAt ?? "",
    ].join(":");

    if (previousSpokenStatusRef.current && previousSpokenStatusRef.current !== statusKey && spokenResponses) {
      const message = openAlert.assignedResponder
        ? `${statusHeadline(openAlert)}. ${responderLabel(openAlert)} has acknowledged your emergency alert.`
        : `${statusHeadline(openAlert)}. No responder has acknowledged your alert yet. Please contact campus security if you need immediate assistance.`;

      void speak(message, { locale });
    }

    previousSpokenStatusRef.current = statusKey;
  }, [openAlert, spokenResponses, locale]);

  async function askUniPal() {
    const question = uniPalQuestion.trim();
    if (!question || askingUniPal) return;

    setAskingUniPal(true);
    setUniPalReply("");
    setError("");

    try {
      const result = await api.chatWithUniPal({
        message: `I am on the Emergency SOS page. Give me clear, concise emergency assistance guidance. My question is: ${question}`,
        language,
        locale,
      });

      const reply = result.message || "UniPal could not provide an answer just now.";
      setUniPalReply(reply);

      if (spokenResponses) {
        await speak(reply, { locale });
      }
    } catch (err) {
      const message = errorMessage(err, "UniPal is temporarily unavailable.");
      setUniPalReply(message);
      if (spokenResponses) await speak(message, { locale });
    } finally {
      setAskingUniPal(false);
    }
  }

  // Move keyboard and screen-reader focus into a confirmation as soon as it appears.
  useEffect(() => {
    if (step === "confirm-send" || step === "confirm-cancel") confirmRef.current?.focus();
  }, [step]);

  async function sendNow() {
    if (step === "sending") return;
    setError("");
    setNotice("");
    setStep("sending");
    try {
      const outcome = await sendSos("student-emergency-page");
      setNotice(outcome.response.message);
      await load(true);
    } catch (err) {
      console.error("UniAble SOS request failed:", err);
      setError(errorMessage(err, CONNECTION_PROBLEM));
    } finally {
      setStep("idle");
    }
  }

  async function cancelNow() {
    if (!openAlert || step === "cancelling") return;
    setError("");
    setNotice("");
    setStep("cancelling");
    try {
      await cancelSos(openAlert.id, cancelReason);
      setNotice("Your SOS was cancelled. It stays on your emergency history.");
      await load(true);
    } catch (err) {
      setError(errorMessage(err, CONNECTION_PROBLEM));
      await load(true);
    } finally {
      setStep("idle");
    }
  }

  async function updateLocation() {
    if (!openAlert || refreshing) return;
    setError("");
    setNotice("");
    setRefreshing(true);
    try {
      const outcome = await refreshSosLocation(openAlert.id);
      if (outcome.ok) {
        setNotice("Your location was updated for responders.");
        await load(true);
      } else {
        setError(outcome.reason);
      }
    } catch (err) {
      setError(errorMessage(err, CONNECTION_PROBLEM));
    } finally {
      setRefreshing(false);
    }
  }

  function onConfirmKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") setStep("idle");
  }

  const gpsLine = gps.fix
    ? `Location ready, ${formatAccuracy(gps.fix.accuracyMeters)}.`
    : gps.status === "error"
      ? `${describeLocationIssue(gps.issue)} Your SOS will still be sent without GPS.`
      : "Finding your location. Your SOS will be sent even if this takes too long.";

  return (
    <section className="page narrow">
      <CampusSecurityCall />
      <p className="eyebrow">{t("emergencyResponse")}</p>
      <h1>{t("emergencySos")}</h1>
      <p className="muted">{t("emergencyDescription")}</p>

      <div className="sos-card">
        <ShieldAlert size={48} aria-hidden="true" />

        {loading && <p role="status">Checking your emergency statusâ€¦</p>}

        {!loading && !openAlert && (
          <>
            <h2>{t("helpImmediate")}</h2>
            <p>{t("genuineEmergency")}</p>

            {step !== "confirm-send" && step !== "sending" && (
              <button
                className="sos-button"
                type="button"
                onClick={() => { setError(""); setNotice(""); setStep("confirm-send"); }}
              >
                {t("sendEmergency")}
              </button>
            )}

            {(step === "confirm-send" || step === "sending") && (
              <div
                className="sos-confirm"
                role="alertdialog"
                aria-labelledby="sos-confirm-title"
                aria-describedby="sos-confirm-gps"
                ref={confirmRef}
                tabIndex={-1}
                onKeyDown={onConfirmKeyDown}
              >
                <h3 id="sos-confirm-title">Send an emergency SOS now?</h3>
                <p id="sos-confirm-gps" role="status" aria-live="polite">{gpsLine}</p>
                <div className="sos-confirm-actions">
                  <button className="sos-confirm-send" type="button" onClick={sendNow} disabled={step === "sending"}>
                    {step === "sending" ? "Sending SOSâ€¦" : "Yes, send SOS"}
                  </button>
                  <button className="sos-confirm-cancel" type="button" onClick={() => setStep("idle")} disabled={step === "sending"}>
                    No, go back
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && openAlert && (
          <>
            <h2 role="status" aria-live="polite">{statusHeadline(openAlert)}</h2>
            <p>
              Sent {formatDateTime(openAlert.createdAt)}.
              {openAlert.assignedResponder
                ? ` ${responderLabel(openAlert)} acknowledged it ${formatDateTime(openAlert.acknowledgedAt)}.`
                : " No responder has acknowledged it yet."}
            </p>
            <p className="muted">
              Notifications submitted to {openAlert.notificationDelivery.sent} responder device(s). This does not
              confirm that a person has seen the alert, so call campus security if you can.
            </p>
            <p className="muted" role="status">{locationSummary(openAlert)}</p>

            {openAlert.location && (
              <LocationMap marker={openAlert.location} label="Location shared with responders" height={200} />
            )}

            <div className="sos-actions">
              <button type="button" className="sos-secondary" onClick={updateLocation} disabled={refreshing}>
                <RefreshCw size={16} aria-hidden="true" />
                {refreshing ? "Updating locationâ€¦" : openAlert.location ? "Update my location" : "Add my location"}
              </button>
              {step !== "confirm-cancel" && step !== "cancelling" && (
                <button type="button" className="sos-secondary danger" onClick={() => setStep("confirm-cancel")}>
                  <X size={16} aria-hidden="true" /> Cancel SOS
                </button>
              )}
            </div>

            {(step === "confirm-cancel" || step === "cancelling") && (
              <div
                className="sos-confirm"
                role="alertdialog"
                aria-labelledby="sos-cancel-title"
                ref={confirmRef}
                tabIndex={-1}
                onKeyDown={onConfirmKeyDown}
              >
                <h3 id="sos-cancel-title">Cancel this SOS?</h3>
                <p>
                  {openAlert.assignedResponder
                    ? `${openAlert.assignedResponder.name} is already responding and will be told.`
                    : "Responders will be told that you no longer need help."}{" "}
                  The alert stays on record.
                </p>
                <label className="sos-reason">
                  Reason
                  <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} disabled={step === "cancelling"}>
                    {CANCEL_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                  </select>
                </label>
                <div className="sos-confirm-actions">
                  <button className="sos-confirm-send" type="button" onClick={cancelNow} disabled={step === "cancelling"}>
                    {step === "cancelling" ? "Cancellingâ€¦" : "Yes, cancel SOS"}
                  </button>
                  <button className="sos-confirm-cancel" type="button" onClick={() => setStep("idle")} disabled={step === "cancelling"}>
                    Keep SOS active
                  </button>
                </div>
              </div>
            )}

            <SosTimeline events={openAlert.timeline} />
          </>
        )}

        {notice && <p className="muted" role="status">{notice}</p>}
        {error && <p className="muted" role="alert">{error}</p>}

        <div className="sos-details">
          <span><MapPin size={17} aria-hidden="true" /> {t("lastLocation")}</span>
          <span><Users size={17} aria-hidden="true" /> Security officers and available volunteers are notified</span>
          <span><Phone size={17} aria-hidden="true" /> Contact campus security directly for immediate assistance</span>
        </div>
      </div>

      <section className="sos-history" aria-labelledby="sos-history-title">
        <h2 id="sos-history-title">Your emergency history</h2>
        {!loading && previousAlerts.length === 0 && <p className="muted">You have no previous emergency reports.</p>}
        <ul>
          {previousAlerts.map((alert) => (
            <li key={alert.id}>
              <details>
                <summary>
                  <strong>{statusHeadline(alert)}</strong>
                  <span> Â· {formatDateTime(alert.createdAt)}</span>
                </summary>
                <dl>
                  <div><dt>Sent</dt><dd>{formatDateTime(alert.createdAt)}</dd></div>
                  <div><dt>Acknowledged</dt><dd>{alert.acknowledgedAt ? formatDateTime(alert.acknowledgedAt) : "No"}</dd></div>
                  <div><dt>Handled by</dt><dd>{responderLabel(alert) || "No responder assigned"}</dd></div>
                  <div><dt>Closed</dt><dd>{formatDateTime(alert.resolvedAt ?? alert.cancelledAt)}</dd></div>
                  <div><dt>Location</dt><dd>{locationSummary(alert)}</dd></div>
                </dl>
                <SosTimeline events={alert.timeline} />
              </details>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}


