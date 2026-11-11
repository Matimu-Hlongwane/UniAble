import React from "react";
function SignUpSuccess({
    fullName,
    onGoBack
}) {

    return (
        <div className="signup-success">

            <div className="success-icon">
                ✓
            </div>


            <h2>Account verified</h2>


            <p>
                Thanks, {fullName}. Your UniAble account has been created
                and your verification is complete.
            </p>


            <p className="success-note">
                You can now continue to your UniAble account.
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

                Go Back

            </button>

        </div>
    );
}


export default SignUpSuccess;
