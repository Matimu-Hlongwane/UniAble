
/* ============================================================
   UNIABLE — VOICE-GUIDED SIGN-UP
   Author: Matimu Hlongwane

   PURPOSE:
   - Collect a student's details through five guided steps.
   - Support voice recognition and manual typing.
   - Validate answers before moving forward.
   - Save a registration only after successful completion.
   - Share registration records with the prototype dashboard.
   - NEVER save passwords or password confirmations to storage.

   IMPORTANT:
   This is a browser-storage prototype. It does not create a
   real authenticated account. Use a secure backend and proper
   authentication before storing real student information.
   ============================================================ */

/* Shared key: dashboard.js must use the exact same key. */
const REGISTRATION_STORAGE_KEY = "uniable_registrations_v1";

/* Defines the five registration steps and their questions. */
const signupSteps = [
  {
    key: "name",
    title: "What is your full name?",
    caption: "Personal Information",
    label: "Full name",
    placeholder: "Enter your full name",
    autocomplete: "name",
    hint: "Tap the microphone and say your full name.",
    description: "Speak clearly, or switch to typing whenever you prefer.",
    type: "text"
  },
  {
    key: "accessibility",
    title: "How can UniAble support you?",
    caption: "Identity & Accessibility Profile",
    label: "Accessibility needs",
    placeholder: "Describe your accessibility needs",
    autocomplete: "off",
    hint: "Tell UniAble what support would help you.",
    description: "For example, visual, hearing, mobility, speech or neurodiverse support. You may also say none.",
    type: "text"
  },
  {
    key: "email",
    title: "What is your email address?",
    caption: "Account Details",
    label: "Email address",
    placeholder: "you@example.com",
    autocomplete: "email",
    hint: "Say your email address, or type it carefully.",
    description: "We'll use this address for account access when authentication is connected.",
    type: "email"
  },
  {
    key: "password",
    title: "Create a password",
    caption: "Secure Your Account",
    label: "Password",
    placeholder: "At least 8 characters",
    autocomplete: "new-password",
    hint: "For privacy, enter your password by typing.",
    description: "Password entry is kept in typing mode rather than spoken aloud.",
    type: "password"
  },
  {
    key: "confirmPassword",
    title: "Confirm your password",
    caption: "Final Check",
    label: "Confirm password",
    placeholder: "Re-enter your password",
    autocomplete: "new-password",
    hint: "Type your password again to confirm.",
    description: "Both password entries must match.",
    type: "password"
  }
];

/* Keeps answers in memory while the user completes the form.
   Password values stay in memory only and are never saved in
   the registration record or browser storage. */
const signupAnswers = {
  name: "",
  accessibility: "",
  email: "",
  password: "",
  confirmPassword: ""
};

/* Tracks the currently displayed step. */
let currentStepIndex = 0;

/* Tracks the preferred answer method. */
let inputMode = "voice";

/* Tracks the browser speech-recognition instance. */
let speechRecognition = null;

/* Tracks whether speech recognition is active. */
let isListening = false;

/* Prevents the final submission from being saved twice. */
let registrationSaved = false;

/* Collects references to the page elements. */
const stepCaption = document.querySelector("#step-caption");
const listeningStatus = document.querySelector("#listening-status");
const progressPercentage = document.querySelector("#progress-percentage");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const microphoneButton = document.querySelector("#microphone-button");
const microphoneHint = document.querySelector("#microphone-hint");
const questionTitle = document.querySelector("#question-title");
const questionDescription = document.querySelector("#question-description");
const answerForm = document.querySelector("#answer-form");
const inputGroup = document.querySelector("#input-group");
const answerLabel = document.querySelector("#answer-label");
const answerInput = document.querySelector("#answer-input");
const fieldError = document.querySelector("#field-error");
const inputSubmit = document.querySelector("#input-submit");
const typingToggle = document.querySelector("#typing-toggle");
const conversationMessages = document.querySelector("#conversation-messages");
const detectedChips = document.querySelector("#detected-chips");
const continueSpeakingButton = document.querySelector("#continue-speaking");
const previousStepButton = document.querySelector("#previous-step");
const continueStepButton = document.querySelector("#continue-step");
const generalStatus = document.querySelector("#general-status");

/* Reads an optional voice-mode request from the landing page. */
const signupQuery = new URLSearchParams(window.location.search);

/* Displays a status message safely for assistive technologies. */
function showGeneralStatus(message) {
  generalStatus.textContent = message;
}

/* Adds a message to the conversation using safe text nodes. */
function addConversationMessage(speaker, message, messageType) {
  const article = document.createElement("article");
  article.className = `message ${messageType}`;

  const speakerLabel = document.createElement("strong");
  speakerLabel.textContent = speaker;

  const messageText = document.createElement("p");
  messageText.textContent = message;

  article.append(speakerLabel, messageText);
  conversationMessages.appendChild(article);

  article.scrollIntoView({
    block: "nearest",
    behavior: "smooth"
  });
}

/* Displays non-password answers as chips.
   Passwords are deliberately excluded from this display. */
function renderDetectedAnswers() {
  detectedChips.replaceChildren();

  const answerKeys = ["name", "accessibility", "email"];
  let hasAnswer = false;

  answerKeys.forEach((key) => {
    const value = signupAnswers[key];

    if (!value) return;

    hasAnswer = true;

    const step = signupSteps.find((item) => item.key === key);
    const chip = document.createElement("span");

    chip.className = "detected-chip";
    chip.textContent = `${step.label}: ${value}`;

    detectedChips.appendChild(chip);
  });

  if (!hasAnswer) {
    const emptyChip = document.createElement("span");

    emptyChip.className = "empty-chip";
    emptyChip.textContent = "Your answers will appear here";

    detectedChips.appendChild(emptyChip);
  }
}

/* Stops speech recognition and clears the listening indicator. */
function stopListening() {
  if (speechRecognition && isListening) {
    speechRecognition.stop();
  }

  isListening = false;
  microphoneButton.classList.remove("is-listening");
}

/* Updates the question, progress bar and answer field. */
function renderCurrentStep() {
  const step = signupSteps[currentStepIndex];
  const progress = Math.round(
    ((currentStepIndex + 1) / signupSteps.length) * 100
  );

  stepCaption.textContent =
    `Step ${currentStepIndex + 1} of ${signupSteps.length} · ${step.caption}`;

  progressPercentage.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;
  progressTrack.setAttribute("aria-valuenow", String(progress));

  questionTitle.textContent = step.title;
  questionDescription.textContent = step.description;
  microphoneHint.textContent = step.hint;
  answerLabel.textContent = step.label;
  answerInput.placeholder = step.placeholder;
  answerInput.autocomplete = step.autocomplete;
  answerInput.type = step.type;
  answerInput.value = signupAnswers[step.key];

  fieldError.textContent = "";

  updateInputMode();

  previousStepButton.disabled = currentStepIndex === 0;

  continueStepButton.textContent =
    currentStepIndex === signupSteps.length - 1
      ? "Review & Finish"
      : "Continue";

  renderDetectedAnswers();
}

/* Shows the right controls for voice or typing mode. */
function updateInputMode() {
  const step = signupSteps[currentStepIndex];
  const passwordStep = step.type === "password";

  /* Passwords always require typing. */
  if (passwordStep) {
    inputMode = "typing";
  }

  const showTyping = inputMode === "typing";

  inputGroup.classList.toggle("is-visible", showTyping);
  inputSubmit.classList.toggle("is-visible", showTyping);

  typingToggle.textContent = showTyping
    ? "♬ Switch to Voice"
    : "⌨ Switch to Typing";

  microphoneButton.hidden = passwordStep;
  continueSpeakingButton.hidden = showTyping;

  listeningStatus.textContent = passwordStep
    ? "Typing required for password privacy"
    : showTyping
      ? "Typing mode active"
      : "Voice and typing are ready";

  if (showTyping) {
    stopListening();
  }
}

/* Validates the current answer before saving it in memory. */
function validateAndStoreAnswer(value) {
  const step = signupSteps[currentStepIndex];
  const cleanValue = value.trim();

  fieldError.textContent = "";

  if (!cleanValue) {
    fieldError.textContent =
      `Please enter your ${step.label.toLowerCase()}.`;

    answerInput.focus();
    return false;
  }

  /* Performs basic email-format validation. */
  if (
    step.key === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)
  ) {
    fieldError.textContent = "Please enter a valid email address.";
    answerInput.focus();
    return false;
  }

  /* Enforces the prototype's minimum password length. */
  if (step.key === "password" && cleanValue.length < 8) {
    fieldError.textContent =
      "Your password must contain at least 8 characters.";

    answerInput.focus();
    return false;
  }

  /* Confirms that both password entries match. */
  if (
    step.key === "confirmPassword" &&
    cleanValue !== signupAnswers.password
  ) {
    fieldError.textContent =
      "The passwords do not match. Please try again.";

    answerInput.focus();
    return false;
  }

  /* Stores the answer in page memory. */
  signupAnswers[step.key] = cleanValue;

  /* Never add the actual password to the conversation history. */
  const safeMessage = step.type === "password"
    ? "Password entered securely."
    : cleanValue;

  addConversationMessage("You", safeMessage, "user-message");

  renderDetectedAnswers();

  return true;
}

/* Reads existing registrations from browser storage.
   An unreadable or missing store is handled without crashing. */
function readRegistrations() {
  const storedData = localStorage.getItem(REGISTRATION_STORAGE_KEY);

  if (!storedData) {
    return [];
  }

  const records = JSON.parse(storedData);

  if (!Array.isArray(records)) {
    throw new Error("Registration storage has an unexpected format.");
  }

  return records;
}

/* Builds and saves a safe dashboard record.
   Passwords and password confirmations are never included. */
function saveRegistrationRecord() {
  if (registrationSaved) {
    return {
      success: true,
      message: "This registration has already been saved."
    };
  }

  try {
    const records = readRegistrations();

    /* Avoid creating duplicate prototype registrations for the
       same email address, regardless of letter case. */
    const normalizedEmail = signupAnswers.email.trim().toLowerCase();

    const duplicate = records.some((record) =>
      String(record.email || "").trim().toLowerCase() === normalizedEmail
    );

    if (duplicate) {
      return {
        success: false,
        duplicate: true,
        message: "A registration with this email already exists in the prototype dashboard."
      };
    }

    /* Creates a unique reference for dashboard staff. */
    const registrationId = window.crypto?.randomUUID
      ? `UA-${window.crypto.randomUUID()}`
      : `UA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    /* Store only the fields needed by the prototype dashboard.
       Do not add password or confirmPassword to this object. */
    const registrationRecord = {
      id: registrationId,
      name: signupAnswers.name.trim(),
      email: normalizedEmail,
      accessibility: signupAnswers.accessibility.trim(),
      status: "Pending review",
      createdAt: new Date().toISOString()
    };

    /* Adds the new record without replacing existing registrations. */
    records.push(registrationRecord);

    /* Saves the updated list for the dashboard to read. */
    localStorage.setItem(
      REGISTRATION_STORAGE_KEY,
      JSON.stringify(records)
    );

    registrationSaved = true;

    return {
      success: true,
      record: registrationRecord
    };
  } catch (error) {
    console.error("Unable to save UniAble registration:", error);

    return {
      success: false,
      message: "The registration could not be saved in this browser. Please check browser storage and try again."
    };
  }
}

/* Moves to the next step or finishes the registration. */
function continueToNextStep() {
  const step = signupSteps[currentStepIndex];
  const answerValue = answerInput.value;

  if (!validateAndStoreAnswer(answerValue)) {
    return;
  }

  stopListening();

  if (currentStepIndex === signupSteps.length - 1) {
    showCompletionScreen();
    return;
  }

  currentStepIndex += 1;

  addConversationMessage(
    "UniAble",
    signupSteps[currentStepIndex].title,
    "assistant-message"
  );

  renderCurrentStep();

  showGeneralStatus(`Step ${currentStepIndex + 1} of ${signupSteps.length}.`);
}

/* Displays the completion state only after the final validation.
   A clear message is shown if storage fails or the email exists. */
function showCompletionScreen() {
  if (registrationSaved) {
    return;
  }

  const result = saveRegistrationRecord();

  stopListening();

  /* Hide the controls once the submission has been processed. */
  microphoneButton.hidden = true;
  answerForm.hidden = true;
  typingToggle.hidden = true;
  previousStepButton.hidden = true;
  continueSpeakingButton.hidden = true;

  if (result.success) {
    questionTitle.textContent = "Your registration has been received";

    questionDescription.textContent =
      "Your prototype registration has been saved and is ready for review. No real account has been created yet.";

    microphoneHint.textContent = "Registration saved";

    continueStepButton.textContent = "Return to UniAble";

    addConversationMessage(
      "UniAble",
      `Registration saved. Your reference is ${result.record.id}. Your status is Pending review.`,
      "assistant-message"
    );

    showGeneralStatus(
      "Registration saved in this browser. It should now appear on the prototype dashboard."
    );

    /* Clear passwords from page memory after the registration is saved. */
    signupAnswers.password = "";
    signupAnswers.confirmPassword = "";
  } else {
    questionTitle.textContent = result.duplicate
      ? "This email is already registered"
      : "We couldn't save your registration";

    questionDescription.textContent = result.message;

    microphoneHint.textContent = "Registration not saved";

    continueStepButton.textContent = "Try Again";

    showGeneralStatus(result.message);

    /* Allow the user to return to the final step and correct or retry. */
    continueStepButton.onclick = () => {
      continueStepButton.onclick = null;

      answerForm.hidden = false;
      typingToggle.hidden = false;
      previousStepButton.hidden = false;

      currentStepIndex = signupSteps.length - 1;
      inputMode = "typing";

      renderCurrentStep();

      showGeneralStatus(
        "Check your details and try again. If this email is already registered, use a different test email."
      );
    };

    return;
  }

  /* The registration was saved; return to the actual landing-page path. */
  continueStepButton.onclick = () => {
    window.location.href = "../Landing_Page/index.html";
  };
}

/* Starts speech recognition if the browser supports it. */
function startListening() {
  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    showGeneralStatus(
      "Voice recognition is not supported here. Please switch to typing."
    );

    inputMode = "typing";
    updateInputMode();
    answerInput.focus();

    return;
  }

  if (signupSteps[currentStepIndex].type === "password") {
    showGeneralStatus(
      "For privacy, passwords must be entered by typing."
    );

    return;
  }

  stopListening();

  speechRecognition = new SpeechRecognitionAPI();
  speechRecognition.lang = "en-ZA";
  speechRecognition.interimResults = false;
  speechRecognition.maxAlternatives = 1;

  speechRecognition.onstart = () => {
    isListening = true;

    microphoneButton.classList.add("is-listening");

    listeningStatus.textContent = "Listening… speak now";
    microphoneHint.textContent = "I'm listening. Speak clearly.";
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();

    answerInput.value = transcript;

    /* Let the user review and correct recognised speech. */
    inputMode = "typing";
    updateInputMode();

    showGeneralStatus(
      "Voice input received. Review your answer, then select Save answer."
    );

    answerInput.focus();
  };

  speechRecognition.onerror = (event) => {
    showGeneralStatus(
      event.error === "not-allowed"
        ? "Microphone permission was denied. Please allow microphone access or switch to typing."
        : "I couldn't recognise that speech. Please try again or switch to typing."
    );

    listeningStatus.textContent = "Voice input unavailable";
  };

  speechRecognition.onend = () => {
    isListening = false;

    microphoneButton.classList.remove("is-listening");

    if (inputMode === "voice") {
      listeningStatus.textContent = "Voice and typing are ready";
    }
  };

  try {
    speechRecognition.start();
  } catch (error) {
    console.error("Could not start speech recognition:", error);

    showGeneralStatus(
      "Voice input could not start. Please switch to typing and continue."
    );
  }
}

/* Switches between voice and typing modes. */
function toggleInputMode() {
  inputMode = inputMode === "voice" ? "typing" : "voice";

  updateInputMode();

  showGeneralStatus(
    inputMode === "typing"
      ? "Typing mode enabled."
      : "Voice mode enabled. Tap the microphone when you're ready."
  );

  if (inputMode === "typing") {
    answerInput.focus();
  }
}

/* Handles typed answers submitted using the Save answer button. */
answerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateAndStoreAnswer(answerInput.value)) {
    return;
  }

  stopListening();

  if (currentStepIndex < signupSteps.length - 1) {
    currentStepIndex += 1;

    addConversationMessage(
      "UniAble",
      signupSteps[currentStepIndex].title,
      "assistant-message"
    );

    renderCurrentStep();
  } else {
    showCompletionScreen();
  }
});

/* Connects the main navigation controls. */
continueStepButton.addEventListener("click", () => {
  continueToNextStep();
});

typingToggle.addEventListener("click", () => {
  toggleInputMode();
});

microphoneButton.addEventListener("click", () => {
  startListening();
});

continueSpeakingButton.addEventListener("click", () => {
  inputMode = "voice";
  updateInputMode();
  startListening();
});

/* Allows the student to revisit an earlier step. */
previousStepButton.addEventListener("click", () => {
  if (currentStepIndex === 0) {
    return;
  }

  stopListening();

  currentStepIndex -= 1;

  inputMode = "voice";

  addConversationMessage(
    "UniAble",
    signupSteps[currentStepIndex].title,
    "assistant-message"
  );

  renderCurrentStep();
});

/* Supports voice mode requested by the landing page. */
if (signupQuery.get("mode") === "voice") {
  inputMode = "voice";
}

/* Displays the first registration question. */
renderCurrentStep();

/* Explains how this prototype handles registration data. */
showGeneralStatus(
  "Welcome to UniAble. Complete all five steps to save a prototype registration. Passwords are not stored in the dashboard."
);
