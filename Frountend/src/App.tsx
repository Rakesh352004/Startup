// src/App.tsx
import React, { useState } from "react";
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
import Contact from "./pages/Help";
import TeamFinder from "./pages/TeamFinder";
import ChatInterface from "./components/ChatInterface"; // Add this import

function Layout() {
  const location = useLocation();
  
  // Add state for chat functionality
  const [currentView, setCurrentView] = useState<'normal' | 'chat'>('normal');
  const [chatData, setChatData] = useState<{
    memberId: string;
    memberName: string;
    conversationId?: string;
  } | null>(null);

  // Handle starting chat from team finder
  const handleStartChat = (memberId: string, memberName: string, conversationId?: string) => {
    setChatData({ memberId, memberName, conversationId });
    setCurrentView('chat');
  };

  // Handle returning to team finder from chat
  const handleBackToTeamFinder = () => {
    setChatData(null);
    setCurrentView('normal');
  };

  // Sidebar visibility logic
  const showSidebar =
    !["/signin", "/register", "/dashboard"].includes(location.pathname) ||
    ["/research-papers", "/roadmap", "/contact"].includes(location.pathname);

  // Header visibility logic - hide header when in chat view
  const showHeader =
    currentView !== 'chat' && (
      !["/signin", "/register", "/dashboard"].includes(location.pathname) ||
      ["/research-papers", "/roadmap", "/contact"].includes(location.pathname)
    );

  // If in chat view, show only chat interface
  if (currentView === 'chat' && chatData) {
    return (
      <div className="h-screen w-full bg-[#0f172a]">
        <ChatInterface
          memberId={chatData.memberId}
          memberName={chatData.memberName}
          conversationId={chatData.conversationId || null}
          onBack={handleBackToTeamFinder}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0a032a] text-white">
      {/* Fixed Header at the top spanning full width - covers sidebar */}
      {showHeader && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Header />
        </div>
      )}

      {/* Content area without top padding - sidebar starts from top */}
      <div className="flex h-full">
        {/* Sidebar on the left - starts from top, gets covered by header */}
        {showSidebar && <Sidebar />}

        {/* Main content on the right */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto p-4 pt-20">
            <Routes>
              <Route path="/home" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/idea-validation" element={<IdeaValidation />} />
              <Route path="/research-papers" element={<ResearchAdvisor />} />
              <Route path="/roadmap" element={<RoadmapGenerator />} />
              <Route path="/help" element={<Contact />} />
              <Route 
                path="/team-maker" 
                element={<TeamFinder onStartChat={handleStartChat} />} 
              />
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