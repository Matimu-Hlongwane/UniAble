import { useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

function OCRDocumentReader({
  language = 'English',
  onBack,
}) {
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const languageMap = {
    English: 'eng',
    isiZulu: 'eng',
    isiXhosa: 'eng',
    Sesotho: 'eng',
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setImageFile(file)
    setImage(URL.createObjectURL(file))
    setExtractedText('')
    setError('')
    setProgress(0)
    setStatus('')
  }

  const performOCR = async () => {
    if (!imageFile) {
      setError('Please select or take a picture first.')
      return
    }

    setIsProcessing(true)
    setError('')
    setExtractedText('')
    setProgress(0)
    setStatus('Preparing OCR...')

    let worker

    try {
      worker = await createWorker(languageMap[language] || 'eng')

      setStatus('Reading image...')

      const result = await
      worker.recognize(imageFile)

      const text = result.data.text.trim()

      if (!text) {
        setError(
          'No readable text was found. Try taking a clearer picture.'
        )
      } else {
        setExtractedText(text)
        setStatus('Text extracted successfully!')
        setProgress(100)
      }

      await worker.terminate()
    } catch (err) {
      console.error('OCR error:', err)

      setError(
        'Something went wrong while reading the document. Please try again.'
      )

      if (worker) {
        try {
          await worker.terminate()
        } catch {
          // Worker cleanup failed; nothing else to do.
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const copyText = async () => {
    if (!extractedText) return

    try {
      await navigator.clipboard.writeText(
        extractedText
      )

      setStatus('Text copied to clipboard!')
    } catch (err) {
      console.error('Copy failed:', err)
      setError(
        'The text could not be copied on this device.'
      )
    }
  }

  const speakText = () => {
    if (!extractedText) return

    if (!('speechSynthesis' in window)) {
      setError(
        'Text-to-speech is not available on this device.'
      )
      return
    }

    window.speechSynthesis.cancel()

    const speechLanguages = {
      English: 'en-ZA',
      isiZulu: 'zu-ZA',
      isiXhosa: 'xh-ZA',
      Sesotho: 'st-ZA',
    }

    const utterance =
      new SpeechSynthesisUtterance(extractedText)

    utterance.lang =
      speechLanguages[language] || 'en-ZA'

    utterance.rate = 0.85
    utterance.pitch = 1

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const clearDocument = () => {
    stopSpeaking()

    setImage(null)
    setImageFile(null)
    setExtractedText('')
    setProgress(0)
    setStatus('')
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  return (
    <main className="screen ocr-screen">

      <header className="header">
        <h1>📖 OCR Document Reader</h1>

        <p>
          Take a picture or upload a document and UniAble
          will extract the text for you.
        </p>
      </header>

      {/* FILE INPUT */}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      {/* CAMERA INPUT */}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        hidden
      />

      {/* UPLOAD OPTIONS */}

      <section className="ocr-actions">

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            cameraInputRef.current?.click()
          }
        >
          📷 Take Picture
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          🖼️ Upload Image
        </button>

      </section>

      {/* IMAGE PREVIEW */}

      {image && (
        <section className="ocr-preview">

          <h2>Document Preview</h2>

          <img
            src={image}
            alt="Selected document"
            className="ocr-image"
          />

          <button
            type="button"
            className="primary-button"
            onClick={performOCR}
            disabled={isProcessing}
          >
            {isProcessing
              ? '🔍 Reading Document...'
              : '🔍 Extract Text'}
          </button>

        </section>
      )}

      {/* PROGRESS */}

      {isProcessing && (
        <section className="ocr-progress">

          <p>{status}</p>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <span>{progress}%</span>

        </section>
      )}

      {/* ERROR */}

      {error && (
        <div className="ocr-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* EXTRACTED TEXT */}

      {extractedText && (
        <section className="ocr-result">

          <div className="ocr-result-header">

            <div>
              <h2>📝 Extracted Text</h2>

              <p>
                The text below was detected from your
                document.
              </p>
            </div>

          </div>

          <textarea
            className="ocr-text"
            value={extractedText}
            onChange={(event) =>
              setExtractedText(event.target.value)
            }
            aria-label="Extracted text"
          />

          <div className="ocr-result-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={copyText}
            >
              📋 Copy Text
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={speakText}
            >
              🔊 Read Aloud
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={stopSpeaking}
            >
              ⏹ Stop Voice
            </button>

          </div>

        </section>
      )}

      {/* CLEAR */}

      {(image || extractedText) && (
        <button
          type="button"
          className="danger-button"
          onClick={clearDocument}
        >
          🗑️ Clear Document
        </button>
      )}

      {/* BACK */}

      <button
        type="button"
        className="back-button"
        onClick={() => {
          stopSpeaking()
          onBack()
        }}
      >
        ← Back
      </button>

    </main>
  )
}

export default OCRDocumentReader
