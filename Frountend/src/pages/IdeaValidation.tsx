import React, { useState } from "react";
import axios from "axios";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface ValidationResponse {
  prompt: string;
  validation: {
    verdict: string;
    feasibility: string;
    marketDemand: string;
    uniqueness: string;
    strength: string;
    riskFactors: string;
    existingCompetitors: string;
  };
  scores: {
    overall: number;
    feasibility: number;
    marketDemand: number;
    uniqueness: number;
    strength: number;
    riskFactors: number;
  };
  suggestions: {
    critical: string[];
    recommended: string[];
    optional: string[];
  };
  created_at: string;
}

// SVG Icon Components (keep all the same)
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

const IconDollarSign = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    feasibility: true,
    marketDemand: true,
    uniqueness: true,
    strength: true,
    riskFactors: true,
    existingCompetitors: true
  });

  const isValidIdea = charCount >= 30;

  const getScoreColor = (score: number, opacity: number = 1) => {
    if (score >= 85) return `rgba(74, 222, 128, ${opacity})`;
    if (score >= 70) return `rgba(163, 230, 53, ${opacity})`;
    if (score >= 50) return `rgba(250, 204, 21, ${opacity})`;
    return `rgba(248, 113, 113, ${opacity})`;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Strong";
    if (score >= 50) return "Moderate";
    return "Weak";
  };

  const getSectionIcon = (section: string, score: number) => {
    const baseProps = {
      className: `w-6 h-6 ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`
    };

    switch (section) {
      case 'marketDemand':
        return <IconTrendingUp {...baseProps} />;
      case 'existingCompetitors':
        return <IconUsers {...baseProps} />;
      case 'feasibility':
        return <IconShield {...baseProps} />;
      case 'strength':
        return <IconTarget {...baseProps} />;
      case 'riskFactors':
        return <IconAlertTriangle {...baseProps} />;
      case 'uniqueness':
        return <IconLightbulb {...baseProps} />;
      default:
        return <IconLightbulb {...baseProps} />;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Enhanced analysis generators with dynamic, natural language responses
  const generateDynamicVerdict = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const industry = ideaKeywords.includes('health') ? 'healthcare' :
                    ideaKeywords.includes('financ') ? 'financial services' :
                    ideaKeywords.includes('educat') ? 'education' :
                    ideaKeywords.includes('tech') ? 'technology' :
                    ideaKeywords.includes('food') ? 'food service' :
                    ideaKeywords.includes('retail') ? 'retail' :
                    'technology';

    if (score >= 85) {
      return `After comprehensive analysis, your startup idea demonstrates exceptional potential in the ${industry} sector. The concept addresses a clear market need with strong differentiation from existing solutions. The technical feasibility appears solid, and the business model shows promising scalability. This is a compelling opportunity worth pursuing with proper execution and market validation.`;
    } else if (score >= 70) {
      return `Your idea shows strong potential with several positive indicators in the ${industry} space. While there are some challenges to address, particularly around ${ideaKeywords.includes('tech') ? 'technical implementation' : 'market penetration'}, the fundamentals appear sound for a viable business. With focused refinement and execution, this could develop into a successful venture.`;
    } else if (score >= 50) {
      return `The analysis reveals moderate potential for your idea in the ${industry} market. While there are some promising aspects, significant challenges exist regarding ${ideaKeywords.includes('competition') ? 'competitive differentiation' : 'market demand'}. Careful refinement of the concept and thorough market validation will be essential before proceeding further.`;
    } else {
      return `The validation results suggest substantial challenges for this idea in its current form. The ${industry} market appears ${ideaKeywords.includes('saturated') ? 'highly competitive' : 'difficult to penetrate'}, and the concept lacks clear differentiation. A significant pivot or reevaluation of the core value proposition may be necessary to create a viable business opportunity.`;
    }
  };

  const generateFeasibilityAnalysis = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const techLevel = ideaKeywords.includes('ai') ? 'advanced AI components' :
                     ideaKeywords.includes('blockchain') ? 'blockchain technology' :
                     ideaKeywords.includes('mobile') ? 'mobile development' :
                     ideaKeywords.includes('iot') ? 'IoT infrastructure' :
                     ideaKeywords.includes('ar') ? 'augmented reality' :
                     'standard web technologies';

    if (score >= 85) {
      return `The technical implementation appears highly feasible using ${techLevel}. The required expertise is readily available in the developer community, and no significant technological barriers are apparent. Development timelines should be reasonable, with an MVP possible within 3-6 months given proper resources. The architecture appears scalable for future growth.`;
    } else if (score >= 70) {
      return `Implementation is feasible but presents some challenges. The ${techLevel} required may need specialized talent, and there could be ${ideaKeywords.includes('integration') ? 'integration complexities with third-party systems' : 'performance considerations at scale'}. With careful planning and the right team, these hurdles are manageable, though may extend timelines by 2-3 months.`;
    } else if (score >= 50) {
      return `Feasibility concerns emerge regarding the ${techLevel} implementation. The technical requirements may involve ${ideaKeywords.includes('ai') ? 'cutting-edge machine learning approaches' : 'complex system architectures'} that could significantly extend development timelines (6-12 months for MVP) and increase costs by 30-50%. Alternative technical approaches should be considered.`;
    } else {
      return `Significant feasibility challenges exist. The proposed solution relies on ${techLevel} that may be ${ideaKeywords.includes('blockchain') ? 'overly complex for the stated problem' : 'not yet mature enough for reliable implementation'}. The development timeline and cost projections appear unrealistic, potentially requiring 12-18 months for MVP at 2-3x the expected budget.`;
    }
  };

  const generateMarketDemand = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const targetUsers = ideaKeywords.includes('business') ? 'business customers' :
                      ideaKeywords.includes('consumer') ? 'individual consumers' :
                      ideaKeywords.includes('student') ? 'students' :
                      ideaKeywords.includes('parent') ? 'parents' :
                      'mixed audience';
    const urgency = ideaKeywords.includes('pain') ? 'clear pain points' :
                   ideaKeywords.includes('problem') ? 'recognized problems' :
                   ideaKeywords.includes('need') ? 'demonstrated needs' :
                   'potential convenience improvements';

    if (score >= 85) {
      return `Market demand appears very strong for this solution. ${targetUsers.charAt(0).toUpperCase() + targetUsers.slice(1)} demonstrate ${urgency} that your idea directly addresses, with willingness to pay for such solutions evidenced by comparable products. Industry trends show 20-30% annual growth in this space, with total addressable market estimated in the billions.`;
    } else if (score >= 70) {
      return `The market shows healthy demand potential. While ${targetUsers} have ${urgency}, the immediate need may not be as urgent as initially presumed, requiring more education and marketing effort. The market size appears substantial (hundreds of millions), though customer acquisition costs may be higher than average.`;
    } else if (score >= 50) {
      return `Market demand appears moderate at best. The solution targets ${urgency} for ${targetUsers}, but these may not be pressing enough to drive rapid adoption. The addressable market is likely in the tens of millions, primarily consisting of early adopters without significant product evolution.`;
    } else {
      return `Current market demand seems weak. The ${urgency} identified for ${targetUsers} may not be substantial enough to support a viable business, with market size potentially limited to single-digit millions. Either the target market needs refinement or the value proposition requires strengthening to address more urgent needs worth paying for.`;
    }
  };

  const generateUniqueness = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const differentiation = ideaKeywords.includes('ai') ? 'AI-powered features' :
                          ideaKeywords.includes('platform') ? 'network effects' :
                          ideaKeywords.includes('experience') ? 'user experience innovations' :
                          ideaKeywords.includes('process') ? 'streamlined processes' :
                          ideaKeywords.includes('model') ? 'innovative business model' :
                          'operational efficiencies';

    if (score >= 85) {
      return `The concept demonstrates exceptional uniqueness through its ${differentiation}, creating meaningful barriers to competition. Customers would have clear reasons to choose your solution over alternatives, with the innovative aspects being difficult to replicate quickly (12-18 month lead time for competitors). This strong differentiation supports premium pricing and faster adoption.`;
    } else if (score >= 70) {
      return `The idea shows good differentiation via ${differentiation}, though some similar solutions exist (3-5 direct competitors). Your approach combines existing elements in novel ways that could resonate with customers. Further refinement of unique value propositions could increase this score by 10-15 points.`;
    } else if (score >= 50) {
      return `Uniqueness is limited at present. While there are some distinctive elements around ${differentiation}, the core concept resembles existing offerings (7-10 similar solutions). Significant innovation in features, business model, or target audience would be needed to stand out in this crowded space.`;
    } else {
      return `The solution lacks meaningful differentiation. The ${differentiation} proposed don't create sufficient competitive separation from established alternatives (10+ similar solutions). A fundamental rethink of what makes this offering unique is recommended, as currently there's little reason for customers to switch from existing options.`;
    }
  };

  const generateStrength = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const advantages = ideaKeywords.includes('team') ? 'strong founding team with relevant experience' :
                     ideaKeywords.includes('tech') ? 'proprietary technology with patent potential' :
                     ideaKeywords.includes('data') ? 'unique data assets and analytics capabilities' :
                     ideaKeywords.includes('partners') ? 'established industry partnerships' :
                     ideaKeywords.includes('traction') ? 'early customer traction' :
                     'first-mover potential in an emerging market';

    if (score >= 85) {
      return `The concept's core strengths are exceptional, particularly in ${advantages}. These foundational advantages create substantial momentum and position the idea for rapid growth. The business model appears scalable, with gross margins potentially reaching 60-80%, and key differentiators are well-protected from competition.`;
    } else if (score >= 70) {
      return `Several notable strengths exist, including ${advantages}. While not without challenges, these positive attributes provide a solid foundation for development. The strengths outweigh the weaknesses, though some areas need reinforcement to reach full potential, particularly around ${ideaKeywords.includes('revenue') ? 'revenue model diversification' : 'customer acquisition strategies'}.`;
    } else if (score >= 50) {
      return `The idea shows some promising aspects like ${advantages}, but these strengths are offset by significant limitations. The current advantages may not be substantial enough to overcome market barriers or competitive pressures without additional resources (2-3x current funding) and strategic partnerships.`;
    } else {
      return `Core strengths are lacking in the current concept. While ${advantages} provide some basis for development, they don't constitute compelling competitive advantages in the face of ${ideaKeywords.includes('competition') ? 'established competitors' : 'market challenges'}. Building more fundamental strengths through technology, partnerships, or business model innovation will be crucial for viability.`;
    }
  };

  const generateRiskFactors = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const primaryRisks = ideaKeywords.includes('regulation') ? 'regulatory hurdles and compliance requirements' :
                       ideaKeywords.includes('tech') ? 'technology development risks and scalability challenges' :
                       ideaKeywords.includes('market') ? 'market adoption risks and customer acquisition costs' :
                       ideaKeywords.includes('competition') ? 'intense competitive pressures' :
                       ideaKeywords.includes('economic') ? 'economic sensitivity' :
                       'execution risks and operational complexities';

    if (score >= 85) {
      return `Risk factors appear manageable and typical for ventures in this space. The primary concerns involve ${primaryRisks}, but these can be mitigated with proper planning and adequate funding buffer (20-30% contingency). No existential risks to the business model are apparent at this stage.`;
    } else if (score >= 70) {
      return `Several notable risks require attention, particularly around ${primaryRisks}. While not deal-breakers, these factors could significantly impact timelines (potential 3-6 month delays) and costs (40-60% over budget). Developing mitigation strategies and securing additional runway should be priorities before full-scale commitment.`;
    } else if (score >= 50) {
      return `Substantial risks are evident, with ${primaryRisks} posing particular challenges. These factors could potentially derail the venture if not addressed properly, requiring 50-100% more resources than initially projected. Careful risk assessment and contingency planning are strongly advised before proceeding further.`;
    } else {
      return `The concept faces critical risks that threaten its viability. ${primaryRisks.charAt(0).toUpperCase() + primaryRisks.slice(1)} present fundamental challenges that may be difficult to overcome without significant changes to the business model or target market. The risks suggest a high probability (60-80%) of the venture failing to achieve traction in its current form.`;
    }
  };

  const generateExistingCompetitors = (prompt: string, score: number): string => {
    const ideaKeywords = prompt.toLowerCase();
    const competitiveLandscape = ideaKeywords.includes('crowded') ? 'highly competitive with well-funded incumbents' :
                              ideaKeywords.includes('niche') ? 'fragmented with specialized niche players' :
                              ideaKeywords.includes('emerging') ? 'rapidly evolving with new entrants' :
                              'dominated by a few large established companies';

    if (score >= 85) {
      return `The competitive landscape appears favorable despite being ${competitiveLandscape}. Your solution addresses an underserved segment or offers distinct advantages that should enable successful market entry and growth. Competitors appear slow to innovate in this particular area, providing a 12-18 month window of opportunity.`;
    } else if (score >= 70) {
      return `Competition exists but isn't prohibitive in this ${competitiveLandscape} market. Differentiation will be important, but viable opportunities exist for a well-executed offering with clear value propositions. Key competitors appear focused on ${ideaKeywords.includes('enterprise') ? 'larger customers' : 'different market segments'}, leaving room for your approach.`;
    } else if (score >= 50) {
      return `The competitive environment presents significant challenges in this ${competitiveLandscape} space. Competing will require substantial resources to gain traction against established players, with customer switching costs estimated at ${ideaKeywords.includes('saas') ? '15-25% of annual contract value' : '20-40 hours of retraining'}. Unique positioning and careful targeting will be essential.`;
    } else {
      return `The competitive landscape appears extremely difficult, being ${competitiveLandscape}. Market conditions suggest high barriers to entry and intense rivalry that may make sustainable differentiation and profitability challenging to achieve. Competitors have ${ideaKeywords.includes('patents') ? 'strong IP protection' : 'significant cost advantages'}, making direct competition particularly risky.`;
    }
  };

  const generateDynamicSuggestions = (prompt: string, score: number) => {
    const critical = [];
    const recommended = [];
    const optional = [];
    const ideaKeywords = prompt.toLowerCase();
    const industry = ideaKeywords.includes('health') ? 'healthcare' :
                    ideaKeywords.includes('financ') ? 'financial services' :
                    ideaKeywords.includes('educat') ? 'education' :
                    ideaKeywords.includes('tech') ? 'technology' :
                    ideaKeywords.includes('food') ? 'food service' :
                    ideaKeywords.includes('retail') ? 'retail' :
                    'technology';
    
    // Critical suggestions based on score and keywords
    if (score < 70) {
      critical.push(
        "Conduct at least 20 customer interviews to validate core assumptions",
        "Develop a minimum viable product to test technical feasibility",
        "Create detailed financial projections with multiple scenarios"
      );
      
      if (score < 50) {
        critical.push(
          "Re-evaluate target market selection and customer segments",
          "Perform thorough competitive analysis of 5-7 direct competitors"
        );
      }
      
      if (ideaKeywords.includes('platform') && !ideaKeywords.includes('network')) {
        critical.push(
          "Develop explicit strategy for solving the cold start problem",
          "Identify and secure anchor partners before launch"
        );
      }
      
      if (ideaKeywords.includes('ai') && !ideaKeywords.includes('data')) {
        critical.push(
          "Secure access to quality training data sources",
          "Validate AI model accuracy with domain experts"
        );
      }
      
      if (ideaKeywords.includes('regulation') || ideaKeywords.includes('compliance')) {
        critical.push(
          "Consult with legal experts on regulatory requirements",
          "Develop compliance roadmap before product development"
        );
      }
    }
    
    // Industry-specific critical suggestions
    if (industry === 'healthcare') {
      critical.push(
        "Validate HIPAA compliance requirements",
        "Engage with medical professionals for clinical validation"
      );
    } else if (industry === 'financial services') {
      critical.push(
        "Research financial licensing requirements",
        "Implement robust security measures from day one"
      );
    }
    
    // Recommended suggestions based on prompt content
    recommended.push(
      "Create 12-month roadmap with key milestones and metrics",
      "Develop customer personas and journey maps",
      "Build financial model with sensitivity analysis"
    );
    
    if (ideaKeywords.includes('tech')) {
      recommended.push(
        "Conduct technical feasibility study with senior engineers",
        "Evaluate build-vs-buy decisions for core technology components"
      );
    }
    
    if (ideaKeywords.includes('market') || ideaKeywords.includes('customer')) {
      recommended.push(
        "Run targeted customer surveys to validate demand",
        "Analyze search trends for related product categories"
      );
    }
    
    if (ideaKeywords.includes('b2b')) {
      recommended.push(
        "Identify potential pilot customers in your network",
        "Develop enterprise sales strategy and pricing tiers"
      );
    } else if (ideaKeywords.includes('b2c')) {
      recommended.push(
        "Design viral growth loops into product experience",
        "Plan for performance marketing budget allocation"
      );
    }
    
    // Optional suggestions for higher-scoring ideas
    if (score > 60) {
      optional.push(
        "Explore strategic partnership opportunities",
        "Consider pilot program with select customers"
      );
      
      if (score > 75) {
        optional.push(
          "Develop thought leadership content strategy",
          "Investigate intellectual property protection options"
        );
      }
      
      if (ideaKeywords.includes('saas')) {
        optional.push(
          "Design tiered pricing model with enterprise options",
          "Plan customer success and onboarding processes"
        );
      }
      
      if (ideaKeywords.includes('mobile')) {
        optional.push(
          "Consider platform-specific feature differentiation",
          "Plan app store optimization strategy"
        );
      }
    }
    
    // Add industry-specific optional suggestions
    if (industry === 'education') {
      optional.push(
        "Explore partnerships with educational institutions",
        "Consider freemium model to drive adoption"
      );
    } else if (industry === 'retail') {
      optional.push(
        "Investigate omnichannel distribution strategies",
        "Plan for seasonal demand fluctuations"
      );
    }
    
    // Ensure we always have at least one suggestion in each category
    if (critical.length === 0) {
      critical.push("No critical issues identified - focus on execution");
    }
    
    if (recommended.length === 0) {
      recommended.push("Conduct SWOT analysis to identify improvement areas");
    }
    
    if (optional.length === 0) {
      optional.push("No optional suggestions at this stage");
    }
    
    return {
      critical: critical.slice(0, 5), // Limit to top 5 critical
      recommended: recommended.slice(0, 5), // Limit to top 5 recommended
      optional: optional.slice(0, 3) // Limit to top 3 optional
    };
  };

  const handleValidate = async () => {
    if (!isValidIdea) {
      setError("Please enter at least 30 characters to validate your idea properly");
      return;
    }

    setError("");
    setValidationResult(null);
    setLoading(true);
    setIsSubmitted(true);

    try {
      // In production, you would call your actual API endpoint
      if (process.env.NODE_ENV === 'production') {
        const token = localStorage.getItem("token");
        const response = await axios.post<ValidationResponse>(
          "https://api.yourstartup.com/validate-idea",
          { prompt: ideaPrompt },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: 20000
          }
        );
        setValidationResult(response.data);
      } else {
        // Mock response for development with dynamic content based on input
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate dynamic scores based on input length and content
        const baseScore = Math.min(100, Math.max(20, 
          Math.floor(ideaPrompt.length / 3) + 
          (ideaPrompt.toLowerCase().includes('platform') ? 15 : 0) +
          (ideaPrompt.toLowerCase().includes('ai') ? 20 : 0) -
          (ideaPrompt.toLowerCase().includes('competition') ? 10 : 0) +
          (ideaPrompt.toLowerCase().includes('unique') ? 15 : 0) -
          (ideaPrompt.toLowerCase().includes('saturated') ? 15 : 0)
        ));
        
        const mockResponse: ValidationResponse = {
          prompt: ideaPrompt,
          validation: {
            verdict: generateDynamicVerdict(ideaPrompt, baseScore),
            feasibility: generateFeasibilityAnalysis(ideaPrompt, baseScore),
            marketDemand: generateMarketDemand(ideaPrompt, baseScore),
            uniqueness: generateUniqueness(ideaPrompt, baseScore),
            strength: generateStrength(ideaPrompt, baseScore),
            riskFactors: generateRiskFactors(ideaPrompt, baseScore),
            existingCompetitors: generateExistingCompetitors(ideaPrompt, baseScore)
          },
          scores: {
            overall: baseScore,
            feasibility: Math.min(100, baseScore + (ideaPrompt.toLowerCase().includes('simple') ? 15 : -5)),
            marketDemand: Math.min(100, baseScore + (ideaPrompt.toLowerCase().includes('market') ? 10 : 0)),
            uniqueness: Math.min(100, baseScore + (ideaPrompt.toLowerCase().includes('unique') ? 15 : -10)),
            strength: Math.min(100, baseScore + (ideaPrompt.toLowerCase().includes('advantage') ? 10 : 0)),
            riskFactors: 100 - Math.min(100, baseScore + (ideaPrompt.toLowerCase().includes('risk') ? -20 : 5))
          },
          suggestions: generateDynamicSuggestions(ideaPrompt, baseScore),
          created_at: new Date().toISOString()
        };
        
        setValidationResult(mockResponse);
      }
    } catch (err: any) {
      console.error("Validation error:", err);
      setError(err.response?.data?.message || "Failed to validate idea. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setIdeaPrompt(value);
    setCharCount(value.length);
    if (error && value.length > 0) setError("");
  };

  const resetForm = () => {
    setIdeaPrompt("");
    setValidationResult(null);
    setError("");
    setCharCount(0);
    setIsSubmitted(false);
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

          {!isSubmitted ? (
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
                  <div className="mt-4 text-red-400 text-sm">
                    {error}
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
                      <h4 className="font-medium text-gray-100">Comprehensive Analysis</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Detailed evaluation of feasibility, market demand, uniqueness, and risk factors with industry-specific insights.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <IconTrendingUp className="w-5 h-5 text-blue-400" />
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
                {validationResult && (
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
                )}

                {/* Key Metrics & Suggestions Card */}
                {validationResult && (
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
                                  {getSectionIcon(key, score)}
                                  <span className="text-gray-300 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                </div>
                                <span 
                                  className="font-semibold"
                                  style={{ color: getScoreColor(score) }}
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
                              {validationResult.suggestions.critical.map((suggestion, idx) => (
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
                                <IconCheckCircle className="w-5 h-5" />
                                Recommended Enhancements
                              </h4>
                              <span className="text-xs text-gray-500">{validationResult.suggestions.recommended.length} items</span>
                            </div>
                            <ul className="space-y-2">
                              {validationResult.suggestions.recommended.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                                  <span className="text-blue-400 font-bold mt-0.5">✓</span>
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
                                <IconLightbulb className="w-5 h-5" />
                                Optional Considerations
                              </h4>
                              <span className="text-xs text-gray-500">{validationResult.suggestions.optional.length} items</span>
                            </div>
                            <ul className="space-y-2">
                              {validationResult.suggestions.optional.map((suggestion, idx) => (
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
                )}
              </div>

              {/* Right Column - Detailed Report */}
              <div className="lg:w-2/3 flex flex-col space-y-6">
                {/* Validation Report */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-300 mb-6 flex items-center gap-2">
                    <IconTarget className="w-5 h-5 text-blue-400" />
                    Detailed Validation Report
                  </h2>
                  
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-gray-400">Analyzing your idea...</p>
                    </div>
                  ) : validationResult ? (
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
                      <div className="bg-gray-900/50 rounded-lg border-l-4 border-gray-500 overflow-hidden">
                        <button 
                          onClick={() => toggleSection('existingCompetitors')}
                          className="w-full flex justify-between items-center p-5"
                        >
                          <div className="flex items-center gap-3">
                            <IconUsers className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-200">
                              Existing Competitors
                            </h3>
                          </div>
                          <IconChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.existingCompetitors ? 'rotate-180' : ''}`} />
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
                  ) : (
                    <div className="text-gray-400 italic p-4 bg-gray-900/50 rounded-lg text-center py-8">
                      Your detailed validation report will appear here after analysis.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <IconAlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">{error}</p>
                  <p className="text-sm text-red-300 mt-1">
                    Please check your input and try again. If the problem persists, contact support.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>Note: AI validation is for informational purposes only and not financial advice.</p>
            <p className="mt-1">Always conduct thorough research before making business decisions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaValidation;