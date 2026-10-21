import { useEffect, useState } from 'react'
import './App.css'
import OCRDocumentReader from './OCRDocumentReader'
import SmartIndoorNavigation from './navigation/SmartIndoorNavigation'

const profiles = [
  { id: 'visual', icon: '◉', nameKey: 'visual' },
  { id: 'hearing', icon: '♧', nameKey: 'hearing' },
  { id: 'mobility', icon: '♿', nameKey: 'mobility' },
  { id: 'neurodivergent', icon: '✣', nameKey: 'neurodivergent' },
  { id: 'speech', icon: '◈', nameKey: 'speech' },
  { id: 'colourBlind', icon: '◌', nameKey: 'colourBlind' },
]

const settingsProfiles = [
  { id: 'visual', icon: '◉', nameKey: 'visual' },
  { id: 'colourBlind', icon: '◌', nameKey: 'colourBlind' },
  { id: 'dyslexia', icon: '⌁', nameKey: 'dyslexia' },
]

const defaultSettings = {
  highContrast: true,
  colourDisplay: true,
  dyslexicFont: false,
  autoCaptions: true,
  audioFirst: true,
  vibrationAlerts: false,
  darkMode: false,
  fontSize: 100,
  language: 'English',
}

/*
  ============================================================
  TRANSLATIONS
  ============================================================
*/

const translations = {
  English: {
    // General
    accessibilityProfile: 'Accessibility Profile',
    profileSubtitle:
      'Select all that apply — UniAble adapts automatically',
    accessibilitySettings: 'Accessibility Settings',
    settingsSubtitle:
      'Adapts automatically, or adjust manually anytime',

    // Profiles
    visual: 'Visual',
    hearing: 'Hearing',
    mobility: 'Mobility',
    neurodivergent: 'Neurodivergent',
    speech: 'Speech',
    colourBlind: 'Colour-blind',
    dyslexia: 'Dyslexia',

    // Profile screen
    personalising: '⚙ Personalising for you...',
    analysing:
      'Analysing preferences · Setting up accessibility · Optimising dashboard',
    continue: 'Continue',
    selectedProfileRequired:
      'Please select at least one accessibility profile.',

    // Settings
    chooseProfile: 'CHOOSE YOUR PROFILE',
    display: 'DISPLAY',
    audioCaptions: 'AUDIO & CAPTIONS',
    language: 'LANGUAGE',
    general: 'GENERAL',

    highContrast: 'High Contrast Mode',
    highContrastDescription: 'Low-clutter, low-colour layout',

    colourDisplay: 'Colour-Changing Display Panel',
    colourDisplayDescription:
      'For colour-blindness & visual conditions',

    dyslexicFont: 'OpenDyslexic Font & Spacing',
    dyslexicFontDescription:
      'Improves readability for users with dyslexia',

    autoCaptions: 'Auto-Captions',
    autoCaptionsDescription:
      'Automatically displays spoken content as text',

    audioFirst: 'Audio-First Mode',
    audioFirstDescription: 'Reads screen content aloud',

    vibrationAlerts: 'Vibration Alerts',
    vibrationAlertsDescription:
      'For hearing-impaired students',

    darkMode: 'Dark Mode',
    darkModeDescription:
      'Uses a darker interface for comfortable viewing',

    textSize: 'Text Size',
    textSizeDescription:
      'Adjust the size of text throughout UniAble',

    selectedLanguage: 'App Language',
    selectedLanguageDescription:
      'Choose the language used throughout UniAble',

    // Buttons
    saveSettings: 'Save Settings',
    resetSettings: 'Reset Settings',
    backToProfile: '← Back to Profile',
    readAloud: '🔊 Read Aloud',
    stopVoice: '⏹ Stop Voice',

    // Messages
    settingsSaved: 'Accessibility settings saved!',
    settingsReset: 'Accessibility settings reset.',
    voiceUnavailable:
      'Text-to-speech is not available on this device.',

    // Languages
    English: 'English',
    isiZulu: 'isiZulu',
    isiXhosa: 'isiXhosa',
    Sesotho: 'Sesotho',

    // Status
    on: 'On',
    off: 'Off',
  },

  isiZulu: {
    accessibilityProfile: 'Iphrofayela Yokufinyeleleka',
    profileSubtitle:
      'Khetha konke okusebenzayo kuwe — i-UniAble izozivumelanisa ngokuzenzakalela',
    accessibilitySettings: 'Izilungiselelo Zokufinyeleleka',
    settingsSubtitle:
      'Izivumelanisa ngokuzenzakalela, noma uzilungise noma nini',

    visual: 'Ukubona',
    hearing: 'Ukuzwa',
    mobility: 'Ukuhamba',
    neurodivergent: 'I-Neurodivergent',
    speech: 'Ukukhuluma',
    colourBlind: 'Ukungakwazi ukuhlukanisa imibala',
    dyslexia: 'I-Dyslexia',

    personalising: '⚙ Siyakwenzela izilungiselelo zakho...',
    analysing:
      'Sihlaziya okuthandayo · Silungisa ukufinyeleleka · Silungiselela ideshibhodi',
    continue: 'Qhubeka',
    selectedProfileRequired:
      'Sicela ukhethe okungenani iphrofayela eyodwa yokufinyeleleka.',

    chooseProfile: 'KHETHA IPHROFAYELA YAKHO',
    display: 'UKUBONISA',
    audioCaptions: 'UMSINDO NAMAZWANA',
    language: 'ULIMI',
    general: 'OKUJWAYELEKILE',

    highContrast: 'Imodi Yokuqhathanisa Okuphezulu',
    highContrastDescription:
      'Isakhiwo esilula esinemibala embalwa',

    colourDisplay: 'Iphaneli Yokushintsha Imibala',
    colourDisplayDescription:
      'Yenzelwe abantu abangakwazi ukuhlukanisa imibala nezimo zokubona',

    dyslexicFont: 'Ifonti ye-OpenDyslexic kanye Nesikhala',
    dyslexicFontDescription:
      'Ithuthukisa ukufundeka kubantu abane-dyslexia',

    autoCaptions: 'Amazwana Azenzakalelayo',
    autoCaptionsDescription:
      'Ibonisa okuqukethwe okukhulunywayo njengombhalo ngokuzenzakalelayo',

    audioFirst: 'Imodi Yomsindo Kuqala',
    audioFirstDescription:
      'Ifunda okuqukethwe kwesikrini ngokuzwakalayo',

    vibrationAlerts: 'Izaziso Zokudlidliza',
    vibrationAlertsDescription:
      'Yenzelwe abafundi abanenkinga yokuzwa',

    darkMode: 'Imodi Emnyama',
    darkModeDescription:
      'Isebenzisa isibonisi esimnyama ukuze kube lula ukubuka',

    textSize: 'Usayizi Wombhalo',
    textSizeDescription:
      'Lungisa usayizi wombhalo kuyo yonke i-UniAble',

    selectedLanguage: 'Ulimi Lohlelo Lokusebenza',
    selectedLanguageDescription:
      'Khetha ulimi olusetshenziswa kuyo yonke i-UniAble',

    saveSettings: 'Gcina Izilungiselelo',
    resetSettings: 'Setha Kabusha Izilungiselelo',
    backToProfile: '← Buyela Kuphrofayela',
    readAloud: '🔊 Funda Ngokuzwakalayo',
    stopVoice: '⏹ Misa Umsindo',

    settingsSaved: 'Izilungiselelo zokufinyeleleka zigciniwe!',
    settingsReset: 'Izilungiselelo zibuyiselwe kokuzenzakalelayo.',
    voiceUnavailable:
      'Ukufunda ngomsindo akutholakali kule divayisi.',

    English: 'IsiNgisi',
    isiZulu: 'isiZulu',
    isiXhosa: 'isiXhosa',
    Sesotho: 'isiSotho',

    on: 'Kuvuliwe',
    off: 'Kuvaliwe',
  },

  isiXhosa: {
    accessibilityProfile: 'Iprofayile Yokufikeleleka',
    profileSubtitle:
      'Khetha zonke ezisebenzayo kuwe — i-UniAble iya kuziqhelanisa ngokuzenzekelayo',
    accessibilitySettings: 'Iisetingi Zokufikeleleka',
    settingsSubtitle:
      'Iziqhelanisa ngokuzenzekelayo, okanye ungazitshintsha nanini na',

    visual: 'Ukubona',
    hearing: 'Ukuva',
    mobility: 'Ukuhamba',
    neurodivergent: 'I-Neurodivergent',
    speech: 'Intetho',
    colourBlind: 'Ukungakwazi ukwahlula imibala',
    dyslexia: 'I-Dyslexia',

    personalising: '⚙ Silungiselela wena...',
    analysing:
      'Sihlalutya izinto ozikhethayo · Silungiselela ukufikeleleka · Silungiselela ideshibhodi',
    continue: 'Qhubeka',
    selectedProfileRequired:
      'Nceda ukhethe ubuncinane iprofayile enye yokufikeleleka.',

    chooseProfile: 'KHETHA IPROFAYILE YAKHO',
    display: 'UMBONISO',
    audioCaptions: 'ISANDI NEZIBHALO',
    language: 'ULWIMI',
    general: 'NGOKUBANZI',

    highContrast: 'Imowudi Yomahluko Ophezulu',
    highContrastDescription:
      'Uyilo olulula olunemibala embalwa',

    colourDisplay: 'Iphaneli Yokutshintsha Imibala',
    colourDisplayDescription:
      'Yenzelwe ukungakwazi ukwahlula imibala kunye neemeko zokubona',

    dyslexicFont: 'Ifonti ye-OpenDyslexic kunye Nesithuba',
    dyslexicFontDescription:
      'Iphucula ukufundeka kubasebenzisi abane-dyslexia',

    autoCaptions: 'Iinkcazelo Ezizenzekelayo',
    autoCaptionsDescription:
      'Ibonisa intetho njengombhalo ngokuzenzekelayo',

    audioFirst: 'Imowudi Yesandi Kuqala',
    audioFirstDescription:
      'Ifunda umxholo wesikrini ngokuvakalayo',

    vibrationAlerts: 'Izilumkiso Zokungcangcazela',
    vibrationAlertsDescription:
      'Yenzelwe abafundi abanengxaki yokuva',

    darkMode: 'Imowudi Emnyama',
    darkModeDescription:
      'Isebenzisa umboniso omnyama ukuze kube lula ukujonga',

    textSize: 'Ubungakanani Bombhalo',
    textSizeDescription:
      'Lungisa ubungakanani bombhalo kuyo yonke i-UniAble',

    selectedLanguage: 'Ulwimi Losetyenziso',
    selectedLanguageDescription:
      'Khetha ulwimi olusetyenziswa kuyo yonke i-UniAble',

    saveSettings: 'Gcina Iisetingi',
    resetSettings: 'Seta Kwakhona Iisetingi',
    backToProfile: '← Buyela KwiProfayile',
    readAloud: '🔊 Funda Ngokuvakalayo',
    stopVoice: '⏹ Misa Isandi',

    settingsSaved: 'Iisetingi zokufikeleleka zigciniwe!',
    settingsReset: 'Iisetingi zibuyiselwe kwezo zokuqala.',
    voiceUnavailable:
      'Ukufunda ngelizwi akufumaneki kule divayisi.',

    English: 'IsiNgesi',
    isiZulu: 'isiZulu',
    isiXhosa: 'isiXhosa',
    Sesotho: 'isiSotho',

    on: 'Kuvuliwe',
    off: 'Kuvaliwe',
  },

  Sesotho: {
    accessibilityProfile: 'Profaele ea Phihlello',
    profileSubtitle:
      'Khetha tsohle tse sebetsang ho uena — UniAble e tla ikamahanya ka bo eona',
    accessibilitySettings: 'Litlhophiso tsa Phihlello',
    settingsSubtitle:
      'E ikamahanya ka bo eona, kapa u li fetole neng kapa neng',

    visual: 'Pono',
    hearing: 'Ho utloa',
    mobility: 'Motsamao',
    neurodivergent: 'Neurodivergent',
    speech: 'Puo',
    colourBlind: 'Ho se bone mebala hantle',
    dyslexia: 'Dyslexia',

    personalising: '⚙ Re u lokisetsa litlhophiso...',
    analysing:
      'Re hlahloba likhetho · Re lokisa phihlello · Re ntlafatsa dashboard',
    continue: 'Tsoela Pele',
    selectedProfileRequired:
      'Ka kopo khetha bonyane profaele e le ’ngoe ea phihlello.',

    chooseProfile: 'KHETHA PROFAELE EA HAO',
    display: 'PONAHALO',
    audioCaptions: 'MOLUMO LE MONGOLI',
    language: 'PUO',
    general: 'KAKARETSO',

    highContrast: 'Mokhoa oa Phapang e Phahameng',
    highContrastDescription:
      'Sebopeho se bonolo se nang le mebala e fokolang',

    colourDisplay: 'Phanele ea ho Fetola Mebala',
    colourDisplayDescription:
      'Bakeng sa batho ba sa boneng mebala hantle le maemo a pono',

    dyslexicFont: 'Fonte ea OpenDyslexic le Sebaka',
    dyslexicFontDescription:
      'E ntlafatsa ho bala bakeng sa basebelisi ba nang le dyslexia',

    autoCaptions: 'Mongolo o Iketsang',
    autoCaptionsDescription:
      'E bontša puo e buuoang e le mongolo ka bo eona',

    audioFirst: 'Mokhoa oa Molumo Pele',
    audioFirstDescription:
      'E bala litaba tsa skrine ka lentsoe',

    vibrationAlerts: 'Litemoso tsa Thothomelo',
    vibrationAlertsDescription:
      'Bakeng sa baithuti ba nang le bothata ba ho utloa',

    darkMode: 'Mokhoa o Lefifi',
    darkModeDescription:
      'E sebelisa ponahalo e lefifi bakeng sa ho shebella hamonate',

    textSize: 'Boholo ba Mongolo',
    textSizeDescription:
      'Fetola boholo ba mongolo ho UniAble kaofela',

    selectedLanguage: 'Puo ea Sesebelisoa',
    selectedLanguageDescription:
      'Khetha puo e sebelisoang ho UniAble kaofela',

    saveSettings: 'Boloka Litlhophiso',
    resetSettings: 'Khutlisetsa Litlhophiso',
    backToProfile: '← Khutlela Profaeleng',
    readAloud: '🔊 Bala ka Lentsoe',
    stopVoice: '⏹ Emisa Lentsoe',

    settingsSaved: 'Litlhophiso tsa phihlello li bolokiloe!',
    settingsReset: 'Litlhophiso li khutliselitsoe qalong.',
    voiceUnavailable:
      'Ho bala ka lentsoe ha ho fumanehe sesebelisoeng sena.',

    English: 'Senyesemane',
    isiZulu: 'isiZulu',
    isiXhosa: 'isiXhosa',
    Sesotho: 'Sesotho',

    on: 'E butsoe',
    off: 'E koetsoe',
  },
}

/*
  ============================================================
  LANGUAGE CODES FOR TEXT-TO-SPEECH
  ============================================================
*/

const speechLanguages = {
  English: 'en-ZA',
  isiZulu: 'zu-ZA',
  isiXhosa: 'xh-ZA',
  Sesotho: 'st-ZA',
}

function App() {
  const [screen, setScreen] = useState('profile')

  const [selectedProfiles, setSelectedProfiles] = useState([])

  const [settings, setSettings] = useState(defaultSettings)
  
  


  /*
    ==========================================================
    LOAD SAVED SETTINGS
    ==========================================================
  */

  useEffect(() => {
    const saved = localStorage.getItem(
      'uniableAccessibilitySettings'
    )

    if (saved) {
      try {
        const parsed = JSON.parse(saved)

        setSelectedProfiles(parsed.profiles || [])

        setSettings({
          ...defaultSettings,
          ...(parsed.settings || {}),
        })
      } catch (error) {
        console.error('Could not load saved settings:', error)
      }
    }
  }, [])

  /*
    ==========================================================
    APPLY ACCESSIBILITY SETTINGS TO THE APP
    ==========================================================
  */

  useEffect(() => {
    document.documentElement.dataset.darkMode =
      settings.darkMode

    document.documentElement.dataset.highContrast =
      settings.highContrast

    document.documentElement.dataset.dyslexicFont =
      settings.dyslexicFont

    document.documentElement.dataset.colourDisplay =
      settings.colourDisplay

    document.documentElement.style.fontSize =
      `${settings.fontSize}%`

    document.documentElement.lang =
      getLanguageCode(settings.language)
  }, [settings])

  /*
    ==========================================================
    TRANSLATION HELPER
    ==========================================================
  */

  const t = (key) => {
    return (
      translations[settings.language]?.[key] ||
      translations.English[key] ||
      key
    )
  }

  /*
    ==========================================================
    LANGUAGE CODE
    ==========================================================
  */

  const getLanguageCode = (language) => {
    const codes = {
      English: 'en',
      isiZulu: 'zu',
      isiXhosa: 'xh',
      Sesotho: 'st',
    }

    return codes[language] || 'en'
  }

  /*
    ==========================================================
    PROFILE TOGGLE
    ==========================================================
  */

  const toggleProfile = (id) => {
    setSelectedProfiles((current) =>
      current.includes(id)
        ? current.filter((profile) => profile !== id)
        : [...current, id]
    )
  }

  /*
    ==========================================================
    SETTING TOGGLE
    ==========================================================
  */

  const toggleSetting = (setting) => {
    setSettings((current) => ({
      ...current,
      [setting]: !current[setting],
    }))
  }

  /*
    ==========================================================
    CHANGE LANGUAGE
    ==========================================================
  */

  const changeLanguage = (language) => {
    setSettings((current) => ({
      ...current,
      language,
    }))

    stopVoice()
  }

  /*
    ==========================================================
    TEXT SIZE
    ==========================================================
  */

  const increaseTextSize = () => {
    setSettings((current) => ({
      ...current,
      fontSize: Math.min(current.fontSize + 10, 160),
    }))
  }

  const decreaseTextSize = () => {
    setSettings((current) => ({
      ...current,
      fontSize: Math.max(current.fontSize - 10, 80),
    }))
  }

  /*
    ==========================================================
    TEXT TO SPEECH
    ==========================================================
  */

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      alert(t('voiceUnavailable'))
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.lang =
      speechLanguages[settings.language] || 'en-ZA'

    utterance.rate = 0.9
    utterance.pitch = 1

    window.speechSynthesis.speak(utterance)
  }

  const speakCurrentScreen = () => {
    let text = ''

    if (screen === 'profile') {
      text = `
        ${t('accessibilityProfile')}.
        ${t('profileSubtitle')}.
        ${t('personalising')}.
        ${t('analysing')}.
        ${t('continue')}.
      `
    }

    if (screen === 'settings') {
      text = `
        ${t('accessibilitySettings')}.
        ${t('settingsSubtitle')}.
        ${t('chooseProfile')}.
        ${t('display')}.
        ${t('highContrast')}.
        ${t('colourDisplay')}.
        ${t('dyslexicFont')}.
        ${t('audioCaptions')}.
        ${t('autoCaptions')}.
        ${t('audioFirst')}.
        ${t('vibrationAlerts')}.
        ${t('language')}.
        ${t('selectedLanguage')}.
        ${t('general')}.
        ${t('darkMode')}.
        ${t('textSize')}.
      `
    }

    speakText(text)
  }

  const stopVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  /*
    ==========================================================
    SAVE SETTINGS
    ==========================================================
  */

  const saveSettings = () => {
    localStorage.setItem(
      'uniableAccessibilitySettings',
      JSON.stringify({
        profiles: selectedProfiles,
        settings,
      })
    )

    alert(t('settingsSaved'))
  }

  /*
    ==========================================================
    RESET SETTINGS
    ==========================================================
  */

  const resetSettings = () => {
    setSelectedProfiles([])
    setSettings(defaultSettings)

    localStorage.removeItem(
      'uniableAccessibilitySettings'
    )

    stopVoice()

    alert(translations.English.settingsReset)
  }
if (screen === 'ocr') {
  return (
    <div className="app">
      <OCRDocumentReader
        language={settings.language}
        onBack={() => setScreen('profile')}
      />
    </div>
  )
}

if (screen === 'navigation'){
  return(
    <div className= "app">
    <SmartIndoorNavigation
    language= {settings.language}
    onBack= {() => setScreen('profile')}
    />
    </div>
  )
}
  /*
    ==========================================================
    PROFILE SCREEN
    ==========================================================
  */

  if (screen === 'profile') {
    return (
      <div className="app">
        <main className="screen">

          <header className="header">
            <h1>{t('accessibilityProfile')}</h1>

            <p>{t('profileSubtitle')}</p>
          </header>

          <section className="profile-grid">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className={`profile-card ${
                  selectedProfiles.includes(profile.id)
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  toggleProfile(profile.id)
                }
                type="button"
                aria-pressed={selectedProfiles.includes(
                  profile.id
                )}
              >
                <span className="profile-icon">
                  {profile.icon}
                </span>

                <span>{t(profile.nameKey)}</span>
              </button>
            ))}
          </section>

          <section className="personalising">
            <div className="personalising-title">
              {t('personalising')}
            </div>

            <p>{t('analysing')}</p>
          </section>

          <button
            className="primary-button"
            onClick={() => setScreen('settings')}
            disabled={selectedProfiles.length === 0}
            type="button"
          >
            {t('continue')}
          </button>

          <button
            className="secondary-button"
            onClick={() => setScreen('settings')}
            type="button"
          >
            ⚙ {t('accessibilitySettings')}
          </button>

          <button
  className="primary-button"
  onClick={() => setScreen('ocr')}
  type="button"
>
  OCR Document Reader
</button>
<button
  className = "primary-button"
  onClick = {() => setScreen('navigation')}
  type= "button"
  >
    Smart Indoor Navigation
  </button>
          <div className="voice-controls">
            <button
              className="secondary-button"
              onClick={speakCurrentScreen}
              type="button"
            >
              {t('readAloud')}
            </button>

            <button
              className="secondary-button"
              onClick={stopVoice}
              type="button"
            >
              {t('stopVoice')}
            </button>
          </div>
        </main>
      </div>
    )
  }

  /*
    ==========================================================
    SETTINGS SCREEN
    ==========================================================
  */

  return (
    <div className="app">
      <main className="screen">

        <header className="header">
          <h1>{t('accessibilitySettings')}</h1>

          <p>{t('settingsSubtitle')}</p>
        </header>

        {/* PROFILE */}

        <section className="settings-section">
          <h2>{t('chooseProfile')}</h2>

          <div className="settings-profile-grid">
            {settingsProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`settings-profile ${
                  selectedProfiles.includes(profile.id)
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  toggleProfile(profile.id)
                }
                aria-pressed={selectedProfiles.includes(
                  profile.id
                )}
              >
                <span className="settings-icon">
                  {profile.icon}
                </span>

                <span>{t(profile.nameKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* DISPLAY */}

        <section className="settings-section">
          <h2>{t('display')}</h2>

          <SettingToggle
            title={t('highContrast')}
            description={t('highContrastDescription')}
            enabled={settings.highContrast}
            onToggle={() =>
              toggleSetting('highContrast')
            }
          />

          <SettingToggle
            title={t('colourDisplay')}
            description={t('colourDisplayDescription')}
            enabled={settings.colourDisplay}
            onToggle={() =>
              toggleSetting('colourDisplay')
            }
          />

          <SettingToggle
            title={t('dyslexicFont')}
            description={t('dyslexicFontDescription')}
            enabled={settings.dyslexicFont}
            onToggle={() =>
              toggleSetting('dyslexicFont')
            }
          />

          <div className="setting-row">
            <div className="setting-text">
              <strong>{t('textSize')}</strong>

              <span>{t('textSizeDescription')}</span>
            </div>

            <div className="font-size-controls">
              <button
                type="button"
                onClick={decreaseTextSize}
                aria-label="Decrease text size"
              >
                A−
              </button>

              <strong>
                {settings.fontSize}%
              </strong>

              <button
                type="button"
                onClick={increaseTextSize}
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>
          </div>
        </section>

        {/* AUDIO */}

        <section className="settings-section">
          <h2>{t('audioCaptions')}</h2>

          <SettingToggle
            title={t('autoCaptions')}
            description={t(
              'autoCaptionsDescription'
            )}
            enabled={settings.autoCaptions}
            onToggle={() =>
              toggleSetting('autoCaptions')
            }
          />

          <SettingToggle
            title={t('audioFirst')}
            description={t(
              'audioFirstDescription'
            )}
            enabled={settings.audioFirst}
            onToggle={() =>
              toggleSetting('audioFirst')
            }
          />

          <SettingToggle
            title={t('vibrationAlerts')}
            description={t(
              'vibrationAlertsDescription'
            )}
            enabled={settings.vibrationAlerts}
            onToggle={() =>
              toggleSetting('vibrationAlerts')
            }
          />
        </section>

        {/* LANGUAGE */}

        <section className="settings-section">
          <h2>{t('language')}</h2>

          <div className="language-control">
            <div className="setting-text">
              <strong>
                {t('selectedLanguage')}
              </strong>

              <span>
                {t('selectedLanguageDescription')}
              </span>
            </div>

            <select
              value={settings.language}
              onChange={(event) =>
                changeLanguage(
                  event.target.value
                )
              }
              aria-label={t('selectedLanguage')}
            >
              <option value="English">
                {t('English')}
              </option>

              <option value="isiZulu">
                {t('isiZulu')}
              </option>

              <option value="isiXhosa">
                {t('isiXhosa')}
              </option>

              <option value="Sesotho">
                {t('Sesotho')}
              </option>
            </select>
          </div>
        </section>

        {/* GENERAL */}

        <section className="settings-section">
          <h2>{t('general')}</h2>

          <SettingToggle
            title={t('darkMode')}
            description={t(
              'darkModeDescription'
            )}
            enabled={settings.darkMode}
            onToggle={() =>
              toggleSetting('darkMode')
            }
          />
        </section>

        {/* VOICE */}

        <section className="voice-controls">
          <button
            className="secondary-button"
            onClick={speakCurrentScreen}
            type="button"
          >
            {t('readAloud')}
          </button>

          <button
            className="secondary-button"
            onClick={stopVoice}
            type="button"
          >
            {t('stopVoice')}
          </button>
        </section>

        {/* SAVE */}

        <button
          className="primary-button save-button"
          onClick={saveSettings}
          type="button"
        >
          {t('saveSettings')}
        </button>

        {/* RESET */}

        <button
          className="danger-button"
          onClick={resetSettings}
          type="button"
        >
          {t('resetSettings')}
        </button>

        {/* BACK */}

        <button
          className="back-button"
          onClick={() => {
            stopVoice()
            setScreen('profile')
          }}
          type="button"
        >
          {t('backToProfile')}
        </button>

      </main>
    </div>
  )
}

/*
  ============================================================
  SETTING TOGGLE COMPONENT
  ============================================================
*/

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
        className={`toggle ${
          enabled ? 'on' : ''
        }`}
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={`${title}: ${
          enabled ? 'on' : 'off'
        }`}
      >
        <span className="toggle-circle"></span>
      </button>
    </div>
  )
}

export default App
