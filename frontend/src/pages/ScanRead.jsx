import React, { useEffect, useRef, useState } from "react";
import { Camera, FileImage, LoaderCircle, Play, Square, RotateCcw } from "lucide-react";
import { createWorker } from "tesseract.js";
import { speak, stopSpeaking } from "../services/speechService";
import "./ScanRead.css";

export default function ScanRead() {
  const [image, setImage] = useState("");
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [status, setStatus] = useState("Choose an image or take a photograph of a document.");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const workerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopSpeaking();

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setStatus("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setStatus("The image is too large. Choose an image smaller than 15 MB.");
      event.target.value = "";
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setFile(selectedFile);
    setExtractedText("");
    setProgress(0);
    setStatus("Image selected. Select Extract Text to begin.");

    const imageUrl = URL.createObjectURL(selectedFile);

    setImage((previousImage) => {
      if (previousImage) URL.revokeObjectURL(previousImage);
      return imageUrl;
    });
  };

  const extractText = async () => {
    if (!file || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    setStatus("Preparing text recognition...");

    try {
      if (!workerRef.current) {
        workerRef.current = await createWorker("eng", 1, {
          logger: (message) => {
            if (!mountedRef.current) return;

            if (message.status) {
              setStatus(`Recognising text: ${message.status}`);
            }

            if (typeof message.progress === "number") {
              setProgress(Math.round(message.progress * 100));
            }
          }
        });
      }

      const result = await workerRef.current.recognize(file);

      if (!mountedRef.current) return;

      const text = result.data.text.trim();

      setExtractedText(text);
      setProgress(100);
      setStatus(
        text
          ? "Text extracted. Review and correct it before reading."
          : "No readable text was detected. Try a clearer image."
      );
    } catch (error) {
      console.error("OCR error:", error);
      setStatus("Text extraction failed. Please try another image.");
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const readText = async () => {
    const text = extractedText.trim();

    if (!text) {
      setStatus("There is no text to read. Extract or enter text first.");
      return;
    }

    try {
      stopSpeaking();
      setIsSpeaking(true);
      setStatus("Reading your document...");

      const result = await speak(text, {
        locale: "en-ZA",
        rate: 0.9,
        onEnd: () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            setStatus("Finished reading your document.");
          }
        },
        onError: () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            setStatus("Reading could not start. Check your device speech settings.");
          }
        }
      });

      if (!result?.started && mountedRef.current) {
        setIsSpeaking(false);
        setStatus("Speech is unavailable. You can still read the extracted text.");
      }
    } catch (error) {
      console.error("Read-aloud error:", error);
      setIsSpeaking(false);
      setStatus("Unable to read the text aloud.");
    }
  };

  const stopReading = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setStatus("Reading stopped.");
  };

  const resetPage = () => {
    stopReading();

    setImage((previousImage) => {
      if (previousImage) URL.revokeObjectURL(previousImage);
      return "";
    });

    setFile(null);
    setExtractedText("");
    setProgress(0);
    setStatus("Choose an image or take a photograph of a document.");

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <section className="scan-read-page">
      <header className="scan-read-header">
        <div>
          <p className="scan-read-eyebrow">STUDY AND ACCESSIBILITY TOOL</p>
          <h1>Scan & Read</h1>
          <p>
            Turn printed documents, notes and study material into editable text
            that you can read or listen to.
          </p>
        </div>
      </header>

      <div className="scan-read-grid">
        <section className="scan-read-card">
          <h2>1. Select a document</h2>

          <p>
            Upload an existing photograph or use your device camera to capture
            a printed document.
          </p>

          <div className="scan-read-actions">
            <button
              type="button"
              className="scan-read-button primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FileImage size={19} />
              Upload image
            </button>

            <button
              type="button"
              className="scan-read-button secondary"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Camera size={19} />
              Use camera
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            hidden
          />

          {image && (
            <div className="scan-read-preview">
              <img src={image} alt="Selected document preview" />
            </div>
          )}

          <button
            type="button"
            className="scan-read-button primary full-width"
            onClick={extractText}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <LoaderCircle className="scan-read-spinner" size={19} />
                Extracting text...
              </>
            ) : (
              "Extract text"
            )}
          </button>

          {isProcessing && (
            <div
              className="scan-read-progress"
              role="progressbar"
              aria-label="Text extraction progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div style={{ width: `${progress}%` }} />
            </div>
          )}

          <p className="scan-read-status" role="status" aria-live="polite">
            {status}
          </p>
        </section>

        <section className="scan-read-card">
          <h2>2. Review extracted text</h2>

          <p>
            Check the extracted text and correct any recognition mistakes.
            You can also type or paste text directly.
          </p>

          <label htmlFor="scan-read-text" className="scan-read-label">
            Document text
          </label>

          <textarea
            id="scan-read-text"
            className="scan-read-textarea"
            value={extractedText}
            onChange={(event) => setExtractedText(event.target.value)}
            placeholder="Your extracted text will appear here. You can also type or paste text."
            rows={13}
          />

          <div className="scan-read-actions">
            <button
              type="button"
              className="scan-read-button primary"
              onClick={readText}
              disabled={!extractedText.trim() || isSpeaking}
            >
              <Play size={19} />
              Read aloud
            </button>

            <button
              type="button"
              className="scan-read-button secondary"
              onClick={stopReading}
              disabled={!isSpeaking}
            >
              <Square size={18} />
              Stop
            </button>

            <button
              type="button"
              className="scan-read-button secondary"
              onClick={resetPage}
              disabled={isProcessing}
            >
              <RotateCcw size={18} />
              Clear
            </button>
          </div>

          <p className="scan-read-status" aria-live="polite">
            {isSpeaking ? "Audio is playing." : "Your text is ready for review."}
          </p>
        </section>
      </div>

      <p className="scan-read-note">
        Text recognition works best with clear, well-lit images. Review the
        extracted text for accuracy before using it.
      </p>
    </section>
  );
}