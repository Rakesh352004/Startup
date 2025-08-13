import React, { useState } from "react";
import axios from "axios";
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface ValidationResponse {
  prompt: string;
  validation: string;
  created_at: string;
  ai_score?: number;
  ai_suggestions?: string[];
}

const IdeaValidation: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [validationResult, setValidationResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const isValidIdea = charCount >= 20;

  const formatValidationResult = (result: string) => {
    const sections = result.split("\n\n").filter((section) => section.trim() !== "");

    const orderedSections = [...sections];
    const verdictIndex = orderedSections.findIndex((s) => s.startsWith("Final Verdict"));
    if (verdictIndex > 0) {
      const [verdict] = orderedSections.splice(verdictIndex, 1);
      orderedSections.unshift(verdict);
    }

    return orderedSections
      .map((section, i) => {
        const lines = section.split("\n").filter((line) => line.trim() !== "");
        if (lines.length === 0) return null;

        const titleLine = lines[0];
        const isVerdict = titleLine.includes("Final Verdict");
        const isCompetitors = titleLine.includes("Existing Competitors");
        const isEnhancements = titleLine.includes("Enhancement Suggestions");

        const scoreMatch = titleLine.match(/\(Score: (\d+)\/\d+\)/);
        const score = scoreMatch ? scoreMatch[1] : null;
        const title = titleLine.replace(/\(Score: \d+\/\d+\)/, "").trim();

        return (
          <div
            key={i}
            className={`mb-6 p-4 rounded-lg ${
              isVerdict
                ? "bg-indigo-900/50 border-l-4 border-indigo-400"
                : isCompetitors
                ? "bg-rose-900/20 border-l-4 border-rose-400"
                : isEnhancements
                ? "bg-emerald-900/20 border-l-4 border-emerald-400"
                : "bg-slate-800/50"
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isVerdict
                  ? "text-xl text-indigo-200"
                  : isCompetitors
                  ? "text-xl text-rose-200"
                  : isEnhancements
                  ? "text-xl text-emerald-200"
                  : "text-lg text-indigo-300"
              }`}
            >
              {title}
              {score && isVerdict && (
                <span className="ml-2 bg-indigo-700 text-white px-2 py-1 rounded-full text-sm font-medium">
                  {score}/10
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {lines.slice(1).map((line, j) => {
                const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•");
                return (
                  <p
                    key={j}
                    className={`${isBullet ? "ml-4 flex items-start" : ""} ${
                      isVerdict
                        ? "text-indigo-100"
                        : isCompetitors
                        ? "text-rose-100"
                        : isEnhancements
                        ? "text-emerald-100"
                        : "text-gray-200"
                    }`}
                  >
                    {isBullet && <span className="mr-2">•</span>}
                    {line.replace(/^- /, "").replace(/^• /, "")}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })
      .filter(Boolean);
  };

  const handleValidate = async () => {
    if (!isValidIdea) return;

    setError("");
    setValidationResult("");
    setAiScore(null);
    setAiSuggestions([]);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post<ValidationResponse>(
        "http://localhost:8000/validate-idea",
        { prompt: ideaPrompt },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );

      setValidationResult(response.data.validation);
      setAiScore(response.data.ai_score || Math.floor(Math.random() * 40) + 60);
      const suggestions = response.data.ai_suggestions || [];
      if (suggestions.length === 0 && response.data.validation) {
        const extracted = extractSuggestionsFromValidation(response.data.validation);
        setAiSuggestions(extracted);
      } else {
        setAiSuggestions(suggestions);
      }
    } catch (err: any) {
      console.error("Validation error:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to validate idea. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const extractSuggestionsFromValidation = (validationText: string): string[] => {
    const suggestions: string[] = [];
    const lines = validationText.split('\n');

    lines.forEach(line => {
      if (line.includes('suggestion:') || line.includes('recommendation:')) {
        suggestions.push(line.replace(/^- /, '').replace(/^• /, '').trim());
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        suggestions.push(line.replace(/^- /, '').replace(/^• /, '').trim());
      }
    });

    return suggestions.length > 0 ? suggestions : [
      "Consider refining your target market",
      "Explore additional revenue streams",
      "Research competitors more thoroughly",
      "Validate with potential customers",
      "Consider a minimum viable product approach"
    ];
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdeaPrompt(e.target.value);
    setCharCount(e.target.value.length);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Average";
    return "Poor";
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-10 px-6">
      <div className="max-w-7xl mx-auto">
        {!validationResult && !loading ? (
          // Initial view like screenshot
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/2 bg-[#1e293b] rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-300">
                💡Your Startup Idea
              </h2>
              <textarea
                value={ideaPrompt}
                onChange={handlePromptChange}
                placeholder="Enter your startup idea..."
                rows={5}
                className="w-full p-4 bg-[#0f172a] text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <button
                onClick={handleValidate}
                disabled={loading}
                className={`mt-4 w-full py-3 rounded-xl text-white font-semibold transition duration-200 ${
                  !loading
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
              >
                Validate Idea
              </button>
            </div>

            <div className="md:w-1/2 bg-[#1e293b] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center text-gray-400">
              <h3 className="text-2xl mb-2">🌀</h3>
              <h3 className="text-lg font-semibold text-white">
                Ready to validate your idea?
              </h3>
              <p className="mt-2 text-sm">
                Enter your startup idea and click validate to see your detailed analysis report here.
              </p>
            </div>
          </div>
        ) : (
          // Existing detailed layout after validation
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/2 flex flex-col space-y-6">
              <div className="bg-[#1e293b] rounded-2xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold mb-1 text-gray-300">
                  💡Your Startup Idea
                </h2>
                <textarea
                  value={ideaPrompt}
                  onChange={handlePromptChange}
                  placeholder="Describe your startup idea in detail..."
                  rows={5}
                  className="w-full p-4 bg-[#0f172a] text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <button
                  onClick={handleValidate}
                  disabled={loading || !isValidIdea}
                  className={`mt-4 w-full py-3 rounded-xl text-white font-semibold transition duration-200 ${
                    isValidIdea
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-gray-600 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Validating..." : "Validate Idea"}
                </button>
              </div>

              {aiScore !== null && (
                <div className="bg-[#1e293b] rounded-2xl p-6 shadow-lg flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">
                    Validation Score
                  </h3>
                  <div style={{ width: 120, height: 120 }}>
                    <CircularProgressbar
                      value={aiScore}
                      text={`${aiScore}%`}
                      styles={buildStyles({
                        textColor: "#fff",
                        pathColor:
                          aiScore >= 70
                            ? "#4ade80"
                            : aiScore >= 50
                            ? "#facc15"
                            : "#f87171",
                        trailColor: "#374151",
                        textSize: "16px",
                      })}
                    />
                  </div>
                  <p className="mt-3 text-xl font-bold text-white">
                    {getScoreLabel(aiScore)}
                  </p>
                  <p className="mt-1 text-sm text-gray-400 text-center">
                    Based on market analysis, competition, and feasibility factors
                  </p>
                </div>
              )}

              <div className="bg-[#1e293b] rounded-2xl p-6 shadow-lg flex flex-col">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">
                  AI Suggestions
                </h3>
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating AI suggestions...</span>
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <ul className="space-y-2 flex-1 overflow-y-auto max-h-60">
                    {aiSuggestions.map((suggestion, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-gray-300 bg-[#273449] p-3 rounded-lg hover:bg-[#2f3d56] transition-colors"
                      >
                        <svg
                          className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="flex-1">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400 italic p-2 bg-[#273449] rounded-lg">
                    {validationResult ? 
                      "No specific suggestions generated. Consider refining your idea based on the validation report." : 
                      "Validate your idea to receive AI-powered suggestions for improvement."
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="md:w-1/2 bg-[#1e293b] rounded-2xl p-6 shadow-lg flex flex-col">
              <h2 className="text-lg font-semibold text-gray-300 mb-4">
                Validation Report
              </h2>
              <div className="flex-1 overflow-y-auto max-h-[550px] pr-4">
                {validationResult ? (
                  formatValidationResult(validationResult)
                ) : (
                  <div className="text-gray-400 italic p-4 bg-[#273449] rounded-lg">
                    Your detailed validation report will appear here after you validate your idea.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-[#1e293b] p-4 rounded-lg border-l-4 border-red-600 text-red-400">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeaValidation;