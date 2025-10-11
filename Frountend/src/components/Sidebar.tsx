// src/components/Sidebar.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Lightbulb,
  BookOpen,
  Rocket,
  Users,
  User,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

interface MenuItem {
  name: string;
  Icon: LucideIcon;
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
    { 
      name: "Home", 
      Icon: Home, 
      path: "/home"
    },
    { 
      name: "Idea Validator", 
      Icon: Lightbulb, 
      path: "/idea-validation"
    },
    { 
      name: "Research Finder", 
      Icon: BookOpen, 
      path: "/research-papers"
    },
    { 
      name: "Roadmap Generator", 
      Icon: Rocket, 
      path: "/roadmap"
    },
    { 
      name: "Team Finder", 
      Icon: Users, 
      path: "/team-maker"
    },
    { 
      name: "Profile", 
      Icon: User, 
      path: "/profile"
    },
    { 
      name: "Help", 
      Icon: HelpCircle, 
      path: "/help"
    },
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
          {menuItems.map((item) => {
            const IconComponent = item.Icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors
                    ${location.pathname === item.path ? "bg-gray-800" : ""}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-lg mr-4">
                    <IconComponent className="w-5 h-5" />
                  </span>
                  {isOpen && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}