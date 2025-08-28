import React, { useState } from "react";
import axios from "axios";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// === Types ===
interface ValidationSuggestion {
  critical: string[];
  recommended: string[];
  optional: string[];
}

interface ValidationDetails {
  verdict: string;
  feasibility: string;
  marketDemand: string;
  uniqueness: string;
  strength: string;
  riskFactors: string;
  existingCompetitors: string;
}

interface ValidationScores {
  overall: number;
  feasibility: number;
  marketDemand: number;
  uniqueness: number;
  strength: number;
  riskFactors: number;
}

interface ValidationResponse {
  prompt: string;
  validation: ValidationDetails;
  scores: ValidationScores;
  suggestions: ValidationSuggestion;
  created_at: string;
}

interface ExpandedSectionsState {
  feasibility: boolean;
  marketDemand: boolean;
  uniqueness: boolean;
  strength: boolean;
  riskFactors: boolean;
  existingCompetitors: boolean;
}

// SVG Icon Components
const IconLightbulb = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const IconTarget = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconCheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m22 4-10 10.01-5-5" />
  </svg>
);

const IconTrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
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

const IconShield = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

const IdeaValidation: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState<ExpandedSectionsState>({
    feasibility: true,
    marketDemand: true,
    uniqueness: true,
    strength: true,
    riskFactors: true,
    existingCompetitors: true,
  });

  const isValidIdea = charCount >= 30;

  // Helper function to get color based on score
  const getScoreColor = (score: number, opacity = 1): string => {
    if (score >= 85) return `rgba(74, 222, 128, ${opacity})`;
    if (score >= 70) return `rgba(163, 230, 53, ${opacity})`;
    if (score >= 50) return `rgba(250, 204, 21, ${opacity})`;
    return `rgba(248, 113, 113, ${opacity})`;
  };

  // Helper function to get a label based on score
  const getScoreLabel = (score: number): string => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Strong";
    if (score >= 50) return "Moderate";
    return "Weak";
  };

  // Helper function to get the appropriate icon for a section
  const getSectionIcon = (section: string, score: number) => {
    const baseProps: React.SVGProps<SVGSVGElement> = {
      className: `w-6 h-6 ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`
    };

    switch (section) {
      case 'feasibility':
        return <IconShield {...baseProps} />;
      case 'marketDemand':
        return <IconTrendingUp {...baseProps} />;
      case 'uniqueness':
        return <IconLightbulb {...baseProps} />;
      case 'strength':
        return <IconTarget {...baseProps} />;
      case 'riskFactors':
        return <IconAlertTriangle {...baseProps} />;
      case 'existingCompetitors':
        return <IconUsers {...baseProps} />;
      default:
        return <IconLightbulb {...baseProps} />;
    }
  };

  // Toggles the expanded state of a section
  const toggleSection = (section: keyof ExpandedSectionsState) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleValidate = async () => {
    if (!isValidIdea) {
      setError("Please enter at least 30 characters to validate your idea properly");
      return;
    }

    setLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      const API_URL = "http://127.0.0.1:8000/validate-idea";
      
      const response = await axios.post<ValidationResponse>(
        API_URL,
        { prompt: ideaPrompt },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000 // Increased timeout to 60 seconds
        }
      );
      
      console.log("Backend response:", response.data);
      setValidationResult(response.data);
      
    } catch (err: any) {
      console.error("Validation error:", err);
      
      if (err.response?.status === 500) {
        setError("Server error occurred. Please check if your GROQ API key is set correctly.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === 'ECONNABORTED') {
        setError("Request timeout. The analysis is taking longer than expected. Please try again.");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Cannot connect to server. Please make sure the backend is running on http://127.0.0.1:8000");
      } else {
        setError("Failed to validate idea. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for text area changes
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setIdeaPrompt(value);
    setCharCount(value.length);
    if (error) setError(null);
  };

  const resetForm = () => {
    setIdeaPrompt("");
    setValidationResult(null);
    setError(null);
    setCharCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-blue-800/5 to-transparent"></div>
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <IconLightbulb className="w-12 h-12 text-yellow-400" />
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
                Startup Idea Validator
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Get comprehensive AI-powered validation for your startup ideas with detailed market analysis and actionable insights.
            </p>
          </div>

          {!validationResult ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Idea Input Section */}
              <div className="lg:w-1/2 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
                  <IconLightbulb className="w-5 h-5 text-yellow-400" />
                  Describe Your Startup Idea
                </h2>
                <textarea
                  value={ideaPrompt}
                  onChange={handlePromptChange}
                  placeholder="Example: 'A platform that connects college students with industry experts for mentorship and career guidance...'"
                  rows={8}
                  className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition duration-200"
                />
                <div className="flex justify-between items-center mt-4">
                  <span className={`text-sm ${charCount < 30 ? 'text-red-400' : 'text-green-400'}`}>
                    {charCount}/30 characters minimum
                  </span>
                  <button
                    onClick={handleValidate}
                    disabled={!isValidIdea || loading}
                    className={`px-6 py-3 rounded-xl text-white font-semibold transition duration-200 ${
                      isValidIdea && !loading
                        ? "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/20"
                        : "bg-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Analyzing...
                      </span>
                    ) : (
                      "Validate Idea"
                    )}
                  </button>
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
                  <IconTarget className="w-8 h-8 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">
                    What You'll Get
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconCheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">AI-Powered Scoring</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Quantified assessment across key dimensions with clear scoring and benchmarks against similar startups.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconLightbulb className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Actionable Suggestions</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Prioritized recommendations to improve your idea's viability, including technical and business considerations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconUsers className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Competitive Analysis</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Detailed review of existing competitors and your potential competitive advantages.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-500">
                    Provide at least 30 characters describing your idea for meaningful analysis. The more detailed your description, the better the validation.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Column */}
              <div className="lg:w-1/3 flex flex-col space-y-6">
                {/* Idea Summary Card */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                      <IconLightbulb className="w-5 h-5 text-yellow-400" />
                      Your Idea Summary
                    </h2>
                    <button
                      onClick={resetForm}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Start Over</span>
                    </button>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg mb-4">
                    <p className="text-gray-300">{ideaPrompt}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleValidate}
                      disabled={loading}
                      className={`flex-1 py-2 rounded-lg text-white font-medium transition duration-200 ${
                        !loading
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-gray-600 cursor-not-allowed"
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Revalidating...
                        </span>
                      ) : (
                        "Update Validation"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ideaPrompt);
                      }}
                      className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition duration-200"
                    >
                      Copy Text
                    </button>
                  </div>
                </div>

                {/* Overall Score Card */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">
                    Overall Validation Score
                  </h3>
                  <div className="flex flex-col items-center">
                    <div style={{ width: 160, height: 160 }} className="mb-4">
                      <CircularProgressbar
                        value={validationResult.scores.overall}
                        text={`${validationResult.scores.overall}%`}
                        styles={buildStyles({
                          textColor: "#fff",
                          pathColor: getScoreColor(validationResult.scores.overall),
                          trailColor: "#374151",
                          textSize: "24px",
                          pathTransitionDuration: 1,
                        })}
                      />
                    </div>
                    <div className="text-center">
                      <p 
                        className="text-xl font-bold mb-1"
                        style={{ color: getScoreColor(validationResult.scores.overall) }}
                      >
                        {getScoreLabel(validationResult.scores.overall)} Potential
                      </p>
                      <div className="text-sm text-gray-400 mb-4 text-left">
                        <p className="mb-2">{validationResult.validation.verdict.split('\n')[0]}</p>
                        <p>{validationResult.validation.verdict.split('\n').slice(1).join(' ')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics & Suggestions Card */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">
                    Key Metrics & Suggestions
                  </h3>
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div>
                      <h4 className="text-md font-medium text-gray-400 mb-3">
                        Performance Scores
                      </h4>
                      <div className="space-y-4">
                        {Object.entries(validationResult.scores)
                          .filter(([key]) => key !== 'overall')
                          .map(([key, score]) => (
                            <div key={key} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getSectionIcon(key, score as number)}
                                <span className="text-gray-300 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              </div>
                              <span 
                                className="font-semibold"
                                style={{ color: getScoreColor(score as number) }}
                              >
                                {score}/100
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-4">
                      {/* Critical Suggestions */}
                      {validationResult.suggestions.critical.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium text-red-400 mb-2 flex items-center gap-2">
                              <IconAlertTriangle className="w-5 h-5" />
                              Critical Improvements
                            </h4>
                            <span className="text-xs text-gray-500">{validationResult.suggestions.critical.length} items</span>
                          </div>
                          <ul className="space-y-2">
                            {validationResult.suggestions.critical.map((suggestion: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                <span className="text-red-400 font-bold mt-0.5">!</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Suggestions */}
                      {validationResult.suggestions.recommended.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium text-blue-400 mb-2 flex items-center gap-2">
                              <IconTrendingUp className="w-4 h-4" />
                              Recommended Improvements
                            </h4>
                            <span className="text-xs text-gray-500">{validationResult.suggestions.recommended.length} items</span>
                          </div>
                          <ul className="space-y-2">
                            {validationResult.suggestions.recommended.map((suggestion: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                <span className="text-blue-400 font-bold mt-0.5">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Optional Suggestions */}
                      {validationResult.suggestions.optional.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium text-gray-400 mb-2 flex items-center gap-2">
                              <IconShield className="w-4 h-4" />
                              Optional Considerations
                            </h4>
                            <span className="text-xs text-gray-500">{validationResult.suggestions.optional.length} items</span>
                          </div>
                          <ul className="space-y-2">
                            {validationResult.suggestions.optional.map((suggestion: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                <span className="text-gray-400 font-bold mt-0.5">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Right Column - Detailed Report */}
              <div className="lg:w-2/3 flex flex-col space-y-6">
                {/* Validation Report */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-300 mb-6 flex items-center gap-2">
                    <IconTarget className="w-5 h-5 text-blue-400" />
                    Detailed Validation Report
                  </h2>

                  <div className="space-y-6">
                    {/* Feasibility */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-blue-500 overflow-hidden">
                      <button
                        onClick={() => toggleSection('feasibility')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconShield className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Feasibility
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: getScoreColor(validationResult.scores.feasibility, 0.2),
                              color: getScoreColor(validationResult.scores.feasibility)
                            }}
                          >
                            {validationResult.scores.feasibility}/100
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.feasibility ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.feasibility && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.feasibility}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Market Demand */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-green-500 overflow-hidden">
                      <button
                        onClick={() => toggleSection('marketDemand')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconTrendingUp className="w-5 h-5 text-green-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Market Demand
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: getScoreColor(validationResult.scores.marketDemand, 0.2),
                              color: getScoreColor(validationResult.scores.marketDemand)
                            }}
                          >
                            {validationResult.scores.marketDemand}/100
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.marketDemand ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.marketDemand && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.marketDemand}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Uniqueness */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-purple-500 overflow-hidden">
                      <button
                        onClick={() => toggleSection('uniqueness')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconLightbulb className="w-5 h-5 text-purple-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Uniqueness
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: getScoreColor(validationResult.scores.uniqueness, 0.2),
                              color: getScoreColor(validationResult.scores.uniqueness)
                            }}
                          >
                            {validationResult.scores.uniqueness}/100
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.uniqueness ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.uniqueness && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.uniqueness}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Strength */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-yellow-500 overflow-hidden">
                      <button
                        onClick={() => toggleSection('strength')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconTarget className="w-5 h-5 text-yellow-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Strength
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: getScoreColor(validationResult.scores.strength, 0.2),
                              color: getScoreColor(validationResult.scores.strength)
                            }}
                          >
                            {validationResult.scores.strength}/100
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.strength ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.strength && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.strength}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Risk Factors */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-red-500 overflow-hidden">
                      <button
                        onClick={() => toggleSection('riskFactors')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconAlertTriangle className="w-5 h-5 text-red-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Risk Factors
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: getScoreColor(validationResult.scores.riskFactors, 0.2),
                              color: getScoreColor(validationResult.scores.riskFactors)
                            }}
                          >
                            {validationResult.scores.riskFactors}/100
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.riskFactors ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.riskFactors && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.riskFactors}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Existing Competitors */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-teal-500 overflow-hidden">
                      <button
                        onClick={() => toggleSection('existingCompetitors')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconUsers className="w-5 h-5 text-teal-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Existing Competitors
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.existingCompetitors ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.existingCompetitors && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.existingCompetitors}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdeaValidation;