// src/components/Sidebar.tsx
import React, { useState, ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaClipboardCheck,
  FaSearch,
  FaMap,
  FaUsers,
  FaUser,
  FaEnvelope,
  FaTimes,
  FaBars,
  FaSignOutAlt
} from "react-icons/fa";

interface MenuItem {
  name: string;
  icon: ReactElement;
  path: string;
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsOpen(false);
    navigate("/signin");
  };

  if (location.pathname === "/signin" || location.pathname === "/register") {
    return null;
  }

  const menuItems: MenuItem[] = [
    { name: "Home", icon: <FaHome />, path: "/home" },
    { name: "Idea Validation", icon: <FaClipboardCheck />, path: "/idea-validation" },
    { name: "Research", icon: <FaSearch />, path: "/research-papers" },
    { name: "Roadmap", icon: <FaMap />, path: "/roadmap" },
    { name: "Team Maker", icon: <FaUsers />, path: "/team-maker" },
    { name: "Profile", icon: <FaUser />, path: "/profile" },
    { name: "help", icon: <FaEnvelope />, path: "/help" },
  ];

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-gray-900 text-white transition-all duration-300 ease-in-out z-40
        ${isOpen ? "w-64" : "w-20"}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      

      {/* Menu Items */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors
                  ${location.pathname === item.path ? "bg-gray-800" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="text-lg mr-4">{item.icon}</span>
                {isOpen && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}