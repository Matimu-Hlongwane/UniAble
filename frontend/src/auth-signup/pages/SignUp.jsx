import React, { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { Link, useLocation } from "react-router-dom";
import {
    createAccountWithEmailPassword,
    startAccountVerification,
    getVerificationStatus,
    getCurrentUser,
    getVoiceFirstPreference,
    subscribeToAuth,
    sendEmailOtp,
    verifyEmailOtp
} from "../../services/firebaseAuth";

import "../styles/signup.css";

import SignUpHeader from "../components/SignUpHeader";
import ProgressBar from "../components/ProgressBar";
import MicrophoneButton from "../components/MicrophoneButton";
import ConversationCard from "../components/ConversationCard";
import DetectedInfo from "../components/DetectedInfo";
import TypingSignUpForm from "../components/TypingSignUpForm";
import SignUpSuccess from "../components/SignUpSuccess";
import AccountVerification from "../components/AccountVerification";

import {
    isSpeechRecognitionSupported,
    requestMicrophonePermission,
    startSpeechRecognition,
    speakText
} from "../services/speechService";

import {
    detectAccessibility
} from "../utils/accessibilityDetector";

import { isNative, startNativeVoiceRecognition } from "../../services/platformVoice";

import {
    isValidStudentNumber,
    STUDENT_EMAIL_DOMAIN,
    validateSignUpForm
} from "../utils/validation";


function SignUp() {
    const location = useLocation();

    /* =========================================
       PAGE MODE
       ========================================= */

    const [mode, setMode] =
        useState(() => new URLSearchParams(location.search).get("mode") === "text" ? "typing" : "voice");


    /* =========================================
       VALIDATION
       ========================================= */

    const [errors, setErrors] = useState({});
    const [verificationStage, setVerificationStage] = useState(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationBusy, setVerificationBusy] = useState(false);
    const [verificationError, setVerificationError] = useState("");
    const [creationBusy, setCreationBusy] = useState(false);


    const [
        registrationValidated,
        setRegistrationValidated
    ] = useState(false);


    /* =========================================
       VOICE STATE
       ========================================= */

    const [isListening, setIsListening] =
        useState(false);
    const recognitionRef = useRef(null);
    const nativeStopRef = useRef(null);
    const voiceSessionActiveRef = useRef(false);


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
        "Speak your full name to continue"
    );


    /* =========================================
       CONVERSATION
       ========================================= */

    const [messages, setMessages] =
        useState([
            {
                speaker: "UNIABLE",
                text:
                    "Welcome! Let's set up your account together. What's your full name?"
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
            yearOfStudy: "",
            dateOfBirth: "",
            phoneNumber: "",
            confirmPassword: "",
            accessibility: "",

            additionalNeeds: "",

            email: "",

            password: ""

        });


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
        let cancelled = false;
        let timer;

        async function announcePage() {
            if (document.querySelector("[data-uniable-public-voice-guide=true]")) return;
            if (!await getVoiceFirstPreference(getCurrentUser()) || cancelled) return;

            const guidance = registrationValidated
                ? "Your UniAble account details have been submitted successfully."
                : mode === "voice"
                    ? "Welcome to UniAble sign up. You can speak your name, accessibility needs and student number, or switch to typing at any time. The microphone only listens when you activate it. Enter your password privately; do not speak it aloud."
                    : "Typing sign up mode. Enter your account details. Your institutional email is generated from your student number. Enter your password privately; it will never be read aloud.";

            timer = window.setTimeout(() => {
                if (!cancelled) void speakText(guidance);
            }, 600);
        }

        announcePage().catch((error) => {
            console.warn("Could not load the spoken guidance preference:", error);
        });

        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [mode, registrationValidated]);
    /* =========================================
       SWITCH INPUT MODES
       ========================================= */

    function switchToTyping() {
        if (isListening) void handleStopListening();
        setMode("typing");

    }

    function switchToVoice() {
        setMode("voice");
    }


    /* =========================================
       HANDLE TYPED INPUT
       ========================================= */

    function handleInputChange(event) {

        const {
            name,
            value
        } = event.target;


        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
            ...(name === "studentNumber"
                ? { email: value.trim() ? `${value.trim()}@${STUDENT_EMAIL_DOMAIN}` : "" }
                : {}),
        }));


        /*
          Remove the error for the field
          once the user starts correcting it.
        */

        setErrors(
            (previousErrors) => ({

                ...previousErrors,

                [name]: ""

            })
        );

    }


    /* =========================================
       FRONTEND ACCOUNT VALIDATION
       ========================================= */

    async function handleCreateAccount() {
        if (creationBusy) return;
        const registrationData = {
            ...formData,
            email: `${String(formData.studentNumber || "").trim()}@${STUDENT_EMAIL_DOMAIN}`,
        };
        const validationErrors = validateSignUpForm(registrationData);
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
        setErrors({});
        setCreationBusy(true);
        try {
            const createdUser = await createAccountWithEmailPassword(
                registrationData.email,
                registrationData.password,
                formData.fullName,
                formData.accessibility,
                formData.accountType,
                { surname: registrationData.surname, studentNumber: registrationData.studentNumber, institutionalEmail: registrationData.email, qualification: registrationData.qualification, yearOfStudy: registrationData.yearOfStudy, dateOfBirth: registrationData.dateOfBirth, modules: [], phoneNumber: registrationData.phoneNumber }
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
            setVerificationStage("choose");
            setVerificationError("");
            setMode("typing");
            try {
                await startAccountVerification();
            } catch (setupError) {
                setVerificationError(`Your account was created, but the verification service is not ready: ${setupError.message}`);
            }
        } catch (error) {
            console.error("UniAble registration failed:", error);
            let message = error.message || "We could not create your account. Please try again.";
            if (error.code === "auth/email-already-in-use") message = "An account already exists for this email address. Sign in, then choose Create an account to resume verification if needed.";
            else if (error.code === "auth/weak-password") message = "Your password is too weak. Please choose a stronger password.";
            else if (error.code === "auth/invalid-email") message = "Please enter a valid email address.";
            else if (error.code === "auth/operation-not-allowed") message = "Email and password sign-in is not enabled in your Firebase project.";
            setErrors({ general: message });
        } finally {
            setCreationBusy(false);
        }
    }

    async function handleSendEmailCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            await sendEmailOtp();
            setVerificationCode(""); setVerificationStage("code");
        } catch (error) { setVerificationError(error.message || "Could not send the email code."); }
        finally { setVerificationBusy(false); }
    }

    async function handleVerifyCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) throw new Error("Enter the six-digit code.");
            await verifyEmailOtp(verificationCode);
            setVerificationStage(null);
            setRegistrationValidated(true);
            speakText("Your account has been verified. You will now be taken to the sign-in page. Please sign in using your Richfield email address and password.");
            window.setTimeout(() => { window.location.assign("/login?registered=1"); }, 1800);
        } catch (error) { setVerificationError(error.message || "The code could not be verified. Please try again."); }
        finally { setVerificationBusy(false); }
    }

    async function handleResendCode() {
        return handleSendEmailCode();
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

        /*
          Display what the user said.
        */

        addMessage(
            "You",
            transcript
        );


        /* =====================================
           STEP 0 — FULL NAME
           ===================================== */

        if (voiceStep === 0) {

            setFormData(
                (previousData) => ({

                    ...previousData,

                    fullName: transcript

                })
            );


            const response =
                `Thank you, ${transcript}. Do you have any accessibility needs, such as visual, hearing, mobility, speech or neurodiverse support?`;


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
                    transcript
                );

            if (!detectedAccessibility) {
                const response = "Please say visual, hearing, mobility, speech, neurodiverse, or no accessibility needs.";
                addMessage("UNIABLE", response);
                setVoiceQuestion("Please choose one of the listed accessibility options");
                speakText(response);
                return;
            }

            setFormData(
                (previousData) => ({

                    ...previousData,

                    accessibility:
                        detectedAccessibility

                })
            );


            const response =
                detectedAccessibility === "None"

                    ? "Thank you. No accessibility needs have been selected. Now please say your Richfield student number, digit by digit."

                    : `Thank you. I've detected ${detectedAccessibility}. Now please say your Richfield student number, digit by digit.`;


            addMessage(
                "UNIABLE",
                response
            );


            setVoiceQuestion(
                "Say your student number, digit by digit"
            );


            setVoiceStep(2);


            speakText(
                response
            );


            return;
        }


        /* =====================================
           STEP 2 — STUDENT NUMBER
           ===================================== */

        if (voiceStep === 2) {
            const digitWords = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
            const studentNumber = String(transcript || "").toLowerCase().split(/\s+/).map((part) => digitWords[part] ?? part).join("").replace(/[^0-9]/g, "");
            if (!isValidStudentNumber(studentNumber)) {
                const response = "A Richfield student number must be exactly nine digits and begin with 401, 402 or 403. Please say the digits again, one at a time.";
                addMessage("UNIABLE", response);
                setVoiceQuestion("Please repeat your student number");
                speakText(response);
                return;
            }

            const institutionalEmail = `${studentNumber}@${STUDENT_EMAIL_DOMAIN}`;
            setFormData((previousData) => ({ ...previousData, studentNumber, email: institutionalEmail }));
            const response = `Thank you. Your Richfield student number has been captured. UniAble has generated your student email address as ${institutionalEmail}. Verification codes will be sent to that address. Please finish your qualification and account details in the accessible form. Enter your password privately; do not speak it aloud.`;
            addMessage("UNIABLE", response);
            setVoiceQuestion("Student number captured. Continue in the accessible form.");
            setVoiceStep(3);
            speakText(response);
            setTimeout(() => setMode("typing"), 1200);
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

        if (voiceSessionActiveRef.current) return;


        /*
          Check if browser speech
          recognition is available.
        */

        if (!isNative() && !isSpeechRecognitionSupported()) {

            setVoiceQuestion(
                "Voice recognition is not supported on this browser. Please switch to typing."
            );


            return;

        }

        voiceSessionActiveRef.current = true;

        try {
            setIsListening(true);
            if (isNative()) {
                const stopNative = await startNativeVoiceRecognition({
                    language: "en-ZA",
                    onResult: (transcript, isFinal) => {
                        if (isFinal && transcript) processVoiceAnswer(transcript);
                    },
                    onEnd: () => {
                        nativeStopRef.current = null;
                        voiceSessionActiveRef.current = false;
                        setIsListening(false);
                    },
                    onError: (error) => {
                        console.error("Sign-up voice input failed:", error);
                        voiceSessionActiveRef.current = false;
                        setIsListening(false);
                        setVoiceQuestion(error?.message || "Voice input failed. Please try again or switch to typing.");
                    },
                });
                if (!voiceSessionActiveRef.current) {
                    await stopNative();
                } else {
                    nativeStopRef.current = stopNative;
                }
                return;
            }

            await requestMicrophonePermission();
            if (!voiceSessionActiveRef.current) return;
            recognitionRef.current = startSpeechRecognition({
                onStart: () => setIsListening(true),
                onResult: processVoiceAnswer,
                onEnd: () => {
                    recognitionRef.current = null;
                    voiceSessionActiveRef.current = false;
                    setIsListening(false);
                },
                onError: (error) => {
                    console.error("Sign-up voice input failed:", error);
                    voiceSessionActiveRef.current = false;
                    setIsListening(false);
                    setVoiceQuestion(error.message);
                },
            });
        }

        catch (error) {
            voiceSessionActiveRef.current = false;

            console.error(
                error
            );


            setIsListening(
                false
            );


            setVoiceQuestion(
                error.message
            );

        }

    }


    async function handleStopListening() {
        voiceSessionActiveRef.current = false;
        const stopNative = nativeStopRef.current;
        nativeStopRef.current = null;
        if (stopNative) {
            try {
                await stopNative();
            } catch (error) {
                console.warn("Could not stop native sign-up voice input:", error);
            }
        } else if (recognitionRef.current) {
            const recognition = recognitionRef.current;
            recognitionRef.current = null;
            try {
                recognition.stop();
            } catch (error) {
                if (error?.name !== "InvalidStateError") {
                    console.warn("Could not stop sign-up voice input:", error);
                }
            }
        }
        setIsListening(false);
    }

    useEffect(() => () => {
        voiceSessionActiveRef.current = false;
        try {
            recognitionRef.current?.abort?.();
        } catch {
            // Recognition may already have stopped.
        }
        if (nativeStopRef.current) {
            void nativeStopRef.current().catch((error) => {
                console.warn("Could not stop native sign-up voice input on exit:", error);
            });
        }
    }, []);

    /* =========================================
       PAGE
       ========================================= */

    return (

        <main className="signup-screen">

            <section className="signup-app">


                {/* HEADER */}

                <SignUpHeader

                    mode={mode}

                    isListening={
                        isListening
                    }
                    voiceStep={voiceStep}

                />


                {/* PROGRESS */}

                {mode === "voice" && (
                    <ProgressBar progress={Math.min(((voiceStep + 1) / 3) * 100, 100)} />
                )}


                {/* PAGE CONTENT */}

                <div className="signup-content">
                    {errors.general && <p className="form-error" role="alert">{errors.general}</p>}

                    {!registrationValidated && !verificationStage && (
                        <div className="signup-mode-switch" role="group" aria-label="Choose sign-up input method">
                            <button
                                type="button"
                                className={mode === "voice" ? "selected" : ""}
                                aria-pressed={mode === "voice"}
                                disabled={creationBusy}
                                onClick={switchToVoice}
                            >
                                Voice guided
                            </button>
                            <button
                                type="button"
                                className={mode === "typing" ? "selected" : ""}
                                aria-pressed={mode === "typing"}
                                disabled={creationBusy}
                                onClick={switchToTyping}
                            >
                                Type details
                            </button>
                        </div>
                    )}

                    {/* =================================
              VALIDATION SUCCESS SCREEN
              ================================= */}

                    {registrationValidated ? (

                        <SignUpSuccess

                            fullName={
                                formData.fullName
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
                            code={verificationCode}
                            setCode={setVerificationCode}
                            busy={verificationBusy}
                            error={verificationError}
                            email={formData.email || getCurrentUser()?.email || ""}
                            onSendEmail={handleSendEmailCode}
                            onVerify={handleVerifyCode}
                            onResend={handleResendCode}
                            onBack={() => { setVerificationStage("choose"); setVerificationCode(""); setVerificationError(""); }}
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
                                onStopListening={
                                    handleStopListening
                                }

                                isListening={
                                    isListening
                                }

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

                            onInputChange={
                                handleInputChange
                            }

                            onCreateAccount={
                                handleCreateAccount
                            }
                            isCreating={creationBusy}

                        />

                    )}
                </div>
                <p className="signup-landing-link" style={{ textAlign: "center", marginTop: 20 }}>
                    <Link to="/" style={{ textDecoration: "underline", fontWeight: 600 }}>
                        Back to landing page
                    </Link>
                </p>

            </section>

        </main>

    );

}

export default SignUp;
