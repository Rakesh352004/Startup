import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService, UserProfile } from "../services/api";
import logo from "../assets/logo.png";

interface User {
  name: string;
  email: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/signin");
        return;
      }

      const response = await apiService.getUserProfile();
      
      if (response.error) {
        if (response.status === 404) {
          setUser({
            name: "User", 
            email: "user@example.com"
          });
          setError("Profile not found. Please complete your profile.");
        } else {
          throw new Error(response.error);
        }
      } else if (response.data) {
        setUser({
          name: response.data.name,
          email: response.data.email,
        });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err instanceof Error ? err.message : "Failed to load user data");
      
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

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

  const getInitials = (name: string) => {
    if (!name) return "U";
    const names = name.trim().split(" ");
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (
      names[0].charAt(0).toUpperCase() +
      names[names.length - 1].charAt(0).toUpperCase()
    );
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/signin");
    setMenuOpen(false);
  };

  const handleRetry = () => {
    fetchUserData();
  };

  // Show loading state
  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0f172a] border-b border-gray-700 w-full h-16">
        {/* Left - Logo & Title */}
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="Startup GPS Logo" 
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl font-semibold text-white">Startup GPS</span>
        </div>

        {/* Right - Loading Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </header>
    );
  }

  const initials = user ? getInitials(user.name) : "U";
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0f172a] border-b border-gray-700 w-full h-16">
      {/* Left - Logo & Title */}
      <div className="flex items-center space-x-3">
        <img 
          src={logo} 
          alt="Startup GPS Logo" 
          className="w-16 h-16 object-contain"
        />
        <span className="text-2xl font-semibold text-white">Startup GPS</span>
      </div>

      {/* Right - Profile Avatar */}
      <div className="relative" ref={menuRef}>
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-10 h-10 rounded-full ${
            error ? "bg-red-600" : "bg-blue-600"
          } text-white flex items-center justify-center cursor-pointer hover:${
            error ? "bg-red-700" : "bg-blue-700"
          } transition-colors duration-200 font-medium text-sm`}
          title={error ? "Click to retry loading profile" : displayName}
        >
          {initials}
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-[#1e293b] rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
            {/* User Info Section */}
            <div className="px-4 py-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${
                  error ? "bg-red-600" : "bg-blue-600"
                } text-white flex items-center justify-center font-medium text-sm`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-lg truncate">
                    {displayName}
                  </h3>
                  <p className="text-gray-400 text-sm truncate">
                    {displayEmail}
                  </p>
                  {error && (
                    <p className="text-red-400 text-xs mt-1">
                      {error.length > 30 ? "Failed to load profile" : error}
                    </p>
                  )}
                </div>
              </div>
              
              {error && (
                <button
                  onClick={handleRetry}
                  className="mt-2 w-full px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Retry Loading
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => handleNavigation("/profile")}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors duration-150 flex items-center space-x-3"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-base">Profile</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors duration-150 flex items-center space-x-3"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-base">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}