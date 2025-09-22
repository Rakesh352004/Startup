# Fixed database.py with proper error handling and ObjectId management

import os
from pymongo import MongoClient, errors
from passlib.context import CryptContext
from dotenv import load_dotenv
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import jwt
import logging
import re

load_dotenv()

# Environment variables
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
JWT_SECRET = os.getenv("JWT_SECRET", "R9AwDobUDMrtgJ_KBySMyOQkpAZAo3Eh0JFXPdUfEBI")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

if not MONGO_URI or not MONGO_DB:
    raise Exception("MONGO_URI and MONGO_DB must be set in environment")

# MongoDB connection
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Collections
users_collection = db["users"]
ideas_collection = db["ideas"]
profiles_collection = db["profiles"]
roadmaps_collection = db["roadmaps"]
research_collection = db["research"]
team_searches_collection = db["team_searches"]
connections_collection = db["connections"]


# Create indexes for better performance
# Create indexes
try:
    users_collection.create_index("email", unique=True)
    profiles_collection.create_index("user_id", unique=True)
    roadmaps_collection.create_index("user_id")
    research_collection.create_index("user_id")
    team_searches_collection.create_index("user_id")
    team_searches_collection.create_index("created_at")
except Exception as e:
    print(f"Index creation error: {e}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =====================
# Auth Helper Functions
# =====================
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str, expires_minutes: int = JWT_EXPIRES_MINUTES):
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode = {"sub": str(subject), "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

# =====================
# User Functions
# =====================
def get_user_by_id(user_id: str):
    """Get user by ID"""
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        logging.error(f"Error getting user by ID {user_id}: {e}")
        return None

def get_user_by_email(email: str):
    """Get user by email"""
    try:
        return users_collection.find_one({"email": email.lower()})
    except Exception as e:
        logging.error(f"Error getting user by email {email}: {e}")
        return None

# =====================
# Profile Functions
# =====================
def get_user_profile(user_id: str):
    """Get user profile"""
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
        return profiles_collection.find_one({"user_id": user_obj_id})
    except Exception as e:
        logging.error(f"Error getting user profile for {user_id}: {e}")
        return None

def update_user_profile(user_id: str, profile_data: dict):
    """Update or create user profile"""
    try:
        user_obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
        profile_data["updated_at"] = datetime.utcnow()
        
        result = profiles_collection.update_one(
            {"user_id": user_obj_id},
            {"$set": profile_data},
            upsert=True
        )
        return result
    except Exception as e:
        logging.error(f"Error updating profile for user {user_id}: {e}")
        raise

# =====================
# Ideas Functions (FIXED)
# =====================
def save_idea_validation(user_id: str, idea_data: dict) -> str:
    """Save a validated idea to the database"""
    try:
        user_obj_id = ObjectId(user_id)
        
        idea_doc = {
            "user_id": user_obj_id,
            "prompt": idea_data["prompt"],
            "validation": idea_data["validation"],
            "scores": idea_data["scores"],
            "suggestions": idea_data["suggestions"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = ideas_collection.insert_one(idea_doc)
        logging.info(f"Successfully saved idea validation with ID: {result.inserted_id}")
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Failed to save idea validation for user {user_id}: {e}")
        raise

def get_user_ideas(user_id: str, limit: int = 10) -> list:
    """Get user's idea validation history"""
    try:
        user_obj_id = ObjectId(user_id)
        ideas = list(ideas_collection.find(
            {"user_id": user_obj_id}
        ).sort("created_at", -1).limit(limit))
        
        # Convert ObjectIds to strings for JSON serialization
        for idea in ideas:
            idea["id"] = str(idea["_id"])
            idea["user_id"] = str(idea["user_id"])
            del idea["_id"]
        
        return ideas
    except Exception as e:
        logging.error(f"Failed to fetch user ideas for {user_id}: {e}")
        return []

def get_idea_by_id(user_id: str, idea_id: str) -> dict:
    """Get a specific idea by ID"""
    try:
        user_obj_id = ObjectId(user_id)
        idea_obj_id = ObjectId(idea_id)
        
        idea = ideas_collection.find_one({
            "_id": idea_obj_id,
            "user_id": user_obj_id
        })
        
        if idea:
            idea["id"] = str(idea["_id"])
            idea["user_id"] = str(idea["user_id"])
            del idea["_id"]
        
        return idea
    except Exception as e:
        logging.error(f"Failed to fetch idea {idea_id} for user {user_id}: {e}")
        return None

# =====================
# Roadmap Functions (FIXED)
# =====================
def create_roadmap(user_id: str, roadmap_data: dict) -> str:
    """Create a new roadmap"""
    try:
        user_obj_id = ObjectId(user_id)
        now = datetime.utcnow()
        
        roadmap_doc = {
            "user_id": user_obj_id,
            "prompt": roadmap_data["prompt"],
            "timeframe": roadmap_data["timeframe"],
            "roadmap": roadmap_data["roadmap"],
            "created_at": now,
            "updated_at": now
        }
        
        result = roadmaps_collection.insert_one(roadmap_doc)
        logging.info(f"Successfully saved roadmap with ID: {result.inserted_id}")
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Failed to create roadmap for user {user_id}: {e}")
        raise

def get_roadmap_by_id(roadmap_id: str):
    """Get roadmap by ID"""
    try:
        roadmap = roadmaps_collection.find_one({"_id": ObjectId(roadmap_id)})
        if roadmap:
            roadmap["id"] = str(roadmap["_id"])
            roadmap["user_id"] = str(roadmap["user_id"])
            del roadmap["_id"]
        return roadmap
    except Exception as e:
        logging.error(f"Error getting roadmap {roadmap_id}: {e}")
        return None

def get_user_roadmaps(user_id: str) -> list:
    """Get user's roadmaps"""
    try:
        user_obj_id = ObjectId(user_id)
        roadmaps = list(roadmaps_collection.find(
            {"user_id": user_obj_id}
        ).sort("created_at", -1))
        
        for roadmap in roadmaps:
            roadmap["id"] = str(roadmap["_id"])
            roadmap["user_id"] = str(roadmap["user_id"])
            del roadmap["_id"]
        
        return roadmaps
    except Exception as e:
        logging.error(f"Error getting user roadmaps for {user_id}: {e}")
        return []

def update_roadmap(roadmap_id: str, update_data: dict):
    """Update a roadmap"""
    try:
        update_data["updated_at"] = datetime.utcnow()
        result = roadmaps_collection.update_one(
            {"_id": ObjectId(roadmap_id)},
            {"$set": update_data}
        )
        return result
    except Exception as e:
        logging.error(f"Error updating roadmap {roadmap_id}: {e}")
        raise

def delete_roadmap(roadmap_id: str):
    """Delete a roadmap"""
    try:
        result = roadmaps_collection.delete_one({"_id": ObjectId(roadmap_id)})
        return result
    except Exception as e:
        logging.error(f"Error deleting roadmap {roadmap_id}: {e}")
        raise

# =====================
# Research Functions (FIXED)
# =====================
def save_research(user_id: str, research_data: dict) -> str:
    """Save a new research document"""
    try:
        user_obj_id = ObjectId(user_id)
        
        research_doc = {
            "user_id": user_obj_id,
            "idea": research_data["idea"],
            "search_terms": research_data.get("search_terms", []),
            "papers": research_data.get("papers", []),
            "created_at": research_data.get("created_at", datetime.utcnow()),
            "updated_at": datetime.utcnow()
        }
        
        result = research_collection.insert_one(research_doc)
        logging.info(f"Successfully saved research with ID: {result.inserted_id}")
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Failed to save research for user {user_id}: {e}")
        raise

def get_user_research_history(user_id: str, limit: int = 10) -> list:
    """Get user's research history"""
    try:
        user_obj_id = ObjectId(user_id)
        research_docs = list(research_collection.find(
            {"user_id": user_obj_id}
        ).sort("created_at", -1).limit(limit))
        
        for doc in research_docs:
            doc["id"] = str(doc["_id"])
            doc["user_id"] = str(doc["user_id"])
            del doc["_id"]
        
        return research_docs
    except Exception as e:
        logging.error(f"Failed to fetch research history for {user_id}: {e}")
        return []

def get_research_by_id(user_id: str, research_id: str) -> dict:
    """Get research by ID"""
    try:
        user_obj_id = ObjectId(user_id)
        research_obj_id = ObjectId(research_id)
        
        research = research_collection.find_one({
            "_id": research_obj_id,
            "user_id": user_obj_id
        })
        
        if research:
            research["id"] = str(research["_id"])
            research["user_id"] = str(research["user_id"])
            del research["_id"]
        
        return research
    except Exception as e:
        logging.error(f"Failed to fetch research {research_id} for user {user_id}: {e}")
        return None

def get_research_count(user_id: str) -> int:
    """Get count of research documents for a user"""
    try:
        user_obj_id = ObjectId(user_id)
        return research_collection.count_documents({"user_id": user_obj_id})
    except Exception as e:
        logging.error(f"Failed to get research count for {user_id}: {e}")
        return 0

# =====================
# Activity and Stats Functions
# =====================
def get_user_activity(user_id: str) -> dict:
    """Get user activity summary"""
    try:
        user_obj_id = ObjectId(user_id)
        return {
            "ideas": ideas_collection.count_documents({"user_id": user_obj_id}),
            "roadmaps": roadmaps_collection.count_documents({"user_id": user_obj_id}),
            "research": research_collection.count_documents({"user_id": user_obj_id}),
            "profile_exists": profiles_collection.count_documents({"user_id": user_obj_id}) > 0
        }
    except Exception as e:
        logging.error(f"Failed to get user activity for {user_id}: {e}")
        return {"ideas": 0, "roadmaps": 0, "research": 0, "profile_exists": False}

def get_user_stats(user_id: str) -> dict:
    """Get comprehensive user statistics"""
    try:
        activity = get_user_activity(user_id)
        user_obj_id = ObjectId(user_id)
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        recent_ideas = ideas_collection.count_documents({
            "user_id": user_obj_id,
            "created_at": {"$gte": thirty_days_ago}
        })
        
        recent_roadmaps = roadmaps_collection.count_documents({
            "user_id": user_obj_id,
            "created_at": {"$gte": thirty_days_ago}
        })
        
        recent_research = research_collection.count_documents({
            "user_id": user_obj_id,
            "created_at": {"$gte": thirty_days_ago}
        })
        
        return {
            **activity,
            "recent_ideas": recent_ideas,
            "recent_roadmaps": recent_roadmaps,
            "recent_research": recent_research,
            "total_activity": activity["ideas"] + activity["roadmaps"] + activity["research"]
        }
    except Exception as e:
        logging.error(f"Failed to get user stats for {user_id}: {e}")
        return {}

# =====================
# Utility Functions
# =====================
def delete_user_data(user_id: str) -> bool:
    """Delete all user data (GDPR compliance)"""
    try:
        user_obj_id = ObjectId(user_id)
        
        # Delete from all collections
        ideas_collection.delete_many({"user_id": user_obj_id})
        roadmaps_collection.delete_many({"user_id": user_obj_id})
        research_collection.delete_many({"user_id": user_obj_id})
        profiles_collection.delete_one({"user_id": user_obj_id})
        users_collection.delete_one({"_id": user_obj_id})
        
        logging.info(f"Successfully deleted all data for user {user_id}")
        return True
    except Exception as e:
        logging.error(f"Failed to delete user data for {user_id}: {e}")
        return False

def convert_objectids_to_strings(obj):
    """Recursively convert ObjectIds to strings in nested dictionaries/lists"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_objectids_to_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids_to_strings(item) for item in obj]
    else:
        return obj