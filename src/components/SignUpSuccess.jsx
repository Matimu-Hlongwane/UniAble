function SignUpSuccess({
    fullName,
    onGoBack
}) {

    return (
        <div className="signup-success">

            <div className="success-icon">
                ✓
            </div>


            <h2>
                Details Validated
            </h2>


            <p>
                Thanks, {fullName}.
                Your UNIABLE registration details
                passed the frontend validation.
            </p>


            <p className="success-note">
                The account will be created once
                the backend and Firebase are connected.
            </p>


            <button
                type="button"

                className="
          action-button
          secondary-action
          success-back-button
        "

                onClick={onGoBack}
            >

                ← Go Back

            </button>

        </div>
    );
}


export default SignUpSuccess;