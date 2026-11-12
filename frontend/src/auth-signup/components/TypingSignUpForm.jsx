import React from "react";
import { useState } from "react";
import accessibilityOptions
  from "../data/accessibilityOptions.json";
import { RICHFIELD_QUALIFICATIONS } from "../../data/qualifications";
import { STUDENT_EMAIL_DOMAIN } from "../utils/validation";


function TypingSignUpForm({
  formData,
  errors,
  onInputChange,
  onCreateAccount,
  isCreating
}) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordChecks = [
    ["At least 8 characters", formData.password.length >= 8],
    ["At least one uppercase letter", /[A-Z]/.test(formData.password)],
    ["At least one lowercase letter", /[a-z]/.test(formData.password)],
    ["At least one number", /[0-9]/.test(formData.password)],
    ["At least one special character", /[^A-Za-z0-9]/.test(formData.password)],
  ];

  return (
    <form
      className="typing-signup"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onCreateAccount();
      }}
    >

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
            First name(s)
          </label>

          <input
            type="text"
            id="fullName"
            name="fullName"

            placeholder="Enter your first name(s)"

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


        <div className="form-group"><label htmlFor="surname">Surname</label><input id="surname" name="surname" type="text" autoComplete="family-name" value={formData.surname || ""} onChange={onInputChange} required aria-invalid={Boolean(errors.surname)} />{errors.surname && <p className="form-error">{errors.surname}</p>}</div>
        <div className="form-group"><label htmlFor="studentNumber">Student number</label><input id="studentNumber" name="studentNumber" inputMode="numeric" pattern="40[123][0-9]{6}" maxLength={9} value={formData.studentNumber || ""} onChange={onInputChange} required aria-invalid={Boolean(errors.studentNumber)} aria-describedby={errors.studentNumber ? "student-number-error" : "student-number-help"} /><small id="student-number-help">Enter exactly nine digits beginning with 401, 402 or 403.</small>{errors.studentNumber && <p id="student-number-error" className="form-error">{errors.studentNumber}</p>}</div>

        <div className="form-group">
          <label htmlFor="email">Richfield student email address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || (formData.studentNumber ? `${formData.studentNumber}@${STUDENT_EMAIL_DOMAIN}` : "")}
            readOnly
            aria-readonly="true"
            autoComplete="email"
            placeholder="Your student number will generate this address"
            aria-invalid={Boolean(errors.email)}
          />
          <p className="signup-password-help">UniAble creates this address automatically from your student number. Verification messages will be sent to this address.</p>
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>

        <div className="form-group"><label htmlFor="qualification">Richfield qualification</label><select id="qualification" name="qualification" value={formData.qualification || ""} onChange={onInputChange} required><option value="">Choose your qualification</option>{RICHFIELD_QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}</select>{errors.qualification && <p className="form-error">{errors.qualification}</p>}</div>
        <div className="form-group"><label htmlFor="dateOfBirth">Date of birth</label><input id="dateOfBirth" name="dateOfBirth" type="date" autoComplete="bday" max={new Date().toISOString().slice(0,10)} value={formData.dateOfBirth || ""} onChange={onInputChange} required aria-invalid={Boolean(errors.dateOfBirth)} />{errors.dateOfBirth && <p className="form-error">{errors.dateOfBirth}</p>}</div>
        <div className="form-group"><label htmlFor="yearOfStudy">Year of study</label><select id="yearOfStudy" name="yearOfStudy" value={formData.yearOfStudy || ""} onChange={onInputChange} required><option value="">Choose year</option>{["2026","2027","2028","2029","2030","2031"].map(y => <option key={y} value={y}>{y}</option>)}</select>{errors.yearOfStudy && <p className="form-error">{errors.yearOfStudy}</p>}</div>
<div className="form-group"><label htmlFor="phoneNumber">Cellphone number (optional)</label><input id="phoneNumber" name="phoneNumber" type="tel" autoComplete="tel" placeholder="+27821234567" value={formData.phoneNumber || ""} onChange={onInputChange} aria-invalid={Boolean(errors.phoneNumber)} /><small>Optional contact detail; it is not used for sign-in or account verification. Use international format, for example +27821234567.</small>{errors.phoneNumber && <p className="form-error">{errors.phoneNumber}</p>}</div>

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
          <div id="signup-password-help" className="signup-password-help"><strong>Password requirements</strong><ul>{passwordChecks.map(([label, met]) => <li key={label} style={{ color: met ? "#16803c" : "inherit" }} aria-live="polite">{met ? "✓" : "○"} {label}</li>)}</ul><small>For security, do not dictate your password or read it aloud in a shared space.</small></div>

          {errors.password && (

            <p className="form-error">
              {errors.password}
            </p>

          )}

        </div>

        <div className="form-group"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" value={formData.confirmPassword || ""} onChange={onInputChange} required aria-invalid={Boolean(errors.confirmPassword)} />{errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}</div>
      </div>


      <div className="typing-actions">

        <button
          type="submit"
          disabled={isCreating}

          className="
            action-button
            primary-action
          "

        >

          {isCreating ? "Creating account…" : "Create Account"}

        </button>


      </div>

    </form>
  );
}


export default TypingSignUpForm;
