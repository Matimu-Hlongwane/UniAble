import accessibilityOptions
  from "../data/accessibilityOptions.json";


function TypingSignUpForm({
  formData,
  errors,
  onInputChange,
  onReturnToVoice,
  onCreateAccount
}) {

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

          <input
            type="password"
            id="password"
            name="password"

            placeholder="Minimum 6 characters"

            value={formData.password}

            onChange={onInputChange}

            autoComplete="new-password"

            aria-invalid={
              Boolean(errors.password)
            }
          />

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

          🎙 Return to Voice Mode

        </button>

      </div>

    </div>
  );
}


export default TypingSignUpForm;