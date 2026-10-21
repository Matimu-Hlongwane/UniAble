import { useMemo, useState } from 'react'
import {
  locations,
  connections,
  getLocation,
} from './NavigationData'

// ============================================================
// UNIABLe SMART INDOOR NAVIGATION
// ============================================================

function SmartIndoorNavigation({ language = 'English', onBack }) {
  const [startLocation, setStartLocation] = useState('entrance')
  const [destination, setDestination] = useState('library')
  const [accessibleOnly, setAccessibleOnly] = useState(true)
  const [route, setRoute] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [message, setMessage] = useState(
    'Choose your starting point and destination.'
  )

  // ==========================================================
  // GET AVAILABLE LOCATIONS
  // ==========================================================

  const locationList = useMemo(() => {
    return Object.values(locations)
  }, [])

  // ==========================================================
  // FIND A ROUTE
  // Breadth-first search through the building graph
  // ==========================================================

  const findRoute = (start, end) => {
    if (start === end) {
      return [start]
    }

    const queue = [[start]]
    const visited = new Set([start])

    while (queue.length > 0) {
      const currentPath = queue.shift()
      const currentLocation = currentPath[currentPath.length - 1]

      const availableConnections = connections.filter(
        (connection) => {
          const connected =
            connection.from === currentLocation ||
            connection.to === currentLocation

          if (!connected) {
            return false
          }

          if (accessibleOnly && !connection.accessible) {
            return false
          }

          return true
        }
      )

      for (const connection of availableConnections) {
        const nextLocation =
          connection.from === currentLocation
            ? connection.to
            : connection.from

        if (visited.has(nextLocation)) {
          continue
        }

        const newPath = [...currentPath, nextLocation]

        if (nextLocation === end) {
          return newPath
        }

        visited.add(nextLocation)
        queue.push(newPath)
      }
    }

    return null
  }

  // ==========================================================
  // CALCULATE ROUTE
  // ==========================================================

  const calculateRoute = () => {
    if (startLocation === destination) {
      setRoute([])
      setCurrentStep(0)
      setMessage(
        'You are already at your destination.'
      )
      speak('You are already at your destination.')
      return
    }

    const calculatedRoute = findRoute(
      startLocation,
      destination
    )

    if (!calculatedRoute) {
      setRoute([])
      setCurrentStep(0)
      setMessage(
        'No accessible route was found.'
      )
      speak('No accessible route was found.')
      return
    }

    setRoute(calculatedRoute)
    setCurrentStep(0)

    const destinationName =
      getLocation(destination)?.name

    const routeMessage =
      `Route found to ${destinationName}. Follow the directions below.`

    setMessage(routeMessage)
    speak(routeMessage)
  }

  // ==========================================================
  // FIND CONNECTION BETWEEN TWO LOCATIONS
  // ==========================================================

  const getConnection = (from, to) => {
    return connections.find(
      (connection) =>
        (connection.from === from &&
          connection.to === to) ||
        (connection.from === to &&
          connection.to === from)
    )
  }

  // ==========================================================
  // CREATE HUMAN-READABLE DIRECTIONS
  // ==========================================================

  const getDirectionText = (from, to) => {
    const connection = getConnection(from, to)

    if (!connection) {
      return 'Continue to the next location.'
    }

    const destinationName =
      getLocation(to)?.name || 'next location'

    const direction =
      connection.direction || 'straight'

    if (direction === 'left') {
      return `Turn left and continue ${connection.distance} metres to ${destinationName}.`
    }

    if (direction === 'right') {
      return `Turn right and continue ${connection.distance} metres to ${destinationName}.`
    }

    return `Continue straight for ${connection.distance} metres to ${destinationName}.`
  }

  // ==========================================================
  // VOICE GUIDANCE
  // ==========================================================

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()

      const speech =
        new SpeechSynthesisUtterance(text)

      speech.rate = 0.9
      speech.pitch = 1

      window.speechSynthesis.speak(speech)
    }
  }

  // ==========================================================
  // NEXT NAVIGATION STEP
  // ==========================================================

  const nextStep = () => {
    if (route.length === 0) {
      return
    }

    if (currentStep >= route.length - 1) {
      const arrivalMessage =
        `You have arrived at ${getLocation(destination)?.name}.`

      setMessage(arrivalMessage)
      speak(arrivalMessage)
      return
    }

    const nextStepIndex = currentStep + 1

    const from = route[currentStep]
    const to = route[nextStepIndex]

    const directionText =
      getDirectionText(from, to)

    setCurrentStep(nextStepIndex)
    setMessage(directionText)
    speak(directionText)
  }

  // ==========================================================
  // PREVIOUS STEP
  // ==========================================================

  const previousStep = () => {
    if (route.length === 0 || currentStep === 0) {
      return
    }

    const previousIndex = currentStep - 1

    const from = route[previousIndex]
    const to = route[currentStep]

    const directionText =
      getDirectionText(from, to)

    setCurrentStep(previousIndex)
    setMessage(directionText)
    speak(directionText)
  }

  // ==========================================================
  // RESET NAVIGATION
  // ==========================================================

  const resetNavigation = () => {
    setRoute([])
    setCurrentStep(0)
    setMessage(
      'Choose your starting point and destination.'
    )

    window.speechSynthesis?.cancel()
  }

  // ==========================================================
  // ACCESSIBILITY FILTER
  // ==========================================================

  const toggleAccessibility = () => {
    const newValue = !accessibleOnly

    setAccessibleOnly(newValue)

    setRoute([])
    setCurrentStep(0)

    if (newValue) {
      setMessage(
        'Accessible routes only is enabled.'
      )

      speak(
        'Accessible routes only is enabled.'
      )
    } else {
      setMessage(
        'All available routes are enabled.'
      )

      speak(
        'All available routes are enabled.'
      )
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="navigation-container">

      {/* HEADER */}
      <div className="navigation-header">

        <button
          className="secondary-button"
          onClick={onBack}
          type="button"
        >
          ← Back
        </button>

        <div>
          <h1>Smart Indoor Navigation</h1>

          <p>
            Accessible navigation inside buildings
          </p>
        </div>

      </div>

      {/* ACCESSIBILITY NOTICE */}
      <div className="navigation-accessibility">

        <span className="accessibility-icon">
          ♿
        </span>

        <div>
          <strong>
            Accessibility Mode
          </strong>

          <p>
            Routes will prioritise accessible pathways.
          </p>
        </div>

      </div>

      {/* START LOCATION */}
      <div className="navigation-card">

        <label htmlFor="start-location">
          📍 Current Location
        </label>

        <select
          id="start-location"
          value={startLocation}
          onChange={(event) =>
            setStartLocation(event.target.value)
          }
        >
          {locationList.map((location) => (
            <option
              key={location.id}
              value={location.id}
            >
              {location.name}
            </option>
          ))}
        </select>

      </div>

      {/* DESTINATION */}
      <div className="navigation-card">

        <label htmlFor="destination">
          🎯 Destination
        </label>

        <select
          id="destination"
          value={destination}
          onChange={(event) =>
            setDestination(event.target.value)
          }
        >
          {locationList.map((location) => (
            <option
              key={location.id}
              value={location.id}
            >
              {location.name}
            </option>
          ))}
        </select>

      </div>

      {/* ACCESSIBLE ROUTES */}
      <div className="navigation-card">

        <div className="accessibility-toggle">

          <div>
            <strong>
              ♿ Accessible routes only
            </strong>

            <p>
              Avoid routes that are not marked as
              accessible.
            </p>
          </div>

          <button
            type="button"
            className={
              accessibleOnly
                ? 'toggle-button active'
                : 'toggle-button'
            }
            onClick={toggleAccessibility}
            aria-pressed={accessibleOnly}
          >
            {accessibleOnly ? 'ON' : 'OFF'}
          </button>

        </div>

      </div>

      {/* MAIN BUTTON */}
      <button
        className="primary-button navigation-start-button"
        onClick={calculateRoute}
        type="button"
      >
        🧭 Find Accessible Route
      </button>

      {/* MESSAGE */}
      <div
        className="navigation-message"
        aria-live="polite"
      >
        <strong>
          Navigation Assistant
        </strong>

        <p>
          {message}
        </p>
      </div>

      {/* ROUTE DISPLAY */}
      {route.length > 0 && (
        <div className="navigation-card">

          <h2>🗺️ Your Route</h2>

          <div className="route-list">

            {route.map((locationId, index) => {

              const location =
                getLocation(locationId)

              const isCurrent =
                index === currentStep

              return (
                <div
                  key={locationId}
                  className={
                    isCurrent
                      ? 'route-location current'
                      : 'route-location'
                  }
                >

                  <span className="route-number">
                    {index + 1}
                  </span>

                  <div>
                    <strong>
                      {location?.name}
                    </strong>

                    {isCurrent && (
                      <small>
                        Current step
                      </small>
                    )}
                  </div>

                </div>
              )
            })}

          </div>

        </div>
      )}

      {/* STEP-BY-STEP DIRECTIONS */}
      {route.length > 1 && (
        <div className="navigation-card">

          <h2>
            👣 Step-by-Step Directions
          </h2>

          <div className="directions">

            {route.slice(0, -1).map(
              (locationId, index) => {

                const nextLocation =
                  route[index + 1]

                const direction =
                  getDirectionText(
                    locationId,
                    nextLocation
                  )

                return (
                  <div
                    key={`${locationId}-${nextLocation}`}
                    className={
                      index === currentStep
                        ? 'direction-item current'
                        : 'direction-item'
                    }
                  >

                    <span>
                      {index + 1}
                    </span>

                    <p>
                      {direction}
                    </p>

                  </div>
                )
              }
            )}

          </div>

        </div>
      )}

      {/* NAVIGATION CONTROLS */}
      {route.length > 0 && (
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
            type="button"
          >
            {currentStep >= route.length - 1
              ? '✓ Arrived'
              : 'Next →'}
          </button>

        </div>
      )}

      {/* RESET */}
      {route.length > 0 && (
        <button
          className="reset-navigation-button"
          onClick={resetNavigation}
          type="button"
        >
          🔄 Start New Route
        </button>
      )}

      {/* VOICE GUIDANCE */}
      <div className="voice-guidance">

        <span>
          🔊
        </span>

        <div>
          <strong>
            Voice Guidance Enabled
          </strong>

          <p>
            UniAble can read navigation instructions
            aloud.
          </p>
        </div>

      </div>

    </div>
  )
}

export default SmartIndoorNavigation
