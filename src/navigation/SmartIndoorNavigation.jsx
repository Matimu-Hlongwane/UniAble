import { useEffect, useState } from 'react'

import {
  getNavigationLocations,
  calculateNavigationRoute,
} from './navigationService'

// ============================================================
// FLOOR PLANS
// ============================================================

const floorPlans = {
  level1: {
    label: 'Level 1',
    src: '/navigation/IMG-20261105-WA0009.jpg',
  },
  level3: {
    label: 'Level 3',
    src: '/navigation/IMG-20261105-WA0011.jpg',
  },
  level4: {
    label: 'Level 4',
    src: '/navigation/IMG-20261105-WA0010.jpg',
  },
}

const getFloorPlan = (floorId) => {
  if (!floorId) return null

  const normalized = String(floorId)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('floor', 'level')

  return floorPlans[normalized] || null
}

const formatFloor = (floorId) => {
  if (!floorId) return 'Floor not specified'

  return String(floorId)
    .replace('level', 'Level ')
    .replace('floor', 'Level ')
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function SmartIndoorNavigation({
  language = 'English',
  onBack,
}) {
  // ==========================================================
  // STATE
  // ==========================================================

  const [locations, setLocations] = useState([])

  const [startLocation, setStartLocation] = useState('entrance')
  const [destination, setDestination] = useState('lectureRoomL1A')

  const [route, setRoute] = useState([])
  const [connections, setConnections] = useState([])
  const [distance, setDistance] = useState(0)

  const [currentStep, setCurrentStep] = useState(0)

  const [message, setMessage] = useState(
    'Choose your starting point and destination.'
  )

  const [loadingLocations, setLoadingLocations] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')

  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [lastSpokenText, setLastSpokenText] = useState('')
  const [speechSpeaking, setSpeechSpeaking] = useState(false)
  const [speechPaused, setSpeechPaused] = useState(false)
  const [speechError, setSpeechError] = useState('')

  // ==========================================================
  // SPEECH LANGUAGE
  // ==========================================================

  const getSpeechLanguage = () => {
    const selectedLanguage = String(language).toLowerCase()

    if (selectedLanguage.includes('zulu')) return 'zu-ZA'
    if (selectedLanguage.includes('xhosa')) return 'xh-ZA'

    if (
      selectedLanguage.includes('sesotho') ||
      selectedLanguage.includes('sotho')
    ) {
      return 'st-ZA'
    }

    return 'en-ZA'
  }

  // ==========================================================
  // TEXT TO SPEECH
  // ==========================================================

  const speak = (text) => {
    if (!text || !voiceEnabled) return

    if (
      typeof window === 'undefined' ||
      !window.speechSynthesis
    ) {
      setSpeechError('Voice guidance is unavailable on this device.')
      return
    }

    window.speechSynthesis.cancel()

    const speech = new SpeechSynthesisUtterance(text)
    const speechLanguage = getSpeechLanguage()

    speech.lang = speechLanguage
    speech.rate = 0.9
    speech.pitch = 1
    speech.volume = 1

    const voices = window.speechSynthesis.getVoices()

    const matchingVoice =
      voices.find(
        voice =>
          voice.lang.toLowerCase() === speechLanguage.toLowerCase()
      ) ||
      voices.find(
        voice =>
          voice.lang.toLowerCase().startsWith(
            speechLanguage.substring(0, 2).toLowerCase()
          )
      )

    if (matchingVoice) {
      speech.voice = matchingVoice
    }

    speech.onstart = () => {
      setSpeechSpeaking(true)
      setSpeechPaused(false)
      setSpeechError('')
    }

    speech.onend = () => {
      setSpeechSpeaking(false)
      setSpeechPaused(false)
    }

    speech.onerror = (event) => {
      setSpeechSpeaking(false)
      setSpeechPaused(false)
      setSpeechError(`Voice error: ${event.error}`)
    }

    setLastSpokenText(text)
    setSpeechError('')

    window.speechSynthesis.speak(speech)
  }

  // ==========================================================
  // ENABLE VOICE GUIDANCE
  // ==========================================================

  const enableVoiceGuidance = () => {
    if (
      typeof window === 'undefined' ||
      !window.speechSynthesis
    ) {
      setSpeechError(
        'Voice guidance is not supported by this browser.'
      )
      return
    }

    setVoiceEnabled(true)

    const text = 'Voice guidance is now enabled.'

    setLastSpokenText(text)
    setSpeechError('')

    window.speechSynthesis.cancel()

    const speech = new SpeechSynthesisUtterance(text)

    speech.lang = getSpeechLanguage()
    speech.rate = 0.9

    speech.onstart = () => {
      setSpeechSpeaking(true)
      setSpeechPaused(false)
    }

    speech.onend = () => {
      setSpeechSpeaking(false)
      setSpeechPaused(false)
    }

    speech.onerror = (event) => {
      setSpeechSpeaking(false)
      setSpeechError(`Voice error: ${event.error}`)
    }

    window.speechSynthesis.speak(speech)
  }

  // ==========================================================
  // VOICE CONTROLS
  // ==========================================================

  const replaySpeech = () => {
    if (lastSpokenText) speak(lastSpokenText)
  }

  const pauseSpeech = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause()
      setSpeechPaused(true)
    }
  }

  const resumeSpeech = () => {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume()
      setSpeechPaused(false)
    }
  }

  const stopSpeech = () => {
    if (
      typeof window !== 'undefined' &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel()
    }

    setSpeechSpeaking(false)
    setSpeechPaused(false)
  }

  // ==========================================================
  // LOAD LOCATIONS
  // ==========================================================

  useEffect(() => {
    let active = true

    const loadLocations = async () => {
      try {
        setLoadingLocations(true)
        setError('')

        const data = await getNavigationLocations()

        if (!active) return

        setLocations(data)

        setStartLocation(
          data.some(item => item.id === 'entrance')
            ? 'entrance'
            : data[0]?.id || ''
        )

        setDestination(
          data.some(item => item.id === 'lectureRoomL1A')
            ? 'lectureRoomL1A'
            : data[1]?.id || data[0]?.id || ''
        )
      } catch (err) {
        if (!active) return

        setError(err.message)
        setMessage('Unable to load campus locations.')
      } finally {
        if (active) setLoadingLocations(false)
      }
    }

    loadLocations()

    return () => {
      active = false

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // ==========================================================
  // CALCULATE ROUTE
  // ==========================================================

  const calculateRoute = async () => {
    if (!startLocation || !destination) {
      setMessage('Please select a starting point and destination.')
      return
    }

    if (startLocation === destination) {
      resetNavigation()

      const text = 'You are already at your destination.'

      setMessage(text)
      speak(text)
      return
    }

    stopSpeech()

    try {
      setCalculating(true)
      setError('')
      setSpeechError('')

      setRoute([])
      setConnections([])
      setDistance(0)
      setCurrentStep(0)

      const result = await calculateNavigationRoute(
        startLocation,
        destination
      )

      if (!result.route?.length) {
        throw new Error('No accessible route was found.')
      }

      if (result.accessible === false) {
        throw new Error('This route is not accessible.')
      }

      if (
        !Array.isArray(result.connections) ||
        result.connections.length !== result.route.length - 1
      ) {
        throw new Error('The route instructions are incomplete.')
      }

      const validConnections = result.connections.map(connection => {
        const instruction =
          connection.instruction ||
          connection.forwardInstruction ||
          connection.reverseInstruction

        if (!instruction) {
          throw new Error(
            'A route connection is missing its instruction.'
          )
        }

        return {
          ...connection,
          instruction,
          accessible: connection.accessible !== false,
        }
      })

      if (validConnections.some(item => !item.accessible)) {
        throw new Error('The route contains an inaccessible connection.')
      }

      setRoute(result.route)
      setConnections(validConnections)
      setDistance(result.distanceMeters || 0)
      setCurrentStep(0)

      const destinationName =
        result.route[result.route.length - 1].name

      const text =
        `Route found to ${destinationName}. ${validConnections[0]?.instruction || ''}`

      setMessage(text)
      speak(text)

    } catch (err) {
      setRoute([])
      setConnections([])
      setDistance(0)
      setCurrentStep(0)

      setError(err.message)
      setMessage(err.message)

    } finally {
      setCalculating(false)
    }
  }

  // ==========================================================
  // NEXT STEP
  // ==========================================================

  const nextStep = () => {
    if (!connections.length || arrived) return

    if (currentStep >= connections.length - 1) {
      const destinationName =
        route[route.length - 1]?.name || 'your destination'

      const text = `You have arrived at ${destinationName}.`

      setCurrentStep(connections.length)
      setMessage(text)
      speak(text)

      return
    }

    const nextIndex = currentStep + 1
    const text = connections[nextIndex].instruction

    setCurrentStep(nextIndex)
    setMessage(text)
    speak(text)
  }

  // ==========================================================
  // PREVIOUS STEP
  // ==========================================================

  const previousStep = () => {
    if (!connections.length || currentStep === 0) return

    const previousIndex =
      currentStep >= connections.length
        ? connections.length - 1
        : currentStep - 1

    const text = connections[previousIndex].instruction

    setCurrentStep(previousIndex)
    setMessage(text)
    speak(text)
  }

  // ==========================================================
  // RESET NAVIGATION
  // ==========================================================

  const resetNavigation = () => {
    stopSpeech()

    setRoute([])
    setConnections([])
    setDistance(0)
    setCurrentStep(0)

    setError('')
    setSpeechError('')
    setLastSpokenText('')

    setMessage('Choose your starting point and destination.')
  }

  // ==========================================================
  // ACTIVE FLOOR PLAN AND ARRIVAL
  // ==========================================================

  const currentLocationIndex = route.length
    ? Math.min(currentStep, route.length - 1)
    : 0

  const activeFloorPlan = route.length
    ? getFloorPlan(route[currentLocationIndex]?.floorId)
    : null

  const arrived =
    connections.length > 0 &&
    currentStep >= connections.length

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="navigation-container">

      <div className="navigation-header">
        <button
          className="secondary-button"
          onClick={() => {
            stopSpeech()
            onBack?.()
          }}
          type="button"
        >
          ← Back
        </button>

        <div>
          <h1>Smart Indoor Navigation</h1>
          <p>Accessible navigation inside buildings</p>
        </div>
      </div>

      <div className="navigation-accessibility">
        <span className="accessibility-icon">♿</span>

        <div>
          <strong>Accessibility Mode</strong>
          <p>Routes use accessible pathways.</p>
        </div>
      </div>

      <div className="navigation-card">
        <label htmlFor="start-location">
          📍 Current Location
        </label>

        <select
          id="start-location"
          value={startLocation}
          onChange={event => setStartLocation(event.target.value)}
          disabled={loadingLocations || calculating}
        >
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name} — {formatFloor(location.floorId)}
            </option>
          ))}
        </select>
      </div>

      <div className="navigation-card">
        <label htmlFor="destination">
          🎯 Destination
        </label>

        <select
          id="destination"
          value={destination}
          onChange={event => setDestination(event.target.value)}
          disabled={loadingLocations || calculating}
        >
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name} — {formatFloor(location.floorId)}
            </option>
          ))}
        </select>
      </div>

      <button
        className="primary-button navigation-start-button"
        onClick={calculateRoute}
        type="button"
        disabled={
          loadingLocations ||
          calculating ||
          !locations.length
        }
      >
        {calculating
          ? 'Calculating Route...'
          : '🧭 Find Accessible Route'}
      </button>

      {loadingLocations && (
        <p role="status">Loading campus locations...</p>
      )}

      <div
        className="navigation-message"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>Navigation Assistant</strong>
        <p>{message}</p>
      </div>

      {error && (
        <p className="navigation-error" role="alert">
          {error}
        </p>
      )}

      {route.length > 0 && (
        <div className="navigation-card">
          <h2>🗺️ Your Route</h2>

          <p>Estimated route distance: {distance} metres</p>

          <div className="route-list">
            {route.map((location, index) => (
              <div
                key={location.id}
                className={
                  index === currentLocationIndex
                    ? 'route-location current'
                    : 'route-location'
                }
              >
                <span className="route-number">
                  {index + 1}
                </span>

                <div>
                  <strong>{location.name}</strong>

                  <small>{formatFloor(location.floorId)}</small>

                  {index === currentLocationIndex && (
                    <small>
                      {arrived ? 'Destination reached' : 'Current step'}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {route.length > 0 && activeFloorPlan && (
        <section className="navigation-card floor-plan-card">
          <div className="floor-plan-heading">
            <h2>{activeFloorPlan.label} Floor Plan</h2>
            <span>Campus layout reference</span>
          </div>

          <img
            className="floor-plan-image"
            src={activeFloorPlan.src}
            alt={`${activeFloorPlan.label} floor plan`}
          />

          <p className="floor-plan-note">
            Reference image only. Follow the navigation
            instructions and campus accessibility signs.
          </p>
        </section>
      )}

      {connections.length > 0 && (
        <div className="navigation-card">
          <h2>👣 Step-by-Step Directions</h2>

          <div className="directions">
            {connections.map((connection, index) => (
              <div
                key={`${connection.from}-${connection.to}`}
                className={
                  index === currentStep
                    ? 'direction-item current'
                    : 'direction-item'
                }
              >
                <span>{index + 1}</span>
                <p>{connection.instruction}</p>
              </div>
            ))}
          </div>

          {arrived && (
            <p className="arrival-message">
              ✓ You have arrived at your destination.
            </p>
          )}
        </div>
      )}

      {route.length > 0 && (
        <div className="navigation-card voice-controls">
          <h2>🔊 Voice Guidance</h2>

          <p>Listen to spoken navigation instructions.</p>

          <div className="navigation-controls">
            <button
              className="secondary-button"
              onClick={replaySpeech}
              disabled={!lastSpokenText}
              type="button"
            >
              🔁 Replay
            </button>

            <button
              className="secondary-button"
              onClick={pauseSpeech}
              disabled={!speechSpeaking || speechPaused}
              type="button"
            >
              ⏸ Pause
            </button>

            <button
              className="secondary-button"
              onClick={resumeSpeech}
              disabled={!speechPaused}
              type="button"
            >
              ▶ Resume
            </button>

            <button
              className="secondary-button"
              onClick={stopSpeech}
              disabled={!speechSpeaking && !speechPaused}
              type="button"
            >
              ⏹ Stop
            </button>
          </div>
        </div>
      )}

      {connections.length > 0 && (
        <div className="navigation-controls">
          <button
            className="secondary-button"
            onClick={previousStep}
            disabled={currentStep === 0}
            type="button"
          >
            ← Previous
          </button>

          <button
            className="primary-button"
            onClick={nextStep}
            disabled={arrived}
            type="button"
          >
            {arrived
              ? '✓ Arrived'
              : currentStep === connections.length - 1
                ? '✓ Finish Route'
                : 'Next →'}
          </button>
        </div>
      )}

      {route.length > 0 && (
        <button
          className="reset-navigation-button"
          onClick={resetNavigation}
          type="button"
        >
          🔄 Start New Route
        </button>
      )}

      <div className="voice-guidance">
        <span>🔊</span>

        <div>
          <strong>
            {voiceEnabled
              ? 'Voice Guidance Enabled'
              : 'Voice Guidance Not Yet Enabled'}
          </strong>

          <p>Language: {language}</p>

          <p>
            Spoken directions depend on the voices installed on the device.
          </p>

          <button
            className="primary-button"
            onClick={enableVoiceGuidance}
            type="button"
          >
            {voiceEnabled
              ? '🔊 Test Voice Again'
              : '🔊 Enable Voice Guidance'}
          </button>

          {speechError && (
            <p className="navigation-error" role="alert">
              {speechError}
            </p>
          )}

          <p role="status">
            {speechSpeaking
              ? 'Speaking directions...'
              : speechPaused
                ? 'Voice guidance paused.'
                : ''}
          </p>
        </div>
      </div>

    </div>
  )
}

export default SmartIndoorNavigation

