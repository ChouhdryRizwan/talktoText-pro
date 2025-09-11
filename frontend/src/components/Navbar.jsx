export default function Navbar() {
    return (
      <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 text-white">
        <span className="font-semibold">Welcome 👋</span>
        <div className="flex items-center space-x-3">
          <img
            src="https://i.pravatar.cc/40"
            alt="avatar"
            className="w-10 h-10 rounded-full border-2 border-purple-500"
          />
        </div>
      </div>
    );
  }
  