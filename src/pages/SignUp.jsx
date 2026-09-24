import { useState } from "react";

import "../styles/signup.css";

import SignUpHeader from "../components/SignUpHeader";
import ProgressBar from "../components/ProgressBar";
import MicrophoneButton from "../components/MicrophoneButton";
import ConversationCard from "../components/ConversationCard";
import DetectedInfo from "../components/DetectedInfo";
import SignUpActions from "../components/SignUpActions";
import TypingSignUpForm from "../components/TypingSignUpForm";
import SignUpSuccess from "../components/SignUpSuccess";

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

    const [errors, setErrors] =
        useState({});


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

    function handleCreateAccount() {

        const validationErrors =
            validateSignUpForm(
                formData
            );


        /*
          If errors exist,
          show them on the form.
        */

        if (
            Object.keys(
                validationErrors
            ).length > 0
        ) {

            setErrors(
                validationErrors
            );


            return;

        }


        /*
          Frontend validation passed.
    
          We are NOT creating the actual
          Firebase account yet.
        */

        setErrors({});


        setRegistrationValidated(
            true
        );

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
           STEP 1 — ACCESSIBILITY
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
           STEP 2 — EMAIL ADDRESS
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

            </section>

        </main>

    );

}

export default SignUp;