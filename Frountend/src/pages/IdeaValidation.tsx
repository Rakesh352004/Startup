import React, { useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { apiService } from '../services/api'; // MOVED TO TOP - CORRECT PLACEMENT

// === Types ===
interface ValidationSuggestion {
  critical: string[];
  recommended: string[];
  optional: string[];
}

interface Competitor {
  name: string;
  url: string;
  description?: string;
}
interface ValidationDetails {
  verdict: string;
  feasibility: string;
  marketDemand: string;
  uniqueness: string;
  strength: string;
  riskFactors: string;
  riskMitigation: string;  // Make sure this line exists
  existingCompetitors: string;
  competitors?: Competitor[]; // Add this line if it's not there
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
  riskMitigation: boolean;
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

const IconShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconExternalLink = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

const IconDownload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconVolume = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const IconVolumeX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23 9" y1="9" x2="17 15" y2="15" />
    <line x1="17 9" y1="9" x2="23 15" y2="15" />
  </svg>
);

const IconPause = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const IconPlay = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IdeaValidation: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<ExpandedSectionsState>({
    feasibility: true,
    marketDemand: true,
    uniqueness: true,
    strength: true,
    riskFactors: true,
    riskMitigation: true,
    existingCompetitors: true,
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const isValidIdea = charCount >= 30;

  // Speech synthesis functionality
  const generateReportText = (result: ValidationResponse): string => {
    let text = `Startup Validation Report. Your idea: ${result.prompt}. `;
    
    text += `Overall validation score: ${result.scores.overall} percent. `;
    text += `This shows ${getScoreLabel(result.scores.overall)} potential. `;
    
    text += `Here's the detailed breakdown: `;
    
    text += `Verdict: ${result.validation.verdict}. `;
    
    text += `Feasibility score: ${result.scores.feasibility} out of 100. `;
    text += `${result.validation.feasibility}. `;
    
    text += `Market demand score: ${result.scores.marketDemand} out of 100. `;
    text += `${result.validation.marketDemand}. `;
    
    text += `Uniqueness score: ${result.scores.uniqueness} out of 100. `;
    text += `${result.validation.uniqueness}. `;
    
    text += `Strength score: ${result.scores.strength} out of 100. `;
    text += `${result.validation.strength}. `;
    
    text += `Risk factors score: ${result.scores.riskFactors} out of 100. `;
    text += `${result.validation.riskFactors}. `;
    
    text += `Risk mitigation strategies: ${result.validation.riskMitigation}. `;
    
    text += `Existing competitors: ${result.validation.existingCompetitors}. `;
    
    if (result.suggestions.critical.length > 0) {
      text += `Critical improvements needed: `;
      result.suggestions.critical.forEach((item, index) => {
        text += `${index + 1}. ${item}. `;
      });
    }
    
    if (result.suggestions.recommended.length > 0) {
      text += `Recommended enhancements: `;
      result.suggestions.recommended.forEach((item, index) => {
        text += `${index + 1}. ${item}. `;
      });
    }
    
    if (result.suggestions.optional.length > 0) {
      text += `Optional considerations: `;
      result.suggestions.optional.forEach((item, index) => {
        text += `${index + 1}. ${item}. `;
      });
    }
    
    text += `This concludes your startup validation report.`;
    
    return text;
  };

  const readReport = () => {
    if (!validationResult) return;
    
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported in this browser.');
      return;
    }
    
    // Stop any existing speech
    if (isSpeaking && speechUtterance) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechUtterance(null);
      return;
    }
    
    const reportText = generateReportText(validationResult);
    const utterance = new SpeechSynthesisUtterance(reportText);
    
    // Configure speech settings
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to use a more natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Natural') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechUtterance(null);
    };
    
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      setSpeechUtterance(null);
      setError(`Speech synthesis error: ${event.error}`);
    };
    
    setSpeechUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const pauseResumeReading = () => {
    if (!speechUtterance) return;
    
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }
  };

  const stopReading = () => {
    if (isSpeaking && speechUtterance) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechUtterance(null);
    }
  };

  // Function to parse competitors from text
  const parseCompetitors = (competitorsText: string): Competitor[] => {
    if (!competitorsText) return [];
    
    const competitors: Competitor[] = [];
    
    // Look for patterns like "Company Name (website.com)" or "Company Name - website.com"
    const patterns = [
      /([A-Za-z0-9\s&.-]+?)\s*\(([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/g,
      /([A-Za-z0-9\s&.-]+?)\s*-\s*([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /([A-Za-z0-9\s&.-]+?):\s*([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(competitorsText)) !== null) {
        const name = match[1].trim();
        let url = match[2].trim();
        
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        // Clean up company name
        const cleanName = name.replace(/^(and|or|\d+\.)\s*/i, '').trim();
        
        if (cleanName.length > 2 && cleanName.length < 50) {
          competitors.push({ name: cleanName, url });
        }
      }
    });
    
    // If no structured competitors found, look for well-known company names
    if (competitors.length === 0) {
      const knownCompanies = [
        { names: ['Google', 'Alphabet'], url: 'https://www.google.com' },
        { names: ['Facebook', 'Meta'], url: 'https://www.meta.com' },
        { names: ['Amazon'], url: 'https://www.amazon.com' },
        { names: ['Microsoft'], url: 'https://www.microsoft.com' },
        { names: ['Apple'], url: 'https://www.apple.com' },
        { names: ['Tesla'], url: 'https://www.tesla.com' },
        { names: ['Netflix'], url: 'https://www.netflix.com' },
        { names: ['Uber'], url: 'https://www.uber.com' },
        { names: ['Airbnb'], url: 'https://www.airbnb.com' },
        { names: ['Spotify'], url: 'https://www.spotify.com' },
        { names: ['LinkedIn'], url: 'https://www.linkedin.com' },
        { names: ['Twitter', 'X'], url: 'https://www.x.com' },
        { names: ['Instagram'], url: 'https://www.instagram.com' },
        { names: ['WhatsApp'], url: 'https://www.whatsapp.com' },
        { names: ['YouTube'], url: 'https://www.youtube.com' },
        { names: ['TikTok'], url: 'https://www.tiktok.com' },
        { names: ['Snapchat'], url: 'https://www.snapchat.com' },
        { names: ['Slack'], url: 'https://www.slack.com' },
        { names: ['Zoom'], url: 'https://www.zoom.us' },
        { names: ['Salesforce'], url: 'https://www.salesforce.com' },
      ];
      
      knownCompanies.forEach(company => {
        company.names.forEach(name => {
          if (competitorsText.toLowerCase().includes(name.toLowerCase())) {
            // Check if already added
            if (!competitors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
              competitors.push({ name, url: company.url });
            }
          }
        });
      });
    }
    
    return competitors.slice(0, 8); // Limit to 8 competitors for UI purposes
  };

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
      case 'riskMitigation':
        return <IconShieldCheck className="w-6 h-6 text-blue-400" />;
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

  // Export functionality
  const exportToHTML = () => {
    if (!validationResult) return;

    setIsExporting(true);
    
    try {
      const currentDate = new Date().toLocaleDateString();
      const scoreColor = (score: number) => score >= 85 ? '#4ade80' : score >= 70 ? '#a3e635' : score >= 50 ? '#facc15' : '#f87171';
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Startup Validation Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.2em;
        }
        .header p {
            margin: 0;
            opacity: 0.9;
        }
        .idea-summary {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .idea-summary h2 {
            color: #4a5568;
            margin-top: 0;
        }
        .idea-text {
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4299e1;
            font-style: italic;
        }
        .scores-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .score-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .score-card h3 {
            margin: 0 0 10px 0;
            color: #4a5568;
            font-size: 1.1em;
        }
        .score-number {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .score-label {
            font-size: 0.9em;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .overall-score {
            grid-column: span 2;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .section {
            background: white;
            margin-bottom: 20px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section-header {
            padding: 20px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        .section-header h3 {
            margin: 0;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-content {
            padding: 20px;
            white-space: pre-line;
        }
        .suggestions {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .suggestion-category {
            margin-bottom: 20px;
        }
        .suggestion-category h4 {
            margin: 0 0 10px 0;
            padding: 10px 15px;
            border-radius: 5px;
            color: white;
        }
        .critical { background: #e53e3e; }
        .recommended { background: #3182ce; }
        .optional { background: #718096; }
        .suggestion-list {
            list-style: none;
            padding: 0;
        }
        .suggestion-list li {
            padding: 10px 15px;
            margin: 5px 0;
            background: #f7fafc;
            border-radius: 5px;
            border-left: 4px solid #cbd5e0;
        }
        .competitors {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        .competitor {
            background: #e6fffa;
            color: #234e52;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            border: 1px solid #81e6d9;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #718096;
            font-size: 0.9em;
        }
        @media print {
            body { background: white; }
            .section, .score-card, .suggestions, .idea-summary {
                box-shadow: none;
                border: 1px solid #e2e8f0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Startup Validation Report</h1>
        <p>Generated on ${currentDate}</p>
    </div>

    <div class="idea-summary">
        <h2>💡 Startup Idea</h2>
        <div class="idea-text">${validationResult.prompt}</div>
    </div>

    <div class="scores-grid">
        <div class="score-card overall-score">
            <h3>Overall Score</h3>
            <div class="score-number">${validationResult.scores.overall}%</div>
            <div class="score-label">${getScoreLabel(validationResult.scores.overall)} Potential</div>
        </div>
        <div class="score-card">
            <h3>Feasibility</h3>
            <div class="score-number" style="color: ${scoreColor(validationResult.scores.feasibility)}">${validationResult.scores.feasibility}</div>
            <div class="score-label">Technical & Operational</div>
        </div>
        <div class="score-card">
            <h3>Market Demand</h3>
            <div class="score-number" style="color: ${scoreColor(validationResult.scores.marketDemand)}">${validationResult.scores.marketDemand}</div>
            <div class="score-label">Audience & Growth</div>
        </div>
        <div class="score-card">
            <h3>Uniqueness</h3>
            <div class="score-number" style="color: ${scoreColor(validationResult.scores.uniqueness)}">${validationResult.scores.uniqueness}</div>
            <div class="score-label">Differentiation</div>
        </div>
        <div class="score-card">
            <h3>Strength</h3>
            <div class="score-number" style="color: ${scoreColor(validationResult.scores.strength)}">${validationResult.scores.strength}</div>
            <div class="score-label">Value Proposition</div>
        </div>
        <div class="score-card">
            <h3>Risk Management</h3>
            <div class="score-number" style="color: ${scoreColor(validationResult.scores.riskFactors)}">${validationResult.scores.riskFactors}</div>
            <div class="score-label">Risk Assessment</div>
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>📊 Overall Verdict</h3>
        </div>
        <div class="section-content">${validationResult.validation.verdict}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>🔧 Feasibility Analysis</h3>
        </div>
        <div class="section-content">${validationResult.validation.feasibility}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>📈 Market Demand</h3>
        </div>
        <div class="section-content">${validationResult.validation.marketDemand}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>💎 Uniqueness & Differentiation</h3>
        </div>
        <div class="section-content">${validationResult.validation.uniqueness}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>💪 Strengths</h3>
        </div>
        <div class="section-content">${validationResult.validation.strength}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>⚠️ Risk Factors</h3>
        </div>
        <div class="section-content">${validationResult.validation.riskFactors}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>🛡️ Risk Mitigation Strategies</h3>
        </div>
        <div class="section-content">${validationResult.validation.riskMitigation}</div>
    </div>

    <div class="section">
        <div class="section-header">
            <h3>🏢 Competitive Landscape</h3>
        </div>
        <div class="section-content">
            ${validationResult.validation.competitors && validationResult.validation.competitors.length > 0 ? 
              `<div class="competitors">
                ${validationResult.validation.competitors.map(comp => 
                  `<span class="competitor">${comp.name}</span>`
                ).join('')}
              </div>` : ''
            }
            ${validationResult.validation.existingCompetitors}
        </div>
    </div>

    <div class="suggestions">
        <h2>📋 Actionable Recommendations</h2>
        
        ${validationResult.suggestions.critical.length > 0 ? `
        <div class="suggestion-category">
            <h4 class="critical">🚨 Critical Improvements (${validationResult.suggestions.critical.length} items)</h4>
            <ul class="suggestion-list">
                ${validationResult.suggestions.critical.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>` : ''}
        
        ${validationResult.suggestions.recommended.length > 0 ? `
        <div class="suggestion-category">
            <h4 class="recommended">✅ Recommended Enhancements (${validationResult.suggestions.recommended.length} items)</h4>
            <ul class="suggestion-list">
                ${validationResult.suggestions.recommended.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>` : ''}
        
        ${validationResult.suggestions.optional.length > 0 ? `
        <div class="suggestion-category">
            <h4 class="optional">💡 Optional Considerations (${validationResult.suggestions.optional.length} items)</h4>
            <ul class="suggestion-list">
                ${validationResult.suggestions.optional.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>` : ''}
    </div>

    <div class="footer">
        <p>Report generated by Startup GPS - AI-Powered Startup Validation Platform</p>
        <p>This report provides AI-generated insights for your startup idea. Consider consulting with industry experts for additional validation.</p>
    </div>
</body>
</html>`;

      // Create and download the file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `startup-validation-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
      // FIXED: Use apiService directly (no dynamic import)
      const response = await apiService.validateIdea(ideaPrompt);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Type guard to ensure response.data exists
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      console.log("Backend response:", response.data);
      
      // Parse competitors from the response
      const competitors = parseCompetitors(response.data.validation.existingCompetitors);
      
      // Create a new validation object with competitors
      const validationWithCompetitors = {
        ...response.data,
        validation: {
          ...response.data.validation,
          competitors: competitors
        }
      };
      
      setValidationResult(validationWithCompetitors);
      
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
    stopReading(); // Stop any ongoing speech when resetting
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
                      <IconShieldCheck className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Risk Mitigation Strategies</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Specific strategies to address identified risks and challenges with actionable mitigation plans.
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
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconVolume className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-100">Audio Accessibility</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Full report can be read aloud with text-to-speech for accessibility, including all sections and recommendations.
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-1 flex flex-col space-y-6">
                {/* Idea Summary Card */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 flex-shrink-0">
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
                      onClick={exportToHTML}
                      disabled={isExporting}
                      className={`py-2 px-4 rounded-lg font-medium transition duration-200 flex items-center gap-2 justify-center ${
                        !isExporting
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-600 cursor-not-allowed text-gray-300"
                      }`}
                    >
                      {isExporting ? (
                        <>
                          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <IconDownload className="w-4 h-4" />
                          Export Report
                        </>
                      )}
                    </button>
                    <button
                      onClick={readReport}
                      disabled={!validationResult}
                      className={`py-2 px-4 rounded-lg font-medium transition duration-200 flex items-center gap-2 justify-center ${
                        validationResult
                          ? isSpeaking
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-600 cursor-not-allowed text-gray-300"
                      }`}
                      title={isSpeaking ? "Stop reading report" : "Read report aloud for accessibility"}
                      aria-label={isSpeaking ? "Stop reading report" : "Read report aloud"}
                    >
                      {isSpeaking ? (
                        <>
                          <IconVolumeX className="w-4 h-4" />
                          Stop Reading
                        </>
                      ) : (
                        <>
                          <IconVolume className="w-4 h-4" />
                          Read Report
                        </>
                      )}
                    </button>
                  </div>
                  {isSpeaking && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={pauseResumeReading}
                        className="text-sm py-1 px-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition duration-200 flex items-center gap-1"
                        title="Pause or resume reading"
                        aria-label="Pause or resume reading"
                      >
                        {window.speechSynthesis?.paused ? (
                          <>
                            <IconPlay className="w-3 h-3" />
                            Resume
                          </>
                        ) : (
                          <>
                            <IconPause className="w-3 h-3" />
                            Pause
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Overall Score Card */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 flex-shrink-0">
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
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 flex-1">
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
              <div className="lg:col-span-2 flex flex-col space-y-6">
                {/* Validation Report */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 lg:min-h-0 lg:h-full">
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

                    {/* Risk Mitigation */}
                    <div className="bg-gray-900/50 rounded-lg border-l-4 border-blue-400 overflow-hidden">
                      <button
                        onClick={() => toggleSection('riskMitigation')}
                        className="w-full flex justify-between items-center p-5"
                      >
                        <div className="flex items-center gap-3">
                          <IconShieldCheck className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-gray-200">
                            Risk Mitigation Strategies
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-400/20 text-blue-400">
                            Strategic
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.riskMitigation ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.riskMitigation && (
                        <div className="p-5 pt-0">
                          <div className="text-gray-300 whitespace-pre-line">
                            {validationResult.validation.riskMitigation}
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
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-400/20 text-teal-400">
                            {validationResult.validation.competitors?.length || 0} Companies
                          </span>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.existingCompetitors ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedSections.existingCompetitors && (
                        <div className="p-5 pt-0 space-y-4">
                          {/* Display competitor bubbles if parsed competitors exist */}
                          {validationResult.validation.competitors && validationResult.validation.competitors.length > 0 ? (
                            <div className="space-y-4">
                              <div className="flex flex-wrap gap-3">
                                {validationResult.validation.competitors.map((competitor, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => window.open(competitor.url, '_blank', 'noopener,noreferrer')}
                                    className="group inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 
                                             border border-teal-500/30 rounded-full text-teal-300 hover:from-teal-600/30 hover:to-cyan-600/30 
                                             hover:border-teal-400/50 transition-all duration-200 hover:scale-105 hover:shadow-lg 
                                             hover:shadow-teal-500/20 cursor-pointer"
                                  >
                                    <span className="font-medium">{competitor.name}</span>
                                    <IconExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ))}
                              </div>
                              <div className="text-sm text-gray-400 italic">
                                Click on any company name to visit their website
                              </div>
                            </div>
                          ) : null}
                          
                          {/* Always show the detailed analysis text */}
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