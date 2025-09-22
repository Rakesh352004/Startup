from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
import os
import jwt
import requests
import asyncio
import json
import re
import logging
import uuid
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Set
from pymongo import errors
from bson import ObjectId
from dotenv import load_dotenv
from datetime import datetime
import uuid
# Database imports
from database import (
    users_collection, ideas_collection, profiles_collection, roadmaps_collection, 
    research_collection, db,
    hash_password, verify_password, create_access_token,
    get_user_by_id, get_user_profile, update_user_profile,
    create_roadmap, get_roadmap_by_id, get_user_roadmaps,
    update_roadmap, delete_roadmap, save_research, get_research_by_id, 
    get_user_research_history, save_idea_validation, get_user_ideas,
    get_user_activity, get_user_stats, delete_user_data,connections_collection
)
from enhanced_chatbot import StartupGPSChatbotEnhanced, integrate_enhanced_chatbot_with_main

# Enhanced chatbot imports (if available)
try:
    from Backend.enhanced_chatbot import enhanced_chatbot, ChatContext
except ImportError:
    enhanced_chatbot = None
    ChatContext = None

# Load environment variables
load_dotenv()

# ==========================================
# CONSTANTS AND CONFIGURATION
# ==========================================

DEVELOPER_EMAILS = {"ry352004@gmail.com"}
JWT_SECRET = os.environ.get("JWT_SECRET", "fallback_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1/paper/search"
ARXIV_API = "https://export.arxiv.org/api/query"
CROSSREF_API = "https://api.crossref.org/works"

# Collections
team_searches_collection = db["team_searches"]

# ==========================================
# FASTAPI APP INITIALIZATION
# ==========================================

app = FastAPI(
    title="Startup GPS API",
    description="Comprehensive API for startup validation, research, roadmaps, and team building",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security - auto_error=False allows optional authentication
security = HTTPBearer(auto_error=False)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# PYDANTIC MODELS
# ==========================================

# Authentication Models
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Profile Models
class ProfileBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    preferred_role: Optional[str] = None
    experience: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    user_id: str
    updated_at: datetime

# Enhanced Idea Validation Models
class IdeaInput(BaseModel):
    prompt: str = Field(..., min_length=30, max_length=2000)

class ValidationScores(BaseModel):
    overall: int
    feasibility: int
    marketDemand: int
    uniqueness: int
    strength: int
    riskFactors: int

class CompetitorInfo(BaseModel):
    name: str
    url: str

class ValidationDetails(BaseModel):
    verdict: str
    feasibility: str
    marketDemand: str
    uniqueness: str
    strength: str
    riskFactors: str
    riskMitigation: str
    existingCompetitors: str
    competitors: Optional[List[CompetitorInfo]] = None

class Suggestions(BaseModel):
    critical: List[str]
    recommended: List[str]
    optional: List[str]

class ValidationResponse(BaseModel):
    prompt: str
    validation: ValidationDetails
    scores: ValidationScores
    suggestions: Suggestions
    created_at: datetime

# Research Models
class ResearchPaper(BaseModel):
    title: str
    authors: List[str]
    abstract: str
    published_date: str
    source: str
    url: str
    doi: Optional[str] = None

class ResearchRequest(BaseModel):
    idea: str
    max_results: int = 10

class ResearchResponse(BaseModel):
    papers: List[ResearchPaper]
    search_terms: List[str]
    research_id: str
    created_at: Any

# Roadmap Models
class RoadmapInput(BaseModel):
    prompt: str = Field(..., min_length=30, max_length=2000)
    timeframe: str

class RoadmapPhase(BaseModel):
    title: str
    timeframe: str
    description: str
    tasks: List[str]
    implementation: List[str]
    resources: List[str]
    team: List[str]
    challenges: List[str]

class RoadmapStructure(BaseModel):
    overview: str
    phases: List[RoadmapPhase]

class RoadmapResponse(BaseModel):
    id: str
    prompt: str
    timeframe: str
    roadmap: RoadmapStructure
    created_at: datetime
    updated_at: datetime
    user_id: str
class TeamSearchInput(BaseModel):
    required_skills: List[str]
    preferred_role: Optional[str] = None
    experience: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None
    interests: List[str] = []
    additional_requirements: Optional[str] = None

class MatchedProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: Optional[str] = None
    skills: List[str]
    interests: List[str]
    preferred_role: Optional[str] = None
    experience: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None
    match_score: int
    matched_skills: List[str]
    matched_interests: List[str]

class TeamSearchResponse(BaseModel):
    profiles: List[MatchedProfileResponse]
    search_id: str
    total_matches: int

class ConnectionRequest(BaseModel):
    target_user_id: str

class ConnectionResponse(BaseModel):
    id: str
    user_id: str
    target_user_id: str
    status: str  # 'connected' or 'disconnected'
    created_at: datetime
    updated_at: datetime

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_optional_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user if authenticated, otherwise return None"""
    if not credentials or not credentials.credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = get_user_by_id(user_id)
        return user
    except (jwt.ExpiredSignatureError, jwt.PyJWTError):
        return None

def create_access_token_helper(subject: str, role: str = "user"):
    """Helper to create access token"""
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + timedelta(days=1),
        "role": role
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==========================================
# ENHANCED IDEA VALIDATION FUNCTIONALITY
# ==========================================

def enhance_competitor_analysis(result: dict) -> dict:
    """Enhanced competitor analysis with structured parsing"""
    competitors_text = result.get("analysis", {}).get("existing_competitors", "")
    
    if not competitors_text:
        return result
    
    # Extract competitors with websites
    competitors = []
    
    # Multiple patterns for competitor extraction
    patterns = [
        r'([A-Za-z0-9\s&.-]+?)\s*\(([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)',
        r'([A-Za-z0-9\s&.-]+?)\s*-\s*([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
        r'([A-Za-z0-9\s&.-]+?):\s*([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, competitors_text)
        for match in matches:
            name = match[0].strip()
            url = match[1].strip()
            
            # Clean up URL
            if not url.startswith('http://') and not url.startswith('https://'):
                url = 'https://' + url
            
            # Clean up company name
            clean_name = re.sub(r'^(and|or|\d+\.)\s*', '', name, flags=re.IGNORECASE).strip()
            
            if 2 < len(clean_name) < 50 and clean_name not in [c['name'] for c in competitors]:
                competitors.append({
                    'name': clean_name,
                    'url': url
                })
    
    # Fallback: extract known companies
    if not competitors:
        known_companies = {
            'Google': 'https://www.google.com',
            'Meta': 'https://www.meta.com',
            'Amazon': 'https://www.amazon.com',
            'Microsoft': 'https://www.microsoft.com',
            'Apple': 'https://www.apple.com',
            'Tesla': 'https://www.tesla.com',
            'Netflix': 'https://www.netflix.com',
            'Uber': 'https://www.uber.com',
            'Airbnb': 'https://www.airbnb.com',
            'Spotify': 'https://www.spotify.com',
            'LinkedIn': 'https://www.linkedin.com',
            'X': 'https://www.x.com',
            'Instagram': 'https://www.instagram.com',
            'YouTube': 'https://www.youtube.com',
            'TikTok': 'https://www.tiktok.com',
            'Slack': 'https://www.slack.com',
            'Zoom': 'https://www.zoom.us',
            'Salesforce': 'https://www.salesforce.com',
            'OpenAI': 'https://www.openai.com',
            'Stripe': 'https://www.stripe.com',
            'PayPal': 'https://www.paypal.com',
            'Shopify': 'https://www.shopify.com',
            'Canva': 'https://www.canva.com',
            'Figma': 'https://www.figma.com',
            'Notion': 'https://www.notion.so',
            'Trello': 'https://www.trello.com',
            'Asana': 'https://www.asana.com',
            'Discord': 'https://www.discord.com',
            'GitHub': 'https://www.github.com',
            'Dropbox': 'https://www.dropbox.com',
        }
        
        competitors_text_lower = competitors_text.lower()
        for company, url in known_companies.items():
            if company.lower() in competitors_text_lower:
                if company not in [c['name'] for c in competitors]:
                    competitors.append({
                        'name': company,
                        'url': url
                    })
    
    # Limit to top 8 competitors for UI purposes
    competitors = competitors[:8]
    
    # Add competitors to the result
    if competitors:
        if "analysis" not in result:
            result["analysis"] = {}
        
        result["analysis"]["competitors"] = competitors
        
        # Enhance the existing_competitors text
        competitor_names_with_urls = [
            f"{comp['name']} ({comp['url'].replace('https://', '').replace('http://', '')})" 
            for comp in competitors
        ]
        if competitor_names_with_urls:
            enhanced_text = f"Key competitors in this space include: {', '.join(competitor_names_with_urls)}.\n\n"
            enhanced_text += result["analysis"]["existing_competitors"]
            result["analysis"]["existing_competitors"] = enhanced_text
    
    return result

def validate_response_structure(result: dict) -> bool:
    """Validate that the response has the expected structure"""
    required_keys = ["overall_score", "scores", "analysis", "suggestions"]
    if not all(key in result for key in required_keys):
        return False
    
    required_scores = ["feasibility", "market_demand", "uniqueness", "strength", "risk_factors"]
    if not all(key in result.get("scores", {}) for key in required_scores):
        return False
    
    required_analysis = ["verdict", "feasibility", "market_demand", "uniqueness", 
                        "strength", "risk_factors", "existing_competitors"]
    if not all(key in result.get("analysis", {}) for key in required_analysis):
        return False
    
    required_suggestions = ["critical", "recommended", "optional"]
    if not all(key in result.get("suggestions", {}) for key in required_suggestions):
        return False
    
    return True

def fix_response_structure(result: dict) -> dict:
    """Fix missing or invalid structure in response"""
    if "overall_score" not in result:
        result["overall_score"] = 70
    
    if "scores" not in result:
        result["scores"] = {}
    
    default_scores = {
        "feasibility": 70, "market_demand": 70, "uniqueness": 70,
        "strength": 70, "risk_factors": 70
    }
    
    for key, default in default_scores.items():
        if key not in result["scores"]:
            result["scores"][key] = default
    
    if "analysis" not in result:
        result["analysis"] = {}
    
    default_analysis = {
        "verdict": "Comprehensive analysis completed with key insights identified.",
        "feasibility": "Technical and operational feasibility assessed.",
        "market_demand": "Market demand indicators evaluated.",
        "uniqueness": "Differentiation opportunities analyzed.",
        "strength": "Core strengths and value proposition reviewed.",
        "risk_factors": "Key risks and mitigation strategies identified.",
        "risk_mitigation": "Strategic risk mitigation approaches recommended.",
        "existing_competitors": "Competitive landscape assessment completed."
    }
    
    for key, default in default_analysis.items():
        if key not in result["analysis"]:
            result["analysis"][key] = default
    
    if "suggestions" not in result:
        result["suggestions"] = {}
    
    default_suggestions = {
        "critical": ["Validate market demand through customer interviews", 
                    "Develop minimum viable product", "Secure initial funding"],
        "recommended": ["Build strategic partnerships", "Focus on user experience", 
                       "Implement analytics tracking"],
        "optional": ["Explore additional market segments", "Consider international expansion"]
    }
    
    for key, default in default_suggestions.items():
        if key not in result["suggestions"]:
            result["suggestions"][key] = default
    
    return result

def extract_score(text: str, pattern: str) -> int:
    """Extract numeric score from text using regex pattern"""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return min(100, max(0, int(match.group(1))))
    return 70

def extract_section(text: str, pattern: str, default: str) -> str:
    """Extract analysis section from text"""
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()[:500]
    return default

def extract_suggestions(text: str, category: str) -> List[str]:
    """Extract suggestion items from text"""
    pattern = rf"{category}[\"']?\s*:\s*\[(.*?)\]"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    
    if match:
        suggestions_text = match.group(1)
        suggestions = re.findall(r'["\']([^"\']+)["\']', suggestions_text)
        return suggestions[:5]
    
    lines = text.split('\n')
    suggestions = []
    in_category = False
    
    for line in lines:
        if category.lower() in line.lower():
            in_category = True
            continue
        if in_category:
            if line.strip().startswith(('-', '•', '*')) or re.match(r'^\d+\.', line.strip()):
                suggestion = re.sub(r'^[-•*\d\.\s]+', '', line.strip())
                if suggestion:
                    suggestions.append(suggestion[:100])
            elif line.strip() and not line.startswith(' '):
                break
    
    return suggestions[:5] if suggestions else [f"No specific {category} suggestions identified"]

def parse_fallback_response(text: str) -> dict:
    """Fallback parser in case JSON parsing fails"""
    overall_score = extract_score(text, r"overall[_\s]*score[\"']?\s*:\s*(\d+)")
    feasibility_score = extract_score(text, r"feasibility[\"']?\s*:\s*(\d+)")
    market_score = extract_score(text, r"market[_\s]*demand[\"']?\s*:\s*(\d+)")
    uniqueness_score = extract_score(text, r"uniqueness[\"']?\s*:\s*(\d+)")
    strength_score = extract_score(text, r"strength[\"']?\s*:\s*(\d+)")
    risk_score = extract_score(text, r"risk[_\s]*factors[\"']?\s*:\s*(\d+)")
    
    verdict = extract_section(text, r"verdict[\"']?\s*:\s*[\"'](.*?)[\"']", 
                             "Strong potential identified with key areas for development.")
    feasibility = extract_section(text, r"feasibility[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                 "Technical implementation appears feasible with proper planning.")
    market_demand = extract_section(text, r"market[_\s]*demand[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                   "Market shows promising demand indicators.")
    uniqueness = extract_section(text, r"uniqueness[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                "Concept demonstrates notable differentiation opportunities.")
    strength = extract_section(text, r"strength[\"']?\s*:\s*[\"'](.*?)[\"']", 
                              "Core strengths provide solid foundation for growth.")
    risk_factors = extract_section(text, r"risk[_\s]*factors[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                  "Manageable risks identified with mitigation strategies available.")
    risk_mitigation = extract_section(text, r"risk[_\s]*mitigation[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                     "Strategic approaches recommended to address identified risks.")
    competitors = extract_section(text, r"competitors[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                 "Competitive landscape analysis reveals positioning opportunities.")
    
    critical = extract_suggestions(text, "critical")
    recommended = extract_suggestions(text, "recommended")
    optional = extract_suggestions(text, "optional")
    
    result = {
        "overall_score": overall_score,
        "scores": {
            "feasibility": feasibility_score,
            "market_demand": market_score,
            "uniqueness": uniqueness_score,
            "strength": strength_score,
            "risk_factors": risk_score
        },
        "analysis": {
            "verdict": verdict,
            "feasibility": feasibility,
            "market_demand": market_demand,
            "uniqueness": uniqueness,
            "strength": strength,
            "risk_factors": risk_factors,
            "risk_mitigation": risk_mitigation,
            "existing_competitors": competitors
        },
        "suggestions": {
            "critical": critical,
            "recommended": recommended,
            "optional": optional
        }
    }
    
    return enhance_competitor_analysis(result)

def call_groq_validation(prompt: str) -> dict:
    """Enhanced validation function with comprehensive error handling"""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GROQ_API_KEY environment variable is not set. Please configure your API key."
        )

    if not GROQ_API_KEY.startswith('gsk_'):
        raise HTTPException(
            status_code=500,
            detail="Invalid GROQ API key format. Key should start with 'gsk_'"
        )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = """You are an AI Startup Validator for "Startup GPS". 
Your role is to provide dynamic, detailed, and actionable startup validation reports based on the user's idea. 
Do not use any static or placeholder data. Always analyze the user's input deeply.

### Instructions:
1. Analyze the startup idea comprehensively across these dimensions:
   - **Overall Validation Score (0-100%)**
   - **Feasibility** (technical & operational)
   - **Market Demand**
   - **Uniqueness / Differentiation**
   - **Strengths**
   - **Risk Factors**

2. For each dimension:
   - Give a **score (0-100)**  
   - Write a **detailed explanation** with specific insights relevant to the idea.

3. Provide three clear sections of suggestions:
   - **Critical Improvements (must-do fixes)** – 3 to 5 items
   - **Recommended Enhancements (should-do improvements)** – 3 to 5 items
   - **Optional Considerations (nice-to-have ideas)** – 2 to 4 items

4. Add detailed analysis for each dimension:
   - Feasibility (timeline, complexity, scalability)
   - Market Demand (target audience, adoption signals, growth potential)
   - Uniqueness (differentiation vs competitors, barriers to entry)
   - Strength (value proposition, monetization, scalability potential)
   - Risk Factors (competition, adoption, finance, tech)
   - Risk Mitigation (specific strategies to address risks)
   - Existing Competitors (real names where possible, differentiation opportunities)

5. Always adapt output **directly to the user's startup idea**.
   - Do NOT give generic or repeated responses.
   - Each section must be grounded in the specific industry/domain of the idea.
   - Avoid filler text.

6. When listing competitors, format them as:
   "CompanyName1 (website1.com), CompanyName2 (website2.com), CompanyName3 (website3.com)"

### Response Format (JSON):
{
  "overall_score": 85,
  "scores": {
    "feasibility": 78,
    "market_demand": 82,
    "uniqueness": 65,
    "strength": 81,
    "risk_factors": 74
  },
  "analysis": {
    "verdict": "Detailed overall assessment...",
    "feasibility": "Technical and operational analysis...",
    "market_demand": "Market size, audience, adoption potential...",
    "uniqueness": "Differentiation analysis...",
    "strength": "Core advantages and value proposition...",
    "risk_factors": "Key risks and mitigation strategies...",
    "risk_mitigation": "Strategic risk mitigation approaches...",
    "existing_competitors": "Real competitor analysis with Company1 (domain1.com), Company2 (domain2.com)..."
  },
  "suggestions": {
    "critical": ["Item 1", "Item 2", "Item 3"],
    "recommended": ["Item 1", "Item 2", "Item 3"],
    "optional": ["Item 1", "Item 2"]
  }
}

Provide ONLY the JSON response with no additional text."""

    user_prompt = f"""Please validate this startup idea comprehensively with proper competitor formatting: {prompt}

IMPORTANT: When listing competitors in the existing_competitors section, format them as:
"CompanyName1 (website1.com), CompanyName2 (website2.com), CompanyName3 (website3.com)"

This format is critical for the frontend to create clickable company bubbles. Include as many relevant competitors as possible with their websites."""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 4000
    }

    try:
        logger.info("Sending request to GROQ API...")
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 401:
            logger.error("Authentication failed - Invalid API key")
            raise HTTPException(
                status_code=401, 
                detail="Authentication failed. Please check your GROQ API key is valid and active."
            )
        elif response.status_code == 429:
            logger.error("Rate limit exceeded")
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please wait before making another request."
            )
        elif response.status_code == 400:
            logger.error(f"Bad request: {response.text}")
            raise HTTPException(
                status_code=400, 
                detail=f"Bad request to GROQ API: {response.text}"
            )
        elif response.status_code != 200:
            logger.error(f"API Error {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"GROQ API error {response.status_code}: {response.text}"
            )

        data = response.json()
        
        if "choices" not in data or not data["choices"]:
            raise HTTPException(
                status_code=500,
                detail="Invalid response structure from GROQ API"
            )
        
        ai_text = data["choices"][0]["message"]["content"]
        logger.info(f"Received response from GROQ API ({len(ai_text)} characters)")
        
        # Clean up the response to ensure it's valid JSON
        ai_text = ai_text.strip()
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:]
        if ai_text.endswith("```"):
            ai_text = ai_text[:-3]
        ai_text = ai_text.strip()
        
        # Parse JSON response
        try:
            result = json.loads(ai_text)
            logger.info("Successfully parsed JSON response")
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parsing failed: {e}")
            logger.info("Using fallback parsing")
            result = parse_fallback_response(ai_text)
        
        # Validate and enhance result structure
        if not validate_response_structure(result):
            logger.info("Response structure invalid, applying fixes")
            result = fix_response_structure(result)
        
        # Enhance competitor analysis
        result = enhance_competitor_analysis(result)
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error("Request timeout")
        raise HTTPException(
            status_code=504, 
            detail="Request timeout. GROQ API took too long to respond."
        )
    except requests.exceptions.ConnectionError:
        logger.error("Connection error")
        raise HTTPException(
            status_code=503, 
            detail="Connection error. Unable to reach GROQ API."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Request exception: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"API request failed: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Validation processing failed: {str(e)}"
        )

# ==========================================
# ROADMAP GENERATION FUNCTIONALITY
# ==========================================

def create_default_phases(timeframe: str) -> List[dict]:
    """Create default phases based on timeframe"""
    if timeframe == "3 months":
        return [
            {
                "title": "Phase 1: 4 weeks - Foundation & MVP",
                "timeframe": "4 weeks",
                "description": "Establish project foundation and develop minimum viable product.",
                "tasks": ["Define core features", "Set up development environment", "Build MVP", "Initial testing"],
                "implementation": ["Create project plan", "Set up version control", "Develop core functionality", "Conduct alpha testing"],
                "resources": ["Development tools", "Cloud infrastructure", "Team members"],
                "team": ["Project Lead", "Developer", "Designer"],
                "challenges": ["Scope creep", "Technical debt", "Time constraints"]
            },
            {
                "title": "Phase 2: 4 weeks - Validation & Feedback",
                "timeframe": "4 weeks",
                "description": "Gather user feedback and validate product-market fit.",
                "tasks": ["User testing", "Collect feedback", "Iterate on MVP", "Prepare for launch"],
                "implementation": ["Recruit beta testers", "Conduct user interviews", "Analyze feedback", "Implement improvements"],
                "resources": ["User testing platform", "Analytics tools", "Feedback collection system"],
                "team": ["Product Manager", "Developer", "UX Researcher"],
                "challenges": ["User acquisition", "Feedback quality", "Iteration speed"]
            },
            {
                "title": "Phase 3: 4 weeks - Launch Preparation",
                "timeframe": "4 weeks",
                "description": "Final preparations for public launch and initial marketing.",
                "tasks": ["Final testing", "Marketing materials", "Launch planning", "Team scaling"],
                "implementation": ["Load testing", "Create marketing assets", "Plan launch campaign", "Hire additional team"],
                "resources": ["Marketing budget", "Hosting infrastructure", "Additional team members"],
                "team": ["Marketing Specialist", "Developer", "Operations Manager"],
                "challenges": ["Launch timing", "Market reception", "Scaling infrastructure"]
            }
        ]
    elif timeframe == "6 months":
        return [
            {
                "title": "Phase 1: 6 weeks - Discovery & Planning",
                "timeframe": "6 weeks",
                "description": "Comprehensive market research and detailed project planning.",
                "tasks": ["Market analysis", "Competitor research", "Feature planning", "Resource allocation"],
                "implementation": ["Conduct market surveys", "Analyze competitors", "Create detailed spec", "Secure initial funding"],
                "resources": ["Market research tools", "Business intelligence", "Initial capital"],
                "team": ["Business Analyst", "Product Manager", "Market Researcher"],
                "challenges": ["Market uncertainty", "Funding acquisition", "Planning accuracy"]
            },
            {
                "title": "Phase 2: 8 weeks - MVP Development",
                "timeframe": "8 weeks",
                "description": "Build and test minimum viable product.",
                "tasks": ["Core development", "Feature implementation", "Quality assurance", "Performance optimization"],
                "implementation": ["Set up development pipeline", "Build core features", "Conduct testing", "Optimize performance"],
                "resources": ["Development team", "Testing tools", "Infrastructure"],
                "team": ["Technical Lead", "Developers", "QA Engineers"],
                "challenges": ["Technical complexity", "Timeline management", "Quality standards"]
            },
            {
                "title": "Phase 3: 6 weeks - Market Validation",
                "timeframe": "6 weeks",
                "description": "Validate product-market fit and gather user feedback.",
                "tasks": ["Beta testing", "User feedback collection", "Product iteration", "Market validation"],
                "implementation": ["Launch beta program", "Collect user data", "Analyze feedback", "Iterate on product"],
                "resources": ["Beta testing platform", "Analytics tools", "User research"],
                "team": ["Product Manager", "UX Researcher", "Data Analyst"],
                "challenges": ["User acquisition", "Feedback interpretation", "Product iteration"]
            },
            {
                "title": "Phase 4: 6 weeks - Launch & Scale",
                "timeframe": "6 weeks",
                "description": "Public launch and initial scaling efforts.",
                "tasks": ["Public launch", "Marketing campaign", "Customer acquisition", "Scale infrastructure"],
                "implementation": ["Execute launch plan", "Run marketing campaigns", "Monitor metrics", "Scale systems"],
                "resources": ["Marketing budget", "Scalable infrastructure", "Customer support"],
                "team": ["Marketing Team", "Operations", "Customer Success"],
                "challenges": ["Market reception", "Scaling challenges", "Customer support"]
            }
        ]
    else:
        return [
            {
                "title": "Phase 1: Foundation & MVP",
                "timeframe": "Varies",
                "description": "Initial setup and minimum viable product development.",
                "tasks": ["Project setup", "Core development", "Initial testing", "Team formation"],
                "implementation": ["Plan development", "Build core features", "Test functionality", "Assemble team"],
                "resources": ["Development tools", "Initial budget", "Team members"],
                "team": ["Project Manager", "Developer", "Designer"],
                "challenges": ["Technical challenges", "Resource constraints", "Time management"]
            }
        ]

def parse_roadmap_fallback(text: str, timeframe: str) -> dict:
    """Fallback parser for roadmap generation"""
    overview_match = re.search(r"overview[\"']?\s*:\s*[\"'](.*?)[\"']", text, re.IGNORECASE | re.DOTALL)
    overview = overview_match.group(1).strip() if overview_match else f"Comprehensive roadmap for the specified {timeframe} timeframe."
    
    phases = []
    phase_pattern = r"\{.*?title[\"']?\s*:\s*[\"'](.*?)[\"'].*?timeframe[\"']?\s*:\s*[\"'](.*?)[\"'].*?description[\"']?\s*:\s*[\"'](.*?)[\"'].*?\}"
    phase_matches = re.finditer(phase_pattern, text, re.IGNORECASE | re.DOTALL)
    
    for match in phase_matches:
        phase = {
            "title": match.group(1).strip(),
            "timeframe": match.group(2).strip(),
            "description": match.group(3).strip(),
            "tasks": ["Develop MVP", "Conduct market research", "Build initial team", "Secure funding"],
            "implementation": ["Create project plan", "Set up development environment", "Build core features", "Test and iterate"],
            "resources": ["Development tools", "Initial budget", "Team members", "Market data"],
            "team": ["Project Manager", "Developer", "Designer", "Business Analyst"],
            "challenges": ["Technical complexity", "Market competition", "Funding constraints", "Team coordination"]
        }
        phases.append(phase)
    
    if not phases:
        phases = create_default_phases(timeframe)
    
    return {
        "overview": overview,
        "phases": phases
    }

def call_groq_roadmap(prompt: str, timeframe: str) -> dict:
    """Generate a detailed roadmap using GROQ API"""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GROQ_API_KEY environment variable is not set."
        )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = """You are an AI Startup Roadmap Generator for "Startup GPS". 
Your role is to create detailed, actionable roadmaps for startup ideas based on the user's input and timeframe.

### Instructions:
1. Analyze the startup idea and create a phased roadmap based on the specified timeframe.
2. Structure the roadmap with:
   - A comprehensive 3-4 sentence overview
   - Multiple phases (typically 3-5 phases depending on timeframe)
   
3. For each phase, include:
   - Title: Clear phase name with timeframe estimate (e.g., "Phase 1: 2-4 weeks - MVP Development")
   - Description: 2-3 sentence overview of the phase
   - Tasks: 4-6 specific, actionable tasks
   - Implementation: 3-5 detailed implementation steps
   - Resources: 3-5 required resources (tools, budget, etc.)
   - Team: 2-4 team roles needed
   - Challenges: 2-4 potential challenges and mitigation strategies

4. Ensure the roadmap is:
   - Actionable and specific
   - Realistic for the given timeframe
   - Technically sound
   - Business-focused
   - Adaptable to the specific industry/domain

5. Timeframe guidance:
   - 3 months: 3 phases, focus on MVP and validation
   - 6 months: 4 phases, include scaling preparation
   - 1 year: 5 phases, comprehensive growth strategy
   - 2 years: 6 phases, long-term vision and expansion

### Response Format (JSON):
{
  "overview": "Comprehensive 3-4 sentence overview of the entire roadmap...",
  "phases": [
    {
      "title": "Phase 1: [Timeframe] - [Phase Name]",
      "timeframe": "e.g., 2-4 weeks",
      "description": "2-3 sentence description...",
      "tasks": ["Task 1", "Task 2", "Task 3", "Task 4"],
      "implementation": ["Step 1", "Step 2", "Step 3", "Step 4"],
      "resources": ["Resource 1", "Resource 2", "Resource 3"],
      "team": ["Role 1", "Role 2", "Role 3"],
      "challenges": ["Challenge 1", "Challenge 2", "Challenge 3"]
    }
  ]
}

Provide ONLY the JSON response with no additional text."""

    user_prompt = f"Create a detailed roadmap for this startup idea: {prompt}\nTimeframe: {timeframe}"

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.4,
        "max_tokens": 4000
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"GROQ API error: {response.text}"
            )

        data = response.json()
        ai_text = data["choices"][0]["message"]["content"].strip()
        
        # Clean JSON response
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:]
        if ai_text.endswith("```"):
            ai_text = ai_text[:-3]
        ai_text = ai_text.strip()
        
        # Parse JSON
        try:
            result = json.loads(ai_text)
            return result
        except json.JSONDecodeError:
            return parse_roadmap_fallback(ai_text, timeframe)
            
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Roadmap generation failed: {str(e)}"
        )

# ==========================================
# RESEARCH PAPER FUNCTIONALITY  
# ==========================================

def generate_search_terms(idea: str) -> List[str]:
    """Generate search terms from the startup idea"""
    if not GROQ_API_KEY:
        words = re.findall(r'\b\w{3,}\b', idea.lower())
        stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'your', 'have', 'from'}
        filtered_words = [word for word in words if word not in stop_words]
        return filtered_words[:5] if filtered_words else ["startup", "technology", "innovation"]
    
    # Use Groq API for better term extraction
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""Extract 3-5 precise technical and academic search terms from this startup idea: {idea}
    Focus on terms that would be effective for searching academic databases.
    Return ONLY the terms separated by commas, no explanations."""
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an expert research assistant. Extract precise academic search terms."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 50
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"].strip()
            terms = [term.strip().strip('"').strip("'") for term in content.split(",")]
            clean_terms = [term for term in terms if term and len(term) > 2 and not term.isdigit()]
            if clean_terms:
                return clean_terms[:5]
    except Exception as e:
        logger.warning(f"Error generating search terms with Groq: {e}")
    
    # Fallback
    words = re.findall(r'\b\w{3,}\b', idea.lower())
    stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'your', 'have', 'from'}
    filtered_words = [word for word in words if word not in stop_words]
    return filtered_words[:5] if filtered_words else ["startup", "technology", "innovation"]

async def fetch_semantic_scholar(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from Semantic Scholar"""
    try:
        query = " ".join(search_terms[:2])
        params = {
            "query": query,
            "limit": min(max_results, 10),
            "fields": "title,authors,abstract,year,url,externalIds",
            "sort": "relevance"
        }

        headers = {"User-Agent": "Research-Advisor-API/1.0"}
        if SEMANTIC_SCHOLAR_API_KEY:
            headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(SEMANTIC_SCHOLAR_API, params=params, headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"Semantic Scholar error {response.status_code}")
                return []
            
            data = response.json()
            papers = []
            
            for item in data.get("data", []):
                try:
                    title = item.get("title", "").strip()
                    if not title:
                        continue
                        
                    authors = [author.get("name", "") for author in item.get("authors", [])]
                    abstract = (item.get("abstract") or "")[:500] + "..." if item.get("abstract") else "No abstract available"
                    
                    papers.append(ResearchPaper(
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        published_date=str(item.get("year", "")),
                        source="Semantic Scholar",
                        url=item.get("url", ""),
                        doi=item.get("externalIds", {}).get("DOI")
                    ))
                except Exception as e:
                    logger.warning(f"Error processing Semantic Scholar paper: {e}")
                    continue
                    
            return papers
            
    except Exception as e:
        logger.warning(f"Semantic Scholar fetch failed: {e}")
        return []

def parse_arxiv_response(xml_text: str, max_results: int) -> List[ResearchPaper]:
    """Helper to parse arXiv XML into ResearchPaper objects"""
    try:
        root = ET.fromstring(xml_text)
        papers = []

        entries = root.findall('{http://www.w3.org/2005/Atom}entry')

        for entry in entries:
            try:
                title_elem = entry.find('{http://www.w3.org/2005/Atom}title')
                title = title_elem.text.strip() if title_elem is not None else "No title"

                summary_elem = entry.find('{http://www.w3.org/2005/Atom}summary')
                abstract = summary_elem.text.strip() if summary_elem is not None else "No abstract available"
                if len(abstract) > 500:
                    abstract = abstract[:500] + "..."

                authors = []
                for author_elem in entry.findall('{http://www.w3.org/2005/Atom}author'):
                    name_elem = author_elem.find('{http://www.w3.org/2005/Atom}name')
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text.strip())

                published_elem = entry.find('{http://www.w3.org/2005/Atom}published')
                published_date = published_elem.text if published_elem is not None else ""

                id_elem = entry.find('{http://www.w3.org/2005/Atom}id')
                url = id_elem.text if id_elem is not None else ""

                papers.append(ResearchPaper(
                    title=title,
                    authors=authors,
                    abstract=abstract,
                    published_date=published_date,
                    source="arXiv",
                    url=url
                ))

            except Exception as e:
                logger.warning(f"Error processing arXiv entry: {e}")
                continue

        return papers[:max_results]
        
    except ET.ParseError as e:
        logger.warning(f"XML parsing error: {e}")
        return []
    except Exception as e:
        logger.warning(f"Error parsing arXiv response: {e}")
        return []

async def fetch_arxiv(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from arXiv"""
    try:
        if not search_terms:
            return []

        query_terms = []
        for term in search_terms[:3]:
            words = term.split()[:2]
            for word in words:
                if len(word) > 2:
                    query_terms.append(word)
        
        query = " OR ".join(query_terms[:5])
        
        params = {
            "search_query": query,
            "start": 0,
            "max_results": min(max_results, 20),
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

        headers = {"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"}

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(ARXIV_API, params=params, headers=headers)

            if response.status_code != 200:
                logger.warning(f"arXiv error {response.status_code}")
                return []

            papers = parse_arxiv_response(response.text, max_results)

            if not papers:
                fallback_query = "machine learning OR neural network OR optimization"
                params["search_query"] = fallback_query
                response = await client.get(ARXIV_API, params=params, headers=headers)
                if response.status_code == 200:
                    papers = parse_arxiv_response(response.text, max_results)

            return papers[:max_results]

    except Exception as e:
        logger.warning(f"arXiv fetch failed: {e}")
        return []

async def fetch_crossref(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from CrossRef"""
    try:
        query = " ".join(search_terms[:2])
        params = {
            "query": query,
            "rows": min(max_results, 20),
            "sort": "relevance",
            "select": "title,author,abstract,created,URL,DOI,published-print,published-online"
        }
        
        headers = {"User-Agent": "Research-Advisor-API/1.0 (mailto:contact@researchadvisor.com)"}
        
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.get(CROSSREF_API, params=params, headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"CrossRef error {response.status_code}")
                return []
                
            data = response.json()
            papers = []
            
            for item in data.get("message", {}).get("items", []):
                try:
                    title_list = item.get("title", [])
                    title = " ".join(title_list) if isinstance(title_list, list) else str(title_list)
                    title = title.strip()
                    if not title:
                        continue
                    
                    abstract = item.get("abstract", "")
                    if not abstract:
                        abstract = "No abstract available"
                    if len(abstract) > 500:
                        abstract = abstract[:500] + "..."
                    
                    authors = []
                    for author in item.get("author", []):
                        given = author.get("given", "")
                        family = author.get("family", "")
                        author_name = f"{given} {family}".strip()
                        if author_name:
                            authors.append(author_name)
                    
                    pub_date = ""
                    date_fields = ["published-print", "published-online", "created"]
                    for field in date_fields:
                        if field in item and "date-parts" in item[field]:
                            date_parts = item[field]["date-parts"][0]
                            if date_parts:
                                pub_date = "-".join(str(part) for part in date_parts[:3])
                                break
                    
                    papers.append(ResearchPaper(
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        published_date=pub_date,
                        source="CrossRef",
                        url=item.get("URL", ""),
                        doi=item.get("DOI")
                    ))
                    
                except Exception as e:
                    logger.warning(f"Error processing CrossRef item: {e}")
                    continue
                    
            return papers
            
    except Exception as e:
        logger.warning(f"CrossRef fetch failed: {e}")
        return []

def save_team_search(user_id: str, search_data: dict) -> str:
    """Save a team search to the database"""
    try:
        search_doc = {
            "user_id": ObjectId(user_id),
            "search_criteria": search_data,
            "created_at": datetime.utcnow()
        }
        result = team_searches_collection.insert_one(search_doc)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error saving team search: {e}")
        raise HTTPException(status_code=500, detail="Failed to save search")

def calculate_profile_match_score(profile: dict, requirements: dict) -> tuple[int, List[str], List[str]]:
    """Calculate match score between profile and requirements"""
    score = 0
    total_criteria = 0
    matched_skills = []
    matched_interests = []
    
    # Skills matching (40% weight)
    if requirements.get("required_skills"):
        profile_skills = profile.get("skills", [])
        req_skills = requirements["required_skills"]
        
        for skill in profile_skills:
            for req_skill in req_skills:
                if (skill.lower() in req_skill.lower() or 
                    req_skill.lower() in skill.lower()):
                    if skill not in matched_skills:
                        matched_skills.append(skill)
        
        if req_skills:
            skill_match_ratio = len(matched_skills) / len(req_skills)
            score += skill_match_ratio * 40
        total_criteria += 40
    
    # Interests matching (25% weight)
    if requirements.get("interests"):
        profile_interests = profile.get("interests", [])
        req_interests = requirements["interests"]
        
        for interest in profile_interests:
            for req_interest in req_interests:
                if (interest.lower() in req_interest.lower() or 
                    req_interest.lower() in interest.lower()):
                    if interest not in matched_interests:
                        matched_interests.append(interest)
        
        if req_interests:
            interest_match_ratio = len(matched_interests) / len(req_interests)
            score += interest_match_ratio * 25
        total_criteria += 25
    
    # Experience matching (15% weight)
    if requirements.get("experience"):
        if profile.get("experience") == requirements["experience"]:
            score += 15
    total_criteria += 15
    
    # Availability matching (10% weight)
    if requirements.get("availability"):
        if profile.get("availability") == requirements["availability"]:
            score += 10
    total_criteria += 10
    
    # Preferred role matching (10% weight)
    if requirements.get("preferred_role"):
        profile_role = profile.get("preferred_role", "").lower()
        req_role = requirements["preferred_role"].lower()
        if req_role in profile_role:
            score += 10
    total_criteria += 10
    
    final_score = min(100, max(0, int((score / total_criteria) * 100)))
    return final_score, matched_skills, matched_interests

def find_matching_profiles(requirements: dict, exclude_user_id: str, limit: int = 10) -> List[dict]:
    """Find profiles matching the search requirements"""
    try:
        # Build MongoDB query
        query = {"user_id": {"$ne": ObjectId(exclude_user_id)}}
        
        # Get all profiles (we'll do matching in Python for more flexibility)
        profiles_cursor = profiles_collection.find(query)
        
        matched_profiles = []
        
        for profile in profiles_cursor:
            # Calculate match score
            match_score, matched_skills, matched_interests = calculate_profile_match_score(
                profile, requirements
            )
            
            # Only include profiles with decent match scores
            if match_score >= 30:
                # Get user details for this profile
                user = users_collection.find_one({"_id": profile["user_id"]})
                if user:
                    matched_profile = {
                        "id": str(profile["user_id"]),
                        "name": user.get("name", "Unknown"),
                        "email": user.get("email", ""),
                        "phone": profile.get("phone", ""),
                        "role": profile.get("role", ""),
                        "skills": profile.get("skills", []),
                        "interests": profile.get("interests", []),
                        "preferred_role": profile.get("preferred_role", ""),
                        "experience": profile.get("experience", ""),
                        "availability": profile.get("availability", ""),
                        "location": profile.get("location", ""),
                        "match_score": match_score,
                        "matched_skills": matched_skills,
                        "matched_interests": matched_interests
                    }
                    matched_profiles.append(matched_profile)
        
        # Sort by match score (highest first)
        matched_profiles.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Return top matches
        return matched_profiles[:limit]
        
    except Exception as e:
        print(f"Error finding matching profiles: {e}")
        return []
    
def create_connection(user_id: str, target_user_id: str) -> str:
    """Create a new connection between two users"""
    try:
        # Check if connection already exists
        existing = connections_collection.find_one({
            "user_id": ObjectId(user_id),
            "target_user_id": ObjectId(target_user_id)
        })
        
        if existing:
            # Update existing connection to connected
            connections_collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "status": "connected",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return str(existing["_id"])
        else:
            # Create new connection
            connection_doc = {
                "user_id": ObjectId(user_id),
                "target_user_id": ObjectId(target_user_id),
                "status": "connected",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            result = connections_collection.insert_one(connection_doc)
            return str(result.inserted_id)
            
    except Exception as e:
        print(f"Error creating connection: {e}")
        raise HTTPException(status_code=500, detail="Failed to create connection")

def remove_connection(user_id: str, target_user_id: str) -> bool:
    """Remove connection between two users"""
    try:
        result = connections_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "target_user_id": ObjectId(target_user_id)
            },
            {
                "$set": {
                    "status": "disconnected",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error removing connection: {e}")
        return False

def get_user_connections(user_id: str) -> List[str]:
    """Get list of connected user IDs for a user"""
    try:
        connections = connections_collection.find({
            "user_id": ObjectId(user_id),
            "status": "connected"
        })
        return [str(conn["target_user_id"]) for conn in connections]
    except Exception as e:
        print(f"Error getting connections: {e}")
        return []

def check_connection_status(user_id: str, target_user_id: str) -> str:
    """Check if two users are connected"""
    try:
        connection = connections_collection.find_one({
            "user_id": ObjectId(user_id),
            "target_user_id": ObjectId(target_user_id)
        })
        
        if connection:
            return connection.get("status", "disconnected")
        return "disconnected"
    except Exception as e:
        print(f"Error checking connection status: {e}")
        return "disconnected"


# ==========================================
# API ENDPOINTS
# ==========================================

# Authentication Endpoints
@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: RegisterIn):
    """Register a new user"""
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    hashed = hash_password(user.password)
    doc = {
        "name": user.name,
        "email": user.email.lower(),
        "password_hash": hashed,
        "created_at": datetime.utcnow()
    }
    try:
        res = users_collection.insert_one(doc)
        return {"id": str(res.inserted_id), "email": user.email}
    except errors.DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/login", response_model=TokenOut)
def login(credentials: LoginIn):
    """User login"""
    user = users_collection.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = "developer" if credentials.email.lower() in DEVELOPER_EMAILS else "user"
    token = create_access_token_helper(subject=str(user["_id"]), role=role)
    return {"access_token": token}

# Profile Endpoints
@app.post("/profile", response_model=ProfileResponse)
async def create_or_update_profile(
    profile: ProfileCreate,
    current_user=Depends(get_current_user)
):
    """Create or update user profile"""
    profile_data = profile.dict()
    profile_data.update({
        "user_id": current_user["_id"],
        "updated_at": datetime.utcnow()
    })
    
    try:
        update_user_profile(str(current_user["_id"]), profile_data)
        updated_profile = get_user_profile(str(current_user["_id"]))
        if not updated_profile:
            raise HTTPException(status_code=400, detail="Profile not saved correctly")
        updated_profile["user_id"] = str(updated_profile["user_id"])
        return updated_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user=Depends(get_current_user)):
    """Get user profile"""
    profile = get_user_profile(str(current_user["_id"]))
    if not profile:
        profile = {
            "user_id": current_user["_id"],
            "name": current_user.get("name", "New User"),
            "email": current_user.get("email", ""),
            "updated_at": datetime.utcnow()
        }
        update_user_profile(str(current_user["_id"]), profile)
    profile["user_id"] = str(profile["user_id"])
    return profile

# Enhanced Idea Validation Endpoint
@app.post("/validate-idea", response_model=ValidationResponse)
async def validate_idea(idea: IdeaInput, current_user=Depends(get_optional_current_user)):
    """Enhanced idea validation with optional authentication for database storage"""
    logger.info(f"Validation request received: {idea.prompt[:50]}...")
    
    try:
        # Get AI validation
        ai_result = call_groq_validation(idea.prompt)
        logger.info("AI validation completed")
        
        # Structure the response
        validation_response = ValidationResponse(
            prompt=idea.prompt,
            validation=ValidationDetails(
                verdict=ai_result["analysis"]["verdict"],
                feasibility=ai_result["analysis"]["feasibility"],
                marketDemand=ai_result["analysis"]["market_demand"],
                uniqueness=ai_result["analysis"]["uniqueness"],
                strength=ai_result["analysis"]["strength"],
                riskFactors=ai_result["analysis"]["risk_factors"],
                riskMitigation=ai_result["analysis"].get("risk_mitigation", "Strategic risk mitigation approaches recommended."),
                existingCompetitors=ai_result["analysis"]["existing_competitors"],
                competitors=[
                    CompetitorInfo(name=comp["name"], url=comp["url"]) 
                    for comp in ai_result["analysis"].get("competitors", [])
                ]
            ),
            scores=ValidationScores(
                overall=ai_result["overall_score"],
                feasibility=ai_result["scores"]["feasibility"],
                marketDemand=ai_result["scores"]["market_demand"],
                uniqueness=ai_result["scores"]["uniqueness"],
                strength=ai_result["scores"]["strength"],
                riskFactors=ai_result["scores"]["risk_factors"]
            ),
            suggestions=Suggestions(
                critical=ai_result["suggestions"]["critical"],
                recommended=ai_result["suggestions"]["recommended"],
                optional=ai_result["suggestions"]["optional"]
            ),
            created_at=datetime.utcnow()
        )
        
        # Save to database if user is authenticated
        if current_user:
            try:
                user_id = str(current_user["_id"])
                logger.info(f"Saving idea validation for user: {current_user.get('email')}")
                
                # Prepare data for database
                idea_data = {
                    "prompt": idea.prompt,
                    "validation": validation_response.validation.dict(),
                    "scores": validation_response.scores.dict(),
                    "suggestions": validation_response.suggestions.dict()
                }
                
                # Save to database
                saved_id = save_idea_validation(user_id, idea_data)
                logger.info(f"Idea saved with ID: {saved_id}")
                
            except Exception as e:
                logger.error(f"Database save error: {e}")
                # Continue anyway - validation still works without saving
        else:
            logger.info("No authenticated user - not saving to database")
        
        return validation_response
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

# Enhanced Roadmap Generation Endpoint
@app.post("/generate-roadmap", response_model=RoadmapResponse)
async def generate_roadmap(roadmap_input: RoadmapInput, current_user=Depends(get_optional_current_user)):
    """Enhanced roadmap generation with optional authentication for database storage"""
    logger.info(f"Roadmap request received: {roadmap_input.prompt[:50]}...")
    
    try:
        # Get AI roadmap generation
        ai_result = call_groq_roadmap(roadmap_input.prompt, roadmap_input.timeframe)
        logger.info("AI roadmap generation completed")
        
        # Default values for anonymous users
        user_id = "anonymous"
        roadmap_id = str(uuid.uuid4())
        phases = ai_result.get("phases") or create_default_phases(roadmap_input.timeframe)

        # Save to database if user is authenticated
        if current_user:
            try:
                user_id = str(current_user["_id"])
                logger.info(f"Saving roadmap for user: {current_user.get('email')}")
                
                # Prepare roadmap data
                roadmap_data = {
                    "prompt": roadmap_input.prompt,
                    "timeframe": roadmap_input.timeframe,
                    "roadmap": {
                        "overview": ai_result.get("overview", "No overview provided"),
                        "phases": phases
                    }
                }
                
                # Save to database
                roadmap_id = create_roadmap(user_id, roadmap_data)
                logger.info(f"Roadmap saved with ID: {roadmap_id}")
                
            except Exception as e:
                logger.error(f"Database save error: {e}")
                # Continue anyway - roadmap still works without saving
        else:
            logger.info("No authenticated user - using anonymous defaults")

        # Return response
        return RoadmapResponse(
            id=roadmap_id,
            prompt=roadmap_input.prompt,
            timeframe=roadmap_input.timeframe,
            roadmap=RoadmapStructure(
                overview=ai_result.get("overview", "No overview provided"),
                phases=[
                    RoadmapPhase(
                        title=phase.get("title", "No title"),
                        timeframe=phase.get("timeframe", "Varies"),
                        description=phase.get("description", ""),
                        tasks=phase.get("tasks", []),
                        implementation=phase.get("implementation", []),
                        resources=phase.get("resources", []),
                        team=phase.get("team", []),
                        challenges=phase.get("challenges", [])
                    )
                    for phase in phases
                ]
            ),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            user_id=user_id
        )

    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {str(e)}")

# Research Papers Endpoint
@app.post("/research-papers", response_model=ResearchResponse)
async def get_research_papers(request: ResearchRequest, current_user=Depends(get_optional_current_user)) -> ResearchResponse:
    """Fetch research papers with optional user authentication for saving"""
    logger.info(f"Research request received: {request.idea[:50]}...")
    
    # Input validation
    if not request.idea or not request.idea.strip():
        raise HTTPException(status_code=400, detail="Idea cannot be empty")
    
    try:
        # Generate search terms
        search_terms = generate_search_terms(request.idea)
        if not search_terms:
            search_terms = [request.idea]
        
        logger.info(f"Generated search terms: {search_terms}")
        
        # Concurrently fetch papers from all sources
        tasks = [
            fetch_semantic_scholar(search_terms, request.max_results),
            fetch_arxiv(search_terms, request.max_results),
            fetch_crossref(search_terms, request.max_results)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_papers: List[ResearchPaper] = []
        source_names = ["Semantic Scholar", "arXiv", "CrossRef"]
        
        for i, result in enumerate(results):
            source_name = source_names[i]
            if isinstance(result, Exception):
                logger.warning(f"{source_name} failed with error: {result}")
            elif isinstance(result, list):
                for paper in result:
                    if isinstance(paper, ResearchPaper):
                        all_papers.append(paper)
        
        logger.info(f"Total papers fetched: {len(all_papers)}")
        
        # Deduplicate papers
        unique_papers: List[ResearchPaper] = []
        seen_titles: Set[str] = set()
        
        for paper in all_papers:
            if not paper.title or not paper.title.strip():
                continue
            
            normalized_title = re.sub(r'[^\w\s]', '', paper.title.lower())
            normalized_title = re.sub(r'\s+', ' ', normalized_title).strip()
            
            if normalized_title and normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_papers.append(paper)
        
        # Limit final results
        final_papers = unique_papers[:request.max_results]
        logger.info(f"Final result: {len(final_papers)} curated papers")
        
        research_id = "anonymous"
        
        # Save to database if user is authenticated
        if current_user and final_papers:
            try:
                user_id = str(current_user["_id"])
                logger.info(f"Saving research for user: {current_user.get('email')}")
                
                paper_data_list = [p.dict() for p in final_papers]
                research_doc = {
                    "idea": request.idea,
                    "search_terms": search_terms,
                    "papers": paper_data_list,
                }
                research_id = save_research(user_id, research_doc)
                logger.info(f"Research saved with ID: {research_id}")
            except Exception as e:
                logger.error(f"Database save error: {e}")
                # Continue anyway - research still works without saving
        
        return ResearchResponse(
            papers=final_papers,
            search_terms=search_terms,
            research_id=research_id,
            created_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Research papers endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch research papers: {str(e)}")

# User Data Endpoints
@app.get("/user/ideas")
async def get_my_ideas(current_user=Depends(get_current_user)):
    """Get user's idea validation history"""
    try:
        user_id = str(current_user["_id"])
        ideas = get_user_ideas(user_id)
        return {"ideas": ideas, "total": len(ideas)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ideas: {str(e)}")

@app.get("/user/research")
async def get_my_research(current_user=Depends(get_current_user)):
    """Get user's research history"""
    try:
        user_id = str(current_user["_id"])
        research = get_user_research_history(user_id)
        return {"research": research, "total": len(research)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch research: {str(e)}")

@app.get("/user/roadmaps")
async def get_my_roadmaps(current_user=Depends(get_current_user)):
    """Get user's roadmaps"""
    try:
        user_id = str(current_user["_id"])
        roadmaps = get_user_roadmaps(user_id)
        return {"roadmaps": roadmaps, "total": len(roadmaps)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch roadmaps: {str(e)}")

@app.get("/user/activity")
async def get_user_activity_summary(current_user=Depends(get_current_user)):
    """Get user activity summary"""
    try:
        user_id = str(current_user["_id"])
        activity = get_user_stats(user_id)
        return activity
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {str(e)}")

@app.get("/user/export")
async def export_my_data(current_user=Depends(get_current_user)):
    """Export all user data (GDPR compliance)"""
    try:
        user_id = str(current_user["_id"])
        
        export_data = {
            "user_info": {
                "id": user_id,
                "name": current_user.get("name"),
                "email": current_user.get("email"),
                "created_at": current_user.get("created_at")
            },
            "profile": get_user_profile(user_id),
            "ideas": get_user_ideas(user_id, limit=100),
            "roadmaps": get_user_roadmaps(user_id),
            "research": get_user_research_history(user_id, limit=100),
            "activity_stats": get_user_stats(user_id),
            "exported_at": datetime.utcnow().isoformat()
        }
        
        # Convert ObjectIds to strings for JSON serialization
        def convert_objectid(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: convert_objectid(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_objectid(item) for item in obj]
            else:
                return obj
        
        export_data = convert_objectid(export_data)
        
        return {"data": export_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data export failed: {str(e)}")

@app.delete("/user/data")
async def delete_my_data(current_user=Depends(get_current_user)):
    """Delete all user data (GDPR compliance)"""
    try:
        user_id = str(current_user["_id"])
        success = delete_user_data(user_id)
        if success:
            return {"message": "All user data deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data deletion failed: {str(e)}")

# Dashboard endpoint for developers
@app.get("/dashboard-data")
def get_dashboard_data(current_user=Depends(get_current_user)):
    """Get dashboard data for developers"""
    if current_user.get("email") != "ry352004@gmail.com":
        raise HTTPException(status_code=403, detail="Access forbidden.")

    try:
        # Summary stats counts
        total_users = users_collection.count_documents({"email": {"$ne": "ry352004@gmail.com"}})
        ideas_validated = ideas_collection.count_documents({})
        roadmaps_generated = roadmaps_collection.count_documents({})
        researches_conducted = research_collection.count_documents({})

        # Date boundary for last month
        one_month_ago = datetime.utcnow() - timedelta(days=30)

        # Last month counts
        last_month_users = users_collection.count_documents({
            "created_at": {"$gte": one_month_ago},
            "email": {"$ne": "ry352004@gmail.com"}
        })
        last_month_ideas = ideas_collection.count_documents({"created_at": {"$gte": one_month_ago}})
        last_month_roadmaps = roadmaps_collection.count_documents({"created_at": {"$gte": one_month_ago}})
        last_month_researches = research_collection.count_documents({"created_at": {"$gte": one_month_ago}})

        # Helper to compute percentage growth safely
        def percentage_change(current, previous):
            if previous == 0:
                return "100" if current > 0 else "0"
            return f"{((current - previous) / previous) * 100:.0f}"

        stats = {
            "total_users": total_users,
            "total_users_change": percentage_change(total_users, total_users - last_month_users),
            "ideas_validated": ideas_validated,
            "ideas_validated_change": percentage_change(ideas_validated, ideas_validated - last_month_ideas),
            "roadmaps_generated": roadmaps_generated,
            "roadmaps_generated_change": percentage_change(roadmaps_generated, roadmaps_generated - last_month_roadmaps),
            "researches_conducted": researches_conducted,
            "researches_conducted_change": percentage_change(researches_conducted, researches_conducted - last_month_researches),
        }

        # Build users list
        users_cursor = users_collection.find({"email": {"$ne": "ry352004@gmail.com"}})
        users_list = []

        for user in users_cursor:
            user_id = user["_id"]
            user_id_str = str(user_id)

            # Get profile
            profile = profiles_collection.find_one({"user_id": user_id}) or {}

            # Get counts
            user_ideas_count = ideas_collection.count_documents({"user_id": user_id})
            user_roadmaps_count = roadmaps_collection.count_documents({"user_id": user_id})
            user_researches_count = research_collection.count_documents({"user_id": user_id})

            # Get recent validations
            validations = list(ideas_collection.find(
                {"user_id": user_id},
                {"_id": 0, "prompt": 1, "validation": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5))

            users_list.append({
                "id": user_id_str,
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "created_at": user.get("created_at", datetime.utcnow()).isoformat(),
                "status": "Active",
                "roadmaps_count": user_roadmaps_count,
                "researches_count": user_researches_count,
                "ideas_count": user_ideas_count,
                "profile_data": {
                    "skills": profile.get("skills", []),
                    "interests": profile.get("interests", []),
                    "experience": profile.get("experience", ""),
                    "availability": profile.get("availability", ""),
                    "location": profile.get("location", ""),
                    "preferred_role": profile.get("preferred_role", ""),
                    "updated_at": profile.get("updated_at", datetime.utcnow()).isoformat() if profile.get("updated_at") else None
                },
                "validation_history": [
                    {
                        "prompt": v["prompt"],
                        "validation": v["validation"],
                        "created_at": v["created_at"].isoformat() if v.get("created_at") else None
                    } for v in validations
                ]
            })

        return {
            "stats": stats,
            "users": users_list
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Health Check and Root Endpoints
@app.get("/")
def root():
    return {
        "message": "Startup GPS API is running successfully!",
        "status": "healthy",
        "version": "2.0.0",
        "features": [
            "Idea Validation",
            "Research Papers",
            "Roadmap Generation", 
            "User Management"
        ]
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected",
            "groq_api": "configured" if GROQ_API_KEY else "not_configured",
            "semantic_scholar": "configured" if SEMANTIC_SCHOLAR_API_KEY else "not_configured"
        }
    }

# Debug endpoints for testing
@app.post("/test-validation-save")
async def test_validation_save(current_user=Depends(get_current_user)):
    """Test endpoint to verify idea validation saving works"""
    try:
        user_id = str(current_user["_id"])
        
        # Create test idea validation data
        test_idea_data = {
            "prompt": "Test idea validation for database saving",
            "validation": {
                "verdict": "This is a test validation",
                "feasibility": "Test feasibility analysis",
                "marketDemand": "Test market demand analysis",
                "uniqueness": "Test uniqueness analysis", 
                "strength": "Test strength analysis",
                "riskFactors": "Test risk factors analysis",
                "existingCompetitors": "Test competitors analysis"
            },
            "scores": {
                "overall": 85,
                "feasibility": 80,
                "marketDemand": 90,
                "uniqueness": 75,
                "strength": 88,
                "riskFactors": 82
            },
            "suggestions": {
                "critical": ["Test critical suggestion 1", "Test critical suggestion 2"],
                "recommended": ["Test recommended suggestion 1", "Test recommended suggestion 2"],
                "optional": ["Test optional suggestion 1"]
            }
        }
        
        # Save to database
        saved_id = save_idea_validation(user_id, test_idea_data)
        
        # Verify it was saved
        saved_doc = ideas_collection.find_one({"_id": ObjectId(saved_id)})
        
        return {
            "success": True,
            "saved_id": saved_id,
            "user_id": user_id,
            "user_email": current_user.get("email"),
            "verification": "Found in database" if saved_doc else "NOT found in database",
            "saved_doc_keys": list(saved_doc.keys()) if saved_doc else None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "user_id": str(current_user["_id"]) if current_user else None
        }

# Add this to your main.py file after your existing imports and before the endpoints


# Initialize enhanced chatbot (add this after your app initialization)
enhanced_chatbot_system = StartupGPSChatbotEnhanced(GROQ_API_KEY)

# Add this new enhanced chatbot endpoint to your main.py

@app.post("/chat")
async def enhanced_startup_gps_chat(
    message_data: dict,
    current_user=Depends(get_optional_current_user)
):
    """
    Enhanced chatbot endpoint that provides comprehensive explanations 
    of all Startup GPS platform features using data from main.py
    """
    try:
        message = message_data.get("message", "").strip()
        
        if not message:
            return {
                "reply": "Hello! I'm your Startup GPS AI assistant. I can provide comprehensive explanations about all our platform features including idea validation, research papers, roadmap generation, user management, and technical integrations. What would you like to know about?",
                "intent": "greeting",
                "follow_ups": [
                    "What is Startup GPS?",
                    "How does idea validation work?",
                    "Explain all your features",
                    "Show me technical capabilities"
                ],
                "session_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
                "confidence": 1.0,
                "source": "startup_gps_enhanced_ai"
            }
        
        # Check message length
        if len(message) > 2000:
            return {
                "reply": "Please keep your message under 2000 characters. I'm here to provide detailed explanations about all Startup GPS features - just ask about any specific capability you'd like to understand!",
                "intent": "error",
                "follow_ups": [
                    "Explain idea validation",
                    "How does research work?",
                    "Tell me about roadmaps",
                    "Show me all features"
                ]
            }
        
        # Get comprehensive response from enhanced chatbot
        response_data = enhanced_chatbot_system.get_comprehensive_response(message)
        
        # Add user context if authenticated
        user_context = ""
        if current_user:
            user_context = f" (User: {current_user.get('name', 'User')})"
        
        # Enhance response with real platform data
        enhanced_response = enhance_response_with_platform_data(
            response_data["response"], 
            message.lower(),
            current_user
        )
        
        return {
            "reply": enhanced_response,
            "intent": response_data["intent"],
            "follow_ups": response_data.get("follow_ups", []),
            "session_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": 0.95,
            "source": "startup_gps_enhanced_ai" + user_context,
            "user_authenticated": current_user is not None
        }
        
    except Exception as e:
        logger.error(f"Enhanced chat error: {e}")
        return {
            "reply": f"I encountered a technical issue, but I'm still here to help! Startup GPS offers comprehensive startup assistance with AI-powered idea validation, multi-source research paper access, strategic roadmap generation, secure user management, and developer-friendly APIs. What specific feature would you like to learn about?",
            "intent": "error",
            "follow_ups": [
                "Explain idea validation process",
                "How does research paper search work?",
                "Tell me about roadmap generation",
                "Show me user management features"
            ],
            "session_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": 0.8,
            "source": "startup_gps_fallback",
            "error": str(e)
        }

def enhance_response_with_platform_data(base_response: str, query_lower: str, current_user=None) -> str:
    """
    Enhance chatbot responses with real data from the platform
    """
    
    # Add real statistics and data
    try:
        # Get real platform statistics
        total_users = users_collection.count_documents({}) if users_collection else 0
        total_ideas = ideas_collection.count_documents({}) if ideas_collection else 0
        total_roadmaps = roadmaps_collection.count_documents({}) if roadmaps_collection else 0
        total_research = research_collection.count_documents({}) if research_collection else 0
        
        # Add real numbers to responses about platform capabilities
        if any(term in query_lower for term in ["platform", "features", "capabilities", "what is startup gps"]):
            stats_addition = f"""

## Real Platform Statistics (Live Data)
- **{total_users} registered users** actively using our platform
- **{total_ideas} startup ideas validated** with comprehensive AI analysis
- **{total_roadmaps} strategic roadmaps generated** with phase-by-phase planning
- **{total_research} research compilations created** from academic databases

"""
            base_response += stats_addition
        
        # Add user-specific data if authenticated
        if current_user and any(term in query_lower for term in ["my", "user", "account", "profile"]):
            try:
                user_id = str(current_user["_id"])
                user_stats = get_user_stats(user_id)
                
                user_addition = f"""

## Your Startup GPS Activity
- **{user_stats.get('ideas', 0)} ideas validated** in your account
- **{user_stats.get('roadmaps', 0)} roadmaps generated** for your projects  
- **{user_stats.get('research', 0)} research compilations** in your history
- **Account created:** {current_user.get('created_at', 'Recently').strftime('%B %Y') if isinstance(current_user.get('created_at'), datetime) else 'Recently'}

You can access all your data via the user dashboard or export it anytime for GDPR compliance.
"""
                base_response += user_addition
                
            except Exception as e:
                logger.warning(f"Could not add user stats: {e}")
        
        # Add real endpoint information for technical queries
        if any(term in query_lower for term in ["api", "endpoint", "technical", "integration"]):
            endpoint_addition = f"""

## Live API Endpoints (Currently Active)
```
Base URL: {os.getenv('API_BASE_URL', 'http://localhost:8000')}

POST /validate-idea - AI idea validation (Active: {GROQ_API_KEY is not None})
POST /research-papers - Multi-source research (Active: True)
POST /generate-roadmap - Strategic planning (Active: {GROQ_API_KEY is not None})
POST /register - User registration (Active: True)
POST /login - Authentication (Active: True)
GET /user/ideas - Your validation history (Active: True)
GET /user/roadmaps - Your roadmap history (Active: True)
GET /health - System status (Active: True)
```

**Current System Status:**
- Database: {'Connected' if users_collection else 'Disconnected'}
- GROQ AI: {'Configured' if GROQ_API_KEY else 'Not Configured'}
- Research APIs: Active (Semantic Scholar, arXiv, CrossRef)
"""
            base_response += endpoint_addition
        
    except Exception as e:
        logger.warning(f"Could not enhance response with platform data: {e}")
    
    return base_response

@app.get("/chat/platform-info")
async def get_chatbot_platform_info(current_user=Depends(get_optional_current_user)):
    """
    Get comprehensive platform information for the chatbot system
    """
    try:
        # Real platform statistics
        stats = {
            "total_users": users_collection.count_documents({}),
            "total_ideas": ideas_collection.count_documents({}),
            "total_roadmaps": roadmaps_collection.count_documents({}), 
            "total_research": research_collection.count_documents({}),
            "system_status": {
                "database": "connected",
                "groq_ai": "configured" if GROQ_API_KEY else "not_configured",
                "research_apis": "active"
            }
        }
        
        # User-specific data if authenticated
        user_data = None
        if current_user:
            user_id = str(current_user["_id"])
            user_data = {
                "user_stats": get_user_stats(user_id),
                "profile_exists": get_user_profile(user_id) is not None,
                "member_since": current_user.get("created_at")
            }
        
        # Available features with real implementation status
        features = {
            "idea_validation": {
                "active": GROQ_API_KEY is not None,
                "endpoint": "/validate-idea",
                "description": "AI-powered comprehensive startup idea validation"
            },
            "research_papers": {
                "active": True,
                "endpoint": "/research-papers", 
                "description": "Multi-source academic research compilation"
            },
            "roadmap_generation": {
                "active": GROQ_API_KEY is not None,
                "endpoint": "/generate-roadmap",
                "description": "Strategic roadmap generation with phase planning"
            },
            "user_management": {
                "active": True,
                "endpoints": ["/register", "/login", "/profile"],
                "description": "Secure user accounts with GDPR compliance"
            }
        }
        
        return {
            "platform_stats": stats,
            "user_data": user_data,
            "features": features,
            "chatbot_capabilities": [
                "Comprehensive platform feature explanations",
                "Real-time data integration",
                "User-specific information",
                "Technical implementation details",
                "API documentation and examples"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting platform info: {e}")
        return {
            "error": "Could not retrieve platform information",
            "basic_features": [
                "AI idea validation", 
                "Academic research search",
                "Strategic roadmap generation",
                "User account management"
            ]
        }

# Health check for chatbot system
@app.get("/health/chatbot")
async def chatbot_health_check():
    """Health check specifically for the enhanced chatbot system"""
    try:
        # Test enhanced chatbot initialization
        test_response = enhanced_chatbot_system.get_comprehensive_response("test")
        
        return {
            "status": "healthy",
            "chatbot_system": "enhanced_startup_gps_ai",
            "capabilities": {
                "platform_knowledge": "comprehensive",
                "real_data_integration": True,
                "user_context_aware": True,
                "feature_explanations": "detailed"
            },
            "components": {
                "enhanced_chatbot": "active",
                "groq_integration": "configured" if GROQ_API_KEY else "missing_api_key",
                "database_integration": "connected",
                "platform_data_access": "active"
            },
            "test_response_length": len(test_response.get("response", "")),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "fallback_available": True,
            "basic_functionality": "available"
        }

# Optional: Add conversation history tracking
@app.post("/chat/session")
async def create_chat_session(current_user=Depends(get_optional_current_user)):
    """Create a new chat session with context tracking"""
    session_id = str(uuid.uuid4())
    
    # Initialize with welcome message that explains all platform capabilities
    welcome_message = """Welcome to Startup GPS! I'm your comprehensive AI assistant that can explain every aspect of our platform in detail.

**I can provide complete explanations about:**

🤖 **AI-Powered Idea Validation**
- How our 6-dimension scoring system works
- Real competitor analysis and identification
- Technical implementation using GROQ AI
- Data structures and response formats

📚 **Academic Research Integration** 
- Multi-source search across 10M+ papers
- Semantic Scholar, arXiv, and CrossRef APIs
- Smart deduplication and relevance ranking
- Concurrent async processing architecture

🗺️ **Strategic Roadmap Generation**
- Phase-by-phase planning methodology  
- Timeframe-specific optimization
- Team and resource allocation
- Challenge identification and mitigation

👥 **User Management System**
- Secure JWT authentication
- GDPR-compliant data handling
- Profile management and activity tracking
- Complete data export capabilities

🛠️ **Technical Architecture**
- FastAPI REST API implementation
- MongoDB database schema
- Security measures and error handling
- Integration examples and documentation

Just ask me about any feature and I'll provide comprehensive technical details, usage examples, and implementation insights directly from our platform!"""

    return {
        "session_id": session_id,
        "welcome_message": welcome_message,
        "user_authenticated": current_user is not None,
        "available_features": [
            "Detailed idea validation explanation",
            "Research paper system architecture", 
            "Roadmap generation process",
            "User management features",
            "Technical API documentation",
            "Real-time platform statistics"
        ],
        "suggested_queries": [
            "How does idea validation work exactly?",
            "Explain the research paper search system",
            "Show me the roadmap generation process", 
            "Tell me about user accounts and security",
            "What technical APIs are available?",
            "Give me the complete platform overview"
        ]
    }

# Add this function to your existing route handlers section
@app.get("/chat/examples")
async def get_chatbot_examples():
    """Get example conversations showing chatbot capabilities"""
    return {
        "examples": [
            {
                "query": "How does idea validation work?",
                "response_type": "Comprehensive technical explanation",
                "includes": [
                    "6-dimension scoring breakdown",
                    "AI model implementation details",
                    "Competitor analysis methodology", 
                    "Data structure specifications",
                    "Usage examples with code"
                ]
            },
            {
                "query": "Explain the research paper feature", 
                "response_type": "Multi-source integration details",
                "includes": [
                    "Database sources and API endpoints",
                    "Async processing architecture",
                    "Deduplication algorithms",
                    "Search term generation process",
                    "Response parsing and curation"
                ]
            },
            {
                "query": "Tell me about roadmap generation",
                "response_type": "Strategic planning system overview", 
                "includes": [
                    "Phase-by-phase methodology",
                    "Timeframe optimization strategies",
                    "AI prompt engineering approach",
                    "Database persistence handling",
                    "Fallback and error recovery"
                ]
            },
            {
                "query": "What is Startup GPS?",
                "response_type": "Complete platform overview",
                "includes": [
                    "All feature explanations",
                    "Technical architecture details", 
                    "Real usage statistics",
                    "User management capabilities",
                    "Developer integration guide"
                ]
            }
        ],
        "capabilities": [
            "Pulls real data from your main.py implementation",
            "Explains technical implementation details", 
            "Provides usage examples and code snippets",
            "Shows current system status and statistics",
            "Adapts responses based on user authentication",
            "Includes follow-up suggestions for deeper exploration"
        ]
    }

# Usage instructions for integration
"""
INTEGRATION INSTRUCTIONS:

1. Add the enhanced_chatbot_integration.py file to your project directory

2. Add these imports at the top of your main.py:
   from enhanced_chatbot_integration import StartupGPSChatbotEnhanced

3. Initialize the enhanced chatbot after your app creation:
   enhanced_chatbot_system = StartupGPSChatbotEnhanced(GROQ_API_KEY)

4. Add all the endpoint functions above to your main.py

5. Test the integration:
   - Start your server: uvicorn main:app --reload
   - Test the chatbot: POST http://localhost:8000/chat
   - Check health: GET http://localhost:8000/health/chatbot
   - Get platform info: GET http://localhost:8000/chat/platform-info

6. Update your frontend Help.tsx to use the new /chat endpoint

The enhanced chatbot will now:
- Provide comprehensive explanations of all your platform features
- Use real data from your database and APIs
- Explain technical implementation details
- Show usage examples and code snippets
- Adapt responses based on user authentication
- Include current system status and statistics

Example chat queries that will work:
- "What is Startup GPS and what can it do?"
- "How does idea validation work exactly?" 
- "Explain the research paper system in detail"
- "Tell me about roadmap generation"
- "Show me the technical API architecture"
- "What are all your features and capabilities?"
"""

@app.get("/debug/check-collections")
async def check_collections(current_user=Depends(get_current_user)):
    """Debug endpoint to check what's in the database collections"""
    try:
        user_id = str(current_user["_id"])
        user_obj_id = ObjectId(user_id)
        
        # Check ideas collection
        user_ideas = list(ideas_collection.find({"user_id": user_obj_id}).limit(5))
        for idea in user_ideas:
            idea["_id"] = str(idea["_id"])
            idea["user_id"] = str(idea["user_id"])
        
        # Check roadmaps collection  
        user_roadmaps = list(roadmaps_collection.find({"user_id": user_obj_id}).limit(5))
        for roadmap in user_roadmaps:
            roadmap["_id"] = str(roadmap["_id"])
            roadmap["user_id"] = str(roadmap["user_id"])
        
        # Check total counts
        total_ideas = ideas_collection.count_documents({})
        total_roadmaps = roadmaps_collection.count_documents({})
        user_ideas_count = ideas_collection.count_documents({"user_id": user_obj_id})
        user_roadmaps_count = roadmaps_collection.count_documents({"user_id": user_obj_id})
        
        return {
            "user_info": {
                "user_id": user_id,
                "email": current_user.get("email"),
                "name": current_user.get("name")
            },
            "collections_status": {
                "total_ideas": total_ideas,
                "total_roadmaps": total_roadmaps,
                "user_ideas_count": user_ideas_count,
                "user_roadmaps_count": user_roadmaps_count
            },
            "recent_user_data": {
                "ideas": user_ideas,
                "roadmaps": user_roadmaps
            }
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "user_id": str(current_user["_id"]) if current_user else None
        }
    
@app.post("/api/connections", response_model=ConnectionResponse)
async def create_user_connection(
    connection_request: ConnectionRequest,
    current_user=Depends(get_current_user)
):
    """Create a connection with another user"""
    try:
        user_id = str(current_user["_id"])
        target_user_id = connection_request.target_user_id
        
        # Validate target user exists
        target_user = users_collection.find_one({"_id": ObjectId(target_user_id)})
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # Can't connect to yourself
        if user_id == target_user_id:
            raise HTTPException(status_code=400, detail="Cannot connect to yourself")
        
        connection_id = create_connection(user_id, target_user_id)
        
        return ConnectionResponse(
            id=connection_id,
            user_id=user_id,
            target_user_id=target_user_id,
            status="connected",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create connection: {str(e)}")

@app.delete("/api/connections/{target_user_id}")
async def remove_user_connection(
    target_user_id: str,
    current_user=Depends(get_current_user)
):
    """Remove a connection with another user"""
    try:
        user_id = str(current_user["_id"])
        
        success = remove_connection(user_id, target_user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        return {"message": "Connection removed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove connection: {str(e)}")

@app.get("/api/connections")
async def get_my_connections(current_user=Depends(get_current_user)):
    """Get user's connections with full profile data"""
    try:
        user_id = str(current_user["_id"])
        connected_user_ids = get_user_connections(user_id)
        
        # Get full profile data for connected users
        connected_profiles = []
        
        for target_user_id in connected_user_ids:
            # Get user details
            user = users_collection.find_one({"_id": ObjectId(target_user_id)})
            if user:
                # Get profile details
                profile = profiles_collection.find_one({"user_id": ObjectId(target_user_id)}) or {}
                
                profile_data = {
                    "id": target_user_id,
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", ""),
                    "phone": profile.get("phone", ""),
                    "role": profile.get("role", ""),
                    "skills": profile.get("skills", []),
                    "interests": profile.get("interests", []),
                    "preferred_role": profile.get("preferred_role", ""),
                    "experience": profile.get("experience", ""),
                    "availability": profile.get("availability", ""),
                    "location": profile.get("location", ""),
                    "connection_status": "connected"
                }
                connected_profiles.append(profile_data)
        
        return {"connections": connected_profiles}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch connections: {str(e)}")


# Update the existing get_all_profiles endpoint to include connection status
@app.get("/api/profiles/all")
async def get_all_profiles(current_user=Depends(get_current_user)):
    """Get all profiles with connection status"""
    try:
        user_id = str(current_user["_id"])
        
        # Get user's connections
        connected_user_ids = get_user_connections(user_id)
        
        # Get all profiles except current user
        query = {"user_id": {"$ne": ObjectId(user_id)}}
        profiles_cursor = profiles_collection.find(query)
        
        profiles = []
        for profile in profiles_cursor:
            # Get user details
            user = users_collection.find_one({"_id": profile["user_id"]})
            if user:
                profile_id = str(profile["user_id"])
                connection_status = "connected" if profile_id in connected_user_ids else "disconnected"
                
                profile_data = {
                    "id": profile_id,
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", ""),
                    "phone": profile.get("phone", ""),
                    "role": profile.get("role", ""),
                    "skills": profile.get("skills", []),
                    "interests": profile.get("interests", []),
                    "preferred_role": profile.get("preferred_role", ""),
                    "experience": profile.get("experience", ""),
                    "availability": profile.get("availability", ""),
                    "location": profile.get("location", ""),
                    "connection_status": connection_status
                }
                profiles.append(profile_data)
        
        return {"profiles": profiles}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profiles: {str(e)}")

@app.post("/api/team-searches", response_model=TeamSearchResponse)
async def create_team_search(
    search_input: TeamSearchInput,
    current_user=Depends(get_current_user)
):
    """Create a new team search and return matching profiles"""
    try:
        user_id = str(current_user["_id"])
        
        # Convert search input to dict for processing
        search_data = search_input.dict()
        
        # Find matching profiles
        matching_profiles = find_matching_profiles(
            search_data, 
            user_id,  # exclude current user
            limit=10
        )
        
        # Save search to database
        search_id = save_team_search(user_id, search_data)
        
        # Convert to response format
        profile_responses = [
            MatchedProfileResponse(**profile) 
            for profile in matching_profiles
        ]
        
        return TeamSearchResponse(
            profiles=profile_responses,
            search_id=search_id,
            total_matches=len(profile_responses)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/profiles/all")
async def get_all_profiles(current_user=Depends(get_current_user)):
    """Get all profiles (for your existing frontend logic)"""
    try:
        user_id = str(current_user["_id"])
        
        # Get all profiles except current user
        query = {"user_id": {"$ne": ObjectId(user_id)}}
        profiles_cursor = profiles_collection.find(query)
        
        profiles = []
        for profile in profiles_cursor:
            # Get user details
            user = users_collection.find_one({"_id": profile["user_id"]})
            if user:
                profile_data = {
                    "id": str(profile["user_id"]),
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", ""),
                    "phone": profile.get("phone", ""),
                    "role": profile.get("role", ""),
                    "skills": profile.get("skills", []),
                    "interests": profile.get("interests", []),
                    "preferred_role": profile.get("preferred_role", ""),
                    "experience": profile.get("experience", ""),
                    "availability": profile.get("availability", ""),
                    "location": profile.get("location", "")
                }
                profiles.append(profile_data)
        
        return {"profiles": profiles}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profiles: {str(e)}")

@app.get("/api/my-team-searches")
async def get_my_team_searches(current_user=Depends(get_current_user)):
    """Get user's previous team searches"""
    try:
        user_id = ObjectId(current_user["_id"])
        
        searches = list(team_searches_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(10))
        
        for search in searches:
            search["id"] = str(search["_id"])
            search["user_id"] = str(search["user_id"])
            del search["_id"]
        
        return {"searches": searches}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch searches: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)