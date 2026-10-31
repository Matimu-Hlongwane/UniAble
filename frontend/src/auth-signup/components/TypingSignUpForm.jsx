import React from "react";
import { useState } from "react";
import accessibilityOptions
  from "../data/accessibilityOptions.json";


function TypingSignUpForm({
  formData,
  errors,
  onInputChange,
  onReturnToVoice,
  onCreateAccount
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="typing-signup">

      <div className="typing-heading">

        <h2>
          Type Your Details
        </h2>

        <p>
          Complete the information below to continue.
        </p>

      </div>


      <div className="typing-card">


        {/* FULL NAME */}

        <div className="form-group">

          <label htmlFor="fullName">
            Full Name
          </label>

          <input
            type="text"
            id="fullName"
            name="fullName"

            placeholder="Enter your full name"

            value={formData.fullName}

            onChange={onInputChange}

            autoComplete="name"

            aria-invalid={
              Boolean(errors.fullName)
            }
          />

          {errors.fullName && (

            <p className="form-error">
              {errors.fullName}
            </p>

          )}

        </div>


        {/* ACCOUNT TYPE */}

        <div className="form-group">
          <label htmlFor="accountType">Account Type</label>
          <select
            id="accountType"
            name="accountType"
            value={formData.accountType || "student"}
            onChange={onInputChange}
          >
            <option value="student">Student</option>
            
          </select>
          <p className="signup-password-help">
          </p>
        </div>

        {/* ACCESSIBILITY */}

        <div className="form-group">

          <label htmlFor="accessibility">
            Accessibility Needs
          </label>

          <select
            id="accessibility"
            name="accessibility"

            value={formData.accessibility}

            onChange={onInputChange}

            aria-invalid={
              Boolean(errors.accessibility)
            }
          >

            {accessibilityOptions.map(
              (option) => (

                <option
                  key={
                    option.value ||
                    "default"
                  }

                  value={option.value}
                >

                  {option.label}

                </option>

              )
            )}

          </select>

          {errors.accessibility && (

            <p className="form-error">
              {errors.accessibility}
            </p>

          )}

        </div>


        {/* ADDITIONAL INFORMATION */}

        <div className="form-group">

          <label htmlFor="additionalNeeds">
            Additional Information
          </label>

          <textarea
            id="additionalNeeds"
            name="additionalNeeds"

            rows="3"

            placeholder="Tell us how UNIABLE can better support you"

            value={
              formData.additionalNeeds
            }

            onChange={
              onInputChange
            }
          />

        </div>


        {/* EMAIL */}

        <div className="form-group">

          <label htmlFor="email">
            Email Address
          </label>

          <input
            type="email"
            id="email"
            name="email"

            placeholder="example@email.com"

            value={formData.email}

            onChange={onInputChange}

            autoComplete="email"

            aria-invalid={
              Boolean(errors.email)
            }
          />

          {errors.email && (

            <p className="form-error">
              {errors.email}
            </p>

          )}

        </div>


        {/* PASSWORD */}

        <div className="form-group">

          <label htmlFor="password">
            Password
          </label>

          <div className="signup-password-field">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="8+ characters, uppercase, lowercase, number and symbol"
              value={formData.password}
              onChange={onInputChange}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="signup-password-help"
            />
            <button
              type="button"
              className="signup-password-toggle"
              aria-controls="password"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>
          <p id="signup-password-help" className="signup-password-help">
            Use your screen reader, keyboard, or password manager if helpful.
            Do not speak your password into the microphone.
          </p>

          {errors.password && (

            <p className="form-error">
              {errors.password}
            </p>

          )}

        </div>

      </div>


      <div className="typing-actions">

        <button
          type="button"

          className="
            action-button
            primary-action
          "

          onClick={
            onCreateAccount
          }
        >

          Create Account

        </button>


        <button
          type="button"

          className="
            action-button
            secondary-action
          "

          onClick={
            onReturnToVoice
          }
        >

          ðŸŽ™ Return to Voice Mode

        </button>

      </div>

    </div>
  );
}


export default TypingSignUpForm;




