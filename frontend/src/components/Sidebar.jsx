import { Link } from "react-router-dom";
import { LayoutDashboard, Upload, History } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 bg-gradient-to-b from-gray-950 to-gray-900 text-white flex flex-col p-6 shadow-xl">
      <h1 className="text-2xl font-bold text-purple-400 mb-10">TalkToText Pro</h1>
      <nav className="space-y-4">
        <Link to="/" className="flex items-center p-2 hover:bg-gray-800 rounded-lg transition">
          <LayoutDashboard className="mr-3 h-5 w-5" /> Dashboard
        </Link>
        <Link to="/upload" className="flex items-center p-2 hover:bg-gray-800 rounded-lg transition">
          <Upload className="mr-3 h-5 w-5" /> Upload
        </Link>
        <Link to="/history" className="flex items-center p-2 hover:bg-gray-800 rounded-lg transition">
          <History className="mr-3 h-5 w-5" /> History
        </Link>
      </nav>
    </div>
  );
}
