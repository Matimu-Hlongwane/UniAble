import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useSettings } from "../context/settingsContext/SettingsContext";
import {
  getNavigationLocations,
  calculateNavigationRoute,
} from "../services/navigationService";
import {
  speak as speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
} from "../services/speechService";

import "./SmartIndoorNavigation.css";

const FLOOR_PLANS = {
  level1: {
    label: "Level 1",
    src: "/navigation/IMG-20261105-WA0009.jpg",
  },
  level3: {
    label: "Level 3",
    src: "/navigation/IMG-20261105-WA0011.jpg",
  },
  level4: {
    label: "Level 4",
    src: "/navigation/IMG-20261105-WA0010.jpg",
  },
};

function getFloorPlan(floorId) {
  if (!floorId) return null;

  const normalized = String(floorId)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("floor", "level");

  return FLOOR_PLANS[normalized] || null;
}

function formatFloor(floorId) {
  if (!floorId) return "Floor not specified";

  return String(floorId)
    .replace(/^level/i, "Level ")
    .replace(/^floor/i, "Level ");
}

export default function SmartIndoorNavigation() {
  const {
    language,
    locale,
    voiceAssistanceEnabled,
    spokenResponses,
  } = useSettings();

  const [locations, setLocations] = useState([]);
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");

  const [route, setRoute] = useState([]);
  const [connections, setConnections] = useState([]);
  const [distance, setDistance] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const [loadingLocations, setLoadingLocations] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    "Choose your starting point and destination."
  );

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speechSpeaking, setSpeechSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [lastSpokenText, setLastSpokenText] = useState("");

  const voiceAvailable = voiceAssistanceEnabled && spokenResponses;

  const arrived = connections.length > 0 && currentStep >= connections.length;

  const currentLocationIndex = route.length
    ? Math.min(currentStep, route.length - 1)
    : 0;

  const activeFloorPlan = route.length
    ? getFloorPlan(route[currentLocationIndex]?.floorId)
    : null;

  const selectedStart = useMemo(
    () => locations.find((item) => item.id === startLocation),
    [locations, startLocation]
  );

  const selectedDestination = useMemo(
    () => locations.find((item) => item.id === destination),
    [locations, destination]
  );

  const stopSpeech = useCallback(() => {
    stopSpeaking();
    setSpeechSpeaking(false);
    setSpeechPaused(false);
  }, []);

  const speak = useCallback(
    async (text, force = false) => {
      if (!text || (!voiceEnabled && !force)) return;

      if (!voiceAvailable) {
        setSpeechError(
          "Enable voice assistance and spoken responses in Accessibility Settings."
        );
        return;
      }

      setLastSpokenText(text);
      setSpeechError("");

      try {
        const result = await speakText(text, {
          locale,
          force,
          onStart: () => {
            setSpeechSpeaking(true);
            setSpeechPaused(false);
            setSpeechError("");
          },
          onEnd: () => {
            setSpeechSpeaking(false);
            setSpeechPaused(false);
          },
          onError: (speechError) => {
            setSpeechSpeaking(false);
            setSpeechPaused(false);
            setSpeechError(
              speechError?.message || "Voice guidance could not be played."
            );
          },
        });

        if (!result.started && result.reason !== "cancelled") {
          setSpeechSpeaking(false);
          setSpeechPaused(false);
          setSpeechError(
            result.reason === "paused"
              ? "Voice guidance is paused."
              : "A suitable voice is not available for the selected language on this device."
          );
        }
      } catch (speechError) {
        setSpeechSpeaking(false);
        setSpeechPaused(false);
        setSpeechError(
          speechError?.message || "Voice guidance could not be started."
        );
      }
    },
    [locale, voiceAvailable, voiceEnabled]
  );

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        setLoadingLocations(true);
        setError("");

        const data = await getNavigationLocations();

        if (!active) return;

        const usableLocations = data.filter(
          (item) => item.id && item.name && item.accessible !== false
        );

        setLocations(usableLocations);

        const preferredStart = usableLocations.find(
          (item) => item.id === "entrance"
        );

        const preferredDestination = usableLocations.find(
          (item) => item.id === "lectureRoomL1A"
        );

        const first = preferredStart || usableLocations[0];
        const second =
          preferredDestination ||
          usableLocations.find((item) => item.id !== first?.id);

        setStartLocation(first?.id || "");
        setDestination(second?.id || "");

        if (!usableLocations.length) {
          setError("No accessible campus locations are currently available.");
        }
      } catch (loadError) {
        if (!active) return;

        setError(loadError.message || "Unable to load campus locations.");
        setMessage("Unable to load campus locations.");
      } finally {
        if (active) setLoadingLocations(false);
      }
    }

    loadLocations();

    return () => {
      active = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!voiceAvailable) {
      setVoiceEnabled(false);
      stopSpeech();
    }
  }, [voiceAvailable, stopSpeech]);

  const resetNavigation = useCallback(() => {
    stopSpeech();

    setRoute([]);
    setConnections([]);
    setDistance(0);
    setCurrentStep(0);
    setError("");
    setSpeechError("");
    setLastSpokenText("");
    setMessage("Choose your starting point and destination.");
  }, [stopSpeech]);

  const calculateRoute = async () => {
    if (!startLocation || !destination) {
      setMessage("Please select a starting point and destination.");
      return;
    }

    if (startLocation === destination) {
      resetNavigation();
      setMessage("You are already at your destination.");
      return;
    }

    stopSpeech();

    try {
      setCalculating(true);
      setError("");
      setSpeechError("");
      setRoute([]);
      setConnections([]);
      setDistance(0);
      setCurrentStep(0);

      const result = await calculateNavigationRoute(
        startLocation,
        destination
      );

      if (!result.route?.length) {
        throw new Error("No accessible route was found.");
      }

      if (result.accessible === false) {
        throw new Error("This route is not accessible.");
      }

      if (
        !Array.isArray(result.connections) ||
        result.connections.length !== result.route.length - 1
      ) {
        throw new Error("The route instructions are incomplete.");
      }

      const validConnections = result.connections.map((connection) => {
        if (
          typeof connection.instruction !== "string" ||
          !connection.instruction.trim() ||
          connection.accessible === false
        ) {
          throw new Error(
            "A route connection is missing a valid accessible instruction."
          );
        }

        return connection;
      });

      setRoute(result.route);
      setConnections(validConnections);
      setDistance(Number(result.distanceMeters) || 0);
      setCurrentStep(0);

      const destinationName =
        result.route[result.route.length - 1].name;

      const firstInstruction = validConnections[0]?.instruction || "";

      const routeMessage = `Accessible route found to ${destinationName}. ${firstInstruction}`;

      setMessage(routeMessage);

      if (voiceEnabled && voiceAvailable) {
        speak(routeMessage);
      }
    } catch (routeError) {
      setRoute([]);
      setConnections([]);
      setDistance(0);
      setCurrentStep(0);
      setError(routeError.message || "Unable to calculate the route.");
      setMessage("We could not calculate that route.");
    } finally {
      setCalculating(false);
    }
  };

  const nextStep = () => {
    if (!connections.length || arrived) return;

    const instruction = connections[currentStep]?.instruction;

    if (currentStep < connections.length) {
      const nextIndex = currentStep + 1;

      setCurrentStep(nextIndex);

      if (nextIndex >= connections.length) {
        const destinationName =
          route[route.length - 1]?.name || "your destination";

        const arrivalMessage = `You have arrived at ${destinationName}.`;

        setMessage(arrivalMessage);
        speak(arrivalMessage);
        return;
      }

      const nextInstruction = connections[nextIndex]?.instruction;

      setMessage(nextInstruction || "Continue along the accessible route.");

      if (nextInstruction) speak(nextInstruction);
    } else if (instruction) {
      speak(instruction);
    }
  };

  const previousStep = () => {
    if (!connections.length || currentStep <= 0) return;

    const previousIndex = currentStep - 1;
    setCurrentStep(previousIndex);

    const instruction = connections[previousIndex]?.instruction;

    if (instruction) {
      setMessage(instruction);
      speak(instruction);
    }
  };

  const enableVoiceGuidance = () => {
    if (!voiceAvailable) {
      setSpeechError(
        "Voice assistance and spoken responses must both be enabled in Accessibility Settings."
      );
      return;
    }

    setVoiceEnabled(true);
    speak("Voice guidance is now enabled.", true);
  };

  const replaySpeech = () => {
    if (lastSpokenText) speak(lastSpokenText, true);
  };

  const pauseSpeech = () => {
    if (pauseSpeaking()) {
      setSpeechPaused(true);
      setSpeechSpeaking(false);
      setSpeechError("");
    } else {
      setSpeechError(
        "Pause is not supported by the current voice engine. You can stop and replay the instruction."
      );
    }
  };

  const resumeSpeech = () => {
    if (resumeSpeaking()) {
      setSpeechPaused(false);
      setSpeechSpeaking(true);
      setSpeechError("");
    } else {
      setSpeechError(
        "Resume is not supported by the current voice engine. Please replay the instruction."
      );
    }
  };

  return (
    <div className="smart-navigation">
      <div className="smart-navigation-heading">
        <div>
          <span className="smart-navigation-eyebrow">
            Accessible campus directions
          </span>
          <h2>Smart Indoor Navigation</h2>
          <p>
            Find accessible pathways between campus locations with
            step-by-step directions.
          </p>
        </div>

        <div className="smart-navigation-accessible">
          <Accessibility size={19} />
          <span>Accessibility mode</span>
        </div>
      </div>

      <div className="smart-navigation-selection">
        <div className="smart-navigation-card">
          <label htmlFor="navigation-start">
            <MapPin size={17} />
            Starting location
          </label>

          <select
            id="navigation-start"
            value={startLocation}
            onChange={(event) => {
              setStartLocation(event.target.value);
              resetNavigation();
            }}
            disabled={loadingLocations || calculating}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} — {formatFloor(location.floorId)}
              </option>
            ))}
          </select>

          {selectedStart && (
            <small>Starting at {selectedStart.name}</small>
          )}
        </div>

        <div className="smart-navigation-card">
          <label htmlFor="navigation-destination">
            <Navigation size={17} />
            Destination
          </label>

          <select
            id="navigation-destination"
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value);
              resetNavigation();
            }}
            disabled={loadingLocations || calculating}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} — {formatFloor(location.floorId)}
              </option>
            ))}
          </select>

          {selectedDestination && (
            <small>Going to {selectedDestination.name}</small>
          )}
        </div>
      </div>

      <button
        className="smart-navigation-primary"
        onClick={calculateRoute}
        type="button"
        disabled={
          loadingLocations ||
          calculating ||
          !locations.length ||
          !startLocation ||
          !destination
        }
      >
        <Navigation size={18} />
        {loadingLocations
          ? "Loading campus locations..."
          : calculating
            ? "Calculating accessible route..."
            : "Find accessible route"}
      </button>

      {loadingLocations && (
        <p className="smart-navigation-status" role="status">
          Loading accessible campus locations...
        </p>
      )}

      {error && (
        <div className="smart-navigation-error" role="alert">
          {error}
        </div>
      )}

      {!error && message && (
        <div className="smart-navigation-message" role="status" aria-live="polite">
          <strong>Navigation assistant</strong>
          <p>{message}</p>
        </div>
      )}

      {route.length > 0 && (
        <>
          <section className="smart-navigation-card">
            <div className="smart-navigation-section-heading">
              <div>
                <span className="smart-navigation-eyebrow">Your journey</span>
                <h3>Accessible route</h3>
              </div>
              <span className="smart-navigation-distance">
                <Clock3 size={15} />
                {distance} m estimated
              </span>
            </div>

            <p className="smart-navigation-note">
              Distance is an estimate based on the supplied campus map data.
              Actual walking distance may differ.
            </p>

            <div className="smart-navigation-route-list">
              {route.map((location, index) => (
                <div
                  key={location.id}
                  className={`smart-navigation-route-stop ${
                    index === currentLocationIndex ? "active" : ""
                  } ${index < currentLocationIndex ? "completed" : ""}`}
                >
                  <span className="smart-navigation-stop-number">
                    {index < currentLocationIndex ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div>
                    <strong>{location.name}</strong>
                    <small>{formatFloor(location.floorId)}</small>
                    {index === currentLocationIndex && (
                      <small className="smart-navigation-current-label">
                        {arrived ? "Destination reached" : "Current position in route"}
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {activeFloorPlan && (
            <section className="smart-navigation-card">
              <div className="smart-navigation-section-heading">
                <div>
                  <span className="smart-navigation-eyebrow">Campus layout</span>
                  <h3>{activeFloorPlan.label} floor plan</h3>
                </div>
              </div>

              <div className="smart-navigation-floor-image">
                <img
                  src={activeFloorPlan.src}
                  alt={`${activeFloorPlan.label} campus floor plan`}
                  loading="lazy"
                />
              </div>

              <p className="smart-navigation-note">
                Reference image only. Follow the written directions and
                campus accessibility signs.
              </p>
            </section>
          )}

          <section className="smart-navigation-card">
            <div className="smart-navigation-section-heading">
              <div>
                <span className="smart-navigation-eyebrow">Your instructions</span>
                <h3>Step-by-step directions</h3>
              </div>
            </div>

            <div className="smart-navigation-directions">
              {connections.map((connection, index) => (
                <div
                  key={`${connection.from}-${connection.to}`}
                  className={`smart-navigation-direction ${
                    index === currentStep ? "active" : ""
                    } ${index < currentStep ? "completed" : ""}`}
                >
                  <span>{index + 1}</span>
                  <p>{connection.instruction}</p>
                </div>
              ))}
            </div>

            {arrived && (
              <div className="smart-navigation-arrival">
                <CheckCircle2 size={20} />
                You have arrived at your destination.
              </div>
            )}
          </section>

          <section className="smart-navigation-card">
            <div className="smart-navigation-section-heading">
              <div>
                <span className="smart-navigation-eyebrow">Audio assistance</span>
                <h3>Voice guidance</h3>
              </div>

              {voiceEnabled ? (
                <Volume2 size={21} />
              ) : (
                <VolumeX size={21} />
              )}
            </div>

            <p className="smart-navigation-note">
              Selected language: {language}. Spoken directions depend on
              the voices supported by your device.
            </p>

            {!voiceEnabled ? (
              <button
                className="smart-navigation-primary"
                type="button"
                onClick={enableVoiceGuidance}
                disabled={!voiceAvailable}
              >
                <Volume2 size={17} />
                Enable voice guidance
              </button>
            ) : (
              <div className="smart-navigation-controls">
                <button
                  type="button"
                  className="smart-navigation-secondary"
                  onClick={replaySpeech}
                  disabled={!lastSpokenText}
                >
                  <RotateCcw size={16} />
                  Replay
                </button>

                <button
                  type="button"
                  className="smart-navigation-secondary"
                  onClick={pauseSpeech}
                  disabled={!speechSpeaking}
                >
                  <Pause size={16} />
                  Pause
                </button>

                <button
                  type="button"
                  className="smart-navigation-secondary"
                  onClick={resumeSpeech}
                  disabled={!speechPaused}
                >
                  <Play size={16} />
                  Resume
                </button>

                <button
                  type="button"
                  className="smart-navigation-secondary"
                  onClick={stopSpeech}
                  disabled={!speechSpeaking && !speechPaused}
                >
                  <VolumeX size={16} />
                  Stop
                </button>
              </div>
            )}

            {speechError && (
              <p className="smart-navigation-error" role="alert">
                {speechError}
              </p>
            )}

            <p className="smart-navigation-speech-status" role="status">
              {speechSpeaking
                ? "Speaking directions..."
                : speechPaused
                  ? "Voice guidance paused."
                  : ""}
            </p>
          </section>

          <div className="smart-navigation-step-controls">
            <button
              type="button"
              className="smart-navigation-secondary"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={17} />
              Previous
            </button>

            <button
              type="button"
              className="smart-navigation-primary"
              onClick={nextStep}
              disabled={arrived}
            >
              {arrived ? "Arrived" : "Next step"}
              {!arrived && <ArrowRight size={17} />}
            </button>
          </div>

          <button
            type="button"
            className="smart-navigation-reset"
            onClick={resetNavigation}
          >
            <RotateCcw size={16} />
            Start a new route
          </button>
        </>
      )}
    </div>
  );
}
