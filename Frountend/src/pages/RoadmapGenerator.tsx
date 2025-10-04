import React, { useState } from "react";

import { apiService } from '../services/api';

interface RoadmapPhase {
  title: string;
  timeframe: string;
  description: string;
  tasks: string[];
  implementation: string[];
  resources: string[];
  team: string[];
  challenges: string[];
}

interface RoadmapResponse {
  id: string;
  prompt: string;
  timeframe: string;
  roadmap: {
    overview: string;
    phases: RoadmapPhase[];
  };
  created_at: string;
  updated_at: string;
  user_id: string;
}

// SVG Icons
const IconRocket = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const IconChecklist = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

const IconDownload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const IconX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const IconCalendar = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

const IconUsers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTool = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconAlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const RoadmapFlowchart: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("6 months");
  const [roadmapResult, setRoadmapResult] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number | null>(null);

  const isValidIdea = charCount >= 30;
  const timeframeOptions = ["3 months", "6 months", "1 year", "2 years"];

  const handleGenerateRoadmap = async () => {
    if (!isValidIdea) {
      setError("Please enter at least 30 characters to generate a meaningful roadmap");
      return;
    }

    setLoading(true);
    setError(null);
    setRoadmapResult(null);
    setSelectedPhaseIndex(null);

    try {
      const response = await apiService.generateRoadmap({
        prompt: ideaPrompt,
        timeframe: timeframe
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      setRoadmapResult(response.data);
      
    } catch (err: any) {
      console.error("Roadmap generation error:", err);
      
      if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to generate roadmap. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setIdeaPrompt(value);
    setCharCount(value.length);
    if (error) setError(null);
  };

  const resetForm = () => {
    setIdeaPrompt("");
    setTimeframe("6 months");
    setRoadmapResult(null);
    setError(null);
    setCharCount(0);
    setSelectedPhaseIndex(null);
  };

  const exportToPDF = () => {
    if (!roadmapResult) return;
    
    const content = `
Startup Roadmap: ${ideaPrompt}
Timeframe: ${timeframe}
Generated on: ${new Date().toLocaleDateString()}

${roadmapResult.roadmap.overview}

${roadmapResult.roadmap.phases.map((phase, index) => `
Phase ${index + 1}: ${phase.title} (${phase.timeframe})
${phase.description}

Tasks: ${phase.tasks.join(', ')}
Implementation: ${phase.implementation.join(', ')}
Resources: ${phase.resources.join(', ')}
Team: ${phase.team.join(', ')}
Challenges: ${phase.challenges.join(', ')}
`).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `startup-roadmap-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Phase Detail Flowchart Component
  const PhaseDetailFlowchart: React.FC<{ phase: RoadmapPhase; phaseIndex: number }> = ({ phase, phaseIndex }) => {
    const sections = [
      { title: "Tasks", items: phase.tasks, icon: IconChecklist, color: "blue" },
      { title: "Implementation", items: phase.implementation, icon: IconRocket, color: "yellow" },
      { title: "Resources", items: phase.resources, icon: IconTool, color: "purple" },
      { title: "Team", items: phase.team, icon: IconUsers, color: "teal" },
      { title: "Challenges", items: phase.challenges, icon: IconAlertTriangle, color: "red" }
    ];

    const colorMap: Record<string, string> = {
      blue: "bg-blue-600 border-blue-500",
      yellow: "bg-yellow-600 border-yellow-500",
      purple: "bg-purple-600 border-purple-500",
      teal: "bg-teal-600 border-teal-500",
      red: "bg-red-600 border-red-500"
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-auto">
        <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-6xl my-8">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-700">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {phaseIndex + 1}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{phase.title}</h2>
                </div>
                <p className="text-gray-400 flex items-center gap-2 ml-13">
                  <IconCalendar className="w-4 h-4" />
                  {phase.timeframe}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhaseIndex(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <IconX className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Description */}
            <div className="p-6 border-b border-gray-700">
              <p className="text-gray-300 text-lg">{phase.description}</p>
            </div>

            {/* Flowchart */}
            <div className="p-6">
              <div className="flex flex-col items-center gap-6">
                {sections.map((section, idx) => (
                  <React.Fragment key={idx}>
                    {/* Section Node */}
                    <div className="w-full max-w-4xl">
                      <div className={`${colorMap[section.color]} rounded-xl p-4 border-2 shadow-lg`}>
                        <div className="flex items-center gap-3 mb-4">
                          <section.icon className="w-6 h-6 text-white" />
                          <h3 className="text-xl font-bold text-white">{section.title}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {section.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 text-white text-sm"
                            >
                              <span className="font-bold text-white mr-2">{itemIdx + 1}.</span>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Arrow between sections */}
                    {idx < sections.length - 1 && (
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-gray-600 to-gray-700"></div>
                        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-700"></div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-blue-800/5 to-transparent"></div>
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <IconRocket className="w-12 h-12 text-blue-400" />
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
                Startup Roadmap Generator
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Create detailed, actionable roadmaps for your startup ideas with AI-powered planning and phased implementation.
            </p>
          </div>

          {!roadmapResult ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Input Section */}
              <div className="lg:w-1/2 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
                  <IconRocket className="w-5 h-5 text-blue-400" />
                  Describe Your Startup Idea
                </h2>
                <textarea
                  value={ideaPrompt}
                  onChange={handlePromptChange}
                  placeholder="Example: 'A platform that connects college students with industry experts for mentorship and career guidance...'"
                  rows={8}
                  className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition duration-200"
                />
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Timeframe
                    </label>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="w-full p-3 bg-gray-900 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {timeframeOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateRoadmap}
                      disabled={!isValidIdea || loading}
                      className={`px-6 py-3 rounded-xl text-white font-semibold transition duration-200 ${
                        isValidIdea && !loading
                          ? "bg-blue-600 hover:bg-blue-700 shadow-lg"
                          : "bg-gray-600 cursor-not-allowed"
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Generating...
                        </span>
                      ) : (
                        "Generate Roadmap"
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className={`text-sm ${charCount < 30 ? 'text-red-400' : 'text-blue-400'}`}>
                    {charCount}/30 characters minimum
                  </span>
                </div>
                {error && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="lg:w-1/2 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <IconChecklist className="w-8 h-8 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">
                    What You'll Get
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <IconCalendar className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-100">Phased Implementation</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Visual flowchart timeline with clear phases, tasks, and milestones tailored to your timeframe.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <IconTool className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-100">Interactive Flowcharts</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Click any phase to see detailed flowcharts of tasks, implementation, resources, and team requirements.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <IconUsers className="w-5 h-5 text-purple-400 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-100">Team & Resources</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Clear guidance on team composition, resource needs, and potential challenges for each phase.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Your Startup Roadmap</h2>
                  <p className="text-gray-400">Generated for: {ideaPrompt}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportToPDF}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition duration-200"
                  >
                    <IconDownload className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition duration-200"
                  >
                    Start Over
                  </button>
                </div>
              </div>

              {/* Overview */}
              <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 mb-8">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <IconRocket className="w-5 h-5 text-blue-400" />
                  Roadmap Overview
                </h3>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <p className="text-gray-300">{roadmapResult.roadmap.overview}</p>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  <IconCalendar className="w-4 h-4" />
                  <span>Timeframe: {timeframe}</span>
                  <span className="mx-2">•</span>
                  <span>{roadmapResult.roadmap.phases.length} phases</span>
                </div>
              </div>

              {/* Phase Flowchart */}
              <div className="bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-8 text-center">
                  Roadmap Phases - Click to Explore
                </h3>
                <div className="flex flex-col items-center gap-6">
                  {roadmapResult.roadmap.phases.map((phase, idx) => (
                    <React.Fragment key={idx}>
                      {/* Phase Node */}
                      <button
                        onClick={() => setSelectedPhaseIndex(idx)}
                        className="w-full max-w-2xl group"
                      >
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 border-2 border-blue-500 shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-xl">
                                {idx + 1}
                              </div>
                              <div className="text-left">
                                <h4 className="text-xl font-bold text-white">{phase.title}</h4>
                                <p className="text-blue-100 text-sm">{phase.timeframe}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                                {phase.tasks.length} tasks
                              </span>
                              <span className="text-blue-100 text-xs group-hover:text-white transition-colors">
                                Click to explore →
                              </span>
                            </div>
                          </div>
                          <p className="text-blue-50 mt-3 text-sm">{phase.description}</p>
                        </div>
                      </button>

                      {/* Arrow between phases */}
                      {idx < roadmapResult.roadmap.phases.length - 1 && (
                        <div className="flex flex-col items-center">
                          <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-blue-600"></div>
                          <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-blue-600"></div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Phase Detail Modal */}
          {selectedPhaseIndex !== null && roadmapResult && (
            <PhaseDetailFlowchart
              phase={roadmapResult.roadmap.phases[selectedPhaseIndex]}
              phaseIndex={selectedPhaseIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapFlowchart;