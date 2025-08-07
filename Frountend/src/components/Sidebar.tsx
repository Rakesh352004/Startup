import React, { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 flex justify-between items-center z-50 h-16">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="mr-4 text-white hover:text-purple-300 text-xl"
          >
            {isOpen ? "×" : "≡"}
          </button>
          <span className="text-xl font-bold text-purple-400">Startup GPS</span>
        </div>

        <div className="flex space-x-4">
          <Link to="/signin" className="text-white hover:text-purple-300">
            Sign In
          </Link>
          <Link 
            to="/register" 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full font-medium"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Sidebar */}
      {isOpen && (
        <div className="fixed top-16 left-0 w-64 h-full bg-gray-900 text-white shadow-lg z-40 p-6 space-y-6">
          <nav className="flex flex-col gap-4">
            <Link to="/" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Home
            </Link>
            <Link to="/idea-validation" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Idea Validation
            </Link>
            <Link to="/research" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Research
            </Link>
            <Link to="/roadmap" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Roadmap
            </Link>
            <Link to="/team-maker" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Team Maker
            </Link>
            <Link to="/profile" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Profile
            </Link>
            <Link to="/contact" className="hover:text-accent py-2" onClick={() => setIsOpen(false)}>
              Contact
            </Link>
          </nav>
        </div>
      )}
    </>
  );
};

export default Sidebar;
