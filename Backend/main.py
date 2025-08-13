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
from database import users_collection

# Database imports
from database import (
    hash_password, verify_password, create_access_token,
    get_user_by_id, get_user_profile, update_user_profile,
    create_roadmap, get_roadmap_by_id, get_user_roadmaps,
    update_roadmap, delete_roadmap, get_user_by_id
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

class ProfileBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    preferred_role: Optional[str] = None
    experience: Optional[str] = None
    availability: Optional[int] = None
    location: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    user_id: str
    updated_at: datetime

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
    """Generate clean search terms from the startup idea"""
    if not GROQ_API_KEY:
        # Fallback: extract meaningful words
        words = re.findall(r'\b\w{3,}\b', idea.lower())
        # Add some agriculture-specific terms if the idea is about agriculture
        if any(term in idea.lower() for term in ['agricul', 'farm', 'crop']):
            base_terms = ['agriculture', 'farming']
            if any(term in idea.lower() for term in ['ai', 'artificial', 'machine', 'computer']):
                base_terms.extend(['artificial intelligence', 'machine learning'])
            return base_terms[:5]
        return [word for word in words if len(word) > 3][:5]
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {
                "role": "system", 
                "content": "Extract 3-5 key technical terms for academic paper search. Return ONLY the terms separated by commas, no explanations or extra text."
            },
            {
                "role": "user", 
                "content": f"Extract key search terms from: {idea}"
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
                if term and len(term) > 2 and not term.isdigit() and not term.startswith("Here"):
                    clean_terms.append(term)
            
            if clean_terms:
                return clean_terms[:5]
    except Exception as e:
        print(f"Error generating search terms with Groq: {e}")
    
    # Enhanced fallback
    words = re.findall(r'\b\w{3,}\b', idea.lower())
    if 'ai' in idea.lower() or 'artificial' in idea.lower():
        return ['artificial intelligence', 'machine learning'] + [w for w in words if len(w) > 4][:3]
    return [w for w in words if len(w) > 3][:5]

async def fetch_semantic_scholar(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    try:
        # Create a simpler, more focused query
        query = " ".join(search_terms[:2])  # Use only first 2 terms to avoid complexity
        params = {
            "query": query,
            "limit": min(max_results, 10),  # Reduced limit to be more conservative
            "fields": "title,authors,abstract,year,url,externalIds"
        }
        
        print(f"🔍 Querying Semantic Scholar with: {query}")
        
        headers = {
            "User-Agent": "Research-Advisor-API/1.0 (contact@researchadvisor.com)"
        }
        
        # Add API key if available
        if SEMANTIC_SCHOLAR_API_KEY:
            headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY
        
        # Add longer delay before Semantic Scholar call
        await asyncio.sleep(3)
        
        async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
            response = await client.get(SEMANTIC_SCHOLAR_API, params=params)
            print(f"📊 Semantic Scholar response status: {response.status_code}")
            
            if response.status_code == 429:
                print("⚠️ Semantic Scholar rate limited, skipping...")
                return []
            elif response.status_code != 200:
                print(f"❌ Semantic Scholar error: {response.text}")
                return []
                
            data = response.json()
            papers = []
            
            for item in data.get("data", []):
                try:
                    title = item.get("title", "").strip()
                    abstract = item.get("abstract", "") or ""
                    
                    if not title:
                        continue
                    
                    # Handle authors
                    authors = []
                    for author in item.get("authors", []):
                        if author and author.get("name"):
                            authors.append(author["name"])
                    
                    # Truncate abstract if too long
                    if len(abstract) > 500:
                        abstract = abstract[:500] + "..."
                    elif not abstract:
                        abstract = "No abstract available"
                    
                    # Handle publication date
                    pub_date = str(item.get("year", "")) if item.get("year") else ""
                    
                    # Create URL if not present
                    url = item.get("url") or ""
                    if not url and item.get("paperId"):
                        url = f"https://semanticscholar.org/paper/{item.get('paperId')}"
                    
                    # Get DOI from externalIds if available
                    doi = None
                    external_ids = item.get("externalIds", {})
                    if external_ids and isinstance(external_ids, dict):
                        doi = external_ids.get("DOI")
                    
                    papers.append(ResearchPaper(
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        published_date=pub_date,
                        source="Semantic Scholar",
                        url=url,
                        doi=doi
                    ))
                    
                except Exception as e:
                    print(f"⚠️ Error processing Semantic Scholar paper: {e}")
                    continue
            
            print(f"✅ Semantic Scholar returned {len(papers)} papers")
            return papers
            
    except Exception as e:
        print(f"❌ Error fetching from Semantic Scholar: {e}")
        return []

async def fetch_arxiv(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    try:
        # Create better search query for arXiv
        clean_terms = [term for term in search_terms if len(term) > 2 and not term.startswith("Here")]
        query_parts = [f'all:"{term}"' for term in clean_terms[:3]]
        
        if not query_parts:
            query = f'all:"artificial intelligence agriculture"'
        else:
            query = " AND ".join(query_parts)
        
        params = {
            "search_query": query,
            "max_results": min(max_results, 20),
            "sortBy": "relevance",
            "sortOrder": "descending"
        }
        
        print(f"🔍 Querying arXiv with: {query}")
        
        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            response = await client.get(ARXIV_API, params=params)
            print(f"📊 arXiv response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ arXiv error: {response.text[:200]}")
                return []
            
            papers = []
            
            try:
                root = ElementTree.fromstring(response.text)
            except ElementTree.ParseError as e:
                print(f"❌ arXiv XML parse error: {e}")
                return []
            
            # Define namespaces
            namespaces = {
                'atom': 'http://www.w3.org/2005/Atom',
                'arxiv': 'http://arxiv.org/schemas/atom'
            }
            
            entries = root.findall('atom:entry', namespaces)
            print(f"📊 arXiv found {len(entries)} entries")
            
            for entry in entries:
                try:
                    title_elem = entry.find('atom:title', namespaces)
                    summary_elem = entry.find('atom:summary', namespaces)
                    published_elem = entry.find('atom:published', namespaces)
                    id_elem = entry.find('atom:id', namespaces)
                    
                    if title_elem is None or summary_elem is None:
                        continue
                    
                    title = title_elem.text.strip() if title_elem.text else ""
                    abstract = summary_elem.text.strip() if summary_elem.text else ""
                    
                    if not title or not abstract:
                        continue
                    
                    # Clean up title and abstract
                    title = re.sub(r'\s+', ' ', title)
                    abstract = re.sub(r'\s+', ' ', abstract)
                    
                    if len(abstract) > 500:
                        abstract = abstract[:500] + "..."
                    
                    # Extract authors
                    authors = []
                    author_elems = entry.findall('atom:author', namespaces)
                    for author in author_elems:
                        name_elem = author.find('atom:name', namespaces)
                        if name_elem is not None and name_elem.text:
                            authors.append(name_elem.text.strip())
                    
                    # Get publication date
                    pub_date = published_elem.text if published_elem is not None else ""
                    
                    # Get URL
                    url = id_elem.text if id_elem is not None else ""
                    
                    papers.append(ResearchPaper(
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        published_date=pub_date,
                        source="arXiv",
                        url=url
                    ))
                    
                except Exception as e:
                    print(f"⚠️ Error processing arXiv paper: {e}")
                    continue
            
            print(f"✅ arXiv returned {len(papers)} papers")
            return papers[:max_results]
            
    except Exception as e:
        print(f"❌ Error fetching from arXiv: {e}")
        return []

async def fetch_crossref(search_terms: List[str], max_results: int) -> List[ResearchPaper]:
    try:
        query = " ".join(search_terms)
        params = {
            "query": query,
            "rows": min(max_results, 20),
            "sort": "relevance",
            "select": "title,author,abstract,created,URL,DOI,published-print,published-online"
        }
        
        print(f"🔍 Querying CrossRef with: {query}")
        
        headers = {
            "User-Agent": "Research-Advisor-API/1.0 (mailto:contact@researchadvisor.com)"
        }
        
        async with httpx.AsyncClient(timeout=45.0, headers=headers) as client:
            response = await client.get(CROSSREF_API, params=params)
            print(f"📊 CrossRef response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ CrossRef error: {response.text[:200]}")
                return []
                
            data = response.json()
            papers = []
            
            for item in data.get("message", {}).get("items", []):
                try:
                    # Handle title
                    title_list = item.get("title", [])
                    if not title_list:
                        continue
                    title = " ".join(title_list).strip()
                    
                    if not title:
                        continue
                    
                    # Handle abstract
                    abstract = item.get("abstract", "") or "No abstract available"
                    if len(abstract) > 500:
                        abstract = abstract[:500] + "..."
                    
                    # Handle authors
                    authors = []
                    for author in item.get("author", []):
                        given = author.get("given", "")
                        family = author.get("family", "")
                        if given or family:
                            authors.append(f"{given} {family}".strip())
                    
                    # Handle publication date
                    pub_date = ""
                    if "published-print" in item:
                        date_parts = item["published-print"].get("date-parts", [])
                        if date_parts and len(date_parts[0]) > 0:
                            pub_date = "-".join(str(p) for p in date_parts[0])
                    elif "published-online" in item:
                        date_parts = item["published-online"].get("date-parts", [])
                        if date_parts and len(date_parts[0]) > 0:
                            pub_date = "-".join(str(p) for p in date_parts[0])
                    elif "created" in item:
                        pub_date = item["created"].get("date-time", "")
                    
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
                    print(f"⚠️ Error processing CrossRef paper: {e}")
                    continue
                    
            print(f"✅ CrossRef returned {len(papers)} papers")
            return papers
            
    except Exception as e:
        print(f"❌ Error fetching from CrossRef: {e}")
        return []

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

@app.get("/dashboard-data")
def get_dashboard_data(current_user=Depends(get_current_user)):
    # First verify developer access
    if current_user.get("email") != "ry352004@gmail.com":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden. Only ry352004@gmail.com can access this endpoint."
        )

    try:
        # Get non-developer users
        users_cursor = users_collection.find({
            "email": {"$ne": "ry352004@gmail.com"}
        })

        users_list = []
        for user in users_cursor:
            user_id = user["_id"]
            profile = profiles_collection.find_one({"user_id": user_id}) or {}
            validations = list(ideas_collection.find(
                {"user_id": user_id},
                {"_id": 0, "prompt": 1, "validation": 1, "created_at": 1}
            ).sort("created_at", -1).limit(10))  # Limit to 10 most recent

            # Convert datetime objects to ISO format strings
            users_list.append({
                "id": str(user_id),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "created_at": user.get("created_at", datetime.utcnow()).isoformat(),
                "profile_data": {
                    "skills": profile.get("skills", []),
                    "interests": profile.get("interests", []),
                    "experience": profile.get("experience", ""),
                    "availability": profile.get("availability", ""),
                    "location": profile.get("location", ""),
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

        return {"users": users_list}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )

    except Exception as e:
        print(f"Error fetching dashboard data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch dashboard data"
        )
# AI Validation + Suggestions
# ---------------------------
def call_groq_validation(prompt: str) -> dict:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = """You are a startup expert providing detailed validation reports. 
    Structure your response EXACTLY as follows:

    1. Feasibility Analysis (X/10) - [Technical/operational assessment]
    2. Market Analysis (X/10)- [Target market details]
    3. Risk Assessment (X/10)- [Key risks]
    4. Strengths (X/10)- [Competitive advantages]
    5. Uniqueness (X/10)- [Differentiation factors]
    6. Final Verdict (Score: X/10) - [Overall summary and rating between 1-10]
    7. Enhancement Suggestions - [Bulleted list of improvement ideas]
    8. Existing Competitors - [3-5 similar startups with brief info]

    Always include the numeric score in parentheses after "Final Verdict" and "Feasibility Analysis".
    """

    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Please validate this startup idea: {prompt}"}
        ],
        "temperature": 0.7
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to get response from Groq API")

    data = response.json()
    ai_text = data["choices"][0]["message"]["content"]

    # Extract score from "Final Verdict"
    score_match = re.search(r"Final Verdict.*?Score:\s*(\d+)/10", ai_text, re.IGNORECASE)
    score = int(score_match.group(1)) if score_match else 0

    # Extract enhancement suggestions section (from "Enhancement Suggestions" to next numbered section)
    suggestions_section = re.search(r"Enhancement Suggestions\s*-\s*(.*?)(?=\n\d+\.)", ai_text, re.DOTALL | re.IGNORECASE)
    suggestions_text = suggestions_section.group(1) if suggestions_section else ""

    # Parse each bullet point (remove leading dash, bullet, and whitespace)
    suggestions = [s.strip("-• ").strip() for s in suggestions_text.strip().split("\n") if s.strip()]

    return {
        "validation": ai_text,
        "score": score,
        "suggestions": suggestions
    }

@app.post("/validate-idea", response_model=IdeaResponse)
def validate_idea(idea: IdeaInput, current_user=Depends(get_current_user)):
    ai_result = call_groq_validation(idea.prompt)

    idea_doc = {
        "user_id": current_user["_id"],
        "prompt": idea.prompt,
        "validation": ai_result["validation"],
        "score": ai_result["score"],
        "suggestions": ai_result["suggestions"],
        "created_at": datetime.utcnow()
    }
    ideas_collection.insert_one(idea_doc)

    return IdeaResponse(
        prompt=idea.prompt,
        validation=ai_result["validation"],
        score=ai_result["score"],
        suggestions=ai_result["suggestions"],
        created_at=idea_doc["created_at"],
    )


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
        raise HTTPException(status_code=404, detail="Profile not found")
    profile["user_id"] = str(profile["user_id"])
    return profile

@app.get("/health")
def health_check():
    """Health check endpoint - no authentication required"""
    return {
        "status": "healthy",
        "message": "Research Advisor API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "research_papers": "POST /research-papers (requires auth)",
            "debug_sources": "GET /debug/sources (requires auth)",
            "test_sources": "GET /debug/test-sources (requires auth)",
            "health": "GET /health (public)"
        }
    }

@app.get("/debug/test-sources")
async def test_each_source_individually(current_user=Depends(get_current_user)):
    """Test each source individually with basic queries"""
    
    test_results = {}
    
    # Test Semantic Scholar
    try:
        await asyncio.sleep(1)  # Rate limiting
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={"query": "agriculture AI", "limit": 3, "fields": "title"},
                headers={"User-Agent": "Research-Advisor-API/1.0 (contact@researchadvisor.com)"}
            )
            test_results["semantic_scholar"] = {
                "status": response.status_code,
                "working": response.status_code == 200,
                "response_length": len(response.text) if response.status_code == 200 else 0,
                "error": response.text[:500] if response.status_code != 200 else None
            }
    except Exception as e:
        test_results["semantic_scholar"] = {"working": False, "error": str(e)}
    
    # Test arXiv
    try:
        await asyncio.sleep(2)  # Rate limiting
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(
                "https://export.arxiv.org/api/query",
                params={"search_query": "all:agriculture", "max_results": 3}
            )
            test_results["arxiv"] = {
                "status": response.status_code,
                "working": response.status_code == 200,
                "response_length": len(response.text) if response.status_code == 200 else 0,
                "error": response.text[:500] if response.status_code != 200 else None
            }
    except Exception as e:
        test_results["arxiv"] = {"working": False, "error": str(e)}
    
    # Test CrossRef
    try:
        await asyncio.sleep(1)  # Rate limiting
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.crossref.org/works",
                params={"query": "agriculture AI", "rows": 3},
                headers={"User-Agent": "Research-Advisor-API/1.0 (mailto:contact@researchadvisor.com)"}
            )
            test_results["crossref"] = {
                "status": response.status_code,
                "working": response.status_code == 200,
                "response_length": len(response.text) if response.status_code == 200 else 0,
                "error": response.text[:500] if response.status_code != 200 else None
            }
    except Exception as e:
        test_results["crossref"] = {"working": False, "error": str(e)}
    
    return test_results

@app.get("/debug/sources")
async def debug_sources(query: str = Query("artificial intelligence"), current_user=Depends(get_current_user)):
    """Debug endpoint to test each source individually with detailed results"""
    results = {}
    
    print(f"🔍 Debug testing with query: {query}")
    
    try:
        results["semantic_scholar"] = await fetch_semantic_scholar([query], 3)
    except Exception as e:
        results["semantic_scholar"] = f"Error: {e}"
    
    try:
        results["arxiv"] = await fetch_arxiv([query], 3)
    except Exception as e:
        results["arxiv"] = f"Error: {e}"
    
    try:
        results["crossref"] = await fetch_crossref([query], 3)
    except Exception as e:
        results["crossref"] = f"Error: {e}"
    
    return {
        "query": query,
        "results": {
            "semantic_scholar": len(results["semantic_scholar"]) if isinstance(results["semantic_scholar"], list) else results["semantic_scholar"],
            "arxiv": len(results["arxiv"]) if isinstance(results["arxiv"], list) else results["arxiv"],
            "crossref": len(results["crossref"]) if isinstance(results["crossref"], list) else results["crossref"]
        },
        "sample_papers": {
            "semantic_scholar": results["semantic_scholar"][:2] if isinstance(results["semantic_scholar"], list) else results["semantic_scholar"],
            "arxiv": results["arxiv"][:2] if isinstance(results["arxiv"], list) else results["arxiv"],
            "crossref": results["crossref"][:2] if isinstance(results["crossref"], list) else results["crossref"]
        }
    }
# ... (keep all existing imports and setup)

# Add these new models to your existing Pydantic models
class RoadmapInput(BaseModel):
    prompt: str
    timeframe: str

class RoadmapResponse(BaseModel):
    id: str
    prompt: str
    timeframe: str
    roadmap: str
    created_at: datetime
    updated_at: datetime
    user_id: str

class RoadmapUpdate(BaseModel):
    prompt: Optional[str] = None
    timeframe: Optional[str] = None
    roadmap: Optional[str] = None

# Add these new endpoints to your existing FastAPI app
@app.post("/roadmaps", response_model=RoadmapResponse)
async def create_roadmap_endpoint(
    roadmap_input: RoadmapInput,
    current_user: dict = Depends(get_current_user)
):
    # Call AI
    roadmap_text = call_groq_roadmap(roadmap_input.prompt, roadmap_input.timeframe)

    # Save to DB
    roadmap_data = {
        "prompt": roadmap_input.prompt,
        "timeframe": roadmap_input.timeframe,
        "roadmap": roadmap_text,
        "user_id": current_user["_id"]
    }

    roadmap_id = create_roadmap(str(current_user["_id"]), roadmap_data)


    # Return response
    return RoadmapResponse(
        id=str(roadmap_id),
        prompt=roadmap_input.prompt,
        timeframe=roadmap_input.timeframe,
        roadmap=roadmap_text,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        user_id=str(current_user["_id"])
    )


@app.get("/roadmaps/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: str,
    current_user: dict = Depends(get_current_user)
):
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Verify the requesting user owns this roadmap
    if roadmap["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to access this roadmap")
    
    return roadmap

@app.get("/users/{user_id}/roadmaps", response_model=List[RoadmapResponse])
async def get_user_roadmaps(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify the requesting user is accessing their own roadmaps
    if user_id != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to access these roadmaps")
    
    roadmaps = get_user_roadmaps(user_id)
    return roadmaps

@app.put("/roadmaps/{roadmap_id}", response_model=RoadmapResponse)
async def update_roadmap_endpoint(
    roadmap_id: str,
    update_data: RoadmapUpdate,
    current_user: dict = Depends(get_current_user)
):
    # First verify the roadmap exists and belongs to this user
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    if roadmap["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to update this roadmap")
    
    # Perform the update
    updated = update_roadmap(roadmap_id, update_data.dict(exclude_unset=True))
    if updated.modified_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap not found or no changes made")
    
    # Return the updated roadmap
    updated_roadmap = get_roadmap_by_id(roadmap_id)
    return updated_roadmap

@app.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap_endpoint(
    roadmap_id: str,
    current_user: dict = Depends(get_current_user)
):
    # First verify the roadmap exists and belongs to this user
    roadmap = get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    if roadmap["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this roadmap")
    
    # Perform the deletion
    deleted = delete_roadmap(roadmap_id)
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    return {"message": "Roadmap deleted successfully"}

# Add this helper function
def call_groq_roadmap(prompt: str, timeframe: str) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_prompt = """You are a startup roadmap specialist. Generate a detailed, actionable roadmap based on the provided idea and timeframe. Structure your response EXACTLY as follows:

Overview:
[Provide a 3-4 sentence high-level summary of the entire roadmap]

Phase 1: [Phase Name] - [Brief one-line description]
Tasks:
- Task 1 (specific action item)
- Task 2
- Task 3
- Task 4
Implementation:
- How to accomplish this phase (3-4 specific steps)
- Resources needed
- Team members involved
- Potential challenges

Phase 2: [Phase Name] - [Brief one-line description]
Tasks:
- Task 1
- Task 2
- Task 3
- Task 4
Implementation:
- How to accomplish this phase (3-4 specific steps)
- Resources needed
- Team members involved
- Potential challenges

[Continue with Phase 3, 4, etc. as needed based on timeframe]

Each phase should have:
1. A clear name and one-line description
2. 4-5 specific tasks (bullet points under "Tasks")
3. 3-4 implementation details (bullet points under "Implementation")
4. Adjust the number of phases according to the specified timeframe (3 months = 3 phases, 6 months = 5 phases, etc.)"""

    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a roadmap for: {prompt}\nTimeframe: {timeframe}"}
        ],
        "temperature": 0.6
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Groq API request failed: {str(e)}")
@app.post("/research-papers", response_model=ResearchResponse)
async def get_research_papers(request: ResearchRequest, current_user=Depends(get_current_user)):
    print(f"🔍 Research request received: {request.idea[:50]}...")
    print(f"👤 User: {current_user.get('email', 'Unknown')}")
    
    if not request.idea or not request.idea.strip():
        raise HTTPException(status_code=400, detail="Idea cannot be empty")
    
    try:
        search_terms = generate_search_terms(request.idea)
        if not search_terms:
            search_terms = [request.idea]
        
        print(f"🔍 Generated search terms: {search_terms}")
        
        # Initialize results
        semantic_papers = []
        arxiv_papers = []
        crossref_papers = []
        
        # Fetch from all sources with proper error handling and rate limiting
        print("🌐 Fetching from Semantic Scholar...")
        try:
            # Start with a longer delay for Semantic Scholar
            await asyncio.sleep(5)
            semantic_papers = await fetch_semantic_scholar(search_terms, request.max_results)
            await asyncio.sleep(3)  # Rate limiting between calls
        except Exception as e:
            print(f"⚠️ Semantic Scholar failed: {e}")
        
        print("🌐 Fetching from arXiv...")
        try:
            arxiv_papers = await fetch_arxiv(search_terms, request.max_results)
            await asyncio.sleep(3)  # Rate limiting between calls
        except Exception as e:
            print(f"⚠️ arXiv failed: {e}")
        
        print("🌐 Fetching from CrossRef...")
        try:
            crossref_papers = await fetch_crossref(search_terms, request.max_results)
        except Exception as e:
            print(f"⚠️ CrossRef failed: {e}")
        
        print(f"📊 Paper counts - Semantic Scholar: {len(semantic_papers)}, arXiv: {len(arxiv_papers)}, CrossRef: {len(crossref_papers)}")
        
        # Combine and deduplicate papers
        all_papers = []
        all_papers.extend(semantic_papers)
        all_papers.extend(arxiv_papers)
        all_papers.extend(crossref_papers)
        
        # Deduplicate by normalized title
        unique_papers = []
        seen_titles = set()
        
        for paper in all_papers:
            if not paper.title or not paper.title.strip():
                continue
                
            # Normalize title for comparison
            normalized_title = re.sub(r'[^\w\s]', '', paper.title.lower())
            normalized_title = re.sub(r'\s+', ' ', normalized_title).strip()
            
            if normalized_title and normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_papers.append(paper)
        
        # Score and sort papers
        def paper_score(paper):
            score = 0
            if paper.abstract and len(paper.abstract) > 100:
                score += 5
            if paper.authors and len(paper.authors) > 0:
                score += 3
            if paper.doi:
                score += 2
            if paper.published_date:
                score += 1
            if paper.url:
                score += 1
            if paper.source == "Semantic Scholar":
                score += 2
            elif paper.source == "arXiv":
                score += 1
            return score
        
        unique_papers.sort(key=paper_score, reverse=True)
        
        # Balance sources in final result
        final_papers = []
        source_counts = {"Semantic Scholar": 0, "arXiv": 0, "CrossRef": 0}
        max_per_source = max(3, request.max_results // 3)
        
        # First pass: add papers up to max per source
        for paper in unique_papers:
            if len(final_papers) >= request.max_results:
                break
            if source_counts[paper.source] < max_per_source:
                final_papers.append(paper)
                source_counts[paper.source] += 1
        
        # Second pass: fill remaining slots with any remaining papers
        if len(final_papers) < request.max_results:
            remaining = request.max_results - len(final_papers)
            for paper in unique_papers:
                if paper not in final_papers and remaining > 0:
                    final_papers.append(paper)
                    remaining -= 1
        
        print(f"✅ Final result: {len(final_papers)} papers")
        print(f"📊 Source distribution: {dict(source_counts)}")
        
        if not final_papers:
            print("⚠️ No papers found from any source")
            return ResearchResponse(
                papers=[],
                search_terms=search_terms
            )
        
        return ResearchResponse(
            papers=final_papers,
            search_terms=search_terms
        )
        
    except Exception as e:
        print(f"❌ Error in research papers endpoint: {e}")
        import traceback
        traceback.print_exc()
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