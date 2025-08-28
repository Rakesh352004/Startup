from fastapi import FastAPI, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import os
import jwt
import requests
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from pymongo import errors
from bson import ObjectId
import httpx
from dotenv import load_dotenv
from xml.etree import ElementTree
import re
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from database import users_collection,ideas_collection,profiles_collection,roadmaps_collection,research_collection

# Database imports
from database import (
    hash_password, verify_password, create_access_token,
    get_user_by_id, get_user_profile, update_user_profile,
    create_roadmap, get_roadmap_by_id, get_user_roadmaps,
    update_roadmap, delete_roadmap, get_user_by_id,save_research,get_research_by_id, get_user_research_history
# Mock imports for external paper fetchers
)

load_dotenv()

# Constants
DEVELOPER_EMAILS = {"ry352004@gmail.com"}
JWT_SECRET = os.environ.get("JWT_SECRET", "fallback_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY")  # Add this to your .env file
SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1/paper/search"
ARXIV_API = "https://export.arxiv.org/api/query"
CROSSREF_API = "https://api.crossref.org/works"

# Initialize FastAPI
app = FastAPI(
    title="Research Advisor API",
    description="API for fetching academic research papers",
    version="1.0.0"
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

# Security
security = HTTPBearer(auto_error=False)

# Models
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

class IdeaInput(BaseModel):
    prompt: str

class IdeaResponse(BaseModel):
    prompt: str
    validation: str
    created_at: datetime

# Update the ProfileBase model to match your frontend changes
class ProfileBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    preferred_role: Optional[str] = None  # Changed from role_preference
    experience: Optional[str] = None      # Changed from experience_level
    availability: Optional[str] = None    # Changed from int to string
    location: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    user_id: str
    updated_at: datetime


class Author(BaseModel):
    """Pydantic model for an author of a paper."""
    name: str

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

# ---
# 3. Real Database & Mock Functions
# ---

def save_research(user_id: str, research_data: dict) -> str:
    """Saves a new research document to the MongoDB database."""
    logging.info(f"Attempting to save research for user {user_id}")
    try:
        user_obj_id = ObjectId(user_id)
        research_doc = {
            "user_id": user_obj_id,
            "idea": research_data["idea"],
            "search_terms": research_data.get("search_terms", []),
            "papers": research_data.get("papers", []),
            "created_at": datetime.utcnow()
        }
        
        result = research_collection.insert_one(research_doc)
        logging.info(f"Successfully saved research with ID: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        logging.error(f"Failed to save research to database: {e}")
        raise HTTPException(status_code=500, detail="Database save failed.")

def generate_search_terms(idea: str) -> List[str]:
    """A mock function to generate search terms."""
    return ["machine learning", "agriculture", "precision farming"]

def paper_score(paper: ResearchPaper) -> float:
    """A mock function to score papers."""
    return 1.0

# Helper Functions
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

def create_access_token_helper(subject: str, role: str = "user"):
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + timedelta(days=1),
        "role": role
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def call_groq_validation(prompt: str) -> str:
    if not GROQ_API_KEY:
        return f"Mock validation for: {prompt[:100]}... This startup idea has potential in the current market. Consider focusing on user acquisition and product-market fit."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": "You are a startup idea validation assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code != 200:
            return f"Validation service temporarily unavailable. Mock validation: {prompt[:100]}..."
        
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Groq API error: {e}")
        return f"Mock validation for: {prompt[:100]}... This startup idea shows promise. Focus on market research and MVP development."

def generate_search_terms(idea: str) -> List[str]:
    """Generate more precise search terms from the startup idea"""
    if not GROQ_API_KEY:
        # Enhanced fallback with domain-specific terms
        words = re.findall(r'\b\w{3,}\b', idea.lower())
        stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'your', 'have', 'from'}
        filtered_words = [word for word in words if word not in stop_words]
        
        # Add domain-specific terms based on context
        domain_terms = []
        idea_lower = idea.lower()
        
        if any(term in idea_lower for term in ['ai', 'artificial', 'machine learning', 'ml']):
            domain_terms.extend(['artificial intelligence', 'machine learning', 'neural networks'])
        if any(term in idea_lower for term in ['agriculture', 'farming', 'crop', 'soil']):
            domain_terms.extend(['agriculture', 'precision farming', 'crop yield'])
        if any(term in idea_lower for term in ['health', 'medical', 'patient', 'diagnosis']):
            domain_terms.extend(['healthcare', 'medical technology', 'clinical'])
        
        return (domain_terms + filtered_words)[:5]
    
    # Use Groq API for better term extraction
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # More specific prompt for academic research
    prompt = f"""
    Extract 3-5 precise technical and academic search terms from this startup idea: {idea}
    Focus on terms that would be effective for searching academic databases like Semantic Scholar, arXiv, and CrossRef.
    Return ONLY the terms separated by commas, no explanations or extra text.
    """
    
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {
                "role": "system", 
                "content": "You are an expert research assistant. Extract precise academic search terms that would return highly relevant research papers."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "temperature": 0.1,
        "max_tokens": 50
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"].strip()
            # Clean up the response
            terms = [term.strip().strip('"').strip("'") for term in content.split(",")]
            clean_terms = []
            for term in terms:
                if (term and len(term) > 2 and not term.isdigit() and 
                    not term.startswith("Here") and not term.lower() in ['the', 'and', 'for']):
                    clean_terms.append(term)
            
            if clean_terms:
                return clean_terms[:5]
    except Exception as e:
        print(f"Error generating search terms with Groq: {e}")
    
    # Fallback to the enhanced method
    return generate_search_terms.fallback(idea)
import asyncio
import httpx
from typing import List, Optional
import xml.etree.ElementTree as ET
import re
from datetime import datetime

async def fetch_semantic_scholar(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from Semantic Scholar with improved error handling"""
    try:
        query = " ".join(search_terms[:2])
        params = {
            "query": query,
            "limit": min(max_results, 10),
            "fields": "title,authors,abstract,year,url,externalIds,citationCount",
            "sort": "relevance"
        }

        headers = {
            "User-Agent": "Research-Advisor-API/1.0 (contact@researchadvisor.com)"
        }

        if SEMANTIC_SCHOLAR_API_KEY:
            headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(SEMANTIC_SCHOLAR_API, params=params, headers=headers)
            
            if response.status_code != 200:
                print(f"Semantic Scholar error {response.status_code}: {response.text[:200]}")
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
                    print(f"Error processing Semantic Scholar paper: {e}")
                    continue
                    
            return papers
            
    except Exception as e:
        print(f"Semantic Scholar fetch failed: {e}")
        return []
ARXIV_API = "https://export.arxiv.org/api/query"

import httpx
import xml.etree.ElementTree as ET
from typing import List

async def fetch_arxiv(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from arXiv with query mapping + fallback"""
    try:
        if not search_terms:
            return []

        # --- Step 1: Build query (simplified) ---
        # Use simple search terms without complex formatting
        query_terms = []
        for term in search_terms[:3]:
            words = term.split()[:2]  # Take first 2 words
            for word in words:
                if len(word) > 2:  # Skip very short words
                    query_terms.append(word)
        
        query = " OR ".join(query_terms[:5])  # Limit to 5 terms max
        
        params = {
            "search_query": query,
            "start": 0,
            "max_results": min(max_results, 20),
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"
        }

        # Use correct arXiv API URL
        ARXIV_API = "http://export.arxiv.org/api/query"
        
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(ARXIV_API, params=params, headers=headers)
            print("arXiv query:", query)  # debug line
            print("Response status:", response.status_code)  # debug line

            if response.status_code != 200:
                print(f"arXiv error {response.status_code}: {response.text[:200]}")
                return []

            papers = parse_arxiv_response(response.text, max_results)
            print(f"Found {len(papers)} papers")  # debug line

            # --- Step 3: Fallback if nothing found ---
            if not papers:
                print("No arXiv results → retrying with fallback terms...")
                fallback_query = "machine learning OR neural network OR optimization"
                params["search_query"] = fallback_query
                response = await client.get(ARXIV_API, params=params, headers=headers)
                print("arXiv fallback query:", fallback_query)
                if response.status_code == 200:
                    papers = parse_arxiv_response(response.text, max_results)

            return papers[:max_results]

    except Exception as e:
        print(f"arXiv fetch failed: {e}")
        return []

def parse_arxiv_response(xml_text: str, max_results: int) -> List[ResearchPaper]:
    """Helper to parse arXiv XML into ResearchPaper objects"""
    try:
        # Add debug output
        print(f"XML response length: {len(xml_text)}")
        print("XML first 200 chars:", xml_text[:200])
        
        root = ET.fromstring(xml_text)
        papers = []

        # Check for errors in the response
        error_elem = root.find('.//{http://www.w3.org/2005/Atom}title')
        if error_elem is not None and "Error" in error_elem.text:
            print(f"arXiv API error: {error_elem.text}")
            return []

        entries = root.findall('{http://www.w3.org/2005/Atom}entry')
        print(f"Found {len(entries)} entries in XML")  # debug line

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
                print(f"Error processing arXiv entry: {e}")
                continue

        return papers[:max_results]
        
    except ET.ParseError as e:
        print(f"XML parsing error: {e}")
        print("Raw XML:", xml_text[:500])
        return []
    except Exception as e:
        print(f"Error parsing arXiv response: {e}")
        return []


async def fetch_crossref(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    """Fetch papers from CrossRef with improved error handling"""
    try:
        query = " ".join(search_terms[:2])
        params = {
            "query": query,
            "rows": min(max_results, 20),
            "sort": "relevance",
            "select": "title,author,abstract,created,URL,DOI,published-print,published-online"
        }
        
        headers = {
            "User-Agent": "Research-Advisor-API/1.0 (mailto:contact@researchadvisor.com)"
        }
        
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.get(CROSSREF_API, params=params, headers=headers)
            
            if response.status_code != 200:
                print(f"CrossRef error {response.status_code}: {response.text[:200]}")
                return []
                
            data = response.json()
            papers = []
            
            for item in data.get("message", {}).get("items", []):
                try:
                    # Handle title (can be a list)
                    title_list = item.get("title", [])
                    title = " ".join(title_list) if isinstance(title_list, list) else str(title_list)
                    title = title.strip()
                    if not title:
                        continue
                    
                    # Handle abstract
                    abstract = item.get("abstract", "")
                    if not abstract:
                        abstract = "No abstract available"
                    if len(abstract) > 500:
                        abstract = abstract[:500] + "..."
                    
                    # Handle authors
                    authors = []
                    for author in item.get("author", []):
                        given = author.get("given", "")
                        family = author.get("family", "")
                        author_name = f"{given} {family}".strip()
                        if author_name:
                            authors.append(author_name)
                    
                    # Handle publication date
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
                    print(f"Error processing CrossRef item: {e}")
                    continue
                    
            return papers
            
    except Exception as e:
        print(f"CrossRef fetch failed: {e}")

# Routes
@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: RegisterIn):
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
    user = users_collection.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = "developer" if credentials.email.lower() in DEVELOPER_EMAILS else "user"
    token = create_access_token_helper(subject=str(user["_id"]), role=role)
    return {"access_token": token}

from datetime import datetime
from fastapi import Depends, HTTPException
from bson import ObjectId

from datetime import datetime, timedelta

from bson import ObjectId

from fastapi import HTTPException, Depends
from datetime import datetime, timedelta
from bson import ObjectId

@app.get("/dashboard-data")
def get_dashboard_data(current_user=Depends(get_current_user)):
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

        def count_user_documents(collection, user_id):
            count_objectid = collection.count_documents({"user_id": user_id})
            count_string = collection.count_documents({"user_id": str(user_id)})
            return max(count_objectid, count_string)

        # Build users list
        users_cursor = users_collection.find({"email": {"$ne": "ry352004@gmail.com"}})
        users_list = []

        for user in users_cursor:
            user_id = user["_id"]
            user_id_str = str(user_id)

            profile = profiles_collection.find_one({"user_id": user_id}) or profiles_collection.find_one({"user_id": user_id_str}) or {}

            user_ideas_count = count_user_documents(ideas_collection, user_id)
            user_roadmaps_count = count_user_documents(roadmaps_collection, user_id)
            user_researches_count = count_user_documents(research_collection, user_id)

            validations_objectid = list(ideas_collection.find(
                {"user_id": user_id},
                {"_id": 0, "prompt": 1, "validation": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5))

            validations_string = list(ideas_collection.find(
                {"user_id": user_id_str},
                {"_id": 0, "prompt": 1, "validation": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5))

            validations = validations_objectid if validations_objectid else validations_string

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



# AI Validation + Suggestions (No Authentication)
# --------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------- Existing Imports ----------------
# (your login/authentication imports here)
# --------------------------------------------------

# ---------------- New Imports ----------------
import json, re, requests, os
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field
# ----------------------------------------------


# Environment variable for GROQ API (you'll need to set this)
import os
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # Make sure to set this in your environment

# Pydantic models
class IdeaInput(BaseModel):
    prompt: str = Field(..., min_length=30, max_length=2000)

class ValidationScores(BaseModel):
    overall: int
    feasibility: int
    marketDemand: int
    uniqueness: int
    strength: int
    riskFactors: int

class ValidationDetails(BaseModel):
    verdict: str
    feasibility: str
    marketDemand: str
    uniqueness: str
    strength: str
    riskFactors: str
    existingCompetitors: str

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

def call_groq_validation(prompt: str) -> dict:
    """
    Enhanced validation function using the comprehensive AI prompt system
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")

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
   - **Critical Improvements (⚠ must-do fixes)** – 3 to 5 items
   - **Recommended Enhancements (✓ should-do improvements)** – 3 to 5 items
   - **Optional Considerations (• nice-to-have ideas)** – 2 to 4 items

4. Add detailed analysis for each dimension:
   - Feasibility (timeline, complexity, scalability)
   - Market Demand (target audience, adoption signals, growth potential)
   - Uniqueness (differentiation vs competitors, barriers to entry)
   - Strength (value proposition, monetization, scalability potential)
   - Risk Factors (competition, adoption, finance, tech)
   - Existing Competitors (real names where possible, differentiation opportunities)

5. Always adapt output **directly to the user's startup idea**.
   - Do NOT give generic or repeated responses.
   - Each section must be grounded in the specific industry/domain of the idea.
   - Avoid filler text.

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
    "existing_competitors": "Real competitor analysis..."
  },
  "suggestions": {
    "critical": ["Item 1", "Item 2", "Item 3"],
    "recommended": ["Item 1", "Item 2", "Item 3"],
    "optional": ["Item 1", "Item 2"]
  }
}

Provide ONLY the JSON response with no additional text."""

    user_prompt = f"Please validate this startup idea comprehensively: {prompt}"

    payload = {
        "model": "llama3-70b-8192",  # Using more powerful model for better analysis
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent analysis
        "max_tokens": 4000
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get response from Groq API")

        data = response.json()
        ai_text = data["choices"][0]["message"]["content"]
        
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
        except json.JSONDecodeError:
            # Fallback: try to extract data using regex patterns
            result = parse_fallback_response(ai_text)
        
        return result
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation processing failed: {str(e)}")

def parse_fallback_response(text: str) -> dict:
    """
    Fallback parser in case JSON parsing fails
    """
    # Extract scores using regex patterns
    overall_score = extract_score(text, r"overall[_\s]*score[\"']?\s*:\s*(\d+)")
    feasibility_score = extract_score(text, r"feasibility[\"']?\s*:\s*(\d+)")
    market_score = extract_score(text, r"market[_\s]*demand[\"']?\s*:\s*(\d+)")
    uniqueness_score = extract_score(text, r"uniqueness[\"']?\s*:\s*(\d+)")
    strength_score = extract_score(text, r"strength[\"']?\s*:\s*(\d+)")
    risk_score = extract_score(text, r"risk[_\s]*factors[\"']?\s*:\s*(\d+)")
    
    # Extract analysis sections
    verdict = extract_section(text, r"verdict[\"']?\s*:\s*[\"'](.*?)[\"']", "Strong potential identified with key areas for development.")
    feasibility = extract_section(text, r"feasibility[\"']?\s*:\s*[\"'](.*?)[\"']", "Technical implementation appears feasible with proper planning.")
    market_demand = extract_section(text, r"market[_\s]*demand[\"']?\s*:\s*[\"'](.*?)[\"']", "Market shows promising demand indicators.")
    uniqueness = extract_section(text, r"uniqueness[\"']?\s*:\s*[\"'](.*?)[\"']", "Concept demonstrates notable differentiation opportunities.")
    strength = extract_section(text, r"strength[\"']?\s*:\s*[\"'](.*?)[\"']", "Core strengths provide solid foundation for growth.")
    risk_factors = extract_section(text, r"risk[_\s]*factors[\"']?\s*:\s*[\"'](.*?)[\"']", "Manageable risks identified with mitigation strategies available.")
    competitors = extract_section(text, r"competitors[\"']?\s*:\s*[\"'](.*?)[\"']", "Competitive landscape analysis reveals positioning opportunities.")
    
    # Extract suggestions
    critical = extract_suggestions(text, "critical")
    recommended = extract_suggestions(text, "recommended")
    optional = extract_suggestions(text, "optional")
    
    return {
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
            "existing_competitors": competitors
        },
        "suggestions": {
            "critical": critical,
            "recommended": recommended,
            "optional": optional
        }
    }

def extract_score(text: str, pattern: str) -> int:
    """Extract numeric score from text using regex pattern"""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return min(100, max(0, int(match.group(1))))
    return 70  # Default score

def extract_section(text: str, pattern: str, default: str) -> str:
    """Extract analysis section from text"""
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()[:500]  # Limit length
    return default

def extract_suggestions(text: str, category: str) -> List[str]:
    """Extract suggestion items from text"""
    # Look for the category followed by suggestions
    pattern = rf"{category}[\"']?\s*:\s*\[(.*?)\]"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    
    if match:
        suggestions_text = match.group(1)
        # Parse individual suggestions
        suggestions = re.findall(r'["\']([^"\']+)["\']', suggestions_text)
        return suggestions[:5]  # Limit to 5 suggestions
    
    # Fallback: look for bullet points or numbered lists
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
                    suggestions.append(suggestion[:100])  # Limit length
            elif line.strip() and not line.startswith(' '):
                break
    
    return suggestions[:5] if suggestions else [f"No specific {category} suggestions identified"]

# API Endpoints

@app.post("/validate-idea", response_model=ValidationResponse)
async def validate_idea(idea: IdeaInput):
    """
    Enhanced idea validation endpoint with comprehensive AI analysis (No Authentication Required)
    """
    try:
        # Get AI validation
        ai_result = call_groq_validation(idea.prompt)
        
        # Structure the response to match frontend expectations
        validation_response = ValidationResponse(
            prompt=idea.prompt,
            validation=ValidationDetails(
                verdict=ai_result["analysis"]["verdict"],
                feasibility=ai_result["analysis"]["feasibility"],
                marketDemand=ai_result["analysis"]["market_demand"],
                uniqueness=ai_result["analysis"]["uniqueness"],
                strength=ai_result["analysis"]["strength"],
                riskFactors=ai_result["analysis"]["risk_factors"],
                existingCompetitors=ai_result["analysis"]["existing_competitors"]
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
        
        # You can optionally save to database here if needed
        # For now, just return the response
        
        return validation_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.post("/profile", response_model=ProfileResponse)
async def create_or_update_profile(
    profile: ProfileCreate,
    current_user=Depends(get_current_user)
):
    profile_data = profile.dict()
    profile_data.update({
        "user_id": current_user["_id"],
        "updated_at": datetime.utcnow()
    })
    
    try:
        update_user_profile(current_user["_id"], profile_data)
        updated_profile = get_user_profile(current_user["_id"])
        if not updated_profile:
            raise HTTPException(status_code=400, detail="Profile not saved correctly")
        updated_profile["user_id"] = str(updated_profile["user_id"])
        return updated_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/profile", response_model=ProfileResponse)
async def edit_profile(
    profile: ProfileCreate,
    current_user=Depends(get_current_user)
):
    existing_profile = get_user_profile(current_user["_id"])
    if not existing_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile_data = profile.dict()
    profile_data.update({
        "user_id": current_user["_id"],
        "updated_at": datetime.utcnow()
    })
    
    try:
        update_user_profile(current_user["_id"], profile_data)
        updated_profile = get_user_profile(current_user["_id"])
        updated_profile["user_id"] = str(updated_profile["user_id"])
        return updated_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user=Depends(get_current_user)):
    profile = get_user_profile(current_user["_id"])
    if not profile:
        profile = {
            "user_id": current_user["_id"],
            "name": current_user.get("name", "New User"),
            "email": current_user.get("email", ""),
            "updated_at": datetime.utcnow()
        }
        update_user_profile(current_user["_id"], profile)
    profile["user_id"] = str(profile["user_id"])
    return profile





import asyncio
import re
import logging
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
from pydantic import BaseModel, Field
import requests
from fastapi import HTTPException, Depends

# Enhanced Pydantic models
class RoadmapInput(BaseModel):
    prompt: str = Field(..., min_length=20, description="Detailed startup idea description")
    timeframe: str = Field(..., description="Project timeline (e.g., '3 months', '6 months', '12 months')")
    industry: Optional[str] = Field(None, description="Industry category (e.g., 'fintech', 'edtech', 'marketplace')")
    target_market: Optional[str] = Field(None, description="Target market or audience")
    funding_stage: Optional[str] = Field("pre-seed", description="Current funding stage")

class PhaseDetail(BaseModel):
    name: str
    duration: str
    description: str
    key_tasks: List[str]
    implementation_steps: List[str]
    success_metrics: List[str]
    risks: List[str]
    resources_needed: List[str]
    deliverables: List[str]

class RoadmapAnalysis(BaseModel):
    overview: str
    phases: List[PhaseDetail]
    total_duration: str
    key_risks: List[str]
    success_factors: List[str]
    resource_requirements: Dict[str, Any]
    competitive_considerations: List[str]
    regulatory_considerations: List[str]

class RoadmapResponse(BaseModel):
    id: str
    prompt: str
    timeframe: str
    industry: Optional[str]
    target_market: Optional[str]
    roadmap: str
    roadmap_analysis: Optional[RoadmapAnalysis]
    research_insights: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    user_id: str

class RoadmapUpdate(BaseModel):
    prompt: Optional[str] = None
    timeframe: Optional[str] = None
    industry: Optional[str] = None
    target_market: Optional[str] = None
    roadmap: Optional[str] = None

# Enhanced AI roadmap generation with research integration
async def call_groq_roadmap_enhanced(
    prompt: str, 
    timeframe: str, 
    industry: Optional[str] = None,
    target_market: Optional[str] = None,
    research_papers: Optional[List[Any]] = None
) -> tuple[str, RoadmapAnalysis]:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")

    # Extract insights from research papers
    research_insights = []
    if research_papers:
        for paper in research_papers[:5]:  # Use top 5 papers
            if hasattr(paper, 'abstract') and paper.abstract:
                abstract_summary = paper.abstract[:200] + "..." if len(paper.abstract) > 200 else paper.abstract
                research_insights.append(f"Research insight from '{paper.title}': {abstract_summary}")

    # Determine phase structure based on timeframe
    phase_config = get_phase_configuration(timeframe)
    
    # Build context-aware system prompt
    system_prompt = f"""You are an expert startup strategist and roadmap architect with deep industry knowledge. 
    Generate a comprehensive, actionable roadmap that goes beyond generic startup advice.

    CONTEXT:
    - Startup Idea: {prompt}
    - Industry: {industry or 'Not specified'}
    - Target Market: {target_market or 'Not specified'}
    - Timeframe: {timeframe}
    - Total Phases: {phase_config['num_phases']}
    - Phase Duration: {phase_config['phase_duration']}

    RESEARCH INSIGHTS:
    {chr(10).join(research_insights) if research_insights else 'No research data available'}

    REQUIREMENTS:
    1. Create {phase_config['num_phases']} phases, each lasting approximately {phase_config['phase_duration']}
    2. Make each phase specific to the business model and industry
    3. Include measurable KPIs and success criteria
    4. Address unique technical and business challenges
    5. Consider regulatory and compliance requirements
    6. Include risk mitigation strategies
    7. Specify resource allocation and team needs

    INDUSTRY-SPECIFIC CONSIDERATIONS:
    {get_industry_considerations(industry, prompt)}

    Structure your response as valid JSON with this exact schema:
    {{
        "overview": "3-4 sentence strategic summary",
        "phases": [
            {{
                "name": "Phase name",
                "duration": "X months",
                "description": "Detailed phase description",
                "key_tasks": ["specific task 1", "specific task 2", "specific task 3"],
                "implementation_steps": ["detailed step 1", "detailed step 2", "detailed step 3"],
                "success_metrics": ["KPI 1", "KPI 2", "KPI 3"],
                "risks": ["risk 1", "risk 2"],
                "resources_needed": ["resource 1", "resource 2"],
                "deliverables": ["deliverable 1", "deliverable 2"]
            }}
        ],
        "key_risks": ["overall risk 1", "overall risk 2", "overall risk 3"],
        "success_factors": ["factor 1", "factor 2", "factor 3"],
        "resource_requirements": {{
            "team_size": "X-Y people",
            "estimated_budget": "$X-Y",
            "key_hires": ["role 1", "role 2"]
        }},
        "competitive_considerations": ["consideration 1", "consideration 2"],
        "regulatory_considerations": ["requirement 1", "requirement 2"]
    }}"""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama3-70b-8192",  # Using more powerful model
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a comprehensive roadmap for: {prompt}"}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent output
        "max_tokens": 4000
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        ai_response = data["choices"][0]["message"]["content"]
        
        # Parse JSON response
        import json
        try:
            analysis_data = json.loads(ai_response)
            roadmap_analysis = RoadmapAnalysis(**analysis_data)
            
            # Generate formatted roadmap text
            roadmap_text = format_roadmap_text(roadmap_analysis)
            
            return roadmap_text, roadmap_analysis
            
        except json.JSONDecodeError:
            # Fallback to text parsing if JSON fails
            roadmap_analysis = parse_text_roadmap(ai_response)
            return ai_response, roadmap_analysis
            
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Groq API request failed: {str(e)}")

def get_phase_configuration(timeframe: str) -> Dict[str, Any]:
    """Determine optimal phase structure based on timeframe"""
    timeframe_lower = timeframe.lower()
    
    if "3" in timeframe_lower and "month" in timeframe_lower:
        return {"num_phases": 3, "phase_duration": "1 month"}
    elif "6" in timeframe_lower and "month" in timeframe_lower:
        return {"num_phases": 4, "phase_duration": "1.5 months"}
    elif "9" in timeframe_lower and "month" in timeframe_lower:
        return {"num_phases": 5, "phase_duration": "1.8 months"}
    elif "12" in timeframe_lower and "month" in timeframe_lower:
        return {"num_phases": 6, "phase_duration": "2 months"}
    elif "18" in timeframe_lower and "month" in timeframe_lower:
        return {"num_phases": 8, "phase_duration": "2.25 months"}
    else:
        return {"num_phases": 6, "phase_duration": "2 months"}

def get_industry_considerations(industry: Optional[str], prompt: str) -> str:
    """Generate industry-specific considerations"""
    if not industry:
        # Try to infer industry from prompt
        prompt_lower = prompt.lower()
        if any(word in prompt_lower for word in ["fintech", "payment", "banking", "finance"]):
            industry = "fintech"
        elif any(word in prompt_lower for word in ["education", "learning", "teaching", "course"]):
            industry = "edtech"
        elif any(word in prompt_lower for word in ["marketplace", "peer-to-peer", "p2p", "trading"]):
            industry = "marketplace"
        elif any(word in prompt_lower for word in ["health", "medical", "healthcare"]):
            industry = "healthtech"
        elif any(word in prompt_lower for word in ["saas", "software", "platform", "api"]):
            industry = "saas"
    
    considerations = {
        "fintech": """
        - PCI DSS compliance and financial regulations
        - Banking partnerships and payment processor integrations
        - KYC/AML requirements and identity verification
        - Data security and encryption standards
        - Regulatory approval processes (varies by jurisdiction)
        """,
        "edtech": """
        - COPPA compliance for users under 13
        - Content quality and educational effectiveness metrics
        - Teacher/instructor onboarding and verification
        - Learning analytics and progress tracking systems
        - Integration with existing educational platforms
        """,
        "marketplace": """
        - Two-sided market dynamics and network effects
        - Trust and safety systems (ratings, reviews, dispute resolution)
        - Payment processing and escrow systems
        - Content moderation and user verification
        - Liquidity challenges and chicken-egg problem
        """,
        "healthtech": """
        - HIPAA compliance and patient data protection
        - FDA regulatory considerations for medical devices
        - Clinical validation and evidence generation
        - Healthcare provider partnerships
        - Insurance and reimbursement considerations
        """,
        "saas": """
        - Scalable architecture and multi-tenancy
        - Data security and SOC 2 compliance
        - API design and integration capabilities
        - Customer success and churn reduction strategies
        - Pricing model optimization and usage tracking
        """
    }
    
    return considerations.get(industry, "General considerations: Focus on user experience, scalability, and market fit.")

def format_roadmap_text(analysis: RoadmapAnalysis) -> str:
    """Format the structured roadmap analysis into readable text"""
    text = f"Overview:\n{analysis.overview}\n\n"
    
    for i, phase in enumerate(analysis.phases, 1):
        text += f"Phase {i}: {phase.name} ({phase.duration})\n"
        text += f"Description: {phase.description}\n\n"
        text += "Key Tasks:\n"
        for task in phase.key_tasks:
            text += f"• {task}\n"
        text += "\nImplementation Steps:\n"
        for step in phase.implementation_steps:
            text += f"• {step}\n"
        text += f"\nSuccess Metrics: {', '.join(phase.success_metrics)}\n"
        text += f"Key Risks: {', '.join(phase.risks)}\n"
        text += f"Resources Needed: {', '.join(phase.resources_needed)}\n\n"
    
    text += f"Overall Success Factors: {', '.join(analysis.success_factors)}\n"
    text += f"Key Risks: {', '.join(analysis.key_risks)}\n"
    
    return text

def parse_text_roadmap(text: str) -> RoadmapAnalysis:
    """Fallback parser for text-based roadmap responses"""
    # This is a simplified parser - in production, you'd want more robust parsing
    lines = text.split('\n')
    
    # Extract overview
    overview = ""
    phases = []
    
    for line in lines:
        if line.strip().startswith("Overview:"):
            overview = line.replace("Overview:", "").strip()
            break
    
    # Create basic phase structure
    phase_count = 6  # Default
    for i in range(1, phase_count + 1):
        phases.append(PhaseDetail(
            name=f"Phase {i}",
            duration="2 months",
            description="Phase description",
            key_tasks=["Task 1", "Task 2"],
            implementation_steps=["Step 1", "Step 2"],
            success_metrics=["Metric 1"],
            risks=["Risk 1"],
            resources_needed=["Resource 1"],
            deliverables=["Deliverable 1"]
        ))
    
    return RoadmapAnalysis(
        overview=overview or "Strategic roadmap for startup development",
        phases=phases,
        total_duration="12 months",
        key_risks=["Market competition", "Resource constraints"],
        success_factors=["Strong execution", "Market validation"],
        resource_requirements={"team_size": "3-5 people", "estimated_budget": "$50k-100k", "key_hires": ["Developer", "Marketer"]},
        competitive_considerations=["Market differentiation required"],
        regulatory_considerations=["Standard business compliance"]
    )

# Enhanced API endpoints
@app.post("/roadmaps", response_model=RoadmapResponse)
async def create_roadmap_endpoint(
    roadmap_input: RoadmapInput,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    
    try:
        # Fetch relevant research papers for context
        research_papers = None
        try:
            # Generate search terms from the startup idea
            search_terms = generate_search_terms(roadmap_input.prompt)
            if search_terms:
                # Fetch papers from multiple sources
                tasks = [
                    fetch_semantic_scholar(search_terms, 10),
                    fetch_arxiv(search_terms, 10),
                    fetch_crossref(search_terms, 10)
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                research_papers = []
                for result in results:
                    if isinstance(result, list):
                        research_papers.extend(result)
        except Exception as e:
            logging.warning(f"Research paper fetch failed: {e}")
        
        # Generate enhanced roadmap with research integration
        roadmap_text, roadmap_analysis = await call_groq_roadmap_enhanced(
            roadmap_input.prompt,
            roadmap_input.timeframe,
            roadmap_input.industry,
            roadmap_input.target_market,
            research_papers
        )
        
        # Extract research insights
        research_insights = []
        if research_papers:
            for paper in research_papers[:3]:
                if hasattr(paper, 'title'):
                    research_insights.append(f"Relevant research: {paper.title}")
        
        # Save to database
        roadmap_data = {
            "prompt": roadmap_input.prompt,
            "timeframe": roadmap_input.timeframe,
            "industry": roadmap_input.industry,
            "target_market": roadmap_input.target_market,
            "roadmap": roadmap_text,
            "roadmap_analysis": roadmap_analysis.dict() if roadmap_analysis else None,
            "research_insights": research_insights,
            "user_id": user_id
        }

        roadmap_id = create_roadmap(user_id, roadmap_data)

        return RoadmapResponse(
            id=str(roadmap_id),
            prompt=roadmap_input.prompt,
            timeframe=roadmap_input.timeframe,
            industry=roadmap_input.industry,
            target_market=roadmap_input.target_market,
            roadmap=roadmap_text,
            roadmap_analysis=roadmap_analysis,
            research_insights=research_insights,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            user_id=user_id
        )
        
    except Exception as e:
        logging.exception("Failed to create roadmap")
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")

@app.get("/roadmaps/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: str,
    current_user: dict = Depends(get_current_user)
):
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Verify ownership
    if roadmap.get("user_id") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to access this roadmap")
    
    return roadmap

@app.get("/users/{user_id}/roadmaps", response_model=List[RoadmapResponse])
async def get_user_roadmaps(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify authorization
    if user_id != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to access these roadmaps")
    
    roadmaps = get_user_roadmaps_from_db(user_id)  # Renamed to avoid naming conflict
    return roadmaps

@app.put("/roadmaps/{roadmap_id}", response_model=RoadmapResponse)
async def update_roadmap_endpoint(
    roadmap_id: str,
    update_data: RoadmapUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    if roadmap.get("user_id") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to update this roadmap")
    
    # If prompt or timeframe is being updated, regenerate the roadmap
    update_dict = update_data.dict(exclude_unset=True)
    if "prompt" in update_dict or "timeframe" in update_dict:
        try:
            new_prompt = update_dict.get("prompt", roadmap["prompt"])
            new_timeframe = update_dict.get("timeframe", roadmap["timeframe"])
            new_industry = update_dict.get("industry", roadmap.get("industry"))
            new_target_market = update_dict.get("target_market", roadmap.get("target_market"))
            
            # Regenerate roadmap
            roadmap_text, roadmap_analysis = await call_groq_roadmap_enhanced(
                new_prompt, new_timeframe, new_industry, new_target_market
            )
            
            update_dict["roadmap"] = roadmap_text
            update_dict["roadmap_analysis"] = roadmap_analysis.dict() if roadmap_analysis else None
            update_dict["updated_at"] = datetime.utcnow()
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to regenerate roadmap: {str(e)}")
    
    # Perform update
    updated = update_roadmap(roadmap_id, update_dict)
    if updated.modified_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap not found or no changes made")
    
    # Return updated roadmap
    updated_roadmap = get_roadmap_by_id(roadmap_id)
    return updated_roadmap

@app.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap_endpoint(
    roadmap_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    if roadmap.get("user_id") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this roadmap")
    
    # Perform deletion
    deleted = delete_roadmap(roadmap_id)
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    return {"message": "Roadmap deleted successfully"}

# Add analytics endpoint
@app.get("/roadmaps/{roadmap_id}/analytics")
async def get_roadmap_analytics(
    roadmap_id: str,
    current_user: dict = Depends(get_current_user)
):
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap or roadmap.get("user_id") != str(current_user["_id"]):
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Generate analytics based on roadmap data
    analytics = {
        "phases_count": len(roadmap.get("roadmap_analysis", {}).get("phases", [])),
        "estimated_duration": roadmap.get("timeframe"),
        "key_risks_count": len(roadmap.get("roadmap_analysis", {}).get("key_risks", [])),
        "success_factors_count": len(roadmap.get("roadmap_analysis", {}).get("success_factors", [])),
        "research_papers_used": len(roadmap.get("research_insights", [])),
        "created_at": roadmap.get("created_at"),
        "last_updated": roadmap.get("updated_at")
    }
    
    return analytics

# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from chatbot import StartupGPSChatbot
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot = StartupGPSChatbot()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    reply = chatbot.get_response(request.message)
    return {"reply": reply}

@app.get("/")
def root():
    return {
        "message": "Startup GPS backend is running with authentication!",
        "status": "healthy",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)