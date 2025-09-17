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
        "model": "llama-3.1-8b-instant",  # ✅ UPDATED MODEL
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
        "model": "llama-3.1-8b-instant",  # ✅ UPDATED MODEL
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
    
    # Fallback if API fails
    words = re.findall(r'\b\w{3,}\b', idea.lower())
    stop_words = {'the', 'and', 'for', 'with', 'that', 'this', 'your', 'have', 'from'}
    filtered_words = [word for word in words if word not in stop_words]
    return filtered_words[:5] if filtered_words else ["startup", "technology", "innovation"]
    
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


import os
import json
import re
import requests
from datetime import datetime
from typing import List
from fastapi import HTTPException
from pydantic import BaseModel, Field

# Environment variable with fallback check
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Print API key status for debugging (remove in production)
if GROQ_API_KEY:
    print(f"✅ GROQ API Key loaded: {GROQ_API_KEY[:10]}...{GROQ_API_KEY[-4:]}")
else:
    print("❌ GROQ_API_KEY not found in environment variables")
    print("Available environment variables:", [k for k in os.environ.keys() if 'GROQ' in k.upper()])

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
    Enhanced validation function with comprehensive error handling
    """
    if not GROQ_API_KEY:
        # More specific error message
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
        "model": "llama-3.3-70b-versatile",  # ✅ UPDATED to current available model
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 4000
    }

    try:
        print(f"🔄 Sending request to GROQ API...")
        response = requests.post(url, headers=headers, json=payload, timeout=60)  # Increased timeout
        
        # Enhanced error handling
        if response.status_code == 401:
            print("❌ Authentication failed - Invalid API key")
            raise HTTPException(
                status_code=401, 
                detail="Authentication failed. Please check your GROQ API key is valid and active."
            )
        elif response.status_code == 429:
            print("⚠️ Rate limit exceeded")
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please wait before making another request."
            )
        elif response.status_code == 400:
            print(f"❌ Bad request: {response.text}")
            raise HTTPException(
                status_code=400, 
                detail=f"Bad request to GROQ API: {response.text}"
            )
        elif response.status_code != 200:
            print(f"❌ API Error {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"GROQ API error {response.status_code}: {response.text}"
            )

        data = response.json()
        
        # Check if response has expected structure
        if "choices" not in data or not data["choices"]:
            raise HTTPException(
                status_code=500,
                detail="Invalid response structure from GROQ API"
            )
        
        ai_text = data["choices"][0]["message"]["content"]
        print(f"✅ Received response from GROQ API ({len(ai_text)} characters)")
        
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
            print("✅ Successfully parsed JSON response")
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing failed: {e}")
            print(f"Raw response: {ai_text[:500]}...")
            # Fallback: try to extract data using regex patterns
            result = parse_fallback_response(ai_text)
            print("✅ Used fallback parsing")
        
        # Validate result structure
        if not validate_response_structure(result):
            print("⚠️ Response structure invalid, applying fixes")
            result = fix_response_structure(result)
        
        return result
        
    except requests.exceptions.Timeout:
        print("⏰ Request timeout")
        raise HTTPException(
            status_code=504, 
            detail="Request timeout. GROQ API took too long to respond."
        )
    except requests.exceptions.ConnectionError:
        print("🌐 Connection error")
        raise HTTPException(
            status_code=503, 
            detail="Connection error. Unable to reach GROQ API."
        )
    except requests.exceptions.RequestException as e:
        print(f"🔗 Request exception: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"API request failed: {str(e)}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Validation processing failed: {str(e)}"
        )

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
    # Ensure overall_score exists
    if "overall_score" not in result:
        result["overall_score"] = 70
    
    # Ensure scores section
    if "scores" not in result:
        result["scores"] = {}
    
    default_scores = {
        "feasibility": 70,
        "market_demand": 70,
        "uniqueness": 70,
        "strength": 70,
        "risk_factors": 70
    }
    
    for key, default in default_scores.items():
        if key not in result["scores"]:
            result["scores"][key] = default
    
    # Ensure analysis section
    if "analysis" not in result:
        result["analysis"] = {}
    
    default_analysis = {
        "verdict": "Comprehensive analysis completed with key insights identified.",
        "feasibility": "Technical and operational feasibility assessed.",
        "market_demand": "Market demand indicators evaluated.",
        "uniqueness": "Differentiation opportunities analyzed.",
        "strength": "Core strengths and value proposition reviewed.",
        "risk_factors": "Key risks and mitigation strategies identified.",
        "existing_competitors": "Competitive landscape assessment completed."
    }
    
    for key, default in default_analysis.items():
        if key not in result["analysis"]:
            result["analysis"][key] = default
    
    # Ensure suggestions section
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

def parse_fallback_response(text: str) -> dict:
    """
    Fallback parser in case JSON parsing fails
    """
    print("🔧 Using fallback response parser")
    
    # Extract scores using regex patterns
    overall_score = extract_score(text, r"overall[_\s]*score[\"']?\s*:\s*(\d+)")
    feasibility_score = extract_score(text, r"feasibility[\"']?\s*:\s*(\d+)")
    market_score = extract_score(text, r"market[_\s]*demand[\"']?\s*:\s*(\d+)")
    uniqueness_score = extract_score(text, r"uniqueness[\"']?\s*:\s*(\d+)")
    strength_score = extract_score(text, r"strength[\"']?\s*:\s*(\d+)")
    risk_score = extract_score(text, r"risk[_\s]*factors[\"']?\s*:\s*(\d+)")
    
    # Extract analysis sections
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
    competitors = extract_section(text, r"competitors[\"']?\s*:\s*[\"'](.*?)[\"']", 
                                 "Competitive landscape analysis reveals positioning opportunities.")
    
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

# Test function to verify everything works
def test_validation_endpoint():
    """Test the validation endpoint"""
    print("\n" + "="*60)
    print("TESTING VALIDATION ENDPOINT")
    print("="*60)
    
    test_prompt = "An AI-powered agricultural monitoring system using drones and IoT sensors to optimize crop yields, reduce water usage, and predict crop diseases through computer vision and machine learning algorithms."
    
    try:
        result = call_groq_validation(test_prompt)
        print("✅ Validation successful!")
        print(f"Overall Score: {result.get('overall_score')}")
        print(f"Scores: {result.get('scores')}")
        print(f"Verdict: {result.get('analysis', {}).get('verdict', '')[:100]}...")
        return True
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        return False




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
import uuid

# Enhanced Pydantic models
# Pydantic models for roadmap generation
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

def call_groq_roadmap(prompt: str, timeframe: str) -> dict:
    """
    Generate a detailed roadmap using GROQ API
    """
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
    },
    {
      "title": "Phase 2: [Timeframe] - [Phase Name]",
      "timeframe": "e.g., 5-8 weeks",
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
        print(f"🔄 Sending roadmap request to GROQ API...")
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
            print("✅ Successfully parsed roadmap JSON")
            return result
        except json.JSONDecodeError:
            # Fallback parsing
            return parse_roadmap_fallback(ai_text, timeframe)
            
    except Exception as e:
        print(f"❌ Roadmap generation failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Roadmap generation failed: {str(e)}"
        )

def parse_roadmap_fallback(text: str, timeframe: str) -> dict:
    """
    Fallback parser for roadmap generation
    """
    print("🔧 Using fallback roadmap parser")
    
    # Extract overview
    overview_match = re.search(r"overview[\"']?\s*:\s*[\"'](.*?)[\"']", text, re.IGNORECASE | re.DOTALL)
    overview = overview_match.group(1).strip() if overview_match else f"Comprehensive roadmap for the specified {timeframe} timeframe."
    
    # Extract phases
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
    
    # If no phases found, create default phases based on timeframe
    if not phases:
        phases = create_default_phases(timeframe)
    
    return {
        "overview": overview,
        "phases": phases
    }

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
        # Add more phases for longer timeframes
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
            # Add more phases...
        ]
    else:
        # Default 3-phase structure
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

@app.post("/generate-roadmap", response_model=RoadmapResponse)
async def generate_roadmap(roadmap_input: RoadmapInput):
    try:
        ai_result = call_groq_roadmap(roadmap_input.prompt, roadmap_input.timeframe)

        # Ensure phases exist
        phases = ai_result.get("phases") or create_default_phases(roadmap_input.timeframe)

        roadmap_response = RoadmapResponse(
            id=str(uuid.uuid4()),
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
            user_id="anonymous"
        )

        return roadmap_response

    except Exception as e:
        logging.exception("Roadmap generation error")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {str(e)}")


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

@app.post("/research-papers", response_model=ResearchResponse)
async def get_research_papers(request: ResearchRequest, current_user: Dict[str, Any] = Depends(get_current_user)) -> ResearchResponse:
    """
    Fetches, deduplicates, and returns a curated list of research papers
    based on a startup idea, storing the results in the database.
    """
    logging.info(f"🔍 Research request received: {request.idea[:50]}...")
    user_id = str(current_user.get("_id"))
    
    # 1. Input validation
    if not request.idea or not request.idea.strip():
        raise HTTPException(status_code=400, detail="Idea cannot be empty")
    
    try:
        # 2. Generate search terms
        search_terms = generate_search_terms(request.idea)
        if not search_terms:
            logging.warning("No search terms generated. Using original idea as a fallback.")
            search_terms = [request.idea]
        
        logging.info(f"🔍 Generated search terms: {search_terms}")
        
        # 3. Concurrently fetch papers from all sources
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
                logging.error(f"⚠️ {source_name} failed with an error: {result}")
            elif isinstance(result, list):
                # Ensure each item in the list is the expected type
                for paper in result:
                    if isinstance(paper, ResearchPaper):
                        all_papers.append(paper)
                    else:
                        logging.warning(f"⚠️ Unexpected paper type from {source_name}: {type(paper)}")
            else:
                logging.warning(f"⚠️ Unexpected response from {source_name}: {type(result)}")
        
        logging.info(f"📊 Total papers fetched: {len(all_papers)}")
        
        # 4. Deduplicate and normalize papers
        unique_papers: List[ResearchPaper] = []
        seen_titles: Set[str] = set()
        
        for paper in all_papers:
            if not paper.title or not paper.title.strip():
                continue
            
            # Normalize title for case-insensitive comparison
            normalized_title = re.sub(r'[^\w\s]', '', paper.title.lower())
            normalized_title = re.sub(r'\s+', ' ', normalized_title).strip()
            
            if normalized_title and normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_papers.append(paper)
        
        # 5. Score and sort unique papers
        unique_papers.sort(key=paper_score, reverse=True)
        
        # 6. Balance sources and limit final results
        final_papers: List[ResearchPaper] = []
        source_counts: Dict[str, int] = {source: 0 for source in source_names}
        max_per_source = max(2, request.max_results // 3)
        
        # Distribute papers, ensuring a balance of sources
        for paper in unique_papers:
            if len(final_papers) >= request.max_results:
                break
            if source_counts[paper.source] < max_per_source:
                final_papers.append(paper)
                source_counts[paper.source] += 1
        
        # Fill any remaining slots with the highest-ranked papers regardless of source
        if len(final_papers) < request.max_results:
            remaining_papers = [p for p in unique_papers if p not in final_papers]
            final_papers.extend(remaining_papers[:request.max_results - len(final_papers)])

        logging.info(f"✅ Final result: {len(final_papers)} curated papers")
        
        if not final_papers:
            logging.warning("⚠️ No papers found from any source.")
            return ResearchResponse(papers=[], search_terms=search_terms, research_id="none", created_at=None)

        # 7. Prepare and save data to the database
        paper_data_list = [p.dict() for p in final_papers]
        research_doc = {
            "idea": request.idea,
            "search_terms": search_terms,
            "papers": paper_data_list,
        }
        
        research_id = save_research(user_id, research_doc)
        
        return ResearchResponse(
            papers=final_papers,
            search_terms=search_terms,
            research_id=research_id,
            created_at=datetime.utcnow()
        )
        
    except HTTPException:
        # Re-raise explicit HTTPException
        raise
    except Exception as e:
        logging.exception("❌ An unhandled error occurred in the research papers endpoint")
        raise HTTPException(status_code=500, detail=f"Failed to fetch research papers: {str(e)}")


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