# enhanced_chatbot_integration.py
from typing import Dict, List, Optional, Any
import re
import json
import requests
import os
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import uuid
import logging
from bson import ObjectId

# Enhanced chatbot that pulls comprehensive data from your platform
class StartupGPSChatbotEnhanced:
    def __init__(self, groq_api_key: str = None):
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        
        # Comprehensive knowledge base extracted from your main.py
        self.platform_features = {
            "idea_validation": {
                "description": "AI-powered comprehensive startup idea validation using GROQ API",
                "endpoint": "/validate-idea",
                "capabilities": [
                    "Overall validation score (0-100%)",
                    "Technical and operational feasibility analysis",
                    "Market demand assessment with real data",
                    "Uniqueness and differentiation analysis",
                    "Strengths identification and value proposition review",
                    "Risk factors identification and mitigation strategies",
                    "Competitive landscape analysis with real competitors",
                    "Structured competitor information with websites",
                    "Critical, recommended, and optional suggestions",
                    "Enhanced competitor analysis with clickable company bubbles"
                ],
                "tech_stack": "GROQ API with llama-3.3-70b-versatile model",
                "features": {
                    "competitor_analysis": "Extracts real competitor names and websites, creates clickable company bubbles",
                    "scoring_system": "Comprehensive 6-dimension scoring: feasibility, market demand, uniqueness, strength, risk factors",
                    "suggestion_categories": "Organized into critical (must-do), recommended (should-do), and optional (nice-to-have)",
                    "ai_validation": "Uses advanced AI prompt engineering for dynamic, detailed analysis"
                },
                "data_structure": {
                    "scores": "ValidationScores with overall, feasibility, marketDemand, uniqueness, strength, riskFactors",
                    "validation": "ValidationDetails with verdict, analysis sections, risk mitigation, competitors list",
                    "suggestions": "Suggestions with critical, recommended, optional arrays"
                }
            },
            
            "research_papers": {
                "description": "Multi-source academic research paper fetching and curation",
                "endpoint": "/research-papers",
                "capabilities": [
                    "Searches 10M+ academic papers across multiple databases",
                    "AI-powered search term generation",
                    "Multi-source concurrent fetching (Semantic Scholar, arXiv, CrossRef)",
                    "Intelligent deduplication and ranking",
                    "Structured paper data with abstracts, authors, DOIs",
                    "Real-time research compilation"
                ],
                "data_sources": {
                    "semantic_scholar": "Semantic Scholar API with 40M+ papers",
                    "arxiv": "arXiv.org for preprint research papers",
                    "crossref": "CrossRef API for published academic papers"
                },
                "ai_features": {
                    "term_generation": "GROQ AI generates precise academic search terms",
                    "relevance_ranking": "AI-powered relevance scoring and filtering",
                    "deduplication": "Smart duplicate detection using normalized titles"
                },
                "tech_implementation": "Async concurrent fetching with httpx, XML parsing for arXiv, JSON APIs"
            },
            
            "roadmap_generation": {
                "description": "AI-powered strategic roadmap generation with phase-by-phase planning",
                "endpoint": "/generate-roadmap",
                "capabilities": [
                    "Timeframe-specific roadmap generation (3 months, 6 months, 1-2 years)",
                    "Phase-by-phase breakdown with detailed tasks",
                    "Implementation steps and resource allocation",
                    "Team role assignments and challenge identification",
                    "Strategic milestone planning",
                    "Adaptive planning with pivot point identification"
                ],
                "roadmap_structure": {
                    "overview": "Comprehensive 3-4 sentence roadmap summary",
                    "phases": "Multiple phases with title, timeframe, description",
                    "phase_details": "Tasks, implementation steps, resources, team roles, challenges"
                },
                "timeframe_optimization": {
                    "3_months": "3 phases focusing on MVP and validation",
                    "6_months": "4 phases including scaling preparation",
                    "1_year": "5 phases with comprehensive growth strategy",
                    "2_years": "6 phases with long-term vision and expansion"
                }
            },
            
            "user_management": {
                "description": "Complete user authentication and profile management system",
                "capabilities": [
                    "Secure user registration and authentication with JWT",
                    "Profile creation and management with skills, interests, experience",
                    "Activity tracking across all platform features",
                    "Data export for GDPR compliance",
                    "User data deletion with complete cleanup"
                ],
                "security": {
                    "authentication": "JWT tokens with bcrypt password hashing",
                    "data_protection": "GDPR-compliant data handling",
                    "role_management": "Developer and user role differentiation"
                }
            },
            
            "database_integration": {
                "description": "MongoDB-based data persistence with comprehensive collections",
                "collections": {
                    "users": "User accounts with authentication data",
                    "ideas": "Saved idea validations with full analysis",
                    "roadmaps": "Generated roadmaps with phase details",
                    "research": "Research paper compilations and search history",
                    "profiles": "User profiles with skills and preferences"
                },
                "features": {
                    "data_persistence": "All validations, roadmaps, and research saved",
                    "history_tracking": "Complete user activity and interaction history",
                    "analytics": "User engagement statistics and platform usage metrics"
                }
            }
        }
        
        # Enhanced intent patterns that cover all platform features
        self.intent_patterns = {
            "idea_validation": [
                r'\b(validate|validation|idea validation|analyze idea|test idea|check idea)\b',
                r'\b(is my idea good|idea assessment|concept validation|startup validation)\b',
                r'\b(competitor analysis|market analysis|feasibility)\b'
            ],
            "research_papers": [
                r'\b(research|papers|academic|studies|publications)\b',
                r'\b(find papers|search papers|academic research|literature review)\b',
                r'\b(semantic scholar|arxiv|crossref|research database)\b'
            ],
            "roadmap_generation": [
                r'\b(roadmap|plan|strategy|timeline|phases|planning)\b',
                r'\b(strategic plan|execution plan|milestone|development plan)\b',
                r'\b(how to execute|implementation|next steps|action plan)\b'
            ],
            "user_management": [
                r'\b(register|login|profile|account|authentication)\b',
                r'\b(user profile|my account|user data|personal data)\b',
                r'\b(export data|delete account|gdpr|privacy)\b'
            ],
            "platform_overview": [
                r'\b(what is startup gps|about startup gps|platform overview)\b',
                r'\b(features|capabilities|what can you do|how does this work)\b',
                r'\b(all features|complete platform|everything you offer)\b'
            ],
            "api_technical": [
                r'\b(api|endpoint|integration|technical|developer)\b',
                r'\b(how to integrate|api documentation|technical specs)\b'
            ]
        }

    def classify_intent(self, query: str) -> str:
        """Enhanced intent classification"""
        query_lower = query.lower()
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    return intent
        
        return "general"

    def get_comprehensive_response(self, query: str, intent: str = None) -> Dict[str, Any]:
        """Generate comprehensive responses based on platform features"""
        if not intent:
            intent = self.classify_intent(query)
        
        query_lower = query.lower()
        
        # Comprehensive platform overview
        if intent == "platform_overview" or any(term in query_lower for term in ["all features", "everything", "complete platform", "what can startup gps do"]):
            return self._get_complete_platform_overview()
        
        # Specific feature explanations
        elif intent == "idea_validation":
            return self._get_idea_validation_explanation(query_lower)
        
        elif intent == "research_papers":
            return self._get_research_explanation(query_lower)
        
        elif intent == "roadmap_generation":
            return self._get_roadmap_explanation(query_lower)
        
        elif intent == "user_management":
            return self._get_user_management_explanation(query_lower)
        
        elif intent == "api_technical":
            return self._get_technical_explanation(query_lower)
        
        else:
            return self._get_contextual_response(query, query_lower)

    def _get_complete_platform_overview(self) -> Dict[str, Any]:
        """Comprehensive platform overview"""
        response = """Startup GPS - Complete Platform Overview

I'm your comprehensive AI-powered entrepreneurial assistant! Here's everything I can help you with:

## AI-Powered Idea Validation
Advanced startup concept analysis using GROQ AI
- Comprehensive Scoring: 6-dimension analysis (feasibility, market demand, uniqueness, strength, risk factors)
- Real Competitor Analysis: Extract actual competitors with clickable website links
- Market Intelligence: Real-time market demand assessment and feasibility analysis
- Structured Suggestions: Critical (must-do), recommended (should-do), and optional improvements
- Risk Assessment: Detailed risk identification with specific mitigation strategies

## Academic Research Integration
10M+ research papers at your fingertips
- Multi-Source Search: Semantic Scholar, arXiv, and CrossRef databases
- AI Search Terms: Intelligent academic term generation for precise results
- Smart Curation: Automated deduplication and relevance ranking
- Structured Data: Full abstracts, author information, DOIs, and publication dates
- Real-Time Compilation: Concurrent fetching for fastest results

## Strategic Roadmap Generation
Phase-by-phase execution planning
- Timeframe-Specific: 3-month, 6-month, 1-year, and 2-year roadmaps
- Detailed Phases: Each phase includes tasks, implementation steps, resources needed
- Team Planning: Role assignments and team composition recommendations
- Challenge Identification: Potential obstacles with mitigation strategies
- Milestone Tracking: Clear success metrics and pivot points

## Complete User Management
Secure and GDPR-compliant platform
- Profile System: Skills, interests, experience tracking
- Activity History: Complete record of validations, roadmaps, and research
- Data Export: Full GDPR-compliant data export functionality
- Secure Authentication: JWT-based security with bcrypt encryption

Want me to dive deeper into any specific feature? I can explain the technical implementation, show you example outputs, or help you get started with any of these capabilities!"""

        return {
            "response": response,
            "intent": "platform_overview",
            "follow_ups": [
                "Show me how idea validation works with an example",
                "Explain the research paper feature in detail", 
                "How does roadmap generation create strategic plans?",
                "What technical APIs and endpoints are available?",
                "Walk me through the user management system"
            ]
        }

    def _get_idea_validation_explanation(self, query_lower: str) -> Dict[str, Any]:
        """Detailed idea validation explanation"""
        feature_data = self.platform_features["idea_validation"]
        
        response = f"""AI-Powered Idea Validation - Complete Guide

Our idea validation system uses advanced AI to provide comprehensive analysis of your startup concepts.

## Validation Process
Endpoint: {feature_data['endpoint']}
AI Model: {feature_data['tech_stack']}

### Input Requirements
- Minimum: 30 characters (ensures meaningful analysis)
- Maximum: 2000 characters (optimal processing)
- Authentication: Optional (anonymous users can validate ideas)

### AI Analysis Dimensions
Our system analyzes your idea across 6 comprehensive dimensions:

**Overall Score (0-100%)**: Master validation score
**Feasibility (0-100)**: Technical and operational viability
**Market Demand (0-100)**: Market size and adoption potential  
**Uniqueness (0-100)**: Differentiation from competitors
**Strength (0-100)**: Core value proposition strength
**Risk Factors (0-100)**: Risk assessment and mitigation

### Enhanced Competitor Analysis
- Real Competitor Detection: Extracts actual company names and websites
- Clickable Format: "CompanyName (website.com)" for easy access
- Industry Mapping: Identifies key players in your space
- Differentiation Opportunities: How to stand out from competition

### Structured Recommendations
- Critical Suggestions: Must-do fixes (3-5 items)
- Recommended Enhancements: Should-do improvements (3-5 items) 
- Optional Considerations: Nice-to-have ideas (2-4 items)

Want to try validating an idea right now? Just describe your startup concept and I'll walk you through the complete analysis process!"""

        return {
            "response": response,
            "intent": "idea_validation",
            "follow_ups": [
                "Validate my startup idea now",
                "Show me an example validation report",
                "How accurate is the competitor analysis?", 
                "What makes your validation different from others?",
                "Can I see the scoring methodology?"
            ]
        }

    def _get_research_explanation(self, query_lower: str) -> Dict[str, Any]:
        """Detailed research papers explanation"""
        response = """Academic Research Integration - Complete System

## 10M+ Research Papers at Your Fingertips

Our research system searches multiple academic databases simultaneously to find the most relevant papers for your startup domain.

### Multi-Source Research Architecture
- Semantic Scholar: 40M+ academic papers
- arXiv: Preprint repository access  
- CrossRef: Published paper metadata

### AI-Powered Search Process
1. Intelligent Search Term Generation - AI extracts precise academic terms
2. Concurrent Multi-Source Fetching - Simultaneous searches across all databases
3. Smart Curation and Deduplication - Relevance ranking and duplicate removal

### Complete Paper Information
- Full paper title and abstract
- Complete author listings
- Publication dates and sources
- Direct links to papers
- DOI identifiers when available

Ready to search for research papers? Just describe your startup idea or research topic, and I'll find the most relevant academic papers across all major databases!"""

        return {
            "response": response,
            "intent": "research_papers",
            "follow_ups": [
                "Search for papers related to my startup idea",
                "How do you ensure research quality and relevance?",
                "What databases do you search exactly?",
                "Can you show me an example research compilation?",
                "How is this different from Google Scholar?"
            ]
        }

    def _get_roadmap_explanation(self, query_lower: str) -> Dict[str, Any]:
        """Detailed roadmap generation explanation"""
        response = """Strategic Roadmap Generation - Complete System

## AI-Powered Phase-by-Phase Planning

Our roadmap generation creates detailed, actionable strategic plans tailored to your specific startup and timeframe.

### Timeframe-Specific Planning
- 3 Months: 3 phases focusing on MVP and validation
- 6 Months: 4 phases including scaling preparation
- 1 Year: 5 phases with comprehensive growth strategy
- 2 Years: 6 phases with long-term vision and expansion

### Comprehensive Roadmap Structure
Each roadmap includes:
- Strategic Overview: 3-4 sentence comprehensive summary
- Detailed Phases: Each with tasks, implementation steps, resources
- Team Planning: Role assignments and composition recommendations  
- Challenge Identification: Potential obstacles with mitigation strategies

### Phase Components
- Title: Clear phase name with timeframe
- Description: Phase objective summary
- Tasks: 4-6 actionable tasks
- Implementation: Step-by-step execution guide
- Resources: Required tools, budget, infrastructure
- Team: Necessary roles and expertise
- Challenges: Potential obstacles and solutions

Ready to generate a strategic roadmap for your startup? Just describe your concept and choose your planning timeframe!"""

        return {
            "response": response,
            "intent": "roadmap_generation",
            "follow_ups": [
                "Generate a roadmap for my startup idea",
                "Show me different timeframe options",
                "How do you customize roadmaps by industry?",
                "Can I modify a roadmap after it's generated?",
                "What's included in each phase of planning?"
            ]
        }

    def _get_user_management_explanation(self, query_lower: str) -> Dict[str, Any]:
        """User management system explanation"""
        response = """User Management System - Complete Guide

## Secure & GDPR-Compliant Platform

Our user management system provides comprehensive account handling with enterprise-grade security and full GDPR compliance.

### Authentication & Security
- JWT Authentication: Secure token-based authentication
- bcrypt Hashing: Industry-standard password encryption
- Role Management: User and developer role differentiation
- Session Management: Secure session handling with expiration

### Profile Management
Complete profile system with:
- Personal Information: Name, email, phone, location
- Professional Details: Role, experience level, availability
- Skills & Interests: Technical and business capabilities
- Preferences: Desired roles and areas of focus

### Data Management & Privacy
- Activity Tracking: All validated ideas, roadmaps, and research
- GDPR Compliance: Complete data export and deletion capabilities
- History Access: View all past interactions and analyses
- Secure Storage: All data encrypted and safely stored

### Anonymous User Support
- Core features work without authentication
- Seamless upgrade to authenticated experience
- No feature limitations for anonymous users

Ready to create your account and unlock the full Startup GPS experience?"""

        return {
            "response": response,
            "intent": "user_management",
            "follow_ups": [
                "How do I create an account?",
                "What data do you collect and store?",
                "How can I export my data?",
                "Is my data secure and private?",
                "Can I use features without an account?"
            ]
        }

    def _get_technical_explanation(self, query_lower: str) -> Dict[str, Any]:
        """Technical API and integration explanation"""
        response = """Technical API Architecture - Developer Guide

## FastAPI-Based REST API Platform

Our platform is built on FastAPI with comprehensive endpoints for all startup assistance features.

### Core API Endpoints
- POST /validate-idea - AI-powered idea validation
- POST /generate-roadmap - Strategic roadmap generation  
- POST /research-papers - Multi-source academic research
- POST /register - User registration
- POST /login - JWT authentication
- GET/POST /profile - Profile management

### User Data Access
- GET /user/ideas - Validation history
- GET /user/roadmaps - Roadmap history
- GET /user/research - Research history
- GET /user/activity - Activity statistics
- GET /user/export - GDPR data export
- DELETE /user/data - Data deletion

### Technical Implementation
- Framework: FastAPI with async support
- Database: MongoDB with comprehensive collections
- AI Integration: GROQ API with advanced models
- Security: JWT tokens with bcrypt encryption
- Research: Multi-source academic database integration

### Integration Examples
All endpoints support both authenticated and anonymous usage, with optional data persistence for authenticated users.

Ready to integrate with our API? The platform is designed for easy integration with comprehensive error handling and detailed response structures."""

        return {
            "response": response,
            "intent": "api_technical",
            "follow_ups": [
                "Show me API integration examples",
                "How do I authenticate API requests?",
                "What are the rate limits and quotas?",
                "Can I integrate this with my existing system?",
                "Where can I find the complete API documentation?"
            ]
        }

    def _get_contextual_response(self, query: str, query_lower: str) -> Dict[str, Any]:
        """Generate contextual responses for general queries"""
        
        # Check for specific feature mentions in general queries
        if any(term in query_lower for term in ["how does", "explain", "tell me about", "what is", "show me"]):
            # Look for feature keywords
            if any(term in query_lower for term in ["validation", "validate", "idea"]):
                return self._get_idea_validation_explanation(query_lower)
            elif any(term in query_lower for term in ["research", "papers", "academic"]):
                return self._get_research_explanation(query_lower)
            elif any(term in query_lower for term in ["roadmap", "plan", "strategy"]):
                return self._get_roadmap_explanation(query_lower)
            elif any(term in query_lower for term in ["user", "account", "profile"]):
                return self._get_user_management_explanation(query_lower)
        
        # Fallback comprehensive response
        response = """I'm your comprehensive AI assistant for Startup GPS! I can provide detailed explanations about all our platform features:

Core Features I Can Explain:
- AI-Powered Idea Validation (comprehensive scoring and competitor analysis)
- Academic Research Integration (10M+ papers from multiple sources)  
- Strategic Roadmap Generation (phase-by-phase planning)
- User Management System (secure accounts with GDPR compliance)
- Technical API Architecture (developer integration guide)

What I Can Help You With:
- Detailed feature explanations with technical implementation
- Step-by-step usage guides and examples
- Integration instructions for developers
- Platform capabilities and limitations
- Data structures and API endpoints

Just ask me about any specific feature you'd like to understand better! For example:
- "How does idea validation work?"
- "Explain the research paper system"
- "Show me the roadmap generation process"
- "Tell me about the user management features"

What would you like to explore in detail?"""

        return {
            "response": response,
            "intent": "general_help",
            "follow_ups": [
                "Explain idea validation in detail",
                "How does research paper search work?",
                "Show me roadmap generation capabilities", 
                "Tell me about user accounts and profiles",
                "What technical APIs are available?"
            ]
        }

# Enhanced integration function for main.py
def integrate_enhanced_chatbot_with_main(app, db_collections=None):
    """
    Integration function to add the enhanced chatbot to your existing FastAPI app
    """
    
    # Initialize enhanced chatbot
    enhanced_chatbot = StartupGPSChatbotEnhanced()
    
    @app.post("/chat")
    async def enhanced_chat_endpoint(message_data: dict):
        """Enhanced chatbot endpoint with comprehensive platform knowledge"""
        try:
            message = message_data.get("message", "").strip()
            
            if not message:
                return {
                    "reply": "Please provide a message to get started with your startup journey!",
                    "intent": "error",
                    "follow_ups": ["What is Startup GPS?", "How can you help me?", "Show me all features"]
                }
            
            # Get comprehensive response
            response = enhanced_chatbot.get_comprehensive_response(message)
            
            return {
                "reply": response["response"],
                "intent": response["intent"],
                "follow_ups": response.get("follow_ups", []),
                "session_id": "enhanced_session",
                "timestamp": datetime.utcnow().isoformat(),
                "confidence": 0.95,
                "source": "startup_gps_enhanced_ai"
            }
            
        except Exception as e:
            return {
                "reply": f"I encountered an issue: {str(e)}. However, I'm still here to help explain all the amazing features of Startup GPS! Try asking about idea validation, research papers, roadmap generation, or any other platform capabilities.",
                "intent": "error",
                "follow_ups": [
                    "What is Startup GPS?",
                    "Explain idea validation",
                    "Show me research capabilities",
                    "Tell me about roadmap generation"
                ],
                "error": str(e)
            }
    
    @app.get("/chat/features")
    async def get_platform_features():
        """Endpoint to get all platform features for the chatbot"""
        return {
            "features": enhanced_chatbot.platform_features,
            "intents": list(enhanced_chatbot.intent_patterns.keys()),
            "capabilities": [
                "Comprehensive idea validation explanation",
                "Multi-source research paper system details",
                "Strategic roadmap generation process",
                "User management and security features", 
                "Technical API and integration guide",
                "Complete platform overview"
            ]
        }
    
    print("Enhanced Startup GPS Chatbot integrated successfully!")
    print("Available endpoints:")
    print("- POST /chat - Enhanced chat with comprehensive platform knowledge")
    print("- GET /chat/features - Platform features and capabilities")
    
    return enhanced_chatbot