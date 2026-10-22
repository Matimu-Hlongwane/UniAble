
/* Finds the voice sign-up button. */
const voiceSignupButton = document.querySelector("#voice-signup");

/* Finds the voice login button. */
const voiceLoginButton = document.querySelector("#voice-login");

/* Finds the email login button. */
const emailLoginButton = document.querySelector("#email-login");

/* Finds the guest access button. */
const guestAccessButton = document.querySelector("#guest-access");

/* Finds the accessible feedback area. */
const statusMessage = document.querySelector("#status-message");

/* Displays a message to the user and assistive technology. */
function showStatus(message) {
  /* Updates the live status area without opening an intrusive alert. */
  statusMessage.textContent = message;
}

/* Starts the voice-guided registration journey. */
voiceSignupButton.addEventListener("click", () => {
  window.location.href = "../Signup_page/signup.html?mode=voice";
});

/* Starts the returning-student voice login journey. */
voiceLoginButton.addEventListener("click", () => {
  /* Explains that authentication still needs to be implemented. */
  showStatus("Voice login selected. Student authentication is not connected yet.");
});

/* Starts the email login journey. */
emailLoginButton.addEventListener("click", () => {
  /* Explains that the email login screen is not implemented yet. */
  showStatus("Email login selected. The login service will be added in a later phase.");
});

/* Starts guest access. */
guestAccessButton.addEventListener("click", () => {
  /* Explains the guest-access prototype status. */
  showStatus("Guest access selected. The guest experience is not connected yet.");
});
