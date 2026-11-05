import React from "react";
import { useState } from "react";
import accessibilityOptions
  from "../data/accessibilityOptions.json";


function TypingSignUpForm({
  formData,
  errors,
  onInputChange,
  onModuleChange,
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


        {/* STUDENT DETAILS */}

        <div className="form-group">

          <label htmlFor="fullName">First and middle names</label>

          <input
            type="text"
            id="fullName"
            name="fullName"
            placeholder="Enter your first and middle names"
            value={formData.fullName}
            onChange={onInputChange}
            autoComplete="given-name"
            aria-invalid={Boolean(errors.fullName)}
          />

          {errors.fullName && <p className="form-error">{errors.fullName}</p>}

        </div>

        <div className="form-group">
          <label htmlFor="surname">Surname</label>
          <input
            type="text"
            id="surname"
            name="surname"
            placeholder="Enter your surname"
            value={formData.surname}
            onChange={onInputChange}
            autoComplete="family-name"
            aria-invalid={Boolean(errors.surname)}
          />
          {errors.surname && <p className="form-error">{errors.surname}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="studentNumber">Student number</label>
          <input
            type="text"
            id="studentNumber"
            name="studentNumber"
            placeholder="Enter your student number"
            value={formData.studentNumber}
            onChange={onInputChange}
            autoComplete="off"
            aria-invalid={Boolean(errors.studentNumber)}
          />
          {errors.studentNumber && <p className="form-error">{errors.studentNumber}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="qualification">IT qualification</label>
          <select
            id="qualification"
            name="qualification"
            value={formData.qualification}
            onChange={onInputChange}
            aria-invalid={Boolean(errors.qualification)}
          >
            <option value="">Select your IT qualification</option>
            <option value="Bachelor of Information Technology">Bachelor of Information Technology</option>
            <option value="Diploma in Information Technology">Diploma in Information Technology</option>
            <option value="Higher Certificate in Information Technology">Higher Certificate in Information Technology</option>
            <option value="Other IT qualification">Other IT qualification</option>
          </select>
          {errors.qualification && <p className="form-error">{errors.qualification}</p>}
        </div>

        {formData.qualification === "Other IT qualification" && (
          <div className="form-group">
            <label htmlFor="otherQualification">Qualification name</label>
            <input
              type="text"
              id="otherQualification"
              name="otherQualification"
              value={formData.otherQualification}
              onChange={onInputChange}
              aria-invalid={Boolean(errors.otherQualification)}
            />
            {errors.otherQualification && <p className="form-error">{errors.otherQualification}</p>}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="yearOfStudy">Year of study</label>
          <select
            id="yearOfStudy"
            name="yearOfStudy"
            value={formData.yearOfStudy}
            onChange={onInputChange}
            aria-invalid={Boolean(errors.yearOfStudy)}
          >
            <option value="">Select your year</option>
            <option value="Year 1">Year 1</option>
            <option value="Year 2">Year 2</option>
            <option value="Year 3">Year 3</option>
            <option value="Year 4">Year 4</option>
            <option value="Postgraduate">Postgraduate</option>
            <option value="Other">Other</option>
          </select>
          {errors.yearOfStudy && <p className="form-error">{errors.yearOfStudy}</p>}
        </div>

        <fieldset className="form-group signup-module-options" aria-describedby="modules-help">
          <legend>IT modules</legend>
          <p id="modules-help">Select every module you are taking.</p>
          {[
            "Programming",
            "Web Development",
            "Database Systems",
            "Systems Analysis",
            "Computer Networks",
            "Information Security",
          ].map((module) => (
            <label className="signup-module-option" key={module}>
              <input
                type="checkbox"
                name="modules"
                value={module}
                checked={formData.modules.includes(module)}
                onChange={onModuleChange}
              />
              {module}
            </label>
          ))}
          <label htmlFor="otherModules">Other module names (optional)</label>
          <input
            type="text"
            id="otherModules"
            name="otherModules"
            placeholder="Separate module names with commas"
            value={formData.otherModules}
            onChange={onInputChange}
            aria-invalid={Boolean(errors.modules)}
          />
          {errors.modules && <p className="form-error">{errors.modules}</p>}
        </fieldset>

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
            placeholder="your.student@email.com"
            value={formData.email}
            onChange={onInputChange}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="form-error">{errors.email}</p>}
          <p className="signup-password-help">
            Use your Richfield student email if available. Any valid email
            address is accepted until the official Richfield email suffix is confirmed.
          </p>

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
            Use at least 8 characters, including uppercase and lowercase letters,
            a number, and a symbol. For example, Renira@12 meets these rules;
            choose a unique password for your account.{" "}
            Use your screen reader, keyboard, or password manager if helpful.
            Do not speak your password into the microphone.
          </p>

          {errors.password && (

            <p className="form-error">
              {errors.password}
            </p>

          )}

        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={onInputChange}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
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
          Return to Voice Mode

        </button>

      </div>

    </div>
  );
}


export default TypingSignUpForm;

