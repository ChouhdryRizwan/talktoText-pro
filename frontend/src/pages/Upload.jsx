import { useState } from "react";
import axios from "axios";

function Upload() {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = ["Transcription", "Translation", "Optimization", "Notes Generation"];
  const API_URL = "http://127.0.0.1:5000";

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsLoading(true);
      setNotes("");
      setCurrentStep(0);
      setProgress(0);

      // Run simulated progress for first 3 steps
      for (let i = 0; i < steps.length - 1; i++) {
        await runStep(i);
      }

      // Last Step = Real API Call
      await runStep(3, true, formData);
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setIsLoading(false);
    }
  };

  const runStep = (stepIndex, isApiCall = false, formData = null) => {
    return new Promise(async (resolve) => {
      setCurrentStep(stepIndex);
      setProgress(0);

      let interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            resolve();
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      if (isApiCall && formData) {
        try {
          const res = await axios.post(`${API_URL}/api/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setNotes(res.data.notes);
        } catch (err) {
          console.error(err);
        }
      }
    });
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
          isLoading ? "bg-gray-500 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
        }`}
      >
        {isLoading ? "Processing..." : "Upload & Process"}
      </button>

      {/* Progress Tracker */}
      {isLoading && (
        <div className="mt-6 space-y-4">
          {steps.map((step, i) => (
            <div key={i}>
              <p className={`text-sm mb-1 ${i === currentStep ? "text-purple-400 font-bold" : "text-gray-400"}`}>
                {step}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    i < currentStep ? "bg-green-500" : i === currentStep ? "bg-purple-500" : "bg-gray-600"
                  }`}
                  style={{
                    width:
                      i < currentStep
                        ? "100%"
                        : i === currentStep
                        ? `${progress}%`
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
          <h3 className="text-xl font-bold text-purple-400 mb-2">Meeting Notes</h3>
          <pre className="text-gray-300 whitespace-pre-wrap">{notes}</pre>
        </div>
      )}
    </div>
  );
}

export default Upload;
