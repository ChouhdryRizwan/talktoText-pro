import { useState } from "react";
import { Upload, Calendar, CheckCircle2, Activity, ArrowLeft } from "lucide-react";

export default function UploadSection() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("Uploading");
  const [progress, setProgress] = useState(0);
  const [progressCount, setProgressCount] = useState(0);

  const API_URL = "http://127.0.0.1:5000";

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setSummary(null);
    setCurrentStep("Uploading");
    setProgress(0);
    setProgressCount(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

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
            setProgressCount(data.progress);

            if (data.notes) {
              let parsedSummary = data.notes;
              if (typeof data.notes === "string") {
                parsedSummary = JSON.parse(data.notes);
              }
              if (
                parsedSummary.executiveSummary &&
                typeof parsedSummary.executiveSummary === "string" &&
                parsedSummary.executiveSummary.startsWith("{")
              ) {
                const innerSummary = JSON.parse(parsedSummary.executiveSummary);
                parsedSummary.executiveSummary =
                  innerSummary.executiveSummary || parsedSummary.executiveSummary;
              }
              setSummary(parsedSummary);
              setIsLoading(false);
              console.log("Parsed summary:", parsedSummary);
            }
          } catch (e) {
            console.error("Error parsing SSE or notes JSON:", e, line);
          }
        }
      }
    }
  };

  // 🔹 Reset state when clicking back arrow
  const handleBack = () => {
    setSummary(null);
    setFile(null);
    setIsLoading(false);
    setCurrentStep("Uploading");
    setProgress(0);
    setProgressCount(0);
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-white flex flex-col items-center p-6 relative">
      {/* 🔹 Back Arrow (only when summary is visible) */}
      {summary && (
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 flex items-center text-gray-300 hover:text-white transition"
        >
          <ArrowLeft className="h-6 w-6 mr-1 text-purple-500" />
        </button>
      )}

      {/* Dynamic Heading */}
      <div className="text-center mb-6">
        {!summary ? (
          <>
            <h2 className="text-3xl font-bold mb-2">Upload Audio</h2>
            <p className="text-gray-400">
              Upload your meeting recordings to generate AI-powered transcriptions and structured notes.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2">Results Unveiled</h2>
            <p className="text-gray-400">
              Discover the insights and outcomes from your meeting analysis.
            </p>
          </>
        )}
      </div>

      {/* Upload Box */}
      {!summary && (
        <div
          className="mt-4 w-full max-w-2xl border-2 border-dashed border-gray-700 rounded-2xl bg-[#1a1c25] p-10 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition"
          onClick={() => document.getElementById("fileInput").click()}
        >
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-300 font-medium mb-2">Upload meeting recordings</p>
          <p className="text-gray-500 text-sm mb-4">
            Drag and drop audio/video, or click to browse
          </p>
          <button className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold">
            Choose Files
          </button>
          <input
            id="fileInput"
            type="file"
            accept=".mp3,.wav,.m4a,.mp4,.mov"
            onChange={(e) => handleUpload(e.target.files[0])}
            className="hidden"
          />
          <p className="text-gray-500 text-xs mt-4">
            Supports MP3, WAV, M4A, MP4, MOV (max 1GB)
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && (
        <div className="mt-10 w-full max-w-2xl">
          <p className="text-sm mb-2 text-white font-bold flex items-center justify-between">
            <span>{currentStep}</span>
            <span>{progressCount}%</span>
          </p>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-purple-500"
              style={{
                width: `${progress}%`,
                transition: "width 0.2s ease-in-out",
              }}
            />
          </div>
        </div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="mt-8 w-full max-w-4xl space-y-6">
          {/* Top Card */}
          <div className="bg-[#1a1c25] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{summary.title || "Meeting Audio"}</h3>
              <p className="text-gray-400 mt-1">{summary.description || "N/A"}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={16} /> {summary.date || "N/A"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <span className="px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm flex items-center gap-1">
                <CheckCircle2 size={14} /> Completed
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-sm flex items-center gap-1">
                <Activity size={14} /> {summary.sentiment || "Neutral"}
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-[#1a1c25] rounded-2xl p-6">
            <h4 className="font-semibold text-purple-400 mb-2">Executive Summary</h4>
            <p className="text-gray-300 whitespace-pre-wrap">{summary.executiveSummary || "N/A"}</p>
          </div>

          {/* Key Discussion Points */}
          <div className="bg-[#1a1c25] rounded-2xl p-6">
            <h4 className="font-semibold text-blue-400 mb-3">Key Discussion Points</h4>
            {summary.keyPoints && summary.keyPoints.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {summary.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">None</p>
            )}
          </div>

          {/* Action Items */}
          <div className="bg-[#1a1c25] rounded-2xl p-6">
            <h4 className="font-semibold text-indigo-400 mb-3">Action Items</h4>
            {summary.actionItems && summary.actionItems.length > 0 ? (
              <div className="space-y-3">
                {summary.actionItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-[#0f111a] rounded-lg px-4 py-2"
                  >
                    <span className="text-gray-300">{item}</span>
                    <span className="text-sm text-gray-400">Medium</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">None</p>
            )}
          </div>

          {/* Decisions Made */}
          <div className="bg-[#1a1c25] rounded-2xl p-6">
            <h4 className="font-semibold text-green-400 mb-3">Decisions Made</h4>
            {summary.decisions && summary.decisions.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {summary.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">None</p>
            )}
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-[#1a1c25] rounded-2xl p-6">
            <h4 className="font-semibold text-blue-300 mb-2">Sentiment Analysis</h4>
            <p className="text-sm text-gray-400 mb-1">
              Overall Sentiment:{" "}
              <span className="text-green-400">{summary.sentiment || "N/A"}</span>
            </p>
            <p className="text-gray-300 whitespace-pre-wrap">
              {summary.sentimentInsights || "N/A"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
