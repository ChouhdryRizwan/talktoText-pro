import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Upload, History, Menu, X } from "lucide-react";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse
  const [isOpenMobile, setIsOpenMobile] = useState(false); // Mobile toggle

  const linkClasses = ({ isActive }) =>
    `flex items-center ${
      isCollapsed ? "justify-center" : "px-4 py-2"
    } rounded-lg transition ${
      isActive
        ? "bg-purple-700 text-white font-semibold"
        : "hover:bg-gray-800 text-gray-300"
    }`;

  return (
    <>
      {/* ✅ Topbar (only mobile) */}
      <div className="lg:hidden flex items-center justify-between bg-gray-950 text-white px-4 py-3 border-b border-gray-800">
        <h1 className="text-xl font-bold text-purple-400">TalkToText Pro</h1>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 rounded-md hover:bg-gray-800"
        >
          {isOpenMobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* ✅ Sidebar */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-40 h-full
          bg-gradient-to-b from-gray-950 to-gray-900 text-white shadow-xl
          transition-all duration-300
          ${isOpenMobile ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        {/* ✅ Sidebar Header (only desktop) */}
        <div className="hidden lg:flex items-center justify-between px-4 py-4">
          {!isCollapsed && (
            <h1 className="text-2xl font-bold text-purple-400">TalkToText Pro</h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-gray-800"
          >
            {isCollapsed ? <Menu className="h-10 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="space-y-2 mt-4">
          <NavLink to="/" className={linkClasses} onClick={() => setIsOpenMobile(false)}>
            <LayoutDashboard className="h-10 w-5" />
            {!isCollapsed && <span className="ml-3">Dashboard</span>}
          </NavLink>

          <NavLink to="/upload" className={linkClasses} onClick={() => setIsOpenMobile(false)}>
            <Upload className="h-10 w-5" />
            {!isCollapsed && <span className="ml-3">Upload</span>}
          </NavLink>

          <NavLink to="/history" className={linkClasses} onClick={() => setIsOpenMobile(false)}>
            <History className="h-10 w-5" />
            {!isCollapsed && <span className="ml-3">History</span>}
          </NavLink>
        </nav>
      </aside>

      {/* ✅ Overlay for mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}
    </>
  );
}
