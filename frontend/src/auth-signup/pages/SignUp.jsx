import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    createAccountWithEmailPassword,
    startAccountVerification,
    getVerificationStatus,
    getCurrentUser,
    signOutAccount,
    subscribeToAuth,
    sendEmailOtp,
    verifyEmailOtp,
    cancelPendingRegistration
} from "../../services/firebaseAuth";
import { speak } from "../../services/speechService";

import "../styles/signup.css";

import SignUpHeader from "../components/SignUpHeader";
import ProgressBar from "../components/ProgressBar";
import MicrophoneButton from "../components/MicrophoneButton";
import ConversationCard from "../components/ConversationCard";
import DetectedInfo from "../components/DetectedInfo";
import SignUpActions from "../components/SignUpActions";
import TypingSignUpForm from "../components/TypingSignUpForm";
import SignUpSuccess from "../components/SignUpSuccess";
import AccountVerification from "../components/AccountVerification";

import {
    startSpeechRecognition
} from "../services/speechService";
import {
    isNative,
    isVoiceRecognitionAvailable,
    startNativeVoiceRecognition
} from "../../services/platformVoice";

import {
    detectAccessibility
} from "../utils/accessibilityDetector";

import {
    normalizeSpokenEmail
} from "../utils/emailUtils";

import {
    isValidStudentNumber,
    STUDENT_EMAIL_DOMAIN,
    capitalizePersonName,
    validateSignUpForm
} from "../utils/validation";

function phoneVerificationError(error, fallback) {
    if (error?.code === "auth/internal-error" && isNative()) {
        return "Firebase could not complete its phone security check in this iOS app. Check the Firebase project's iOS app registration, API key restrictions, Phone sign-in provider, South Africa SMS region policy and SMS quota. Try email verification or the browser signup while iOS Firebase phone auth is configured.";
    }

    const messages = {
        "auth/operation-not-allowed": "SMS verification is disabled for this Firebase project. Enable Phone sign-in in Firebase Authentication settings.",
        "auth/captcha-check-failed": "Firebase could not verify the security check. Refresh the page and ensure localhost is an authorized Firebase domain.",
        "auth/invalid-app-credential": "Firebase rejected the SMS security check. Confirm Phone sign-in is enabled and localhost is authorized in Firebase.",
        "auth/invalid-phone-number": "Enter a valid South African mobile number.",
        "auth/too-many-requests": "Too many SMS attempts. Wait a while before requesting another code.",
        "auth/quota-exceeded": "Firebase has reached its SMS quota. Try email verification or check the Firebase billing and SMS limits.",
        "auth/app-not-authorized": "This app is not authorized for Firebase Phone Authentication. Check the Firebase project's app configuration.",
        "auth/unauthorized-continue-uri": "Add localhost to the authorized domains in Firebase Authentication settings, then try again.",
        "auth/network-request-failed": "Firebase could not reach its authentication service. Check the internet connection and try again.",
        "auth/billing-not-enabled": "Firebase SMS delivery requires billing to be enabled for this project. Check the Firebase plan and SMS quota.",
        "auth/internal-error": "Firebase could not complete phone verification. Check that Phone sign-in is enabled, localhost is an authorized domain, South Africa is allowed in the SMS region policy, and the Firebase project has SMS quota.",
        "auth/invalid-verification-code": "That SMS code is incorrect. Check the message and try again.",
        "auth/code-expired": "That SMS code has expired. Request a new one."
    };

    return messages[error?.code] || error?.message || fallback;
}


function SignUp() {
    const location = useLocation();
    const navigate = useNavigate();

    /* =========================================
       PAGE MODE
       ========================================= */

    const [mode, setMode] =
        useState("voice");


    /* =========================================
       VALIDATION
       ========================================= */

    const [errors, setErrors] = useState({});
    const [verificationStage, setVerificationStage] = useState(null);
    const [verificationMethod, setVerificationMethod] = useState("email");
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationPhone, setVerificationPhone] = useState("");
    const [phoneConfirmation, setPhoneConfirmation] = useState(null);
    const [phoneVerifier, setPhoneVerifier] = useState(null);
    const [verificationBusy, setVerificationBusy] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [verificationError, setVerificationError] = useState("");


    const [
        registrationValidated,
        setRegistrationValidated
    ] = useState(false);


    /* =========================================
       VOICE STATE
       ========================================= */

    const [isListening, setIsListening] =
        useState(false);
    const [recordingTranscript, setRecordingTranscript] = useState("");
    const recognitionRef = useRef(null);
    const nativeStopRef = useRef(null);
    const mountedRef = useRef(true);


    /*
      Voice Steps
  
      0 = Full Name
      1 = Accessibility Needs
      2 = Email Address
      3 = Voice Section Complete
    */

    const [voiceStep, setVoiceStep] =
        useState(0);


    const [
        voiceQuestion,
        setVoiceQuestion
    ] = useState(
        "Speak your first and middle names to continue"
    );


    /* =========================================
       CONVERSATION
       ========================================= */

    const [messages, setMessages] =
        useState([
            {
                speaker: "UNIABLE",
                text:
                    "Welcome! Let's set up your account together. What are your first and middle names?"
            }
        ]);


    /* =========================================
       FORM DATA
       ========================================= */

    const [formData, setFormData] =
        useState({

            fullName: "",

            surname: "",

            studentNumber: "",

            qualification: "",

            otherQualification: "",

            yearOfStudy: "",
            dateOfBirth: "",
            confirmPassword: "",
            accessibility: "",

            additionalNeeds: "",

            email: "",

            password: "",

            confirmPassword: ""

        });

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            recognitionRef.current?.abort?.();
            void nativeStopRef.current?.();
        };
    }, []);


    useEffect(() => {
        let cancelled = false;
        let timer;

        async function announceSignup() {
            if (!voiceAssistanceEnabled || cancelled) return;
            timer = window.setTimeout(async () => {
                try {
                    await speak(
                        "UniAble create account page. Enter your name, surname, student number, IT qualification, year, modules, accessibility needs, student email, and password. You can choose voice-assisted signup or switch to typing. The microphone only listens when you activate it. Do not speak your password aloud.",
                        { locale: locale || "en-ZA" }
                    );
                } catch (error) {
                    console.warn("Signup page spoken guidance failed:", error);
                }
            }, 100);
        }

        announceSignup();
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [voiceAssistanceEnabled, locale]);

    useEffect(() => {
        let active = true;
        const unsubscribe = subscribeToAuth(async (user) => {
            if (!user) return;
            try {
                const status = await getVerificationStatus();
                if (active && status.required && !status.verified) {
                    setFormData((previous) => ({ ...previous, email: user.email || previous.email, fullName: user.displayName || previous.fullName }));
                    setVerificationStage("choose");
                    setMode("typing");
                } else if (active && status.required && status.verified) {
                    setRegistrationValidated(true);
                }
            } catch (error) {
                console.warn("Could not resume pending UniAble verification:", error);
            }
        });
        return () => { active = false; unsubscribe?.(); };
    }, []);

    /* =========================================
       SIGNUP PAGE ENTRY GUIDANCE
       ========================================= */

    useEffect(() => {
        if (!voiceAssistanceEnabled) return undefined;

        if (registrationValidated) {
            speakText(
                "Your UniAble account details have been submitted successfully."
            );
            return;
        }

        const guidance = mode === "voice"

            ? "Welcome to UniAble sign up. You can complete the first steps by speaking or switch to typing at any time. The microphone is optional. You only need to select Tap to Speak if you want to provide an answer using your voice. I will guide you through your first and middle names, accessibility needs and email address. Switch to typing to enter your surname, student number, qualification, year, modules and password. For your security, your password must be entered using typing mode and will never be read aloud. You can also use your keyboard to navigate the page."

            : "You are now in typing sign up mode. Enter your first and middle names, surname, student number, IT qualification, year of study, modules, accessibility needs, email address and password. Your password is private and will never be read aloud. You can use your keyboard to move between fields. You can return to voice sign up if you prefer.";

        const timer = window.setTimeout(() => {
            speakText(guidance);
        }, 100);

        return () => {
            window.clearTimeout(timer);
        };

    }, [mode, registrationValidated, speakText, voiceAssistanceEnabled]);
    /* =========================================
       SWITCH INPUT MODES
       ========================================= */

    function switchToTyping() {
        void stopListening();
        setMode("typing");

    }


    function switchToVoice() {

        setMode("voice");

    }


    /* =========================================
       HANDLE TYPED INPUT
       ========================================= */

    function handleInputChange(event) {
        const { name, value } = event.target;

        setFormData((previousData) => {
            const nextData = {
                ...previousData,
                [name]: value
            };

            if (name === "studentNumber") {
                const previousGenerated = getRichfieldStudentEmail(
                    previousData.studentNumber
                );
                const nextGenerated = getRichfieldStudentEmail(value);

        setFormData((previousData) => ({
            ...previousData,
            [name]: ["fullName", "surname"].includes(name) ? capitalizePersonName(value) : value,
            ...(name === "studentNumber"
                ? { email: value.trim() ? `${value.trim()}@${STUDENT_EMAIL_DOMAIN}` : "" }
                : {}),
        }));
    }

    async function handleExitSignup() {
        if (verificationBusy) return;
        setVerificationBusy(true);
        setVerificationError("");
        try {
            phoneVerifier?.clear?.();
            await signOutAccount();
            setPhoneConfirmation(null);
            setPhoneVerifier(null);
            setVerificationCode("");
            setVerificationStage(null);
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Could not safely exit UniAble verification:", error);
            setVerificationError("We could not sign you out. Please try again.");
            setVerificationBusy(false);
        }
    }

    async function handleCreateAccount() {
        const validationErrors = validateSignUpForm(formData);
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
        setErrors({});
        try {
            const createdUser = await createAccountWithEmailPassword(
                formData.email,
                formData.password,
                `${formData.fullName.trim()} ${formData.surname.trim()}`,
                formData.accessibility,
                formData.accountType,
                { surname: registrationData.surname, studentNumber: registrationData.studentNumber, institutionalEmail: registrationData.email, qualification: registrationData.qualification, yearOfStudy: registrationData.yearOfStudy, dateOfBirth: registrationData.dateOfBirth, modules: [] }
            );

            if (formData.accountType === "volunteer") {
                try {
                    await api.registerVolunteer({
                        userId: createdUser.uid,
                        name: formData.fullName
                    });
                } catch (volunteerError) {
                    console.warn(
                        "Account created, but volunteer registration could not reach the Peer Assistance server:",
                        volunteerError
                    );
                    setVerificationError(
                        "Your account was created. Volunteer registration could not reach the server yet; please try again later."
                    );
                }
            }
            setVerificationBusy(true);
            try {
                await startAccountVerification();
                setVerificationError("");
            } catch (setupError) {
                setVerificationError(`Your account was created, but the verification service is not ready: ${setupError.message}`);
            } finally {
                setVerificationMethod("email");
                setVerificationStage("choose");
                setMode("typing");
                setVerificationBusy(false);
            }
        } catch (error) {
            console.error("UniAble registration failed:", error);
            let message = error.message || "We could not create your account. Please try again.";
            if (error.code === "auth/email-already-in-use") message = "An account already exists for this email address. Sign in, then choose Create an account to resume verification if needed.";
            else if (error.code === "auth/weak-password") message = "Your password is too weak. Please choose a stronger password.";
            else if (error.code === "auth/invalid-email") message = "Please enter a valid email address.";
            else if (error.code === "auth/operation-not-allowed") message = "Email and password sign-in is not enabled in your Firebase project.";
            setErrors({ general: message });
        }
    }

function handleModuleChange(event) {
        const { checked, value } = event.target;
        setFormData((previousData) => ({
            ...previousData,
            modules: checked
                ? [...previousData.modules, value]
                : previousData.modules.filter((module) => module !== value)
        }));
        setErrors((previousErrors) => ({ ...previousErrors, modules: "" }));
    }

    async function handleSendEmailCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            const status = await getVerificationStatus();
            if (!status.required || status.verified) {
                throw new Error("Verification codes are only available while completing a new UniAble sign-up.");
            }
            await sendEmailOtp();
            setVerificationMethod("email"); setVerificationCode(""); setVerificationStage("code");
        } catch (error) {
            console.error("UniAble signup email OTP failed:", error);
            setVerificationError(error.message || "Could not send the email code.");
        }
        finally { setVerificationBusy(false); }
    }

    async function handleSendPhoneCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            const status = await getVerificationStatus();
            if (!status.required || status.verified) {
                throw new Error("Verification codes are only available while completing a new UniAble sign-up.");
            }
            const normalized = normalizeSouthAfricanMobile(verificationPhone);
            if (!normalized) throw new Error("Enter a valid South African mobile number, with or without the first 0.");
            phoneVerifier?.clear();
            const result = await sendPhoneOtp(normalized, "uniable-phone-recaptcha");
            setPhoneConfirmation(result.confirmation); setPhoneVerifier(result.verifier);
            setVerificationPhone(normalized); setVerificationMethod("sms"); setVerificationCode(""); setVerificationStage("code");
        } catch (error) {
            console.error("UniAble signup SMS OTP failed:", {
                code: error.code || "unknown",
                message: error.message,
            });
            setVerificationError(phoneVerificationError(error, "Could not send the SMS code. Check Firebase Phone Authentication and reCAPTCHA settings."));
        }
        finally { setVerificationBusy(false); }
    }

    async function handleVerifyCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            if (verificationMethod === "email") {
                await verifyEmailOtp(verificationCode);
            } else {
                if (!phoneConfirmation) throw new Error("Request a new SMS code before verifying.");
                await verifyPhoneOtp(phoneConfirmation, verificationCode, phoneVerifier);
                await completePhoneVerification(verificationPhone);
                setPhoneConfirmation(null); setPhoneVerifier(null);
            }
            setVerificationStage(null);
            setRegistrationValidated(true);
        } catch (error) { setVerificationError(verificationMethod === "sms"
            ? phoneVerificationError(error, "The SMS code could not be verified. Please try again.")
            : error.message || "The email code could not be verified. Please try again."); }
        finally { setVerificationBusy(false); }
    }

    async function handleResendCode() {
        if (verificationMethod === "email") return handleSendEmailCode();
        return handleSendPhoneCode();
    }

    async function handleCancelRegistration(action) {
        if (cancelBusy) return;
        setCancelBusy(true);
        setVerificationError("");
        try {
            await cancelPendingRegistration();
            setVerificationStage(null);
            setVerificationCode("");
            setVerificationError("");
            setErrors({});
            setRegistrationValidated(false);
            if (action === "edit") {
                setFormData((previous) => ({ ...previous, password: "", confirmPassword: "" }));
                setMode("typing");
                setMessages([{ speaker: "UNIABLE", text: "Your unverified account was removed. You can now edit your details and start sign-up again." }]);
                window.requestAnimationFrame(() => document.getElementById("fullName")?.focus());
            } else {
                navigate("/", { replace: true });
            }
        } catch (error) {
            console.error("Could not cancel pending UniAble sign-up:", error);
            setVerificationError(error.message || "Could not cancel this unverified account. Please try again.");
        } finally {
            setCancelBusy(false);
        }
    }

    /* =========================================
       ADD CONVERSATION MESSAGE
       ========================================= */

    function addMessage(
        speaker,
        text
    ) {

        setMessages(
            (previousMessages) => [

                ...previousMessages,

                {
                    speaker,
                    text
                }

            ]
        );

    }


    /* =========================================
       PROCESS VOICE ANSWER
       ========================================= */

    function processVoiceAnswer(
        transcript
    ) {
        const answer = String(transcript || "").trim();
        if (!answer) {
            setRecordingTranscript("");
            setVoiceQuestion("I didn't catch that. Please tap to speak and try again.");
            return;
        }

        setRecordingTranscript(answer);
        /*
          Display what the user said.
        */

        addMessage(
            "You",
            answer
        );


        /* =====================================
           STEP 0 — FULL NAME
           ===================================== */

        if (voiceStep === 0) {

            setFormData(
                (previousData) => ({

                    ...previousData,

                    fullName: answer

                })
            );


            const response =
                `Thank you, ${answer}. Do you have any accessibility needs, such as visual, hearing, mobility or speech support?`;


            addMessage(
                "UNIABLE",
                response
            );


            setVoiceQuestion(
                "Tell us about your accessibility needs"
            );


            setVoiceStep(1);


            speakText(
                response
            );


            return;
        }


        /* =====================================
           STEP 1 — ACCESSIBILITY
           ===================================== */

        if (voiceStep === 1) {

            const detectedAccessibility =
                detectAccessibility(
                    answer
                );


            setFormData(
                (previousData) => ({

                    ...previousData,

                    accessibility:
                        detectedAccessibility

                })
            );


            const response =
                detectedAccessibility === "None"

                    ? "Thank you. No accessibility needs have been selected. Now please say your email address. You can say something like name at gmail dot com."

                    : `Thank you. I've detected ${detectedAccessibility}. Now please say your email address. You can say something like name at gmail dot com.`;


            addMessage(
                "UNIABLE",
                response
            );


            setVoiceQuestion(
                "Say your email address"
            );


            setVoiceStep(2);


            speakText(
                response
            );


            return;
        }


        /* =====================================
           STEP 2 — EMAIL ADDRESS
           ===================================== */

        if (voiceStep === 2) {
            const digitWords = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
            const studentNumber = String(transcript || "").toLowerCase().split(/\s+/).map((part) => digitWords[part] ?? part).join("").replace(/[^0-9]/g, "");
            if (!isValidStudentNumber(studentNumber)) {
                const response = "A Richfield student number must be exactly nine digits and begin with 401 through 405. Please say the digits again, one at a time.";
                addMessage("UNIABLE", response);
                setVoiceQuestion("Please repeat your student number");
                speakText(response);
                return;
            }


            /*
              Valid email detected.
            */

            setFormData(
                (previousData) => ({

                    ...previousData,

                    email:
                        normalizedEmail

                })
            );


            const response =
                "Thank you. I've saved your email address. For your security, please create your password using typing mode.";


            addMessage(
                "UNIABLE",
                response
            );


            setVoiceQuestion(
                "Email complete. Create your password using typing mode."
            );


            setVoiceStep(3);


            speakText(
                response
            );


            /*
              Give UNIABLE a short moment
              to speak before switching modes.
            */

            window.setTimeout(
                () => {

                    setMode(
                        "typing"
                    );

                },
                1200
            );


            return;
        }


        /* =====================================
           STEP 3 — VOICE COMPLETE
           ===================================== */

        if (voiceStep === 3) {

            const response =
                "Your voice information is complete. Please finish creating your account using typing mode.";


            addMessage(
                "UNIABLE",
                response
            );


            speakText(
                response
            );


            setMode(
                "typing"
            );

        }

    }


    /* =========================================
       START VOICE RECOGNITION
       ========================================= */

    async function handleStartListening() {

        /*
          Prevent two listening sessions
          at the same time.
        */

        if (isListening) {

            return;

        }

        setRecordingTranscript("");
        setIsListening(true);
        try {
            const available = await isVoiceRecognitionAvailable();
            if (!available) {
                throw new Error(
                    "Voice recognition is not available on this device. Please switch to typing."
                );
            }

            if (isNative()) {
                nativeStopRef.current = await startNativeVoiceRecognition({
                    language: locale || "en-ZA",
                    onResult: (transcript, isFinal) => {
                        if (!mountedRef.current) return;
                        setRecordingTranscript(transcript);
                        if (isFinal) processVoiceAnswer(transcript);
                    },
                    onEnd: () => {
                        nativeStopRef.current = null;
                        if (mountedRef.current) setIsListening(false);
                    },
                    onError: (error) => {
                        console.error("Native signup voice recognition failed:", error);
                        nativeStopRef.current = null;
                        if (mountedRef.current) {
                            setIsListening(false);
                            setVoiceQuestion(
                                error.message || "Voice recognition failed. Please try again."
                            );
                        }
                    },
                });
                return;
            }

            recognitionRef.current = startSpeechRecognition({
                language: locale || "en-ZA",
                onResult: (transcript, isFinal) => {
                    if (!mountedRef.current) return;
                    setRecordingTranscript(transcript);
                    if (isFinal) processVoiceAnswer(transcript);
                },
                onEnd: () => {
                    recognitionRef.current = null;
                    if (mountedRef.current) setIsListening(false);
                },
                onError: (error) => {
                    console.error("Signup voice recognition failed:", error);
                    recognitionRef.current = null;
                    if (mountedRef.current) {
                        setIsListening(false);
                        setVoiceQuestion(error.message);
                    }
                },
            });

        }

        catch (error) {

            console.error(
                error
            );


            recognitionRef.current = null;
            nativeStopRef.current = null;
            if (mountedRef.current) {
                setIsListening(false);
                setVoiceQuestion(error.message);
            }

        }

    }

    async function stopListening() {
        if (isNative()) {
            await nativeStopRef.current?.();
            return;
        }

        try {
            recognitionRef.current?.stop();
        } catch (error) {
            console.warn("Could not stop signup voice recognition:", error);
        }
    }


    /* =========================================
       PAGE
       ========================================= */

    return (

        <main className="signup-screen">

            <section className="signup-app">
                <VoiceAssistanceToggle />


                {/* HEADER */}

                <SignUpHeader

                    mode={mode}

                    isListening={
                        isListening
                    }

                />


                {/* PROGRESS */}

                <ProgressBar />


                {/* PAGE CONTENT */}

                <div className="signup-content">
                    {errors.general && <p className="form-error" role="alert">{errors.general}</p>}


                    {/* =================================
              VALIDATION SUCCESS SCREEN
              ================================= */}

                    {registrationValidated ? (

                        <SignUpSuccess

                            fullName={
                                `${formData.fullName} ${formData.surname}`.trim()
                            }

                            onGoBack={() => {

                                setRegistrationValidated(
                                    false
                                );


                                setMode(
                                    "typing"
                                );

                            }}

                        />

                    ) : verificationStage ? (
                        <AccountVerification
                            stage={verificationStage}
                            method={verificationMethod}
                            setMethod={(value) => { setVerificationMethod(value); setVerificationError(""); }}
                            phoneNumber={verificationPhone}
                            setPhoneNumber={setVerificationPhone}
                            code={verificationCode}
                            setCode={setVerificationCode}
                            busy={verificationBusy}
                            setupBusy={creationBusy}
                            cancelBusy={cancelBusy}
                            cancelDisabled={cancelBusy || creationBusy || verificationBusy}
                            error={verificationError}
                            email={formData.email || getCurrentUser()?.email || ""}
                            locale={locale || "en-ZA"}
                            onSendEmail={handleSendEmailCode}
                            onSendPhone={handleSendPhoneCode}
                            onVerify={handleVerifyCode}
                            onResend={handleResendCode}
                            onBack={() => { setVerificationStage("choose"); setVerificationCode(""); setVerificationError(""); }}
                            onCancel={handleCancelRegistration}
                        />
                    ) : mode === "voice" ? (


                        /* =================================
                           VOICE MODE
                           ================================= */

                        <>

                            <MicrophoneButton

                                onStartListening={
                                    handleStartListening
                                }
                                onStopListening={stopListening}

                                isListening={
                                    isListening
                                }
                                transcript={recordingTranscript}

                                voiceQuestion={
                                    voiceQuestion
                                }

                            />


                            <ConversationCard

                                messages={
                                    messages
                                }

                            />


                            <DetectedInfo

                                formData={
                                    formData
                                }

                            />


                            <SignUpActions

                                onContinueSpeaking={
                                    isListening ? stopListening : handleStartListening
                                }

                                onSwitchToTyping={
                                    switchToTyping
                                }

                                isListening={
                                    isListening
                                }

                            />

                        </>

                    ) : (


                        /* =================================
                           TYPING MODE
                           ================================= */

                        <TypingSignUpForm

                            formData={
                                formData
                            }

                            errors={
                                errors
                            }

                            onModuleChange={
                                handleModuleChange
                            }

                            onInputChange={
                                handleInputChange
                            }

                            onReturnToVoice={
                                switchToVoice
                            }

                            onCreateAccount={
                                handleCreateAccount
                            }

                        />

                    )}
                </div>
                <p className="signup-landing-link" style={{ textAlign: "center", marginTop: 20 }}>
                    <Link to="/" onClick={(event) => { if (verificationStage) { event.preventDefault(); void handleExitSignup(); } }} style={{ textDecoration: "underline", fontWeight: 600 }}>
                        Back to landing page
                    </Link>
                </p>

            </section>

        </main>

    );

}

export default SignUp;
