import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { FileText, UploadCloud } from "lucide-react";

function Dashboard() {
  const [stats, setStats] = useState({
    total_uploads: 0,
    total_words: 0,
    labels: [],
    uploads: [],
  });

  const API_URL = "http://127.0.0.1:5000";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/stats`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = stats.labels.map((label, idx) => ({
    day: label,
    uploads: stats.uploads[idx],
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-gray-900 rounded-xl shadow-lg flex items-center space-x-4">
          <UploadCloud className="h-10 w-10 text-purple-400" />
          <div>
            <p className="text-gray-400">Total Uploads</p>
            <p className="text-2xl font-bold">{stats.total_uploads}</p>
          </div>
        </div>
        <div className="p-6 bg-gray-900 rounded-xl shadow-lg flex items-center space-x-4">
          <FileText className="h-10 w-10 text-green-400" />
          <div>
            <p className="text-gray-400">Total Words</p>
            <p className="text-2xl font-bold">{stats.total_words}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6 bg-gray-900 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Uploads (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="day" stroke="#aaa" />
            <YAxis allowDecimals={false} stroke="#aaa" />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", color: "#fff" }} />
            <Line
              type="monotone"
              dataKey="uploads"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ fill: "#a855f7", r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
