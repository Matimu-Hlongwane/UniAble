function DetectedInfo({ formData }) {

  const detectedItems = [];


  if (formData.fullName) {
    detectedItems.push(formData.fullName);
  }


  if (formData.accessibility) {
    detectedItems.push(formData.accessibility);
  }


  if (formData.email) {
    detectedItems.push(formData.email);
  }


  return (
    <div className="detected-card">

      <div className="detected-heading">
        ✓ Detected so far
      </div>


      <div className="detected-tags">

        {detectedItems.length > 0 ? (

          detectedItems.map((item, index) => (

            <span
              className="detected-tag"
              key={`${item}-${index}`}
            >
              {item}
            </span>

          ))

        ) : (

          <span className="detected-tag">
            Waiting for information...
          </span>

        )}

      </div>

    </div>
  );
}

export default DetectedInfo;