import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Bell, Shield, Palette, Globe, MapPin, Lock, LogOut, ChevronRight,
  Check, Moon, Sun, Mail, Smartphone, Trash2, Save, Settings as SettingsIcon,
  Camera, KeyRound, Mic, PhoneCall, Volume2
} from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import {
  firebaseConfigured, getCurrentUser, subscribeToAuth, sendVerificationEmail,
  saveFirebaseProfile, sendPhoneOtp, verifyPhoneOtp,
  changeAccountPassword, signOutAccount, deleteAccount,
  getVoiceAuthenticationState, setVoiceAuthenticationState
} from "../services/firebaseAuth";
import { getSpeechSupport } from "../services/speechService";
import "../styles/Settings.css";

const DEFAULT_PROFILE = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  photo: "",
  emailVerified: false,
  phoneVerified: false,
};

function loadProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...(JSON.parse(localStorage.getItem("uniableProfile") || "{}")) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function Settings() {
  const {
    theme, setTheme, language, setLanguage, fontSize,
    setFontSize, notifications, setNotification, privacy, setPrivacy, t,
    spokenResponses, setSpokenResponses, locale
  } = useSettings();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState(loadProfile);
  const [firebaseUser, setFirebaseUser] = useState(getCurrentUser());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [voiceAuth, setVoiceAuth] = useState(false);
  const photoInputRef = useRef(null);
  const [speechStatus, setSpeechStatus] = useState("checking");

  useEffect(() => subscribeToAuth(setFirebaseUser), []);
  useEffect(() => {
    // Tell the student whether a voice exists for the selected language on this device.
    let cancelled = false;
    setSpeechStatus("checking");
    getSpeechSupport(locale, { force: true })
      .then((result) => {
        if (cancelled) return;
        setSpeechStatus(result.supported ? "ready" : ["no-engine", "plugin-missing", "engine-error"].includes(result.reason) ? result.reason : "unavailable");
      })
      .catch(() => { if (!cancelled) setSpeechStatus("no-engine"); });
    return () => { cancelled = true; };
  }, [locale]);
  useEffect(() => { getVoiceAuthenticationState().then(setVoiceAuth); }, []);

  useEffect(() => {
    if (firebaseUser) {
      setProfile((previous) => ({
        ...previous,
        email: firebaseUser.email || previous.email,
        firstName: firebaseUser.displayName?.split(" ")[0] || previous.firstName,
        lastName: firebaseUser.displayName?.split(" ").slice(1).join(" ") || previous.lastName,
        photo: firebaseUser.photoURL || previous.photo,
        phone: firebaseUser.phoneNumber?.startsWith("+27")
          ? `0${firebaseUser.phoneNumber.slice(3)}`
          : previous.phone,
        emailVerified: Boolean(firebaseUser.emailVerified),
        phoneVerified: Boolean(firebaseUser.phoneNumber),
      }));
    }
  }, [firebaseUser]);

  const clearMessages = () => { setStatus(""); setError(""); };

  const showError = (message) => { setStatus(""); setError(message); };
  const showStatus = (message) => { setError(""); setStatus(message); };

  const persistProfile = (next) => {
    setProfile(next);
    localStorage.setItem("uniableProfile", JSON.stringify(next));
  };

  const handleProfileChange = (field, value) => {
    persistProfile({ ...profile, [field]: value });
  };

  const handlePhoneChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    persistProfile({ ...profile, phone: digits, phoneVerified: false });
  };

  const saveProfile = async () => {
    clearMessages();
    setBusy(true);
    try {
      let photo = profile.photo;
      if (photoFile && firebaseConfigured && firebaseUser) {
        const result = await saveFirebaseProfile({
          displayName: `${profile.firstName} ${profile.lastName}`.trim(),
          photoFile,
        });
        photo = result.photoURL || photo;
      } else if (photoFile) {
        const reader = new FileReader();
        photo = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      }

      const next = { ...profile, photo };
      persistProfile(next);
      setPhotoFile(null);
      showStatus(t("profileSaved"));
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async () => {
    clearMessages();
    setBusy(true);
    try {
      if (!firebaseConfigured) throw new Error("Firebase authentication is not configured. Add the shared Firebase web configuration to the frontend environment.");
      if (!firebaseUser) throw new Error(t("emailVerificationRequired"));
      if (firebaseUser.emailVerified) {
        showStatus(t("emailVerified"));
        return;
      }
      await sendVerificationEmail(profile.email);
      showStatus(t("verificationSent"));
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally { setBusy(false); }
  };

  const sendOtp = async () => {
    clearMessages();
    if (!/^[0-9]{10}$/.test(profile.phone) || !profile.phone.startsWith("0")) {
      showError(t("invalidPhone"));
      return;
    }
    setBusy(true);
    try {
      if (!firebaseConfigured || !firebaseUser) throw new Error(t("phoneVerificationRequired"));
      const result = await sendPhoneOtp(`+27${profile.phone.slice(1)}`, "phone-recaptcha");
      setPhoneConfirmation(result.confirmation);

      showStatus(`${t("verificationSent")} ${t("otp")}.`);
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    clearMessages();
    if (!/^[0-9]{6}$/.test(phoneOtp)) {
      showError("Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      const user = await verifyPhoneOtp(phoneConfirmation, phoneOtp);
      const next = { ...profile, phoneVerified: true };
      persistProfile(next);
      setFirebaseUser(user);
      setPhoneConfirmation(null);

      setPhoneOtp("");
      showStatus(t("phoneVerified"));
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally { setBusy(false); }
  };

  const updatePassword = async () => {
    clearMessages();
    if (newPassword.length < 8 || !/[^\W_]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      showError(t("passwordTooWeak"));
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(t("passwordsDoNotMatch"));
      return;
    }
    setBusy(true);
    try {
      if (!firebaseConfigured || !firebaseUser) throw new Error("A signed-in Firebase account is required to change the password.");
      await changeAccountPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      showStatus(t("passwordChanged"));
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally { setBusy(false); }
  };

  const toggleVoiceAuth = async () => {
    const next = !voiceAuth;
    await setVoiceAuthenticationState(next);
    setVoiceAuth(next);
    showStatus(`${t("voiceAuthentication")}: ${next ? t("enabled") : t("disabled")}`);
  };

  const signOut = async () => {
    clearMessages();
    setBusy(true);
    try {
      if (firebaseConfigured && firebaseUser) await signOutAccount();
      localStorage.removeItem("uniableProfile");
      showStatus(t("signedOut"));
      setTimeout(() => navigate("/"), 300);
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally { setBusy(false); }
  };

  const removeAccount = async () => {
    clearMessages();
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try {
      if (!firebaseConfigured || !firebaseUser) throw new Error("A signed-in Firebase account is required to delete the account.");
      await deleteAccount();
      localStorage.removeItem("uniableProfile");
      localStorage.removeItem("uniableSettings");
      showStatus(t("accountDeleted"));
      setTimeout(() => navigate("/"), 300);
    } catch (err) {
      showError(err.message || t("actionFailed"));
    } finally { setBusy(false); }
  };

  const speechStatusText = ({
    checking: t("spokenVoiceChecking"),
    ready: t("spokenVoiceReady").replace("{language}", language),
    unavailable: t("spokenVoiceUnavailable").replace("{language}", language),
    "no-engine": t("spokenVoiceNoEngine"),
    "plugin-missing": t("spokenPluginMissing"),
    "engine-error": t("spokenEngineError"),
  })[speechStatus];

  const menuItems = [
    { id: "profile", label: t("profile"), description: t("managePersonalInfo"), icon: User },
    { id: "notifications", label: t("notifications"), description: t("controlAlerts"), icon: Bell },
    { id: "appearance", label: t("appearance"), description: t("chooseAppearance"), icon: Palette },
    { id: "language", label: t("language"), description: t("languageDescription"), icon: Globe },
    { id: "privacy", label: t("privacy"), description: t("manageData"), icon: Shield },
    { id: "security", label: t("security"), description: t("passwordSecurity"), icon: Lock },
  ];

  const renderToggle = (checked, onChange, label) => (
    <button type="button" className={`settings-toggle ${checked ? "active" : ""}`}
      onClick={onChange} aria-label={`${label}: ${checked ? t("enabled") : t("disabled")}`} aria-pressed={checked}>
      <span className="toggle-circle">{checked && <Check size={14} />}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <section className="settings-section">
          <div className="section-heading"><div className="section-icon"><User size={22}/></div><div>
            <h2>{t("profileInformation")}</h2><p>{t("updatePersonalInfo")}</p>
          </div></div>

          <div className="profile-card">
            <button type="button" className="profile-avatar-button" onClick={() => photoInputRef.current?.click()} aria-label={t("chooseImage")}>
              {(photoFile ? URL.createObjectURL(photoFile) : profile.photo) ? <img src={photoFile ? URL.createObjectURL(photoFile) : profile.photo} alt={t("profileImage")} className="profile-photo"/> : <span>{profile.firstName.charAt(0)}{profile.lastName.charAt(0)}</span>}
              <span className="photo-camera"><Camera size={16}/></span>
            </button>
            <div className="profile-summary"><h3>{profile.firstName} {profile.lastName}</h3><p>{profile.email}</p><span className="student-badge">{t("studentAccount")}</span></div>
            <input ref={photoInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}/>
          </div>

          <div className="form-grid">
            <div className="form-group"><label>{t("firstName")}</label><input value={profile.firstName} onChange={(e)=>handleProfileChange("firstName",e.target.value)}/></div>
            <div className="form-group"><label>{t("lastName")}</label><input value={profile.lastName} onChange={(e)=>handleProfileChange("lastName",e.target.value)}/></div>
            <div className="form-group verification-field"><label>{t("emailAddress")}</label><div className="input-action-row">
              <input type="email" value={profile.email} onChange={(e)=>handleProfileChange("email",e.target.value)}/>
              <span className={`verification-badge ${profile.emailVerified || firebaseUser?.emailVerified ? "verified" : ""}`}>{profile.emailVerified || firebaseUser?.emailVerified ? <Check size={14}/> : <Mail size={14}/>} {profile.emailVerified || firebaseUser?.emailVerified ? t("emailVerified") : t("verifyEmail")}</span>
            </div><button type="button" className="secondary-button" onClick={verifyEmail} disabled={busy || Boolean(firebaseUser?.emailVerified)}><Mail size={16}/>{firebaseUser?.emailVerified ? t("emailVerified") : t("verifyEmail")}</button></div>
            <div className="form-group verification-field"><label>{t("phoneNumber")}</label><div className="phone-input-row"><span>+27</span><input inputMode="numeric" maxLength={10} pattern="[0-9]{10}" value={profile.phone} onChange={(e)=>handlePhoneChange(e.target.value)} placeholder="0XXXXXXXXX"/></div><small>{t("phoneTenDigits")}</small>
              <div className="verification-actions"><button type="button" className="secondary-button" onClick={sendOtp} disabled={busy || profile.phone.length !== 10 || profile.phoneVerified}><PhoneCall size={16}/>{t("sendOtp")}</button>
              {phoneConfirmation && <><input className="otp-input" inputMode="numeric" maxLength={6} value={phoneOtp} onChange={(e)=>setPhoneOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder={t("otp")}/><button type="button" className="primary-button" onClick={verifyOtp} disabled={busy}><Check size={16}/>{t("verifyOtp")}</button></>}
              {profile.phoneVerified && <span className="verification-badge verified"><Check size={14}/>{t("phoneVerified")}</span>}</div>
              <div id="phone-recaptcha" className="recaptcha-host" />
            </div>
          </div>
          {photoFile && <p className="file-selected">{photoFile.name}</p>}
          <button className="primary-button" onClick={saveProfile} disabled={busy}><Save size={18}/>{t("saveProfile")}</button>
        </section>;

      case "notifications":
        return <section className="settings-section"><div className="section-heading"><div className="section-icon"><Bell size={22}/></div><div><h2>{t("notifications")}</h2><p>{t("controlAlerts")}</p></div></div>
          <div className="settings-card">
            <SettingRow icon={<Bell/>} title={t("emergencyAlerts")} description={t("emergencyAlerts")} control={renderToggle(notifications.emergency,()=>setNotification("emergency",!notifications.emergency),t("emergencyAlerts"))}/>
            <SettingRow icon={<User/>} title={t("peerAssistanceUpdates")} description={t("peerAssistanceUpdates")} control={renderToggle(notifications.assistance,()=>setNotification("assistance",!notifications.assistance),t("peerAssistanceUpdates"))}/>
            <SettingRow icon={<Smartphone/>} title={t("timetableChanges")} description={t("timetableChanges")} control={renderToggle(notifications.timetable,()=>setNotification("timetable",!notifications.timetable),t("timetableChanges"))}/>
            <SettingRow icon={<Mail/>} title={t("universityAnnouncements")} description={t("universityAnnouncements")} control={renderToggle(notifications.announcements,()=>setNotification("announcements",!notifications.announcements),t("universityAnnouncements"))}/>
          </div>
          <h3 className="subsection-title">{t("notificationChannels")}</h3><div className="settings-card">
            <SettingRow icon={<Smartphone/>} title={t("pushNotifications")} description={t("pushNotifications")} control={renderToggle(notifications.push,()=>setNotification("push",!notifications.push),t("pushNotifications"))}/>
            <SettingRow icon={<Mail/>} title={t("emailNotifications")} description={t("emailNotifications")} control={renderToggle(notifications.email,()=>setNotification("email",!notifications.email),t("emailNotifications"))}/>
          </div>
        </section>;

      case "appearance":
        return <section className="settings-section"><div className="section-heading"><div className="section-icon"><Palette/></div><div><h2>{t("appearance")}</h2><p>{t("chooseAppearance")}</p></div></div>
          <div className="appearance-grid">
            <AppearanceOption icon={<Sun/>} title={t("light")} description={t("light")} selected={theme==="light"} onClick={()=>setTheme("light")}/>
            <AppearanceOption icon={<Moon/>} title={t("dark")} description={t("dark")} selected={theme==="dark"} onClick={()=>setTheme("dark")}/>
          </div>
        </section>;

      case "language":
        return <section className="settings-section"><div className="section-heading"><div className="section-icon"><Globe/></div><div><h2>{t("language")}</h2><p>{t("languageDescription")}</p></div></div>
          <div className="settings-card"><div className="form-grid language-grid">
            <div className="form-group"><label>{t("language")}</label><select value={language} onChange={(e)=>setLanguage(e.target.value)}>
              <option>English</option><option>Afrikaans</option><option>isiNdebele</option><option>isiXhosa</option><option>isiZulu</option><option>Sepedi</option><option>Sesotho</option><option>Setswana</option><option>siSwati</option><option>Tshivenda</option><option>Xitsonga</option>
            </select></div>
            <div className="form-group"><label>{t("textSize")}</label><select value={fontSize} onChange={(e)=>setFontSize(e.target.value)}><option value="small">{t("small")}</option><option value="medium">{t("medium")}</option><option value="large">{t("large")}</option></select></div>
          </div></div>
          <h3 className="subsection-title">{t("spokenResponses")}</h3>
          <div className="settings-card">
            <SettingRow icon={<Volume2/>} title={t("spokenResponses")} description={<>{t("spokenResponsesDescription")}<span className={`speech-status ${speechStatus}`} role="status">{speechStatusText}</span></>} control={renderToggle(spokenResponses,()=>setSpokenResponses(!spokenResponses),t("spokenResponses"))}/>
          </div>
        </section>;

      case "privacy":
        return <section className="settings-section"><div className="section-heading"><div className="section-icon"><Shield/></div><div><h2>{t("privacy")}</h2><p>{t("manageData")}</p></div></div><div className="settings-card">
          <SettingRow icon={<MapPin/>} title="Location services" description="Allow UniAble to use your location for campus navigation and assistance." control={renderToggle(privacy.location,()=>setPrivacy("location",!privacy.location),"Location services")}/>
          <SettingRow icon={<Smartphone/>} title="Activity information" description="Allow UniAble to use activity information to personalise your experience." control={renderToggle(privacy.activity,()=>setPrivacy("activity",!privacy.activity),"Activity information")}/>
          <SettingRow icon={<User/>} title="Profile visibility" description="Allow approved peer assistants to see limited profile information." control={renderToggle(privacy.profileVisibility,()=>setPrivacy("profileVisibility",!privacy.profileVisibility),"Profile visibility")}/>
        </div></section>;

      case "security":
        return <section className="settings-section"><div className="section-heading"><div className="section-icon"><Lock/></div><div><h2>{t("security")}</h2><p>{t("passwordSecurity")}</p></div></div>
          {passwordOpen && <div className="security-form settings-card"><div className="form-grid">
            <div className="form-group"><label>{t("newPassword")}</label><input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} minLength={8}/></div>
            <div className="form-group"><label>{t("confirmPassword")}</label><input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} minLength={8}/></div>
          </div><p className="password-rule"><KeyRound size={15}/>{t("passwordRules")}</p><div className="button-row"><button className="primary-button" onClick={updatePassword} disabled={busy}>{t("changePassword")}</button><button className="secondary-button" onClick={()=>setPasswordOpen(false)}>{t("cancel")}</button></div></div>}
          <div className="settings-card">
            <div className="security-row"><div className="row-icon"><Lock/></div><div className="row-content"><h3>{t("password")}</h3><p>{t("passwordSecurity")}</p></div><button className="secondary-button" onClick={()=>setPasswordOpen(v=>!v)}><KeyRound size={16}/>{t("changePassword")}</button></div>
            <div className="security-row"><div className="row-icon"><Mic/></div><div className="row-content"><h3>{t("voiceAuthentication")}</h3><p>{t("voiceAuthDescription")}</p></div>{renderToggle(voiceAuth,toggleVoiceAuth,t("voiceAuthentication"))}</div>
          </div>
          <div className="danger-card"><div><h3>{t("signOut")}</h3><p>{t("signOut")}</p></div><button className="danger-button" onClick={signOut} disabled={busy}><LogOut size={17}/>{t("signOut")}</button></div>
          <div className="danger-card delete"><div><h3>{t("deleteAccount")}</h3><p>{t("deleteConfirm")}</p></div><button className="danger-button" onClick={removeAccount} disabled={busy}><Trash2 size={17}/>{t("delete")}</button></div>
        </section>;
      default: return null;
    }
  };

  return <div className="uniable-settings">
    <div className="settings-header"><div><div className="page-label"><SettingsIcon size={18}/>{t("accountSettings")}</div><h1>{t("settingsTitle")}</h1><p>{t("manageAccount")}</p></div><button className="header-save-button" onClick={saveProfile} disabled={busy}><Save size={17}/>{t("saveChanges")}</button></div>
    {(status || error) && <div className={`settings-message ${error ? "error" : "success"}`} role="status">{error || status}</div>}
    <div className="settings-layout"><aside className="settings-navigation"><div className="navigation-title">{t("settingsTitle")}</div>
      {menuItems.map(({id,label,description,icon:Icon})=><button type="button" key={id} className={`settings-nav-item ${activeSection===id?"selected":""}`} onClick={()=>{setActiveSection(id);clearMessages();}}><span className="nav-icon"><Icon size={19}/></span><span className="nav-text"><strong>{label}</strong><small>{description}</small></span><ChevronRight size={17} className="nav-arrow"/></button>)}
      <button type="button" className="accessibility-link" onClick={() => navigate("/accessibility")}>
        <div className="accessibility-link-icon"><AccessibilityIcon/></div>
        <div><strong>{t("needAccessibility")}</strong><p>{t("accessibilityManaged")}</p></div>
      </button>
    </aside><main className="settings-content">{renderContent()}</main></div>
  </div>;
}

function SettingRow({icon,title,description,control}) {
  return <div className="setting-row"><div className="row-icon">{icon}</div><div className="row-content"><h3>{title}</h3><p>{description}</p></div><div className="row-control">{control}</div></div>;
}

function AppearanceOption({icon,title,description,selected,onClick}) {
  return <button type="button" className={`appearance-option ${selected?"selected":""}`} onClick={onClick}><div className="appearance-icon">{icon}</div><div><h3>{title}</h3><p>{description}</p></div><div className="radio-circle">{selected&&<Check size={15}/>}</div></button>;
}

function AccessibilityIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M5 8h14"/><path d="M12 6v6"/><path d="m8 22 4-10 4 10"/></svg>;
}

export default Settings;
