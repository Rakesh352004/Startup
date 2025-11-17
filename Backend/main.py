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
import requests
from collections import defaultdict
import time

from database import (
    users_collection, ideas_collection, profiles_collection, roadmaps_collection, 
    research_collection, db, hash_password, verify_password, create_access_token,
    get_user_by_id, get_user_profile, update_user_profile, create_roadmap, 
    get_user_roadmaps, save_research, get_user_research_history, save_idea_validation, 
    get_user_ideas, get_user_activity, get_user_stats, delete_user_data,
    connection_requests_collection, connections_collection,  # Add these
    
    # Use ONLY the _fixed versions:
    create_connection_request,  # Remove the import, we'll define it inline
    get_connection_requests_fixed as get_connection_requests, 
    respond_to_connection_request_fixed as respond_to_connection_request,
    get_connection_status_fixed as get_connection_status, 
    get_connected_profiles_fixed as get_connected_profiles, 
    create_conversation_fixed as create_conversation, 
    send_message_fixed as send_message, 
    get_messages_fixed as get_messages,
    disconnect_users,
    ObjectId  # Add this import
)
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel


_ss_last_request_time = 0
_ss_request_lock = asyncio.Lock()
# Load environment variables
load_dotenv()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"
# ==========================================
# CONSTANTS AND CONFIGURATION
# ==========================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

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
    version="2.0.0",
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable docs in production
    redoc_url="/redoc" if not IS_PRODUCTION else None
)


# CORS Configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://startup-gps-frontend-v5f9.onrender.com"  # Add this line
]

# Add production frontend URL if specified
if FRONTEND_URL and FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

# Add any additional production URLs from environment
ADDITIONAL_ORIGINS = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if ADDITIONAL_ORIGINS:
    additional = [origin.strip() for origin in ADDITIONAL_ORIGINS.split(",")]
    allowed_origins.extend(additional)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
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
    # preferred_role removed
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
    current_role: Optional[str] = None  # Changed from preferred_role
    experience: Optional[str] = None
    availability: Optional[str] = None
    location: Optional[str] = None
    interests: List[str] = []

class ConnectionRequestInput(BaseModel):
    receiver_id: str
    message: str = ""

class ConnectionResponseInput(BaseModel):
    action: str  # "accept" or "reject"

class MessageInput(BaseModel):
    conversation_id: str
    content: str




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
# Content filtering for harmful keywords
# Replace the HARMFUL_KEYWORDS list (around line 330)
HARMFUL_KEYWORDS = [
    # Explicit violence (not general security terms)
    'build a bomb', 'make explosive', 'create weapon', 'assassination service',
    'murder for hire', 'hit man', 'contract killing',
    
    # Illegal drugs (not medical/pharma)
    'sell cocaine', 'sell heroin', 'drug trafficking', 'drug cartel',
    'illegal drug distribution', 'narcotics smuggling',
    
    # Fraud (specific schemes, not general fraud detection)
    'ponzi scheme', 'pyramid scheme operation', 'money laundering service',
    'counterfeit money', 'fake documents service',
    
    # Explicit adult content
    'pornography production', 'escort service', 'prostitution ring',
    
    # Hacking (malicious intent, not security)
    'hack into accounts', 'create malware', 'ransomware development',
    'ddos attack service', 'sell exploits',
    
    # Serious crimes
    'human trafficking', 'child exploitation', 'organ trafficking',
    'kidnapping service', 'extortion scheme',
]

def is_harmful_content(text: str) -> bool:
    """Check if the text contains harmful keywords WITH context awareness"""
    text_lower = text.lower()
    
    # Positive context indicators (legitimate business use)
    positive_indicators = [
        'prevent', 'detect', 'protect', 'security', 'safety', 'defense',
        'anti-', 'counter-', 'stop', 'fight', 'against', 'combat',
        'awareness', 'education', 'research', 'study', 'analysis',
        'cybersecurity', 'fraud detection', 'anti-fraud', 'firewall'
    ]
    
    # Check if text has positive/legitimate context
    has_positive_context = any(indicator in text_lower for indicator in positive_indicators)
    
    if has_positive_context:
        # Only check for EXTREMELY explicit harmful patterns
        explicit_harmful_patterns = [
            r'\b(how to (make|build|create) (bomb|explosive|weapon))\b',
            r'\b(sell (illegal drugs|weapons|stolen))\b',
            r'\b(hack into|steal (money|identity))\b',
            r'\b(distribute|traffic) (drugs|weapons|children)\b',
        ]
        
        for pattern in explicit_harmful_patterns:
            if re.search(pattern, text_lower):
                return True
        
        return False  # Legitimate business context
    
    # For non-contextualized text, check harmful keywords
    for keyword in HARMFUL_KEYWORDS:
        if keyword in text_lower:
            return True
    
    # Additional pattern checks for suspicious content
    suspicious_patterns = [
        r'\b(how to (make|build|create) (bomb|explosive|weapon))\b',
        r'\b(sell (drugs|weapons|stolen))\b',
        r'\b(hack (into|system|account))\b',
        r'\b(steal (money|identity|data))\b',
        r'\b(illegal (business|activity|service))\b'
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, text_lower):
            return True
    
    return False
# Add this function after the is_harmful_content function (around line 370)

def call_groq_roadmap_enhanced(prompt: str, timeframe: str) -> dict:
    """Enhanced roadmap generation with content filtering"""
    
    # Check for harmful content
    if is_harmful_content(prompt):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid and appropriate startup idea. The content provided contains inappropriate elements."
        )
    
    # Validate minimum quality
    if len(prompt.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Please provide a more detailed description (at least 30 characters) for accurate roadmap generation."
        )
    
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

def is_valid_startup_idea(text: str) -> tuple[bool, str]:
    """
    STRICT validation to check if input is actually a startup idea
    Returns: (is_valid, user_friendly_reason)
    """
    text_lower = text.lower().strip()
    
    # Check minimum length
    if len(text) < 10:
        return False, "Please provide more detail about your startup idea (at least 10 characters)"
    
    # Check for harmful/illegal content FIRST
    if is_harmful_content(text):
        return False, "This appears to contain inappropriate or illegal content. Please describe a legitimate business idea."
    
    # ===== STRICT REJECTION PATTERNS =====
    
    # 1. Personal activities (NOT business ideas)
    personal_activity_patterns = [
        r'\b(i want to|i will|i\'m going to|let me)\s+(steal|rob|take|grab)\b',
        r'\b(go to|going to|watch|see)\s+(movie|cinema|theatre|theater)\b',
        r'\b(eat|have|get)\s+(food|biryani|pizza|burger|lunch|dinner)\b',
        r'\b(buy|purchase|get)\s+(phone|laptop|car|bike|clothes)\b',
        r'\b(play|watch|listen to)\s+(game|music|video)\b',
        r'\b(sleep|rest|relax|chill)\b',
        r'\b(go\s+(home|out|shopping|traveling))\b',
    ]
    
    for pattern in personal_activity_patterns:
        if re.search(pattern, text_lower):
            return False, "This sounds like a personal activity, not a business idea. Please describe what product or service you want to create for customers."
    
    # 2. Just greetings or casual chat
    if re.search(r'^(hi|hello|hey|sup|yo|greetings|good\s+(morning|afternoon|evening))\s*[\!\?\.]*$', text_lower):
        return False, "Please describe your startup idea instead of just greeting."
    
    # 3. Just personal introduction
    if re.search(r'^(my\s+name\s+is|i\s+am|i\'m)\s+\w+\s*$', text_lower):
        return False, "Please describe your business idea, not just your name."
    
    # 4. Test/sample inputs
    if re.search(r'^(test|testing|sample|example|demo)\s*\d*\s*$', text_lower):
        return False, "Please enter a real startup idea, not a test message."
    
    # 5. Just numbers or gibberish
    if re.match(r'^\d+$', text_lower) or len(text_lower.split()) == 1:
        return False, "Please provide a complete description of your startup idea."
    
    # 6. Questions without business context
    question_patterns = [
        r'^(what|how|why|when|where|who)\s',
        r'^(can you|could you|will you)\s',
        r'^(tell me|show me|give me)\s',
    ]
    
    has_business_context = any(word in text_lower for word in [
        'startup', 'business', 'company', 'product', 'service', 
        'app', 'platform', 'solution', 'customers', 'market'
    ])
    
    if not has_business_context:
        for pattern in question_patterns:
            if re.search(pattern, text_lower):
                return False, "Please describe what business or product you want to create, not just ask a question."
    
    # ===== POSITIVE VALIDATION =====
    
    # Check for startup/business intent keywords
    startup_indicators = [
        # Core business terms
        'platform', 'app', 'application', 'service', 'product', 'business',
        'startup', 'company', 'solution', 'system', 'marketplace', 'website',
        'software', 'tool', 'device', 'technology', 'digital',
        
        # Business actions
        'connect', 'help', 'enable', 'provide', 'offer', 'build', 'create',
        'develop', 'sell', 'rent', 'deliver', 'manufacture', 'design',
        'teach', 'train', 'consult', 'manage', 'organize',
        
        # Customer/market terms
        'customers', 'users', 'clients', 'market', 'industry', 'consumers',
        
        # Business structure words
        'revenue', 'profit', 'subscription', 'monetize', 'pricing'
    ]
    
    keyword_count = sum(1 for keyword in startup_indicators if keyword in text_lower)
    
    # Need at least 1 business keyword OR clear business intent phrases
    business_intent_phrases = [
        'i want to create', 'i plan to build', 'we will develop',
        'business idea', 'startup idea', 'my idea is',
        'looking to create', 'trying to build', 'aiming to develop',
        'platform for', 'app for', 'service for', 'product for'
    ]
    
    has_business_intent = any(phrase in text_lower for phrase in business_intent_phrases)
    
    if keyword_count < 1 and not has_business_intent:
        return False, "This doesn't appear to be a business idea. Please describe what product/service you want to create, who your customers are, and what problem you're solving."
    
    # Passed all checks
    return True, "Valid startup idea"


def call_groq_validation_enhanced(prompt: str) -> dict:
    """Enhanced validation with STRICT pre-filtering"""
    
    # ===== STEP 1: STRICT PRE-VALIDATION =====
    is_valid, reason = is_valid_startup_idea(prompt)
    if not is_valid:
        # Return immediate rejection with clear explanation
        raise HTTPException(
            status_code=400,
            detail=reason
        )
    
    # ===== STEP 2: Check for harmful content =====
    if is_harmful_content(prompt):
        raise HTTPException(
            status_code=400,
            detail="This content appears inappropriate for business validation. Please describe a legitimate, legal business idea."
        )
    
    # ===== STEP 3: Minimum quality check =====
    if len(prompt.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Please provide more detail (at least 30 characters). Include: what you're building, who it's for, and what problem it solves."
        )
    
    # ===== STEP 4: Proceed with AI validation =====
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = """You are an expert startup validator with 15+ years of experience.

### CRITICAL: REJECT NON-BUSINESS IDEAS IMMEDIATELY

If the input is:
- A personal activity (going to movies, eating food, buying things for personal use)
- A greeting or casual chat
- A question without business context
- Gibberish or test input
- Anything illegal or harmful

Return this JSON with score 15:
{
  "overall_score": 15,
  "scores": {"feasibility": 15, "market_demand": 15, "uniqueness": 15, "strength": 15, "risk_factors": 95},
  "analysis": {
    "verdict": "This does not appear to be a business idea. Please describe a product or service you want to create for customers.",
    "feasibility": "Cannot assess - not a business concept",
    "market_demand": "Cannot assess - not a business concept",
    "uniqueness": "Cannot assess - not a business concept",
    "strength": "Cannot assess - not a business concept",
    "risk_factors": "Invalid input - not a business idea",
    "risk_mitigation": "Please provide a legitimate business concept",
    "existing_competitors": "Not applicable"
  },
  "suggestions": {
    "critical": ["Describe what product/service you want to create", "Identify your target customers", "Explain what problem you're solving"],
    "recommended": ["Research similar businesses in your target market", "Define your unique value proposition"],
    "optional": ["Consider creating a business plan", "Validate your idea with potential customers"]
  }
}

### FOR REAL STARTUP IDEAS:

Apply your full expertise with REALISTIC scoring:

**Market Demand Scoring**:
- 85-100: Revolutionary unmet need, massive TAM ($10B+)
- 70-84: Strong demand, growing market ($1B+)
- 55-69: Moderate demand, niche market
- 40-54: Limited demand, saturated market
- 15-39: Very low demand, commodity product

**Response Format**:
{
  "overall_score": <15-100>,
  "scores": {
    "feasibility": <15-100>,
    "market_demand": <15-100>,
    "uniqueness": <15-100>,
    "strength": <15-100>,
    "risk_factors": <15-100>
  },
  "analysis": {
    "verdict": "Honest 3-4 sentence assessment...",
    "feasibility": "Detailed technical analysis...",
    "market_demand": "Market reality with data...",
    "uniqueness": "True differentiation...",
    "strength": "Core value proposition...",
    "risk_factors": "Honest risks...",
    "risk_mitigation": "Practical strategies...",
    "existing_competitors": "CompanyName1 (domain.com), CompanyName2 (domain.com)"
  },
  "suggestions": {
    "critical": ["Must-do items"],
    "recommended": ["Should-do items"],
    "optional": ["Nice-to-haves"]
  }
}"""

    user_prompt = f"""Analyze this input with BRUTAL HONESTY:

"{prompt}"

First: Is this actually a BUSINESS IDEA (product/service for customers)?
If NO → return score 15 with explanation
If YES → analyze thoroughly with realistic scoring"""

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
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Validation service error")

        data = response.json()
        ai_text = data["choices"][0]["message"]["content"].strip()
        
        # Clean and parse
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:]
        if ai_text.endswith("```"):
            ai_text = ai_text[:-3]
        ai_text = ai_text.strip()
        
        try:
            result = json.loads(ai_text)
        except json.JSONDecodeError:
            result = parse_fallback_response(ai_text)
        
        # Apply realistic overall scoring
        overall_score = calculate_realistic_overall_score(result.get("scores", {}), prompt)
        result["overall_score"] = overall_score
        
        # Validate structure
        if not validate_response_structure(result):
            result = fix_response_structure(result)
        
        # Enhance competitors
        result = enhance_competitor_analysis(result)
        
        logger.info(f"✅ Validation complete - Score: {overall_score}")
        return result
        
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


def calculate_realistic_overall_score(scores: Dict[str, int], prompt: str) -> int:
    """
    Calculate realistic overall score with context-aware adjustments
    """
    # Base weighted calculation
    weights = {
        'feasibility': 0.25,
        'market_demand': 0.35,      # Increased weight - most important
        'uniqueness': 0.20,
        'strength': 0.15,
        'risk_factors': 0.05
    }
    
    weighted_sum = 0
    for dimension, weight in weights.items():
        score = scores.get(dimension, 50)
        if dimension == 'risk_factors':
            contribution_score = max(0, 100 - score + 50)
            weighted_sum += contribution_score * weight
        else:
            weighted_sum += score * weight
    
    overall_score = int(weighted_sum)
    
    # Context-aware adjustments based on idea quality
    prompt_lower = prompt.lower()
    
    # PENALTY for oversaturated/commodity markets (-15 to -25 points)
    oversaturated_keywords = [
        'umbrella rent', 'umbrella rental', 'rent umbrella',
        'generic marketplace', 'another uber', 'uber for', 
        'tinder for', 'airbnb for', 'facebook for',
        'simple website', 'basic app', 'standard platform'
    ]
    
    for keyword in oversaturated_keywords:
        if keyword in prompt_lower:
            overall_score -= 20
            break
    
    # PENALTY for weak differentiation (-10 points)
    weak_differentiation = [
        'everyone has', 'commonly available', 'already exists',
        'nothing new', 'not unique', 'standard service'
    ]
    
    if any(phrase in prompt_lower for phrase in weak_differentiation):
        overall_score -= 10
    
    # PENALTY if market demand is very low (<40)
    if scores.get('market_demand', 70) < 40:
        overall_score -= 15
    
    # PENALTY if feasibility is very low (<35)
    if scores.get('feasibility', 70) < 35:
        overall_score -= 10
    
    # BONUS for innovative/emerging tech (+10 to +15 points)
    innovative_keywords = [
        'ai', 'machine learning', 'blockchain', 'quantum',
        'vr', 'ar', 'metaverse', 'web3', 'crypto',
        'biotech', 'nanotech', 'renewable energy', 'sustainable'
    ]
    
    if any(keyword in prompt_lower for keyword in innovative_keywords):
        overall_score += 12
    
    # BONUS for solving real pain points (+8 points)
    pain_point_indicators = [
        'painful', 'frustrating', 'difficult', 'time-consuming',
        'expensive', 'inefficient', 'complicated', 'hard to'
    ]
    
    if any(indicator in prompt_lower for indicator in pain_point_indicators):
        overall_score += 8
    
    # Critical checks - cap score if fundamentals are weak
    if scores.get('market_demand', 70) < 30:
        overall_score = min(overall_score, 35)
    
    if scores.get('feasibility', 70) < 25:
        overall_score = min(overall_score, 40)
    
    if all(scores.get(key, 70) < 45 for key in ['feasibility', 'market_demand', 'uniqueness']):
        overall_score = min(overall_score, 45)
    
    # Boost if all dimensions are strong (85+)
    if all(scores.get(key, 70) >= 85 for key in weights.keys()):
        overall_score = max(overall_score, 85)
    
    # Final bounds
    return max(15, min(100, overall_score))
def call_groq_chat_with_idea(message: str, idea_context: str, session_id: str) -> str:
    """Enhanced chat function for idea-specific conversations"""
    
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ API not configured"
        )
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = f"""You are an expert AI startup advisor specifically helping with this startup idea:

STARTUP IDEA: {idea_context}

Your role:
1. Provide specific, actionable advice related to this exact startup idea
2. Answer questions about market opportunities, competition, implementation, funding, etc.
3. Give concrete examples and strategies tailored to this specific idea
4. Suggest specific tools, platforms, partnerships relevant to this startup
5. Provide realistic timelines and resource estimates
6. Keep responses focused and practical

Guidelines:
- Always relate advice back to the specific startup idea
- Provide concrete next steps and actionable recommendations
- Include specific examples, tools, or resources when possible
- Be honest about challenges while remaining constructive
- Ask clarifying questions when needed to provide better advice

Keep responses conversational but informative, around 2-4 paragraphs maximum.
"""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Chat service temporarily unavailable"
            )
        
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Chat service encountered an error"
        )
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



# ADD THESE NEW API ENDPOINTS:

@app.post("/validate-idea-enhanced")
async def validate_idea_enhanced(idea: IdeaInput, current_user=Depends(get_optional_current_user)):
    """Enhanced idea validation with better understanding and scoring"""
    logger.info(f"🔍 Validation request: {idea.prompt[:50]}...")
    
    try:
        # Get AI validation with enhanced features
        ai_result = call_groq_validation_enhanced(idea.prompt)
        logger.info(f"✅ AI validation complete - Score: {ai_result['overall_score']}")
        
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
                riskMitigation=ai_result["analysis"].get("risk_mitigation", ""),
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
        
        # ✅ FIXED: Save to database if user is authenticated
        if current_user:
            try:
                user_id = str(current_user["_id"])
                logger.info(f"💾 Saving validation for user: {user_id}")
                
                # Prepare data for database
                idea_data = {
                    "prompt": idea.prompt,
                    "validation": {
                        "verdict": ai_result["analysis"]["verdict"],
                        "feasibility": ai_result["analysis"]["feasibility"],
                        "marketDemand": ai_result["analysis"]["market_demand"],
                        "uniqueness": ai_result["analysis"]["uniqueness"],
                        "strength": ai_result["analysis"]["strength"],
                        "riskFactors": ai_result["analysis"]["risk_factors"],
                        "riskMitigation": ai_result["analysis"].get("risk_mitigation", ""),
                        "existingCompetitors": ai_result["analysis"]["existing_competitors"]
                    },
                    "scores": {
                        "overall": ai_result["overall_score"],
                        "feasibility": ai_result["scores"]["feasibility"],
                        "marketDemand": ai_result["scores"]["market_demand"],
                        "uniqueness": ai_result["scores"]["uniqueness"],
                        "strength": ai_result["scores"]["strength"],
                        "riskFactors": ai_result["scores"]["risk_factors"]
                    },
                    "suggestions": {
                        "critical": ai_result["suggestions"]["critical"],
                        "recommended": ai_result["suggestions"]["recommended"],
                        "optional": ai_result["suggestions"]["optional"]
                    }
                }
                
                # Save to database
                saved_id = save_idea_validation(user_id, idea_data)
                logger.info(f"✅ Idea saved successfully with ID: {saved_id}")
                
            except Exception as e:
                logger.error(f"❌ Database save error: {e}")
                # Don't fail the request, just log the error
        else:
            logger.info("👤 Anonymous user - skipping database save")
        
        return validation_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.post("/chat-with-idea")
async def chat_with_idea(
    chat_data: dict,
    current_user=Depends(get_optional_current_user)
):
    """Chat about specific startup idea with contextual AI responses"""
    try:
        message = chat_data.get("message", "").strip()
        idea_context = chat_data.get("idea_context", "").strip()
        session_id = chat_data.get("session_id", "")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        if not idea_context:
            raise HTTPException(status_code=400, detail="Idea context is required")
        
        if len(message) > 1000:
            raise HTTPException(status_code=400, detail="Message too long (max 1000 characters)")
        
        # Get AI response
        ai_response = call_groq_chat_with_idea(message, idea_context, session_id)
        
        return {
            "response": ai_response,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Chat service temporarily unavailable"
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

# Replace fetch_semantic_scholar function
async def fetch_semantic_scholar(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """
    Fetch papers from Semantic Scholar with rate limit protection
    Rate limit: 1 request per second
    """
    global _ss_last_request_time
    
    try:
        query = " ".join(search_terms[:3])
        papers = []
        
        params = {
            "query": query,
            "limit": min(max_results * 2, 100),
            "offset": 0,
            "fields": "title,authors,abstract,year,url,externalIds,publicationDate,citationCount",
            "sort": "citationCount:desc"
        }

        headers = {"User-Agent": "Research-Advisor-API/1.0"}
        if SEMANTIC_SCHOLAR_API_KEY:
            headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY
            logger.info("✅ Using Semantic Scholar API key")
        else:
            logger.warning("⚠️ No Semantic Scholar API key - using unauthenticated access")

        # Rate limiting: Ensure at least 1 second between requests
        async with _ss_request_lock:
            current_time = time.time()
            time_since_last_request = current_time - _ss_last_request_time
            
            if time_since_last_request < 1.0:
                wait_time = 1.0 - time_since_last_request
                logger.info(f"⏱️ Rate limiting: waiting {wait_time:.2f}s before Semantic Scholar request")
                await asyncio.sleep(wait_time)
            
            # Make the request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(SEMANTIC_SCHOLAR_API, params=params, headers=headers)
                _ss_last_request_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                
                for item in data.get("data", []):
                    try:
                        title = item.get("title", "").strip()
                        if not title or len(title) < 10:
                            continue
                        
                        authors = [author.get("name", "") for author in item.get("authors", [])]
                        if not authors:
                            authors = ["Unknown"]
                        
                        abstract = item.get("abstract", "")
                        if not abstract or abstract == "null":
                            abstract = "No abstract available"
                        elif len(abstract) > 500:
                            abstract = abstract[:497] + "..."
                        
                        pub_year = item.get("year")
                        if not pub_year and item.get("publicationDate"):
                            try:
                                pub_year = item["publicationDate"][:4]
                            except:
                                pub_year = ""
                        pub_year = str(pub_year) if pub_year else ""
                        
                        url = item.get("url", "")
                        if not url and item.get("externalIds", {}).get("DOI"):
                            url = f"https://doi.org/{item['externalIds']['DOI']}"
                        
                        papers.append(ResearchPaper(
                            title=title,
                            authors=authors,
                            abstract=abstract,
                            published_date=pub_year,
                            source="Semantic Scholar",
                            url=url,
                            doi=item.get("externalIds", {}).get("DOI")
                        ))
                        
                    except Exception as e:
                        logger.warning(f"Error processing Semantic Scholar paper: {e}")
                        continue
                
                logger.info(f"Semantic Scholar: {len(papers)} papers fetched")
                return papers
            
            elif response.status_code == 429:
                logger.warning("Semantic Scholar rate limit exceeded (429). Increase delay between requests.")
                return []
            
            else:
                logger.warning(f"Semantic Scholar error {response.status_code}: {response.text[:200]}")
                return []
            
    except Exception as e:
        logger.error(f"Semantic Scholar fetch failed: {e}")
        return []


async def fetch_arxiv(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from arXiv - improved query"""
    try:
        if not search_terms:
            return []

        # Build better query with multiple terms
        query_parts = []
        for term in search_terms[:4]:  # Use up to 4 terms
            clean_term = term.strip()
            if len(clean_term) > 2:
                query_parts.append(clean_term)
        
        query = " AND ".join(query_parts[:3]) if len(query_parts) > 1 else query_parts[0]
        
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": min(max_results * 2, 100),
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

        headers = {"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"}

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(ARXIV_API, params=params, headers=headers)

            if response.status_code != 200:
                logger.warning(f"arXiv error {response.status_code}")
                return []

            papers = parse_arxiv_response(response.text, max_results * 2)
            logger.info(f"arXiv: {len(papers)} papers fetched")
            return papers

    except Exception as e:
        logger.error(f"arXiv fetch failed: {e}")
        return []

def parse_arxiv_response(xml_text: str, max_results: int) -> List[ResearchPaper]:
    """Helper to parse arXiv XML into ResearchPaper objects"""
    try:
        root = ET.fromstring(xml_text)
        papers = []

        entries = root.findall('{http://www.w3.org/2005/Atom}entry')

        for entry in entries[:max_results]:
            try:
                title_elem = entry.find('{http://www.w3.org/2005/Atom}title')
                title = title_elem.text.strip() if title_elem is not None else ""
                
                if not title or len(title) < 10:
                    continue

                summary_elem = entry.find('{http://www.w3.org/2005/Atom}summary')
                abstract = summary_elem.text.strip() if summary_elem is not None else "No abstract available"
                if len(abstract) > 500:
                    abstract = abstract[:497] + "..."

                authors = []
                for author_elem in entry.findall('{http://www.w3.org/2005/Atom}author'):
                    name_elem = author_elem.find('{http://www.w3.org/2005/Atom}name')
                    if name_elem is not None and name_elem.text:
                        authors.append(name_elem.text.strip())
                
                if not authors:
                    authors = ["Unknown"]

                published_elem = entry.find('{http://www.w3.org/2005/Atom}published')
                published_date = ""
                if published_elem is not None and published_elem.text:
                    published_date = published_elem.text[:4]

                id_elem = entry.find('{http://www.w3.org/2005/Atom}id')
                url = id_elem.text if id_elem is not None else ""

                papers.append(ResearchPaper(
                    title=title,
                    authors=authors,
                    abstract=abstract,
                    published_date=published_date,
                    source="arXiv",
                    url=url,
                    doi=None
                ))

            except Exception as e:
                logger.warning(f"Error processing arXiv entry: {e}")
                continue

        return papers
        
    except ET.ParseError as e:
        logger.error(f"XML parsing error: {e}")
        return []
    except Exception as e:
        logger.error(f"Error parsing arXiv response: {e}")
        return []
async def fetch_crossref(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from CrossRef - improved query"""
    try:
        # Build better query
        query = " ".join(search_terms[:3])
        
        params = {
            "query": query,
            "rows": min(max_results * 2, 100),
            "sort": "relevance",
            "select": "title,author,abstract,created,URL,DOI,published-print,published-online,is-referenced-by-count"
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
                    if not title or len(title) < 10:
                        continue
                    
                    abstract = item.get("abstract", "No abstract available")
                    if abstract and abstract != "No abstract available":
                        if len(abstract) > 500:
                            abstract = abstract[:497] + "..."
                    
                    authors = []
                    for author in item.get("author", [])[:5]:
                        given = author.get("given", "")
                        family = author.get("family", "")
                        author_name = f"{given} {family}".strip()
                        if author_name:
                            authors.append(author_name)
                    
                    if not authors:
                        authors = ["Unknown"]
                    
                    # Get publication date
                    pub_date = ""
                    date_fields = ["published-print", "published-online", "created"]
                    for field in date_fields:
                        if field in item and "date-parts" in item[field]:
                            date_parts = item[field]["date-parts"][0]
                            if date_parts and len(date_parts) > 0:
                                pub_date = str(date_parts[0])
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
            
            logger.info(f"CrossRef: {len(papers)} papers fetched")
            return papers
            
    except Exception as e:
        logger.error(f"CrossRef fetch failed: {e}")
        return []


# Replace the deduplicate_and_rank_papers function in main.py

def deduplicate_and_rank_papers(papers: List[ResearchPaper], target_count: int = 40) -> List[ResearchPaper]:
    """
    Deduplicate papers and return top N with BALANCED source distribution
    Ensures papers from all sources are represented fairly
    """
    if not papers:
        return []
    
    # Step 1: Deduplicate by normalized title
    unique_papers = []
    seen_titles = set()
    
    for paper in papers:
        if not paper.title or len(paper.title.strip()) < 10:
            continue
        
        # Normalize title for comparison
        normalized_title = re.sub(r'[^\w\s]', '', paper.title.lower())
        normalized_title = re.sub(r'\s+', ' ', normalized_title).strip()
        
        if normalized_title and normalized_title not in seen_titles:
            seen_titles.add(normalized_title)
            unique_papers.append(paper)
    
    logger.info(f"After deduplication: {len(unique_papers)} unique papers")
    
    # Step 2: Group papers by source
    papers_by_source = defaultdict(list)
    for paper in unique_papers:
        papers_by_source[paper.source].append(paper)
    
    logger.info(f"Source distribution before ranking: {dict((k, len(v)) for k, v in papers_by_source.items())}")
    
    # Step 3: Score papers within each source
    for source, source_papers in papers_by_source.items():
        scored = []
        for paper in source_papers:
            score = 0
            
            # Quality metrics (same for all sources)
            # Has abstract (+20 points)
            if paper.abstract and paper.abstract != "No abstract available":
                score += 20
                score += min(len(paper.abstract) / 50, 10)
            
            # Has URL (+15 points)
            if paper.url:
                score += 15
            
            # Has DOI (+15 points) 
            if paper.doi:
                score += 15
            
            # Has publication date (+10 points)
            if paper.published_date:
                score += 10
                # Recent papers bonus
                try:
                    year = int(paper.published_date[:4])
                    current_year = datetime.utcnow().year
                    if year >= current_year - 3:  # Last 3 years
                        score += 15
                    elif year >= current_year - 5:  # Last 5 years
                        score += 10
                    elif year >= current_year - 10:  # Last 10 years
                        score += 5
                except:
                    pass
            
            # Multiple authors (+5 points)
            if len(paper.authors) > 1:
                score += 5
            
            scored.append((score, paper))
        
        # Sort by score within each source
        scored.sort(key=lambda x: x[0], reverse=True)
        papers_by_source[source] = [paper for score, paper in scored]
    
    # Step 4: BALANCED SELECTION - Take papers from all sources proportionally
    result = []
    sources = list(papers_by_source.keys())
    source_counts = {source: 0 for source in sources}
    
    # Calculate target distribution (proportional to available papers)
    total_available = sum(len(papers_by_source[s]) for s in sources)
    target_per_source = {}
    
    for source in sources:
        available = len(papers_by_source[source])
        # Each source gets at least min(8, available) papers
        min_allocation = min(8, available)
        # Remaining slots distributed proportionally
        proportion = available / total_available if total_available > 0 else 0
        target = max(min_allocation, int(target_count * proportion))
        target_per_source[source] = min(target, available)
    
    logger.info(f"Target distribution per source: {target_per_source}")
    
    # Round-robin selection with quality priority
    # First pass: Get top papers from each source up to their target
    for source in sources:
        target = target_per_source[source]
        available_papers = papers_by_source[source]
        
        # Take up to target papers from this source
        to_take = min(target, len(available_papers))
        for i in range(to_take):
            if len(result) < target_count:
                result.append(available_papers[i])
                source_counts[source] += 1
    
    # Second pass: Fill remaining slots with best papers from any source
    if len(result) < target_count:
        # Get all remaining papers
        remaining_papers = []
        for source in sources:
            taken = source_counts[source]
            remaining_papers.extend(papers_by_source[source][taken:])
        
        # Score and sort remaining papers
        scored_remaining = []
        for paper in remaining_papers:
            score = 0
            if paper.abstract and paper.abstract != "No abstract available":
                score += 20 + min(len(paper.abstract) / 50, 10)
            if paper.url:
                score += 15
            if paper.doi:
                score += 15
            if paper.published_date:
                score += 10
                try:
                    year = int(paper.published_date[:4])
                    current_year = datetime.utcnow().year
                    if year >= current_year - 3:
                        score += 15
                except:
                    pass
            scored_remaining.append((score, paper))
        
        scored_remaining.sort(key=lambda x: x[0], reverse=True)
        
        # Add best remaining papers
        for score, paper in scored_remaining:
            if len(result) >= target_count:
                break
            result.append(paper)
            source_counts[paper.source] += 1
    
    # Final result limited to target_count
    result = result[:target_count]
    
    # Log final distribution
    final_distribution = defaultdict(int)
    for paper in result:
        final_distribution[paper.source] += 1
    
    logger.info(f"Final distribution achieved: {dict(final_distribution)}")
    logger.info(f"Returning top {len(result)} papers")
    
    return result
def check_profile_completion_helper(profile: dict) -> tuple[bool, List[str]]:
    """
    Check if profile is complete and return missing fields
    Returns: (is_complete, list_of_missing_fields)
    """
    missing_fields = []
    
    # Check all required fields
    if not profile.get("name") or not str(profile.get("name")).strip():
        missing_fields.append("Name")
    
    if not profile.get("email") or not str(profile.get("email")).strip():
        missing_fields.append("Email")
    
    if not profile.get("role") or not str(profile.get("role")).strip():
        missing_fields.append("Current Role")
    
    skills = profile.get("skills")
    if not skills or not isinstance(skills, list) or len(skills) == 0:
        missing_fields.append("Skills")
    
    interests = profile.get("interests")
    if not interests or not isinstance(interests, list) or len(interests) == 0:
        missing_fields.append("Interests")
    
    if not profile.get("experience") or not str(profile.get("experience")).strip():
        missing_fields.append("Experience Level")
    
    if not profile.get("availability") or not str(profile.get("availability")).strip():
        missing_fields.append("Availability")
    
    if not profile.get("location") or not str(profile.get("location")).strip():
        missing_fields.append("Location")
    
    is_complete = len(missing_fields) == 0
    return is_complete, missing_fields
def calculate_match_score_and_details(profile: dict, requirements: dict) -> tuple:
    """Calculate match score and matched items with updated field names"""
    score = 0
    matched_skills = []
    matched_interests = []
    
    def normalize_text(text: str) -> str:
        return text.lower().strip()
    
    def is_skill_match(profile_skill: str, req_skill: str) -> bool:
        """Check if skills match"""
        p_skill = normalize_text(profile_skill)
        r_skill = normalize_text(req_skill)
        
        if p_skill == r_skill:
            return True
        
        if len(r_skill) >= 3:
            if r_skill in p_skill or p_skill in r_skill:
                overlap = min(len(r_skill), len(p_skill))
                if overlap / max(len(r_skill), len(p_skill)) >= 0.7:
                    return True
        
        return False
    
    # 1. REQUIRED SKILLS MATCHING (60% weight)
    req_skills = requirements.get("required_skills", [])
    if req_skills:
        profile_skills = profile.get("skills", [])
        
        for req_skill in req_skills:
            for profile_skill in profile_skills:
                if is_skill_match(profile_skill, req_skill):
                    if profile_skill not in matched_skills:
                        matched_skills.append(profile_skill)
                    break
        
        skill_match_ratio = len(matched_skills) / len(req_skills) if req_skills else 0
        score += skill_match_ratio * 60
    else:
        score += 30
    
    # 2. CURRENT ROLE MATCHING (15% weight) - UPDATED
    req_role = requirements.get("current_role", "").strip()
    profile_role = profile.get("role", "").strip()  # Using 'role' field
    
    if req_role and profile_role:
        req_role_norm = normalize_text(req_role)
        profile_role_norm = normalize_text(profile_role)
        
        if req_role_norm == profile_role_norm or \
           req_role_norm in profile_role_norm or \
           profile_role_norm in req_role_norm:
            score += 15
        else:
            role_words = set(req_role_norm.split())
            profile_words = set(profile_role_norm.split())
            common_words = role_words.intersection(profile_words)
            if common_words:
                score += 7.5
    
    # 3. EXPERIENCE LEVEL MATCHING (10% weight)
    req_experience = requirements.get("experience", "").strip()
    profile_experience = profile.get("experience", "").strip()
    
    if req_experience and profile_experience:
        if normalize_text(req_experience) == normalize_text(profile_experience):
            score += 10
        else:
            exp_levels = ["junior", "mid", "senior"]
            try:
                req_idx = exp_levels.index(normalize_text(req_experience))
                prof_idx = exp_levels.index(normalize_text(profile_experience))
                if abs(req_idx - prof_idx) == 1:
                    score += 5
            except ValueError:
                pass
    elif not req_experience:
        score += 5
    
    # 4. AVAILABILITY MATCHING (5% weight)
    req_availability = requirements.get("availability", "").strip()
    profile_availability = profile.get("availability", "").strip()
    
    if req_availability and profile_availability:
        if normalize_text(req_availability) == normalize_text(profile_availability):
            score += 5
    elif not req_availability:
        score += 2.5
    
    # 5. LOCATION MATCHING (5% weight)
    req_location = requirements.get("location", "").strip()
    profile_location = profile.get("location", "").strip()
    
    if req_location and profile_location:
        req_loc_norm = normalize_text(req_location)
        prof_loc_norm = normalize_text(profile_location)
        
        if "remote" in req_loc_norm and "remote" in prof_loc_norm:
            score += 5
        elif req_loc_norm in prof_loc_norm or prof_loc_norm in req_loc_norm:
            score += 5
        else:
            req_loc_parts = set(req_loc_norm.split())
            prof_loc_parts = set(prof_loc_norm.split())
            if req_loc_parts.intersection(prof_loc_parts):
                score += 2.5
    elif not req_location:
        score += 2.5
    
    # 6. INTERESTS MATCHING (5% weight)
    req_interests = requirements.get("interests", [])
    if req_interests:
        profile_interests = profile.get("interests", [])
        
        for req_interest in req_interests:
            for profile_interest in profile_interests:
                if is_skill_match(profile_interest, req_interest):
                    if profile_interest not in matched_interests:
                        matched_interests.append(profile_interest)
                    break
        
        if req_interests:
            interest_match_ratio = len(matched_interests) / len(req_interests)
            score += interest_match_ratio * 5
    
    final_score = min(100, max(0, int(score)))
    return final_score, matched_skills, matched_interests
# ==========================================
# CONNECTION REQUEST HELPER (Override database.py version)
# ==========================================
def create_connection_request_api(sender_id: str, receiver_id: str, message: str = "") -> str:
    """
    API-specific connection request handler with detailed logging and error handling
    """
    try:
        logger.info(f"🔍 Connection request: {sender_id} -> {receiver_id}")
        
        sender_oid = ObjectId(sender_id)
        receiver_oid = ObjectId(receiver_id)
        
        # 1. Prevent self-connection
        if sender_id == receiver_id:
            logger.warning(f"❌ Self-connection attempt: {sender_id}")
            raise ValueError("Cannot send request to yourself")
        
        # 2. Check if already connected
        existing_connection = connections_collection.find_one({
            "$or": [
                {"user_id": sender_oid, "target_user_id": receiver_oid, "status": "connected"},
                {"user_id": receiver_oid, "target_user_id": sender_oid, "status": "connected"}
            ]
        })
        
        if existing_connection:
            logger.warning(f"❌ Already connected: {sender_id} <-> {receiver_id}")
            raise ValueError("Already connected with this user")
        
        # 3. Check for pending requests (both directions)
        existing_request = connection_requests_collection.find_one({
            "$or": [
                {"sender_id": sender_oid, "receiver_id": receiver_oid, "status": "pending"},
                {"sender_id": receiver_oid, "receiver_id": sender_oid, "status": "pending"}
            ]
        })
        
        if existing_request:
            # If receiver already sent a request to sender, auto-accept
            if str(existing_request["sender_id"]) == receiver_id:
                logger.info(f"✅ Auto-accepting mutual request: {receiver_id} -> {sender_id}")
                
                connection_requests_collection.update_one(
                    {"_id": existing_request["_id"]},
                    {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
                )
                
                # Create bidirectional connections
                connections_collection.insert_one({
                    "user_id": sender_oid,
                    "target_user_id": receiver_oid,
                    "status": "connected",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                
                connections_collection.insert_one({
                    "user_id": receiver_oid,
                    "target_user_id": sender_oid,
                    "status": "connected",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                
                return str(existing_request["_id"])
            else:
                logger.warning(f"❌ Request already sent: {sender_id} -> {receiver_id}")
                logger.info(f"📋 Existing request ID: {existing_request['_id']}, Status: {existing_request['status']}")
                raise ValueError("Connection request already sent")
        
        # 4. Check for ANY existing request (including rejected/accepted)
        any_existing = connection_requests_collection.find_one({
            "$or": [
                {"sender_id": sender_oid, "receiver_id": receiver_oid},
                {"sender_id": receiver_oid, "receiver_id": sender_oid}  # Check both directions
            ]
        })
        
        if any_existing:
            logger.info(f"📋 Found existing request with status: {any_existing['status']}")
            
            if any_existing["status"] == "rejected":
                # Check if 24 hours have passed
                rejection_time = any_existing.get("updated_at", any_existing.get("created_at"))
                if rejection_time:
                    hours_since = (datetime.utcnow() - rejection_time).total_seconds() / 3600
                    if hours_since < 24:
                        logger.warning(f"❌ Too soon after rejection: {int(24 - hours_since)} hours remaining")
                        raise ValueError(f"Please wait {int(24 - hours_since)} hours before sending another request")
                
                # Delete old rejected request
                logger.info(f"🗑️ Deleting old rejected request: {any_existing['_id']}")
                connection_requests_collection.delete_one({"_id": any_existing["_id"]})
            
            elif any_existing["status"] == "accepted":
                # ✅ CRITICAL FIX: If request is accepted but no connection exists, 
                # it means they disconnected - delete the old request
                logger.warning(f"⚠️ Found accepted request but no connection - cleaning up orphaned request")
                logger.info(f"🗑️ Deleting orphaned accepted request: {any_existing['_id']}")
                connection_requests_collection.delete_one({"_id": any_existing["_id"]})
                # Now continue to create a new request below
            
            elif any_existing["status"] == "pending":
                logger.warning(f"❌ Request already pending: {any_existing['_id']}")
                raise ValueError("Connection request already sent")
        
        # 5. Create new request
        request_doc = {
            "sender_id": sender_oid,
            "receiver_id": receiver_oid,
            "message": message,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            result = connection_requests_collection.insert_one(request_doc)
            logger.info(f"✅ Connection request created: {result.inserted_id}")
            return str(result.inserted_id)
        except errors.DuplicateKeyError as e:
            logger.error(f"❌ Duplicate key error: {e}")
            # The request exists but we didn't catch it above - find and return it
            existing = connection_requests_collection.find_one({
                "$or": [
                    {"sender_id": sender_oid, "receiver_id": receiver_oid},
                    {"sender_id": receiver_oid, "receiver_id": sender_oid}
                ]
            })
            if existing:
                logger.info(f"📋 Found existing request after duplicate error: {existing['_id']}")
                # Delete it and retry
                connection_requests_collection.delete_one({"_id": existing["_id"]})
                logger.info(f"🗑️ Deleted duplicate request, retrying...")
                # Retry insertion
                result = connection_requests_collection.insert_one(request_doc)
                logger.info(f"✅ Connection request created on retry: {result.inserted_id}")
                return str(result.inserted_id)
            raise ValueError("Failed to create connection request due to duplicate")
        
    except ValueError:
        raise  # Re-raise ValueError for API handling
    except Exception as e:
        logger.error(f"❌ Connection request failed: {e}")
        raise ValueError(f"Failed to create connection request: {str(e)}")



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
@app.post("/validate-idea-enhanced")
async def validate_idea_enhanced(idea: IdeaInput, current_user=Depends(get_optional_current_user)):
    """Enhanced idea validation with content filtering and accurate scoring"""
    logger.info(f"Enhanced validation request: {idea.prompt[:50]}...")
    
    try:
        # Get AI validation with enhanced features
        ai_result = call_groq_validation_enhanced(idea.prompt)
        logger.info("Enhanced AI validation completed")
        
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
                riskMitigation=ai_result["analysis"].get("risk_mitigation", "Strategic risk mitigation recommended."),
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
                idea_data = {
                    "prompt": idea.prompt,
                    "validation": validation_response.validation.dict(),
                    "scores": validation_response.scores.dict(),
                    "suggestions": validation_response.suggestions.dict()
                }
                saved_id = save_idea_validation(user_id, idea_data)
                logger.info(f"Enhanced idea saved with ID: {saved_id}")
            except Exception as e:
                logger.error(f"Database save error: {e}")
        
        return validation_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.post("/chat-with-idea")
async def chat_with_idea(
    chat_data: dict,
    current_user=Depends(get_optional_current_user)
):
    """Chat about specific startup idea with contextual AI responses"""
    try:
        message = chat_data.get("message", "").strip()
        idea_context = chat_data.get("idea_context", "").strip()
        session_id = chat_data.get("session_id", "")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        if not idea_context:
            raise HTTPException(status_code=400, detail="Idea context is required")
        
        if len(message) > 1000:
            raise HTTPException(status_code=400, detail="Message too long (max 1000 characters)")
        
        # Get AI response
        ai_response = call_groq_chat_with_idea(message, idea_context, session_id)
        
        # Optional: Save chat history if user is authenticated
        if current_user:
            try:
                # You can implement chat history saving here if needed
                pass
            except Exception as e:
                logger.warning(f"Failed to save chat history: {e}")
        
        return {
            "response": ai_response,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Chat service temporarily unavailable"
        )
# Enhanced Roadmap Generation Endpoint
# Replace the existing /generate-roadmap endpoint (around line 1450)

@app.post("/generate-roadmap", response_model=RoadmapResponse)
async def generate_roadmap(roadmap_input: RoadmapInput, current_user=Depends(get_optional_current_user)):
    """Enhanced roadmap generation with content filtering and optional authentication"""
    logger.info(f"Roadmap request received: {roadmap_input.prompt[:50]}...")
    
    try:
        # Get AI roadmap generation with enhanced filtering
        ai_result = call_groq_roadmap_enhanced(roadmap_input.prompt, roadmap_input.timeframe)
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {str(e)}")

# Research Papers Endpoint
# Replace the /research-papers endpoint (around line 1500)

# Replace your /research-papers endpoint in main.py

@app.post("/research-papers", response_model=ResearchResponse)
async def get_research_papers(
    request: ResearchRequest, 
    current_user=Depends(get_optional_current_user)
) -> ResearchResponse:
    """
    Fetch exactly 40 high-quality research papers from 3 sources in parallel,
    properly deduplicated and ranked by quality
    """
    logger.info(f"Research request: {request.idea[:50]}...")
    
    # Content validation
    if is_harmful_content(request.idea):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid research idea."
        )
    
    if len(request.idea.strip()) < 10:
        raise HTTPException(
            status_code=400, 
            detail="Please provide more detail (at least 10 characters)"
        )
    
    try:
        # Generate search terms
        search_terms = generate_search_terms(request.idea)
        if not search_terms:
            search_terms = [request.idea]
        
        logger.info(f"Search terms: {search_terms}")
        
        # ⚡ PARALLEL FETCH - All 3 APIs called simultaneously
        logger.info("🚀 Fetching papers from all 3 sources IN PARALLEL...")
        start_time = datetime.utcnow()
        
        # Create tasks for parallel execution
        tasks = [
            fetch_semantic_scholar(search_terms, 50),
            fetch_arxiv(search_terms, 50),
            fetch_crossref(search_terms, 50)
        ]
        
        # Execute all tasks simultaneously
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = datetime.utcnow()
        fetch_duration = (end_time - start_time).total_seconds()
        logger.info(f"⏱️ All 3 APIs completed in {fetch_duration:.2f} seconds")
        
        # Process results
        all_papers: List[ResearchPaper] = []
        source_names = ["Semantic Scholar", "arXiv", "CrossRef"]
        source_counts = {}
        
        for i, result in enumerate(results):
            source = source_names[i]
            if isinstance(result, Exception):
                logger.warning(f"❌ {source} failed: {result}")
                source_counts[source] = 0
            elif isinstance(result, list):
                paper_count = len(result)
                all_papers.extend(result)
                source_counts[source] = paper_count
                logger.info(f"✅ {source}: {paper_count} papers")
        
        # Log combined results
        logger.info(f"📊 Combined totals: SS={source_counts.get('Semantic Scholar', 0)}, "
                   f"arXiv={source_counts.get('arXiv', 0)}, "
                   f"CrossRef={source_counts.get('CrossRef', 0)}")
        logger.info(f"📚 Total papers before deduplication: {len(all_papers)}")
        
        # Deduplicate and rank to get best 40 papers
        final_papers = deduplicate_and_rank_papers(all_papers, target_count=40)
        
        logger.info(f"🎯 Final paper count after ranking: {len(final_papers)}")
        
        # Log source distribution in final 40
        final_source_dist = {}
        for paper in final_papers:
            final_source_dist[paper.source] = final_source_dist.get(paper.source, 0) + 1
        
        logger.info(f"📈 Final 40 paper distribution: {final_source_dist}")
        
        if not final_papers:
            raise HTTPException(
                status_code=404,
                detail="No research papers found. Try different keywords."
            )
        
        # Save to database if user is authenticated
        research_id = "anonymous"
        
        if current_user and final_papers:
            try:
                user_id = str(current_user["_id"])
                paper_data_list = [p.dict() for p in final_papers]
                research_doc = {
                    "idea": request.idea,
                    "search_terms": search_terms,
                    "papers": paper_data_list,
                }
                research_id = save_research(user_id, research_doc)
                logger.info(f"💾 Research saved: {research_id}")
            except Exception as e:
                logger.error(f"❌ Save error: {e}")
        
        return ResearchResponse(
            papers=final_papers,
            search_terms=search_terms,
            research_id=research_id,
            created_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Research failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Research failed: {str(e)}"
        )
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
        "environment": ENVIRONMENT,
        "features": [
            "Idea Validation",
            "Research Papers",
            "Roadmap Generation", 
            "User Management",
            "Team Finder"
        ]
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected" if db is not None else "error",
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



@app.post("/api/team-search")
async def search_team_members(search_input: TeamSearchInput, current_user=Depends(get_current_user)):
    """Search for team members with profile completion check"""
    try:
        user_id = str(current_user["_id"])
        
        # Check if current user's profile is complete
        user_profile = get_user_profile(user_id)
        if not user_profile:
            raise HTTPException(
                status_code=400,
                detail="Please create your profile before searching for team members"
            )
        
        is_complete, missing_fields = check_profile_completion_helper(user_profile)
        if not is_complete:
            raise HTTPException(
                status_code=400,
                detail=f"Please complete your profile. Missing fields: {', '.join(missing_fields)}"
            )
        
        # Validate required skills
        if not search_input.required_skills or len(search_input.required_skills) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one required skill must be specified"
            )
        
        # Get all profiles except current user
        query = {"user_id": {"$ne": ObjectId(user_id)}}
        profiles_cursor = profiles_collection.find(query)
        
        matched_profiles = []
        
        for profile in profiles_cursor:
            # Calculate match score
            match_score, matched_skills, matched_interests = calculate_match_score_and_details(
                profile,
                search_input.dict()
            )
            
            # Only include profiles with >= 30% match
            if match_score >= 30:
                user = users_collection.find_one({"_id": profile["user_id"]})
                if user:
                    profile_id = str(profile["user_id"])
                    connection_status = get_connection_status(user_id, profile_id)
                    
                    matched_profile = {
                        "id": profile_id,
                        "name": user.get("name", "Unknown"),
                        "email": user.get("email", ""),
                        "phone": profile.get("phone", ""),
                        "role": profile.get("role", ""),
                        "skills": profile.get("skills", []),
                        "interests": profile.get("interests", []),
                        "current_role": profile.get("role", ""),  # Using role field
                        "experience": profile.get("experience", ""),
                        "availability": profile.get("availability", ""),
                        "location": profile.get("location", ""),
                        "match_score": match_score,
                        "matched_skills": matched_skills,
                        "matched_interests": matched_interests,
                        "connection_status": connection_status
                    }
                    matched_profiles.append(matched_profile)
        
        # Sort by match score
        matched_profiles.sort(key=lambda x: x["match_score"], reverse=True)
        
        return {
            "profiles": matched_profiles[:20],
            "total": len(matched_profiles),
            "search_criteria": search_input.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Team search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@app.post("/api/connection-requests/{request_id}/respond")
async def respond_to_request_api(
    request_id: str, 
    response_data: ConnectionResponseInput, 
    current_user=Depends(get_current_user)
):
    """Respond to connection request - POST with /respond"""
    try:
        user_id = str(current_user["_id"])
        logger.info(f"📨 Responding to request {request_id}: {response_data.action} by user {user_id}")
        
        success = respond_to_connection_request(request_id, response_data.action, user_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to process connection request")
        
        action_text = "accepted" if response_data.action == "accept" else "rejected"
        logger.info(f"✅ Request {request_id} {action_text} successfully")
        
        return {
            "message": f"Connection request {action_text} successfully",
            "status": action_text
        }
        
    except ValueError as e:
        logger.error(f"❌ Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error responding to request: {e}")
        raise HTTPException(status_code=500, detail="Failed to process connection request")

@app.get("/api/connection-requests/received")
async def get_received_requests(current_user=Depends(get_current_user)):
    """Get received connection requests"""
    try:
        user_id = str(current_user["_id"])
        requests = get_connection_requests(user_id, "received")
        return {"requests": requests, "total": len(requests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get requests")


@app.put("/api/connection-requests/{request_id}")
async def respond_to_request_api(
    request_id: str, 
    response_data: ConnectionResponseInput, 
    current_user=Depends(get_current_user)
):
    """Respond to connection request - PUT endpoint"""
    try:
        user_id = str(current_user["_id"])
        logger.info(f"📨 Responding to request {request_id}: {response_data.action} by user {user_id}")
        
        success = respond_to_connection_request(request_id, response_data.action, user_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to process connection request")
        
        action_text = "accepted" if response_data.action == "accept" else "rejected"
        logger.info(f"✅ Request {request_id} {action_text} successfully")
        
        return {
            "message": f"Connection request {action_text} successfully",
            "status": action_text
        }
        
    except ValueError as e:
        logger.error(f"❌ Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error responding to request: {e}")
        raise HTTPException(status_code=500, detail="Failed to process connection request")

@app.get("/api/connection-status/{target_user_id}")
async def check_connection_status_api(target_user_id: str, current_user=Depends(get_current_user)):
    """Check connection status"""
    try:
        user_id = str(current_user["_id"])
        status = get_connection_status(user_id, target_user_id)
        return {"status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to check status")
# Add this temporary endpoint to main.py
@app.delete("/api/debug/delete-request/{sender_id}/{receiver_id}")
async def delete_duplicate_request(sender_id: str, receiver_id: str, current_user=Depends(get_current_user)):
    """Debug: Delete a specific connection request"""
    try:
        result = connection_requests_collection.delete_one({
            "sender_id": ObjectId(sender_id),
            "receiver_id": ObjectId(receiver_id)
        })
        
        return {
            "deleted": result.deleted_count > 0,
            "count": result.deleted_count
        }
    except Exception as e:
        return {"error": str(e)}
@app.get("/api/connections")
async def get_connections_api(current_user=Depends(get_current_user)):
    """Get connected users"""
    try:
        user_id = str(current_user["_id"])
        connected_profiles = get_connected_profiles(user_id)
        return {"connections": connected_profiles}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get connections")

@app.post("/api/conversations")
async def create_conversation_api(request_data: dict, current_user=Depends(get_current_user)):
    """Create conversation between connected users"""
    try:
        user_id = str(current_user["_id"])
        target_user_id = request_data.get("target_user_id")
        
        if not target_user_id:
            raise HTTPException(status_code=400, detail="target_user_id required")
        
        conversation_id = create_conversation(user_id, target_user_id)
        target_user = get_user_by_id(target_user_id)
        
        return {
            "id": conversation_id,
            "participant_ids": [user_id, target_user_id],
            "participant_names": [
                current_user.get("name", "Unknown"),
                target_user.get("name", "Unknown") if target_user else "Unknown"
            ]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create conversation")

@app.post("/api/messages")
async def send_message_api(message_data: MessageInput, current_user=Depends(get_current_user)):
    """Send message"""
    try:
        user_id = str(current_user["_id"])
        message = send_message(user_id, message_data.conversation_id, message_data.content)
        return message
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send message")

@app.get("/api/messages/{conversation_id}")
async def get_messages_api(
    conversation_id: str, 
    current_user=Depends(get_current_user), 
    skip: int = 0, 
    limit: int = 50
):
    """Get conversation messages"""
    try:
        user_id = str(current_user["_id"])
        messages = get_messages(user_id, conversation_id, skip, limit)
        return {"messages": messages}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get messages")
    
@app.delete("/api/connections/{target_user_id}")
async def disconnect_user(target_user_id: str, current_user=Depends(get_current_user)):
    """Disconnect from a connected user"""
    try:
        user_id = str(current_user["_id"])
        
        # Check if users are actually connected
        if get_connection_status(user_id, target_user_id) != "connected":
            raise HTTPException(status_code=400, detail="Users are not connected")
        
        success = disconnect_users(user_id, target_user_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to disconnect")
        
        return {"message": "Successfully disconnected"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Disconnect failed")
# Add this right after the existing endpoints and BEFORE the if __name__ == "__main__": block

# ==============================================
# CHATBOT ENDPOINTS SETUP (FIXED)
# ==============================================


# ==============================================
# APPLICATION STARTUP
# ==============================================

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment (Render will set this)
    port = int(os.getenv("PORT", 8000))
    
    print("\n" + "="*60)
    print(f"🚀 STARTUP GPS API SERVER ({ENVIRONMENT.upper()})")
    print("="*60)
    print(f"🌐 Server URL: http://0.0.0.0:{port}")
    print(f"📖 API Docs: http://0.0.0.0:{port}/docs")
    print(f"🔧 Health Check: http://0.0.0.0:{port}/health")
    print(f"🌍 CORS Origins: {allowed_origins}")
    print("="*60)
    print("✅ All systems ready! Starting server...")
    print("="*60 + "\n")
    
    uvicorn.run(
        app, 
        host="0.0.0.0",  # Listen on all interfaces for Render
        port=port, 
        log_level="info"
    )
