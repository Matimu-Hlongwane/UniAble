import { useState } from 'react'
import './App.css'

const profiles = [
  { id: 'visual', icon: '◉', name: 'Visual' },
  { id: 'hearing', icon: '♧', name: 'Hearing' },
  { id: 'mobility', icon: '♿', name: 'Mobility' },
  { id: 'neurodivergent', icon: '✣', name: 'Neurodivergent' },
  { id: 'speech', icon: '◈', name: 'Speech' },
  { id: 'colourBlind', icon: '◌', name: 'Colour-blind' },
]

const settingsProfiles = [
  { id: 'visual', icon: '◉', name: 'Visual' },
  { id: 'colourBlind', icon: '◌', name: 'Colour-blind' },
  { id: 'dyslexia', icon: '⌁', name: 'Dyslexia' },
]

function App() {
  const [screen, setScreen] = useState('profile')

  const [selectedProfiles, setSelectedProfiles] = useState([])

  const [settings, setSettings] = useState({
    highContrast: true,
    colourDisplay: true,
    dyslexicFont: false,
    autoCaptions: true,
    audioFirst: true,
    vibrationAlerts: false,
  })

  const toggleProfile = (id) => {
    setSelectedProfiles((current) =>
      current.includes(id)
        ? current.filter((profile) => profile !== id)
        : [...current, id]
    )
  }

  const toggleSetting = (setting) => {
    setSettings((current) => ({
      ...current,
      [setting]: !current[setting],
    }))
  }

  const saveSettings = () => {
    localStorage.setItem(
      'uniableAccessibilitySettings',
      JSON.stringify({
        profiles: selectedProfiles,
        settings,
      })
    )

    alert('Accessibility settings saved!')
  }

  return (
    <div className="app">

      {/* PROFILE SCREEN */}
      {screen === 'profile' && (
        <main className="screen">

          <header className="header">
            <h1>Accessibility Profile</h1>
            <p>Select all that apply — UniAble adapts automatically</p>
          </header>

          <section className="profile-grid">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className={`profile-card ${
                  selectedProfiles.includes(profile.id) ? 'selected' : ''
                }`}
                onClick={() => toggleProfile(profile.id)}
                type="button"
              >
                <span className="profile-icon">{profile.icon}</span>
                <span>{profile.name}</span>
              </button>
            ))}
          </section>

          <section className="personalising">
            <div className="personalising-title">
              ⚙ Personalising for you...
            </div>

            <p>
              Analysing preferences · Setting up accessibility ·
              Optimising dashboard
            </p>
          </section>

          <button
            className="primary-button"
            onClick={() => setScreen('settings')}
            disabled={selectedProfiles.length === 0}
          >
            Continue
          </button>

        </main>
      )}

      {/* SETTINGS SCREEN */}
      {screen === 'settings' && (
        <main className="screen">

          <header className="header">
            <h1>Accessibility Settings</h1>
            <p>Adapts automatically, or adjust manually anytime</p>
          </header>

          <section className="settings-section">
            <h2>CHOOSE YOUR PROFILE</h2>

            <div className="settings-profile-grid">
              {settingsProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`settings-profile ${
                    selectedProfiles.includes(profile.id) ? 'selected' : ''
                  }`}
                  onClick={() => toggleProfile(profile.id)}
                >
                  <span className="settings-icon">
                    {profile.icon}
                  </span>

                  <span>{profile.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">

            <h2>DISPLAY</h2>

            <SettingToggle
              title="High Contrast Mode"
              description="Low-clutter, low-colour layout"
              enabled={settings.highContrast}
              onToggle={() => toggleSetting('highContrast')}
            />

            <SettingToggle
              title="Colour-Changing Display Panel"
              description="For colour-blindness & visual conditions"
              enabled={settings.colourDisplay}
              onToggle={() => toggleSetting('colourDisplay')}
            />

            <SettingToggle
              title="OpenDyslexic Font & Spacing"
              description=""
              enabled={settings.dyslexicFont}
              onToggle={() => toggleSetting('dyslexicFont')}
            />

          </section>

          <section className="settings-section">

            <h2>AUDIO & CAPTIONS</h2>

            <SettingToggle
              title="Auto-Captions"
              description="Enabled because you turn this on often"
              enabled={settings.autoCaptions}
              onToggle={() => toggleSetting('autoCaptions')}
            />

            <SettingToggle
              title="Audio-First Mode"
              description="Reads screen content aloud"
              enabled={settings.audioFirst}
              onToggle={() => toggleSetting('audioFirst')}
            />

            <SettingToggle
              title="Vibration Alerts"
              description="For hearing-impaired students"
              enabled={settings.vibrationAlerts}
              onToggle={() => toggleSetting('vibrationAlerts')}
            />

          </section>

          <button
            className="primary-button save-button"
            onClick={saveSettings}
          >
            Save Settings
          </button>

          <button
            className="back-button"
            onClick={() => setScreen('profile')}
          >
            ← Back to Profile
          </button>

        </main>
      )}
    </div>
  )
}


/* Reusable toggle component */

function SettingToggle({
  title,
  description,
  enabled,
  onToggle,
}) {
  return (
    <div className="setting-row">

      <div className="setting-text">
        <strong>{title}</strong>

        {description && (
          <span>{description}</span>
        )}
      </div>

      <button
        type="button"
        className={`toggle ${enabled ? 'on' : ''}`}
        onClick={onToggle}
        aria-label={`${title}: ${enabled ? 'on' : 'off'}`}
      >
        <span className="toggle-circle"></span>
      </button>

    </div>
  )
}

export default App