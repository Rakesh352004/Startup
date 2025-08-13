import React, { useState } from "react";

interface RoadmapResponse {
  prompt: string;
  timeframe: string;
  roadmap: string;
  created_at: string;
}

interface Phase {
  title: string;
  description: string;
  tasks: string[];
  implementation: string[];
}

interface RoadmapData {
  overview: string;
  phases: Phase[];
}

const RoadmapGenerator: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [timeframe, setTimeframe] = useState("6 months");
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const isValidIdea = charCount >= 20;

  const parseRoadmapResponse = (result: string): RoadmapData => {
    const sections = result.split('\n\n').filter(section => section.trim() !== '');
    const roadmap: RoadmapData = { overview: "", phases: [] };
    let currentPhase: Partial<Phase> | null = null;

    sections.forEach(section => {
      const lines = section.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const firstLine = lines[0];
      
      if (firstLine.includes("Overview")) {
        roadmap.overview = lines.slice(1).join('\n');
      } 
      else if (firstLine.startsWith("Phase")) {
        if (currentPhase) {
          roadmap.phases.push(currentPhase as Phase);
        }
        
        const phaseMatch = firstLine.match(/Phase \d+: (.+?) - (.+)/);
        currentPhase = {
          title: phaseMatch ? phaseMatch[1] : firstLine,
          description: phaseMatch ? phaseMatch[2] : "",
          tasks: [],
          implementation: []
        };
      }
      else if (firstLine.includes("Tasks")) {
        if (currentPhase) {
          currentPhase.tasks = lines.slice(1).filter(line => line.startsWith('-'));
        }
      }
      else if (firstLine.includes("Implementation")) {
        if (currentPhase) {
          currentPhase.implementation = lines.slice(1).filter(line => line.startsWith('-'));
        }
      }
    });

    if (currentPhase) {
      roadmap.phases.push(currentPhase as Phase);
    }

    return roadmap;
  };

  const handleGenerate = async () => {
    if (!isValidIdea) return;
    
    setError("");
    setRoadmapData(null);
    setLoading(true);
    setExpandedPhase(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/roadmaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          prompt: ideaPrompt,
          timeframe: timeframe
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRoadmapData(parseRoadmapResponse(data.roadmap));
    } catch (err: any) {
      console.error("Roadmap generation error:", err);
      setError(
        err.message || 
        "Failed to generate roadmap. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdeaPrompt(e.target.value);
    setCharCount(e.target.value.length);
  };

  const togglePhase = (index: number) => {
    setExpandedPhase(expandedPhase === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Enter your Startup Idea with a Time Feature</h1>
          <p className="text-gray-600">Generate a detailed roadmap for your startup</p>
        </div>

        {/* Input Section */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <textarea
            value={ideaPrompt}
            onChange={handlePromptChange}
            placeholder="Describe your startup idea in detail..."
            rows={4}
            className="w-full p-4 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 mb-1">
                Timeframe
              </label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full p-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="9 months">9 months</option>
                <option value="12 months">12 months</option>
                <option value="18 months">18 months</option>
              </select>
            </div>

            <div className="flex flex-col">
              <span className={`text-sm mb-1 ${isValidIdea ? "text-green-600" : "text-red-600"}`}>
                {charCount}/20 characters
              </span>
              <button
                onClick={handleGenerate}
                disabled={loading || !isValidIdea}
                className={`px-6 py-2 rounded-lg transition duration-200 flex items-center justify-center ${
                  isValidIdea 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : "Generate Roadmap"}
              </button>
            </div>
          </div>

          {!isValidIdea && charCount > 0 && (
            <p className="mt-2 text-red-600 text-sm">
              Please enter at least 20 characters for meaningful roadmap generation.
            </p>
          )}
        </div>

        {/* Results Section */}
        {roadmapData && (
          <div className="bg-white p-6 rounded-lg shadow">
            {/* Overview Section */}
            {roadmapData.overview && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">Overview</h2>
                <p className="text-gray-700 whitespace-pre-line">{roadmapData.overview}</p>
              </div>
            )}

            {/* Roadmap Timeline */}
            <div className="relative">
              {/* Timeline connector */}
              <div className="absolute left-6 top-0 h-full w-0.5 bg-blue-200"></div>
              
              <div className="space-y-8 pl-8">
                {roadmapData.phases.map((phase, index) => (
                  <div key={index} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-8 top-6 h-4 w-4 rounded-full bg-blue-500 border-4 border-blue-100"></div>
                    
                    {/* Phase card */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => togglePhase(index)}
                        className={`w-full text-left p-4 flex justify-between items-start ${
                          expandedPhase === index ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <h3 className="font-medium text-gray-800">{phase.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform mt-1 ${
                            expandedPhase === index ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Expanded content */}
                      {expandedPhase === index && (
                        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Key Tasks</h4>
                            <ul className="space-y-2">
                              {phase.tasks.map((task, i) => (
                                <li key={i} className="text-gray-700 flex">
                                  <span className="mr-2">•</span>
                                  <span>{task.substring(1).trim()}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Implementation</h4>
                            <ul className="space-y-2">
                              {phase.implementation.map((step, i) => (
                                <li key={i} className="text-gray-700 flex">
                                  <span className="mr-2">•</span>
                                  <span>{step.substring(1).trim()}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Arrow connector (except for last phase) */}
                    {index < roadmapData.phases.length - 1 && (
                      <div className="absolute -left-6 top-16 h-8 w-8">
                        <svg viewBox="0 0 20 20" className="h-full w-full text-blue-200">
                          <path fill="currentColor" d="M10 0v15l5-5H0l5 5V0z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoadmapGenerator;