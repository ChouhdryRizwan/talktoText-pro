import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FileDown } from "lucide-react";

function History() {
  const [history, setHistory] = useState([]);
  const API_URL = "http://127.0.0.1:5000";

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/history`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = (id, format) => {
    window.open(`${API_URL}/api/download/${id}/${format}`, "_blank");
  };

  // same parser from Upload.jsx
  const parseNotes = (text) => {
    const sections = {
      summary: "",
      points: [],
      actions: [],
      sentiment: "",
    };

    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);

    let current = null;
    lines.forEach((line) => {
      if (line.startsWith("Abstract Summary")) {
        current = "summary";
      } else if (line.startsWith("Key Points")) {
        current = "points";
      } else if (line.startsWith("Action Items")) {
        current = "actions";
      } else if (line.startsWith("Sentiment")) {
        current = "sentiment";
      } else {
        if (current === "summary") sections.summary += line + " ";
        if (current === "points" && line.startsWith(".")) sections.points.push(line.slice(1).trim());
        if (current === "actions" && (line[0] === "1" || line.match(/^\d+\./))) {
          sections.actions.push(line.replace(/^\d+\.\s*/, ""));
        }
        if (current === "sentiment") sections.sentiment += line + " ";
      }
    });

    return sections;
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-3xl font-bold mb-4">Chat History</h2>

      <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-y-auto space-y-6 shadow-lg">
        {history.map((h) => {
          const structured = parseNotes(h.notes);

          return (
            <div key={h.id} className="space-y-3">
              {/* User bubble */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="ml-auto max-w-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-2 rounded-2xl shadow-md"
              >
                🎤 Uploaded: {h.filename}
              </motion.div>

              {/* AI bubble (structured notes) */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mr-auto max-w-2xl bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-md space-y-4"
              >
                <div>
                  <h3 className="text-2xl font-bold text-purple-400 mb-2">Abstract Summary</h3>
                  <p className="text-gray-300">{structured.summary}</p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-purple-400 mb-2">Key Points</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {structured.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-purple-400 mb-2">Action Items</h3>
                  <ol className="list-decimal list-inside text-gray-300">
                    {structured.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-purple-400 mb-2">Sentiment</h3>
                  <p className="italic text-gray-300">{structured.sentiment}</p>
                </div>
              </motion.div>

              {/* Download buttons */}
              <div className="flex space-x-2 ml-2">
                <button
                  onClick={() => handleDownload(h.id, "word")}
                  className="flex items-center bg-blue-600 px-3 py-1 rounded-lg hover:bg-blue-700 text-sm text-white"
                >
                  <FileDown className="h-4 w-4 mr-1" /> Word
                </button>
                <button
                  onClick={() => handleDownload(h.id, "pdf")}
                  className="flex items-center bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700 text-sm text-white"
                >
                  <FileDown className="h-4 w-4 mr-1" /> PDF
                </button>
              </div>

              <div className="text-xs text-gray-400 ml-2">
                {new Date(h.created_at).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default History;
