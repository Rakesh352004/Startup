import React, { useState, useEffect, useRef } from "react";

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

const IconMic = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const IconVolume2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconPause = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const IconStop = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="14" rx="2" />
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

  // Voice input states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isValidIdea = charCount >= 30;
  const timeframeOptions = ["3 months", "6 months", "1 year", "2 years"];

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setIdeaPrompt(prev => prev + finalTranscript);
          setCharCount(prev => prev + finalTranscript.length);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceError(`Voice input error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setVoiceError('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setVoiceError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        setVoiceError('Failed to start voice input. Please try again.');
      }
    }
  };

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
    setIsListening(false);
    setVoiceError(null);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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
    const [isPhaseReading, setIsPhaseReading] = useState<boolean>(false);
    const [isPhasePaused, setIsPhasePaused] = useState<boolean>(false);
    const phaseUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const sections = [
      { title: "Tasks", items: phase.tasks, icon: IconChecklist, color: "blue" },
      { title: "Implementation", items: phase.implementation, icon: IconRocket, color: "blue" },
      { title: "Resources", items: phase.resources, icon: IconTool, color: "blue" },
      { title: "Team", items: phase.team, icon: IconUsers, color: "blue" },
      { title: "Challenges", items: phase.challenges, icon: IconAlertTriangle, color: "blue" }
    ];

    const colorMap: Record<string, string> = {
      blue: "bg-blue-600 border-blue-500",
      yellow: "bg-yellow-600 border-yellow-500",
      purple: "bg-purple-600 border-purple-500",
      teal: "bg-teal-600 border-teal-500",
      red: "bg-red-600 border-red-500"
    };

    // Read phase details aloud
    const readPhaseAloud = () => {
      if (isPhaseReading) {
        window.speechSynthesis.cancel();
        setIsPhaseReading(false);
        setIsPhasePaused(false);
        return;
      }

      let speechText = `Phase ${phaseIndex + 1}: ${phase.title}. ${phase.description}. `;
      
      sections.forEach(section => {
        speechText += `${section.title}. `;
        section.items.forEach((item, idx) => {
          speechText += `${idx + 1}. ${item}. `;
        });
      });

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsPhaseReading(true);
        setIsPhasePaused(false);
      };

      utterance.onend = () => {
        setIsPhaseReading(false);
        setIsPhasePaused(false);
        phaseUtteranceRef.current = null;
      };

      utterance.onerror = () => {
        setIsPhaseReading(false);
        setIsPhasePaused(false);
        phaseUtteranceRef.current = null;
      };

      phaseUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    const togglePausePhase = () => {
      if (isPhasePaused) {
        window.speechSynthesis.resume();
        setIsPhasePaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPhasePaused(true);
      }
    };

    const stopPhaseReading = () => {
      window.speechSynthesis.cancel();
      setIsPhaseReading(false);
      setIsPhasePaused(false);
      phaseUtteranceRef.current = null;
    };

    useEffect(() => {
      return () => {
        if (phaseUtteranceRef.current) {
          window.speechSynthesis.cancel();
        }
      };
    }, []);

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
              <div className="flex gap-2">
                {/* Text-to-Speech Controls for Phase */}
                {!isPhaseReading ? (
                  <button
                    onClick={readPhaseAloud}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition duration-200"
                    title="Read phase aloud"
                  >
                    <IconVolume2 className="w-4 h-4" />
                    Read Aloud
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePausePhase}
                      className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg flex items-center gap-2 transition duration-200"
                      title={isPhasePaused ? "Resume" : "Pause"}
                    >
                      <IconPause className="w-4 h-4" />
                      {isPhasePaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      onClick={stopPhaseReading}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition duration-200"
                      title="Stop reading"
                    >
                      <IconStop className="w-4 h-4" />
                      Stop
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedPhaseIndex(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <IconX className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="p-6 border-b border-gray-700">
              <p className="text-gray-300 text-lg">{phase.description}</p>
              
              {/* Reading indicator for phase */}
              {isPhaseReading && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-blue-400">
                    {isPhasePaused ? "Paused" : "Reading phase details..."}
                  </p>
                </div>
              )}
            </div>

            {/* Flowchart */}
            <div className="p-6">
            <div className="flex flex-col items-center gap-6">
            {sections.map((section, idx) => (
            <React.Fragment key={idx}>
            {/* Section Node */}
            <div className="w-full max-w-4xl">
           <div className="border-2 border-blue-500 bg-gray-900/60 rounded-2xl p-6 shadow-[0_0_6px_rgba(37,99,235,0.15)] hover:shadow-[0_0_10px_rgba(59,130,246,0.25)] transition-all duration-300">

            
            {/* Subheading + Icon */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                <section.icon className="w-5 h-5 text-blue-100" />
              </div>
              <h3 className="text-2xl font-semibold text-blue-400 tracking-wide font-[Poppins]">
              {section.title}
              </h3>

            </div>

            {/* Content Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 text-white text-sm hover:bg-blue-800/40 hover:border-blue-400 transition-all duration-200"
                >
                  <span className="font-bold text-blue-400 mr-2">{itemIdx + 1}.</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow between sections */}
        {idx < sections.length - 1 && (
          <div className="flex flex-col items-center">
            <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-blue-700"></div>
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-600"></div>
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
                <div className="relative">
                  <textarea
                    value={ideaPrompt}
                    onChange={handlePromptChange}
                    placeholder="Example: 'A platform that connects college students with industry experts for mentorship and career guidance...'"
                    rows={8}
                    className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition duration-200"
                  />
                  {/* Voice Input Button */}
                  <button
                    onClick={toggleVoiceInput}
                    className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                      isListening 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    <IconMic className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                {/* Voice error message */}
                {voiceError && (
                  <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-yellow-400 text-xs">{voiceError}</p>
                  </div>
                )}
                
                {/* Listening indicator */}
                {isListening && (
                  <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/50 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="text-blue-400 text-sm">Listening... Speak now</p>
                  </div>
                )}

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
                    <IconMic className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-100">Voice Input</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Use the microphone button to describe your idea using voice. Perfect for hands-free input.
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
                <div className="flex gap-3 flex-wrap">
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
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700">
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
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                {idx + 1}
                              </div>
                              <div className="text-left">
                                <h4 className="text-xl font-bold text-white">{phase.title}</h4>
                                <p className="text-gray-400 text-sm">{phase.timeframe}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">
                                {phase.tasks.length} tasks
                              </span>
                              <span className="text-gray-400 text-xs group-hover:text-blue-400 transition-colors">
                                Click to explore →
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-300 mt-3 text-sm">{phase.description}</p>
                        </div>
                      </button>

                      {/* Arrow between phases */}
                      {idx < roadmapResult.roadmap.phases.length - 1 && (
                      <div className="flex flex-col items-center">
                          {/* Line */}
                          <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-blue-700"></div>
                          {/* Arrowhead */}
                          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-600"></div>
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