import React, { useCallback, useEffect, useState } from "react";
import { HeartHandshake, MapPin, Send, ShieldAlert, Users, CheckCircle2, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getCurrentUser, getCurrentUserRole } from "../services/firebaseAuth";
import { useSettings } from "../context/settingsContext/SettingsContext";

const initialForm = {
  type: "General assistance",
  detail: "",
  location: "",
  priority: "Normal",
};

export default function PeerAssistance() {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    let active = true;

    const loadUserRole = async () => {
      try {
        const user = getCurrentUser();
        const role = await getCurrentUserRole(user);

        if (active) {
          setCurrentUserId(user?.uid || null);
          setUserRole(role);
        }
      } catch (error) {
        console.error("Could not load user role:", error);
      }
    };

    loadUserRole();

    return () => {
      active = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [requestData, volunteerData] = await Promise.all([
        api.getRequests(),
        api.getVolunteers(),
      ]);
      setRequests(requestData.requests || []);
      setVolunteers(volunteerData.volunteers || []);
    } catch (err) {
      setError(err?.message || t("connectionProblem"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.detail.trim()) {
      setError(t("requestDetails"));
      return;
    }

    setBusy(true);
    try {
      const result = await api.createRequest({
        type: form.type,
        detail: form.detail.trim(),
        location: form.location.trim() || "Campus",
        priority: form.priority,
      });
      setRequests((current) => [result.request, ...current]);
      setForm(initialForm);
      setMessage(t("requestSent"));
    } catch (err) {
      setError(err?.message || t("connectionProblem"));
    } finally {
      setBusy(false);
    }
  };

  const updateRequest = async (id, status) => {
    try {
      const result = await api.updateRequest(id, status);
      setRequests((current) =>
        current.map((item) => item.id === id ? result.request : item)
      );
    } catch (err) {
      setError(err?.message || t("connectionProblem"));
    }
  };

  const toggleAvailability = async (volunteer) => {
    try {
      const result = await api.setAvailability(volunteer.id, !volunteer.available);
      setVolunteers((current) =>
        current.map((item) => item.id === volunteer.id ? result.volunteer : item)
      );
    } catch (err) {
      setError(err?.message || t("connectionProblem"));
    }
  };

  const registerVolunteer = async () => {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const result = await api.registerVolunteer({});
      setMessage(
        result.alreadyRegistered
          ? "Your volunteer application is already recorded. It is awaiting administrator approval."
          : "Your volunteer application has been submitted and is awaiting administrator approval."
      );
    } catch (err) {
      setError(err?.message || t("connectionProblem"));
    } finally {
      setBusy(false);
    }
  };

  const openEmergency = () => navigate("/emergency");
  const currentVolunteer = volunteers.find(item => item.id === currentUserId);

  return (
    <section className="page peer-page">
      <div className="page-heading peer-heading">
        <div>
          <p className="eyebrow">{t("supportOptions")}</p>
          <h1>{t("peerAssistance")}</h1>
          <p className="muted">{t("peerDescription")}</p>
        </div>
        {userRole === "volunteer" && currentVolunteer && (
          <span className={`availability ${currentVolunteer.available ? "on" : "off"}`}>
            <span className="availability-dot" />
            {currentVolunteer.available ? t("available") : t("unavailable")}
          </span>
        )}
      </div>

      <div className="peer-hero">
        <div className="peer-hero-icon"><HeartHandshake size={26} /></div>
        <div>
          <h2>{t("getPeerHelp")}</h2>
          <p>{t("peerDescription")}</p>
        </div>
      </div>

      {(message || error) && (
        <div className={error ? "peer-message error" : "peer-message success"} role="status">
          {error ? <ShieldAlert size={17} /> : <CheckCircle2 size={17} />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="peer-grid">
        <form className="panel peer-request-form" onSubmit={submitRequest} style={{ display: userRole === "student" ? "block" : "none" }}>
          <div className="panel-title">
            <h2>{t("requestHelp")}</h2>
          </div>

          <div className="form-group">
            <label htmlFor="peer-type">{t("requestType")}</label>
            <select
              id="peer-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="General assistance">{t("generalSupport")}</option>
              <option value="Academic support">{t("academicSupport")}</option>
              <option value="Mobility support">{t("mobilitySupport")}</option>
              <option value="Campus support">{t("campusSupport")}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="peer-detail">{t("requestDetails")}</label>
            <textarea
              id="peer-detail"
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              placeholder={t("peerDescription")}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="peer-location">{t("requestLocation")}</label>
            <div className="peer-input-with-icon">
              <MapPin size={17} />
              <input
                id="peer-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Campus location"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="peer-priority">{t("priority")}</label>
            <select
              id="peer-priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="Normal">{t("normal")}</option>
              <option value="Urgent">{t("urgent")}</option>
            </select>
          </div>

          <button className="primary-btn peer-submit" type="submit" disabled={busy}>
            <Send size={17} />
            {busy ? t("connecting") : t("submitRequest")}
          </button>
        </form>

        <div className="panel">
          <div className="panel-title">
            <h2>{t("activeVolunteers")}</h2>
            <Users size={19} />
            {userRole === "student" &&
              currentUserId &&
              !volunteers.some((volunteer) => volunteer.id === currentUserId) && (
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={busy}
                  onClick={registerVolunteer}
                >
                  {busy ? t("connecting") : "Register as a volunteer"}
                </button>
              )}
          </div>

          {loading ? (
            <div className="empty-state">{t("connecting")}</div>
          ) : volunteers.length === 0 ? (
            <div className="empty-state">{t("noVolunteers")}</div>
          ) : (
            <div className="peer-volunteer-list">
              {volunteers.map((volunteer) => (
                <div className="peer-volunteer" key={volunteer.id}>
                  <div className="peer-avatar"><Users size={18} /></div>
                  <div className="peer-volunteer-copy">
                    <strong>{volunteer.name}</strong>
                    <small>{volunteer.available ? t("available") : t("unavailable")}</small>
                  </div>
                  {userRole === "volunteer" && volunteer.id === currentUserId && (
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => toggleAvailability(volunteer)}
                    >
                      {volunteer.available ? t("markUnavailable") : t("markAvailable")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel peer-requests-panel">
        <div className="panel-title">
          <h2>{t("openRequests")}</h2>
          <span className="peer-count">{requests.length}</span>
        </div>

        {loading ? (
          <div className="empty-state">{t("connecting")}</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <HeartHandshake size={28} />
            <p>{t("noRequests")}</p>
          </div>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <article className={`request-card ${String(request.priority).toLowerCase()}`} key={request.id}>
                <div className="request-icon"><HeartHandshake size={20} /></div>
                <div className="request-main">
                  <div className="request-top">
                    <strong>{request.type}</strong>
                    <span className={`priority ${String(request.priority).toLowerCase()}`}>
                      {request.priority}
                    </span>
                  </div>
                  <p>{request.detail}</p>
                  <div className="request-meta">
                    <span><MapPin size={14} />{request.location}</span>
                    <span><Clock3 size={14} />{request.createdAt ? new Date(request.createdAt).toLocaleString() : "Time unavailable"}</span>
                    <span><CheckCircle2 size={14} />{request.status}</span>
                  </div>
                  <div className="request-actions">
                    {request.status === "open" &&
                      (
                        userRole === "volunteer" ||
                        userRole === "admin" ||
                        userRole === "disability_office" ||
                        (userRole === "lecturer" && request.type === "Lecture assistance")
                      ) && (
                        <>
                          <button
                            className="secondary-btn"
                            type="button"
                            onClick={() => updateRequest(request.id, "accepted")}
                          >
                            <CheckCircle2 size={15} /> {t("accept")}
                          </button>
                          {userRole !== "volunteer" && (
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() => updateRequest(request.id, "declined")}
                            >
                              {t("decline")}
                            </button>
                          )}
                        </>
                      )}

                    {userRole === "volunteer" &&
                      request.status === "accepted" &&
                      request.assignedVolunteerId === currentUserId && (
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => updateRequest(request.id, "completed")}
                        >
                          <CheckCircle2 size={15} /> Mark completed
                        </button>
                      )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="peer-safety panel">
        <div>
          <span className="eyebrow">{t("safetyReminder")}</span>
          <h2>{t("contactSecurity")}</h2>
          <p>{t("emergencyResponse")}</p>
        </div>
        <button className="secondary-btn" type="button" onClick={openEmergency}>
          <ShieldAlert size={17} />
          {t("emergency")}
        </button>
      </div>
    </section>
  );
}
