import React from "react";
function ProgressBar({ progress }) {
    return (
        <div
            className="progress-container"
            role="progressbar"
            aria-label="Voice sign-up progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
        >
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
    );
}

export default ProgressBar;
