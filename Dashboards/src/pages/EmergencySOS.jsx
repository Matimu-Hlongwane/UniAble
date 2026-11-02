import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/SessionContext.jsx";
import {
  cancelIncident,
  createIncident,
  updateIncidentLocation,
} from "../services/incidents.js";
import "./EmergencySOS.css";

// The alert is raised IMMEDIATELY, before location is known, so help is
// never delayed by a slow or denied GPS fix. Location is attached when it
// arrives (real Geolocation API). In this demo the alert is delivered to
// the Security dashboard via shared browser storage; in production this
// is a call to the security/notifications backend (Cloud Functions + FCM).

export default function EmergencySOS() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState("sent"); // sent | cancelled
  const [locationState, setLocationState] = useState("locating"); // locating | shared | unavailable
  const [coords, setCoords] = useState(null);
  const [problem, setProblem] = useState(null);
  const incidentIdRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const incident = createIncident({
      studentName: user?.name ?? "Unidentified (not signed in)",
      studentUid: user?.uid ?? null,
      type: "Emergency SOS",
    });
    incidentIdRef.current = incident.id;

    function unavailable(message) {
      updateIncidentLocation(incident.id, null, "Location unavailable");
      setLocationState("unavailable");
      setProblem(message);
    }

    if (!("geolocation" in navigator)) {
      unavailable("Location isn’t available on this device or browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        };
        updateIncidentLocation(incident.id, location);
        setCoords(location);
        setLocationState("shared");
      },
      (error) =>
        unavailable(
          error.code === error.PERMISSION_DENIED
            ? "Location access was denied, so security has your alert but not your position."
            : "We couldn’t get your position, so security has your alert but not where you are."
        ),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [user]);

  function handleCancel() {
    if (incidentIdRef.current) cancelIncident(incidentIdRef.current);
    setStatus("cancelled");
    setTimeout(() => navigate(-1), 900);
  }

  return (
    <div className="sos">
      <header className="sos__header">
        <span aria-hidden="true">⚠</span>
        <div>
          <p className="sos__title">Emergency alert</p>
          <p className="sos__subtitle">UniAble Emergency SOS</p>
        </div>
      </header>

      <main className="sos__body">
        <div className={`sos__status-card sos__status-card--${status === "cancelled" ? "error" : "sent"}`} role="status">
          {status === "cancelled" ? (
            <p>Alert cancelled.</p>
          ) : (
            <>
              <p className="sos__status-headline">Alert sent to campus security</p>
              {locationState === "locating" && <p>Sharing your location…</p>}
              {locationState === "shared" && coords && (
                <p className="sos__coords">
                  Location shared: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (±{coords.accuracy} m)
                </p>
              )}
              {locationState === "unavailable" && <p>{problem}</p>}
            </>
          )}
        </div>

        {status !== "cancelled" && (
          <button type="button" className="sos__cancel" onClick={handleCancel}>
            Cancel alert
          </button>
        )}

        <button type="button" className="sos__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <p className="sos__demo-note">
          Demo build: the alert appears on the Security dashboard in this browser. Delivery to real
          security staff needs the back end, which isn’t connected yet.
        </p>
      </main>
    </div>
  );
}
