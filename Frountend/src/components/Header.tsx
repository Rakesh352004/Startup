import { FaMapMarkedAlt } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

interface User {
  name: string;
  email: string;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User>({ name: "", email: "" });
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load user whenever route changes or localStorage is updated
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser({
        name: storedUser.name || "",
        email: storedUser.email || "",
      });
    } catch {
      setUser({ name: "", email: "" });
    }
  }, [location]);

  // Listen for localStorage changes in other tabs
  useEffect(() => {
    const handleStorage = () => {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser({
        name: storedUser.name || "",
        email: storedUser.email || "",
      });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <header className="flex items-center justify-between px-10 py-2 bg-[#0a0f1c] absolute top-0 left-0 w-full z-50">
      {/* Left - Logo & Title */}
      <div className="flex items-center space-x-2">
        <FaMapMarkedAlt className="text-white text-3xl" />
        <span className="text-2xl font-bold text-white">Startup GPS</span>
      </div>

      {/* Right - Profile Avatar */}
      <div className="relative" ref={menuRef}>
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white cursor-pointer hover:scale-105 transition-transform duration-200 font-bold"
        >
          {firstLetter}
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-black border border-blue-500 rounded-xl shadow-lg p-4 z-50">
            <div className="mb-3">
              <h3 className="text-white font-semibold">{user.name || "Guest"}</h3>
              <p className="text-blue-300 text-sm">{user.email || "guest@example.com"}</p>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg mb-2 transition-colors"
            >
              Edit Profile
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                navigate("/signin", { replace: true });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}