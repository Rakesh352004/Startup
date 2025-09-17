import React, { useState } from "react";
import axios from "axios";

// === Types ===
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

// SVG Icon Components
const IconCalendar = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

const IconChecklist = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

const IconRocket = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
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

const IconChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconDownload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const IconArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const RoadmapGeneration: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("6 months");
  const [roadmapResult, setRoadmapResult] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const isValidIdea = charCount >= 30;
  const timeframeOptions = ["3 months", "6 months", "1 year", "2 years"];

  // Toggle phase expansion (only one phase can be open at a time)
  const togglePhase = (phaseIndex: number) => {
    setExpandedPhase(expandedPhase === phaseIndex ? null : phaseIndex);
  };

  const handleGenerateRoadmap = async () => {
    if (!isValidIdea) {
      setError("Please enter at least 30 characters to generate a meaningful roadmap");
      return;
    }

    setLoading(true);
    setError(null);
    setRoadmapResult(null);
    setExpandedPhase(null);

    try {
      const API_URL = "http://127.0.0.1:8000/generate-roadmap";
      
      const response = await axios.post<RoadmapResponse>(
        API_URL,
        { 
          prompt: ideaPrompt,
          timeframe: timeframe
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000
        }
      );
      
      console.log("Roadmap response:", response.data);
      setRoadmapResult(response.data);
      
    } catch (err: any) {
      console.error("Roadmap generation error:", err);
      
      if (err.response?.status === 500) {
        setError("Server error occurred. Please check if your GROQ API key is set correctly.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === 'ECONNABORTED') {
        setError("Request timeout. The roadmap generation is taking longer than expected. Please try again.");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Cannot connect to server. Please make sure the backend is running on http://127.0.0.1:8000");
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

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeframe(e.target.value);
  };

  const resetForm = () => {
    setIdeaPrompt("");
    setTimeframe("6 months");
    setRoadmapResult(null);
    setError(null);
    setCharCount(0);
    setExpandedPhase(null);
  };

  const exportToPDF = () => {
    // Simple text export for now
    if (!roadmapResult) return;
    
    const content = `
Startup Roadmap: ${ideaPrompt}
Timeframe: ${timeframe}
Generated on: ${new Date().toLocaleDateString()}

${roadmapResult.roadmap.overview}

${roadmapResult.roadmap.phases.map((phase, index) => `
Phase ${index + 1}: ${phase.title} (${phase.timeframe})
${phase.description}

Tasks:
${phase.tasks.map(task => `- ${task}`).join('\n')}

Implementation:
${phase.implementation.map(step => `- ${step}`).join('\n')}

Resources:
${phase.resources.map(resource => `- ${resource}`).join('\n')}

Team:
${phase.team.map(member => `- ${member}`).join('\n')}

Challenges:
${phase.challenges.map(challenge => `- ${challenge}`).join('\n')}
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

  // Helper function to split array into two rows
  const splitIntoTwoRows = (items: string[]) => {
    const mid = Math.ceil(items.length / 2);
    return [items.slice(0, mid), items.slice(mid)];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-600/10 via-green-800/5 to-transparent"></div>
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <IconRocket className="w-12 h-12 text-green-400" />
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
              {/* Idea Input Section */}
              <div className="lg:w-1/2 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
                  <IconRocket className="w-5 h-5 text-green-400" />
                  Describe Your Startup Idea
                </h2>
                <textarea
                  value={ideaPrompt}
                  onChange={handlePromptChange}
                  placeholder="Example: 'A platform that connects college students with industry experts for mentorship and career guidance...'"
                  rows={8}
                  className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition duration-200"
                />
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Timeframe
                    </label>
                    <select
                      value={timeframe}
                      onChange={handleTimeframeChange}
                      className="w-full p-3 bg-gray-900 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                          ? "bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-500/20"
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
                  <span className={`text-sm ${charCount < 30 ? 'text-red-400' : 'text-green-400'}`}>
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
                    <div className="flex-shrink-0 mt-1">
                      <IconCalendar className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Phased Implementation</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Detailed timeline with clear phases, tasks, and milestones tailored to your timeframe.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconTool className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Actionable Tasks</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Specific, actionable tasks for each phase with implementation guidance and resource requirements.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconUsers className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Team & Resources</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Clear guidance on team composition, resource needs, and potential challenges for each phase.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-500">
                    Provide at least 30 characters describing your idea. The more detailed your description, the more comprehensive your roadmap will be.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header with controls */}
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

              {/* Overview Section */}
              <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 mb-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <IconRocket className="w-5 h-5 text-green-400" />
                  Roadmap Overview
                </h3>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-line">{roadmapResult.roadmap.overview}</p>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  <IconCalendar className="w-4 h-4" />
                  <span>Timeframe: {timeframe}</span>
                  <span className="mx-2">•</span>
                  <span>{roadmapResult.roadmap.phases.length} phases</span>
                </div>
              </div>

              {/* Phases with arrows */}
              <div className="relative">
                {roadmapResult.roadmap.phases.map((phase, phaseIndex) => (
                  <div key={phaseIndex} className="relative">
                    {/* Phase Card */}
                    <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden mb-6">
                      <button
                        onClick={() => togglePhase(phaseIndex)}
                        className="w-full flex justify-between items-center p-6 bg-gray-900/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                            {phaseIndex + 1}
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-white">{phase.title}</h3>
                            <p className="text-sm text-gray-400">{phase.timeframe}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-medium">
                            {phase.tasks.length} tasks
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedPhase === phaseIndex ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      
                      {expandedPhase === phaseIndex && (
                        <div className="p-6 space-y-6">
                          {/* Description */}
                          <div>
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <IconRocket className="w-4 h-4 text-green-400" />
                              Phase Overview
                            </h4>
                            <p className="text-gray-400">{phase.description}</p>
                          </div>

                          {/* Tasks */}
                          <div>
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <IconChecklist className="w-4 h-4 text-blue-400" />
                              Key Tasks
                            </h4>
                            <ul className="space-y-2">
                              {phase.tasks.map((task, taskIndex) => (
                                <li key={taskIndex} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                  <span className="text-blue-400 font-bold mt-0.5">•</span>
                                  <span>{task}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Implementation */}
                          <div>
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <IconTool className="w-4 h-4 text-yellow-400" />
                              Implementation Steps
                            </h4>
                            <ul className="space-y-2">
                              {phase.implementation.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                  <span className="text-yellow-400 font-bold mt-0.5">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Resources - Split into two rows */}
                          <div>
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <IconTool className="w-4 h-4 text-purple-400" />
                              Required Resources
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {splitIntoTwoRows(phase.resources).map((row, rowIndex) => (
                                <ul key={rowIndex} className="space-y-2">
                                  {row.map((resource, resourceIndex) => (
                                    <li key={resourceIndex} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                      <span className="text-purple-400 font-bold mt-0.5">•</span>
                                      <span>{resource}</span>
                                    </li>
                                  ))}
                                </ul>
                              ))}
                            </div>
                          </div>

                          {/* Team - Split into two rows */}
                          <div>
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <IconUsers className="w-4 h-4 text-teal-400" />
                              Team Requirements
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {splitIntoTwoRows(phase.team).map((row, rowIndex) => (
                                <ul key={rowIndex} className="space-y-2">
                                  {row.map((member, memberIndex) => (
                                    <li key={memberIndex} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                      <span className="text-teal-400 font-bold mt-0.5">•</span>
                                      <span>{member}</span>
                                    </li>
                                  ))}
                                </ul>
                              ))}
                            </div>
                          </div>

                          {/* Challenges */}
                          <div>
                            <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <IconAlertTriangle className="w-4 h-4 text-red-400" />
                              Potential Challenges
                            </h4>
                            <ul className="space-y-2">
                              {phase.challenges.map((challenge, challengeIndex) => (
                                <li key={challengeIndex} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                  <span className="text-red-400 font-bold mt-0.5">⚠</span>
                                  <span>{challenge}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow between phases (except for the last one) */}
                    {phaseIndex < roadmapResult.roadmap.phases.length - 1 && (
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                          <IconArrowRight className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapGeneration;