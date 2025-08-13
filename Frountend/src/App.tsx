// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Signup from "./pages/Signup";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import IdeaValidation from "./pages/IdeaValidation";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardPage from "./pages/DashboardPage";
import Sidebar from "./components/Sidebar";
import ResearchAdvisor from "./pages/ResearchAdvisor";
import Header from "./components/Header";
import RoadmapGenerator from "./pages/RoadmapGenerator";

function Layout() {
  const location = useLocation();

  // Sidebar visibility logic
  const showSidebar =
    !["/signin", "/register", "/dashboard"].includes(location.pathname) ||
    ["/research-papers", "/roadmap"].includes(location.pathname);

  // Header visibility logic
  const showHeader =
    !["/signin", "/register", "/dashboard"].includes(location.pathname) ||
    ["/research-papers", "/roadmap"].includes(location.pathname);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a032a] text-white">
      {showHeader && <Header />}
      <div className="flex flex-1 relative">
        {showSidebar && <Sidebar />}
        {/* Content area */}
        <div className="flex-1 flex flex-col">
          {/* Scroll only in content area */}
          <main className="flex-1 overflow-y-auto p-4">
            <Routes>
              <Route path="/home" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/idea-validation" element={<IdeaValidation />} />
              <Route path="/research-papers" element={<ResearchAdvisor />} />
              <Route path="/roadmap" element={<RoadmapGenerator />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/*" element={<Layout />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
