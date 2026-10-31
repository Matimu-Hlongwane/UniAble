import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";
import {
    createAccountWithEmailPassword,
    startAccountVerification,
    getVerificationStatus,
    getCurrentUser,
    subscribeToAuth,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    completePhoneVerification
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
    isSpeechRecognitionSupported,
    requestMicrophonePermission,
    startSpeechRecognition,
    speakText
} from "../services/speechService";

import {
    detectAccessibility
} from "../utils/accessibilityDetector";

import {
    normalizeSpokenEmail
} from "../utils/emailUtils";

import {
    isValidEmail,
    validateSignUpForm
} from "../utils/validation";


function SignUp() {

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

            accessibility: "",

            additionalNeeds: "",

            email: "",

            password: ""

        });


    useEffect(() => {
        let cancelled = false;
        let timer;

        async function announceSignup() {
            try {
                const profile = JSON.parse(
                    window.localStorage.getItem("uniableAccessibilityProfile") || "null"
                );
                const voiceFirst =
                    profile?.id === "blind" ||
                    window.localStorage.getItem("uniableVoiceFirstEnabled") === "true";

                if (!voiceFirst || cancelled) return;

                timer = window.setTimeout(async () => {
                    try {
                        await speak(
                            "UniAble create account page. Enter your full name, accessibility needs, email address, and password. You can choose voice-assisted signup or switch to typing. The microphone only listens when you activate it. Do not speak your password aloud.",
                            { locale: "en-ZA", rate: 0.94 }
                        );
                    } catch (error) {
                        console.warn("Signup page spoken guidance failed:", error);
                    }
                }, 600);
            } catch (error) {
                console.warn("Could not determine signup voice-first preference:", error);
            }
        }

        announceSignup();
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, []);

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

        if (registrationValidated) {
            speakText(
                "Your UniAble account details have been submitted successfully."
            );
            return;
        }

        const guidance = mode === "voice"

            ? "Welcome to UniAble sign up. You can complete the first steps by speaking or switch to typing at any time. The microphone is optional. You only need to select Tap to Speak if you want to provide an answer using your voice. I will guide you through your full name, accessibility needs and email address. For your security, your password must be entered using typing mode and will never be read aloud. You can also use your keyboard to navigate the page."

            : "You are now in typing sign up mode. Enter your full name, accessibility needs, email address and password. Your password is private and will never be read aloud. You can use your keyboard to move between fields. You can return to voice sign up if you prefer.";

        const timer = window.setTimeout(() => {
            speakText(guidance);
        }, 600);

        return () => {
            window.clearTimeout(timer);
        };

    }, [mode, registrationValidated]);
    /* =========================================
       SWITCH INPUT MODES
       ========================================= */

    function switchToTyping() {

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


        setFormData(
            (previousData) => ({

                ...previousData,

                [name]: value

            })
        );


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
        const validationErrors = validateSignUpForm(formData);
        if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
        setErrors({});
        try {
            const createdUser = await createAccountWithEmailPassword(
                formData.email,
                formData.password,
                formData.fullName,
                formData.accessibility,
                formData.accountType
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
            setVerificationMethod("email");
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
        }
    }

    async function handleSendEmailCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            await sendEmailOtp();
            setVerificationMethod("email"); setVerificationCode(""); setVerificationStage("code");
        } catch (error) { setVerificationError(error.message || "Could not send the email code."); }
        finally { setVerificationBusy(false); }
    }

    async function handleSendPhoneCode() {
        setVerificationBusy(true); setVerificationError("");
        try {
            const normalized = verificationPhone.trim();
            if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error("Enter your phone number in international format, for example +27821234567.");
            phoneVerifier?.clear();
            const result = await sendPhoneOtp(normalized, "uniable-phone-recaptcha");
            setPhoneConfirmation(result.confirmation); setPhoneVerifier(result.verifier);
            setVerificationPhone(normalized); setVerificationMethod("sms"); setVerificationCode(""); setVerificationStage("code");
        } catch (error) { setVerificationError(error.message || "Could not send the SMS code. Check Firebase Phone Authentication and reCAPTCHA settings."); }
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
        } catch (error) { setVerificationError(error.message || "The code could not be verified. Please try again."); }
        finally { setVerificationBusy(false); }
    }

    async function handleResendCode() {
        if (verificationMethod === "email") return handleSendEmailCode();
        return handleSendPhoneCode();
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
           STEP 0 â€” FULL NAME
           ===================================== */

        if (voiceStep === 0) {

            setFormData(
                (previousData) => ({

                    ...previousData,

                    fullName: transcript

                })
            );


            const response =
                `Thank you, ${transcript}. Do you have any accessibility needs, such as visual, hearing, mobility or speech support?`;


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
           STEP 1 â€” ACCESSIBILITY
           ===================================== */

        if (voiceStep === 1) {

            const detectedAccessibility =
                detectAccessibility(
                    transcript
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
           STEP 2 â€” EMAIL ADDRESS
           ===================================== */

        if (voiceStep === 2) {

            const normalizedEmail =
                normalizeSpokenEmail(
                    transcript
                );


            /*
              Email could not be validated.
            */

            if (
                !isValidEmail(
                    normalizedEmail
                )
            ) {

                const response =
                    `I heard ${normalizedEmail || transcript}, but I couldn't confirm that as a valid email address. Please say it again slowly, for example, name at gmail dot com.`;


                addMessage(
                    "UNIABLE",
                    response
                );


                setVoiceQuestion(
                    "Please say your email address again"
                );


                speakText(
                    response
                );


                /*
                  Keep voiceStep at 2.
                */

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

            setTimeout(
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
           STEP 3 â€” VOICE COMPLETE
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


        /*
          Check if browser speech
          recognition is available.
        */

        if (
            !isSpeechRecognitionSupported()
        ) {

            setVoiceQuestion(
                "Voice recognition is not supported on this browser. Please switch to typing."
            );


            return;

        }


        try {

            /*
              Ask user for microphone access.
            */

            await requestMicrophonePermission();


            /*
              Start recognition.
            */

            startSpeechRecognition({

                onStart: () => {

                    setIsListening(
                        true
                    );

                },


                onResult: (
                    transcript
                ) => {

                    processVoiceAnswer(
                        transcript
                    );

                },


                onEnd: () => {

                    setIsListening(
                        false
                    );

                },


                onError: (
                    error
                ) => {

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

            });

        }

        catch (error) {

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
                            method={verificationMethod}
                            setMethod={(value) => { setVerificationMethod(value); setVerificationError(""); }}
                            phoneNumber={verificationPhone}
                            setPhoneNumber={setVerificationPhone}
                            code={verificationCode}
                            setCode={setVerificationCode}
                            busy={verificationBusy}
                            error={verificationError}
                            email={formData.email || getCurrentUser()?.email || ""}
                            onSendEmail={handleSendEmailCode}
                            onSendPhone={handleSendPhoneCode}
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


                            <SignUpActions

                                onContinueSpeaking={
                                    handleStartListening
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
                    <Link to="/" style={{ textDecoration: "underline", fontWeight: 600 }}>
                        Back to landing page
                    </Link>
                </p>

            </section>

        </main>

    );

}

export default SignUp;







