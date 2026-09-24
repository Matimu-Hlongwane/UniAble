/* =========================================
   UNIABLE SPEECH SERVICE
   ========================================= */


/*
  Check whether the current browser
  supports browser speech recognition.
*/

export function isSpeechRecognitionSupported() {
    return Boolean(
        window.SpeechRecognition ||
        window.webkitSpeechRecognition
    );
}


/*
  Ask the device for microphone permission.
*/

export async function requestMicrophonePermission() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "Microphone access is not supported on this device."
        );

    }


    const stream =
        await navigator.mediaDevices.getUserMedia({
            audio: true
        });


    /*
      We only need the stream to confirm
      that permission was granted.
  
      SpeechRecognition will use the
      microphone itself.
    */

    stream.getTracks().forEach((track) => {
        track.stop();
    });


    return true;
}


/*
  Start one speech-recognition session.
*/

export function startSpeechRecognition({
    onStart,
    onResult,
    onEnd,
    onError
}) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        if (onError) {
            onError(
                new Error(
                    "Speech recognition is not supported by this browser."
                )
            );
        }

        return null;

    }


    const recognition =
        new SpeechRecognition();


    /*
      South African English.
    */

    recognition.lang = "en-ZA";


    /*
      Stop after one spoken answer.
    */

    recognition.continuous = false;


    /*
      Only return the final result.
    */

    recognition.interimResults = false;


    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        if (onStart) {
            onStart();
        }

    };


    recognition.onresult = (event) => {

        const transcript =
            event.results[0][0].transcript.trim();


        if (onResult) {
            onResult(transcript);
        }

    };


    recognition.onerror = (event) => {

        let message =
            "Voice recognition failed.";


        switch (event.error) {

            case "not-allowed":

                message =
                    "Microphone permission was denied.";

                break;


            case "no-speech":

                message =
                    "No speech was detected. Please try again.";

                break;


            case "audio-capture":

                message =
                    "UNIABLE could not access your microphone.";

                break;


            case "network":

                message =
                    "A network error interrupted voice recognition.";

                break;


            default:

                message =
                    `Voice recognition error: ${event.error}`;

        }


        if (onError) {

            onError(
                new Error(message)
            );

        }

    };


    recognition.onend = () => {

        if (onEnd) {
            onEnd();
        }

    };


    recognition.start();


    return recognition;
}
/* =========================================
   TEXT TO SPEECH
   ========================================= */

export function speakText(text) {

    if (!("speechSynthesis" in window)) {

        console.warn(
            "Text-to-speech is not supported by this browser."
        );

        return;

    }


    /*
      Stop anything UNIABLE may already
      be saying.
    */

    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(text);


    speech.lang = "en-ZA";

    speech.rate = 0.95;

    speech.pitch = 1;

    speech.volume = 1;


    window.speechSynthesis.speak(
        speech
    );

}