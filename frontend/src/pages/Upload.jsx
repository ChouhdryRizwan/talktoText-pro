import { useState } from "react";

function Upload() {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);

  const steps = ["Transcription", "Translation", "Optimization", "Notes Generation"];
  const API_URL = "http://127.0.0.1:5000";

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setIsLoading(true);
    setNotes("");
    setCurrentStep("");
    setProgress(0);

    // Prepare file upload
    const formData = new FormData();
    formData.append("file", file);

    // First, upload file with fetch (not axios because we need SSE after)
    const res = await fetch(`${API_URL}/api/upload_with_progress`, {
      method: "POST",
      body: formData,
    });

    if (!res.body) {
      alert("No response stream from server");
      setIsLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            setCurrentStep(data.step);
            setProgress(data.progress);

            if (data.notes) {
              setNotes(data.notes);
              setIsLoading(false);
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e, line);
          }
        }
      }
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Upload Meeting</h2>

      {/* Upload section */}
      <input
        type="file"
        accept=".mp3,.wav,.ogg,.opus"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg text-white ${
          isLoading
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-700"
        }`}
      >
        {isLoading ? "Processing..." : "Upload & Process"}
      </button>

      {/* Progress Tracker */}
      {isLoading && (
        <div className="mt-6 space-y-4">
          {steps.map((step, i) => (
            <div key={i}>
              <p
                className={`text-sm mb-1 ${
                  step === currentStep
                    ? "text-purple-400 font-bold"
                    : "text-gray-400"
                }`}
              >
                {step}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    step === currentStep
                      ? "bg-purple-500"
                      : steps.indexOf(step) < steps.indexOf(currentStep)
                      ? "bg-green-500"
                      : "bg-gray-600"
                  }`}
                  style={{
                    width:
                      step === currentStep
                        ? `${progress}%`
                        : steps.indexOf(step) < steps.indexOf(currentStep)
                        ? "100%"
                        : "0%",
                    transition: "width 0.2s ease-in-out",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes Display */}
      {notes && !isLoading && (
        <div className="mt-8 p-4 bg-gray-900 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold text-purple-400 mb-2">
            Meeting Notes
          </h3>
          <pre className="text-gray-300 whitespace-pre-wrap">{notes}</pre>
        </div>
      )}
    </div>
  );
}

export default Upload;
