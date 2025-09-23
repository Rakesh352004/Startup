# Clean database.py - Team Finder Functionality
import os
from pymongo import MongoClient, errors
from passlib.context import CryptContext
from dotenv import load_dotenv
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import jwt
import logging
import re
from typing import List, Dict, Tuple

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
messages_collection = db["messages"]
conversations_collection = db["conversations"]
connection_requests_collection = db["connection_requests"]

# Create indexes for better performance
try:
    users_collection.create_index("email", unique=True)
    profiles_collection.create_index("user_id", unique=True)
    roadmaps_collection.create_index("user_id")
    research_collection.create_index("user_id")
    team_searches_collection.create_index("user_id")
    team_searches_collection.create_index("created_at")
    messages_collection.create_index("conversation_id")
    messages_collection.create_index("sender_id")
    messages_collection.create_index("timestamp")
    conversations_collection.create_index("participant_ids")
    conversations_collection.create_index("last_message_time")
    connection_requests_collection.create_index([("sender_id", 1), ("receiver_id", 1)])
    connection_requests_collection.create_index("status")
    connection_requests_collection.create_index("created_at")
    connections_collection.create_index([("user_id", 1), ("target_user_id", 1)])
    connections_collection.create_index("status")
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
# IDEAS FUNCTIONS
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
        
        for idea in ideas:
            idea["id"] = str(idea["_id"])
            idea["user_id"] = str(idea["user_id"])
            del idea["_id"]
        
        return ideas
    except Exception as e:
        logging.error(f"Failed to fetch user ideas for {user_id}: {e}")
        return []

# =====================
# ROADMAP FUNCTIONS
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

# =====================
# RESEARCH FUNCTIONS
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

# =====================
# USER ACTIVITY FUNCTIONS
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
# TEAM FINDER - CONNECTION REQUEST FUNCTIONS
# =====================
def create_connection_request(sender_id: str, receiver_id: str, message: str = "") -> str:
    """Create a new connection request"""
    try:
        # Check if request already exists
        existing = connection_requests_collection.find_one({
            "sender_id": ObjectId(sender_id),
            "receiver_id": ObjectId(receiver_id)
        })
        
        if existing:
            if existing["status"] == "pending":
                raise ValueError("Connection request already sent")
            elif existing["status"] == "accepted":
                raise ValueError("Already connected")
            else:
                # Update existing rejected request to pending
                connection_requests_collection.update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "status": "pending",
                            "message": message,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                return str(existing["_id"])
        
        # Check reverse request (if receiver already sent request to sender)
        reverse_request = connection_requests_collection.find_one({
            "sender_id": ObjectId(receiver_id),
            "receiver_id": ObjectId(sender_id),
            "status": "pending"
        })
        
        if reverse_request:
            # Auto-accept if there's already a pending request from the receiver
            connection_requests_collection.update_one(
                {"_id": reverse_request["_id"]},
                {
                    "$set": {
                        "status": "accepted",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            # Create mutual connections
            create_connection(sender_id, receiver_id)
            create_connection(receiver_id, sender_id)
            return str(reverse_request["_id"])
        
        # Create new request
        request_doc = {
            "sender_id": ObjectId(sender_id),
            "receiver_id": ObjectId(receiver_id),
            "status": "pending",
            "message": message,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = connection_requests_collection.insert_one(request_doc)
        logging.info(f"Connection request created: {result.inserted_id}")
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Error creating connection request: {e}")
        raise

def get_connection_requests(user_id: str, request_type: str = "received") -> List[Dict]:
    """Get connection requests for a user"""
    try:
        if request_type == "received":
            query = {"receiver_id": ObjectId(user_id), "status": "pending"}
        else:
            query = {"sender_id": ObjectId(user_id), "status": "pending"}
        
        requests = list(connection_requests_collection.find(query).sort("created_at", -1))
        
        for request in requests:
            request["id"] = str(request["_id"])
            request["sender_id"] = str(request["sender_id"])
            request["receiver_id"] = str(request["receiver_id"])
            del request["_id"]
            
            # Get user details
            if request_type == "received":
                user = get_user_by_id(request["sender_id"])
                profile = get_user_profile(request["sender_id"])
            else:
                user = get_user_by_id(request["receiver_id"])
                profile = get_user_profile(request["receiver_id"])
            
            request["user_name"] = user.get("name", "Unknown") if user else "Unknown"
            request["user_email"] = user.get("email", "") if user else ""
            request["user_profile"] = profile or {}
        
        return requests
        
    except Exception as e:
        logging.error(f"Error getting connection requests: {e}")
        return []

def respond_to_connection_request(request_id: str, action: str, user_id: str) -> bool:
    """Accept or reject a connection request"""
    try:
        request = connection_requests_collection.find_one({
            "_id": ObjectId(request_id),
            "receiver_id": ObjectId(user_id),
            "status": "pending"
        })
        
        if not request:
            raise ValueError("Connection request not found")
        
        new_status = "accepted" if action == "accept" else "rejected"
        
        # Update request status
        connection_requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # If accepted, create mutual connections
        if action == "accept":
            sender_id = str(request["sender_id"])
            receiver_id = str(request["receiver_id"])
            
            # Create connections in both directions
            create_connection(sender_id, receiver_id)
            create_connection(receiver_id, sender_id)
        
        return True
        
    except Exception as e:
        logging.error(f"Error responding to connection request: {e}")
        return False

def get_connection_status(user_id: str, target_user_id: str) -> str:
    """Get connection status between two users"""
    try:
        # Check if already connected
        connection = connections_collection.find_one({
            "user_id": ObjectId(user_id),
            "target_user_id": ObjectId(target_user_id),
            "status": "connected"
        })
        if connection:
            return "connected"
        
        # Check for pending request from user to target
        sent_request = connection_requests_collection.find_one({
            "sender_id": ObjectId(user_id),
            "receiver_id": ObjectId(target_user_id),
            "status": "pending"
        })
        if sent_request:
            return "request_sent"
        
        # Check for pending request from target to user
        received_request = connection_requests_collection.find_one({
            "sender_id": ObjectId(target_user_id),
            "receiver_id": ObjectId(user_id),
            "status": "pending"
        })
        if received_request:
            return "request_received"
        
        return "not_connected"
        
    except Exception as e:
        logging.error(f"Error checking connection status: {e}")
        return "not_connected"

# =====================
# TEAM FINDER - CONNECTION MANAGEMENT
# =====================
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
        logging.error(f"Error creating connection: {e}")
        raise

def get_user_connections(user_id: str) -> List[str]:
    """Get list of connected user IDs for a user"""
    try:
        connections = connections_collection.find({
            "user_id": ObjectId(user_id),
            "status": "connected"
        })
        return [str(conn["target_user_id"]) for conn in connections]
    except Exception as e:
        logging.error(f"Error getting connections: {e}")
        return []

def get_connected_profiles(user_id: str) -> List[Dict]:
    """Get full profile data for connected users"""
    try:
        connected_user_ids = get_user_connections(user_id)
        connected_profiles = []
        
        for target_user_id in connected_user_ids:
            user = get_user_by_id(target_user_id)
            if user:
                profile = get_user_profile(target_user_id) or {}
                
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
        
        return connected_profiles
        
    except Exception as e:
        logging.error(f"Error getting connected profiles: {e}")
        return []

# =====================
# TEAM FINDER - SEARCH FUNCTIONS
# =====================
def calculate_profile_match_score(profile: Dict, requirements: Dict) -> Tuple[int, List[str], List[str]]:
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
    if requirements.get("experience") and profile.get("experience"):
        if profile.get("experience") == requirements["experience"]:
            score += 15
    total_criteria += 15
    
    # Availability matching (10% weight)
    if requirements.get("availability") and profile.get("availability"):
        if profile.get("availability") == requirements["availability"]:
            score += 10
    total_criteria += 10
    
    # Preferred role matching (10% weight)
    if requirements.get("preferred_role") and profile.get("preferred_role"):
        profile_role = profile.get("preferred_role", "").lower()
        req_role = requirements["preferred_role"].lower()
        if req_role in profile_role:
            score += 10
    total_criteria += 10
    
    final_score = min(100, max(0, int((score / total_criteria) * 100)))
    return final_score, matched_skills, matched_interests

def find_matching_profiles(requirements: Dict, exclude_user_id: str, limit: int = 10) -> List[Dict]:
    """Find profiles matching the search requirements"""
    try:
        # Get all profiles except current user
        query = {"user_id": {"$ne": ObjectId(exclude_user_id)}}
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
                user = get_user_by_id(str(profile["user_id"]))
                if user:
                    profile_id = str(profile["user_id"])
                    connection_status = get_connection_status(exclude_user_id, profile_id)
                    
                    matched_profile = {
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
                        "match_score": match_score,
                        "matched_skills": matched_skills,
                        "matched_interests": matched_interests,
                        "connection_status": connection_status
                    }
                    matched_profiles.append(matched_profile)
        
        # Sort by match score (highest first)
        matched_profiles.sort(key=lambda x: x["match_score"], reverse=True)
        
        return matched_profiles[:limit]
        
    except Exception as e:
        logging.error(f"Error finding matching profiles: {e}")
        return []

# =====================
# TEAM FINDER - CHAT FUNCTIONS
# =====================
def create_conversation(user_id: str, target_user_id: str) -> str:
    """Create a conversation between connected users"""
    try:
        # Check if users are connected
        if get_connection_status(user_id, target_user_id) != "connected":
            raise ValueError("Users must be connected to chat")
        
        # Check if conversation already exists
        existing_conv = conversations_collection.find_one({
            "participant_ids": {"$all": [ObjectId(user_id), ObjectId(target_user_id)]}
        })
        
        if existing_conv:
            return str(existing_conv["_id"])
        
        # Get user names
        user1 = get_user_by_id(user_id)
        user2 = get_user_by_id(target_user_id)
        
        conversation_doc = {
            "participant_ids": [ObjectId(user_id), ObjectId(target_user_id)],
            "participant_names": [
                user1.get("name", "Unknown") if user1 else "Unknown",
                user2.get("name", "Unknown") if user2 else "Unknown"
            ],
            "created_at": datetime.utcnow(),
            "last_message_time": datetime.utcnow(),
            "last_message": None
        }
        
        result = conversations_collection.insert_one(conversation_doc)
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Error creating conversation: {e}")
        raise

def send_message(user_id: str, conversation_id: str, content: str) -> Dict:
    """Send a message in a conversation"""
    try:
        # Verify user is part of conversation
        conversation = conversations_collection.find_one({
            "_id": ObjectId(conversation_id),
            "participant_ids": ObjectId(user_id)
        })
        
        if not conversation:
            raise ValueError("Conversation not found or access denied")
        
        user = get_user_by_id(user_id)
        
        # Create message
        message_doc = {
            "conversation_id": ObjectId(conversation_id),
            "sender_id": ObjectId(user_id),
            "sender_name": user.get("name", "Unknown") if user else "Unknown",
            "content": content,
            "message_type": "text",
            "timestamp": datetime.utcnow(),
            "read": False
        }
        
        result = messages_collection.insert_one(message_doc)
        
        # Update conversation last message
        conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "last_message": content,
                    "last_message_time": datetime.utcnow()
                }
            }
        )
        
        # Prepare response
        message_doc["id"] = str(result.inserted_id)
        message_doc["conversation_id"] = conversation_id
        message_doc["sender_id"] = user_id
        del message_doc["_id"]
        
        return message_doc
        
    except Exception as e:
        logging.error(f"Error sending message: {e}")
        raise

def get_messages(user_id: str, conversation_id: str, skip: int = 0, limit: int = 50) -> List[Dict]:
    """Get messages from a conversation"""
    try:
        # Verify user is part of conversation
        conversation = conversations_collection.find_one({
            "_id": ObjectId(conversation_id),
            "participant_ids": ObjectId(user_id)
        })
        
        if not conversation:
            raise ValueError("Conversation not found or access denied")
        
        # Get messages
        messages = list(messages_collection.find(
            {"conversation_id": ObjectId(conversation_id)}
        ).sort("timestamp", 1).skip(skip).limit(limit))
        
        # Convert ObjectIds to strings
        for message in messages:
            message["id"] = str(message["_id"])
            message["conversation_id"] = str(message["conversation_id"])
            message["sender_id"] = str(message["sender_id"])
            del message["_id"]
        
        return messages
        
    except Exception as e:
        logging.error(f"Error getting messages: {e}")
        return []
# ADD these functions to your existing database.py file
# Keep ALL your existing functions - just ADD these new ones

# =====================
# TEAM FINDER - FIXED CONNECTION REQUEST FUNCTIONS
# =====================

def create_connection_request(sender_id: str, receiver_id: str, message: str = "") -> str:
    """Create a new connection request - FIXED VERSION"""
    try:
        # Check if request already exists
        existing = connection_requests_collection.find_one({
            "sender_id": ObjectId(sender_id),
            "receiver_id": ObjectId(receiver_id),
            "status": "pending"
        })
        
        if existing:
            raise ValueError("Connection request already sent")
        
        # Check if already connected
        existing_connection = connections_collection.find_one({
            "user_id": ObjectId(sender_id),
            "target_user_id": ObjectId(receiver_id),
            "status": "connected"
        })
        
        if existing_connection:
            raise ValueError("Already connected")
        
        # Create new request
        request_doc = {
            "sender_id": ObjectId(sender_id),
            "receiver_id": ObjectId(receiver_id),
            "status": "pending",
            "message": message,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = connection_requests_collection.insert_one(request_doc)
        logging.info(f"Connection request created: {result.inserted_id}")
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Error creating connection request: {e}")
        raise

def get_connection_requests_fixed(user_id: str, request_type: str = "received") -> List[Dict]:
    """Get connection requests for a user - FIXED VERSION"""
    try:
        if request_type == "received":
            query = {"receiver_id": ObjectId(user_id), "status": "pending"}
        else:
            query = {"sender_id": ObjectId(user_id), "status": "pending"}
        
        requests = list(connection_requests_collection.find(query).sort("created_at", -1))
        
        for request in requests:
            # Convert ObjectIds to strings FIRST
            request["id"] = str(request["_id"])
            request["sender_id"] = str(request["sender_id"])
            request["receiver_id"] = str(request["receiver_id"])
            del request["_id"]
            
            # Get user details
            if request_type == "received":
                user = get_user_by_id(request["sender_id"])
                profile = get_user_profile(request["sender_id"])
            else:
                user = get_user_by_id(request["receiver_id"])
                profile = get_user_profile(request["receiver_id"])
            
            # Add user details safely
            request["sender_name"] = user.get("name", "Unknown") if user else "Unknown"
            request["sender_email"] = user.get("email", "") if user else ""
            
            # Convert profile ObjectIds to strings if profile exists
            if profile:
                # Make a copy to avoid modifying the original
                safe_profile = {}
                for key, value in profile.items():
                    if isinstance(value, ObjectId):
                        safe_profile[key] = str(value)
                    else:
                        safe_profile[key] = value
                request["user_profile"] = safe_profile
            else:
                request["user_profile"] = {}
        
        return requests
        
    except Exception as e:
        logging.error(f"Error getting connection requests: {e}")
        return []

def respond_to_connection_request_fixed(request_id: str, action: str, user_id: str) -> bool:
    """Accept or reject a connection request - FIXED VERSION"""
    try:
        request = connection_requests_collection.find_one({
            "_id": ObjectId(request_id),
            "receiver_id": ObjectId(user_id),
            "status": "pending"
        })
        
        if not request:
            raise ValueError("Connection request not found")
        
        new_status = "accepted" if action == "accept" else "rejected"
        
        # Update request status
        connection_requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # If accepted, create mutual connections
        if action == "accept":
            sender_id = str(request["sender_id"])
            receiver_id = str(request["receiver_id"])
            
            # Create connections in both directions
            create_connection_fixed(sender_id, receiver_id)
            create_connection_fixed(receiver_id, sender_id)
        
        return True
        
    except Exception as e:
        logging.error(f"Error responding to connection request: {e}")
        return False

def get_connection_status_fixed(user_id: str, target_user_id: str) -> str:
    """Get connection status between two users - FIXED VERSION"""
    try:
        # Check if already connected
        connection = connections_collection.find_one({
            "user_id": ObjectId(user_id),
            "target_user_id": ObjectId(target_user_id),
            "status": "connected"
        })
        if connection:
            return "connected"
        
        # Check for pending request from user to target
        sent_request = connection_requests_collection.find_one({
            "sender_id": ObjectId(user_id),
            "receiver_id": ObjectId(target_user_id),
            "status": "pending"
        })
        if sent_request:
            return "request_sent"
        
        # Check for pending request from target to user
        received_request = connection_requests_collection.find_one({
            "sender_id": ObjectId(target_user_id),
            "receiver_id": ObjectId(user_id),
            "status": "pending"
        })
        if received_request:
            return "request_received"
        
        return "not_connected"
        
    except Exception as e:
        logging.error(f"Error checking connection status: {e}")
        return "not_connected"

def create_connection_fixed(user_id: str, target_user_id: str) -> str:
    """Create a connection between two users - FIXED VERSION"""
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
        logging.error(f"Error creating connection: {e}")
        raise

def get_user_connections_fixed(user_id: str) -> List[str]:
    """Get list of connected user IDs for a user - FIXED VERSION"""
    try:
        connections = connections_collection.find({
            "user_id": ObjectId(user_id),
            "status": "connected"
        })
        return [str(conn["target_user_id"]) for conn in connections]
    except Exception as e:
        logging.error(f"Error getting connections: {e}")
        return []

def get_connected_profiles_fixed(user_id: str) -> List[Dict]:
    """Get full profile data for connected users - FIXED VERSION"""
    try:
        connected_user_ids = get_user_connections_fixed(user_id)
        connected_profiles = []
        
        for target_user_id in connected_user_ids:
            user = get_user_by_id(target_user_id)
            if user:
                profile = get_user_profile(target_user_id) or {}
                
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
        
        return connected_profiles
        
    except Exception as e:
        logging.error(f"Error getting connected profiles: {e}")
        return []

def create_conversation_fixed(user_id: str, target_user_id: str) -> str:
    """Create a conversation between connected users - FIXED VERSION"""
    try:
        # Check if users are connected
        if get_connection_status_fixed(user_id, target_user_id) != "connected":
            raise ValueError("Users must be connected to chat")
        
        # Check if conversation already exists
        existing_conv = conversations_collection.find_one({
            "participant_ids": {"$all": [ObjectId(user_id), ObjectId(target_user_id)]}
        })
        
        if existing_conv:
            return str(existing_conv["_id"])
        
        # Get user names
        user1 = get_user_by_id(user_id)
        user2 = get_user_by_id(target_user_id)
        
        conversation_doc = {
            "participant_ids": [ObjectId(user_id), ObjectId(target_user_id)],
            "participant_names": [
                user1.get("name", "Unknown") if user1 else "Unknown",
                user2.get("name", "Unknown") if user2 else "Unknown"
            ],
            "created_at": datetime.utcnow(),
            "last_message_time": datetime.utcnow(),
            "last_message": None
        }
        
        result = conversations_collection.insert_one(conversation_doc)
        return str(result.inserted_id)
        
    except Exception as e:
        logging.error(f"Error creating conversation: {e}")
        raise

def send_message_fixed(user_id: str, conversation_id: str, content: str) -> Dict:
    """Send a message in a conversation - FIXED VERSION"""
    try:
        # Verify user is part of conversation
        conversation = conversations_collection.find_one({
            "_id": ObjectId(conversation_id),
            "participant_ids": ObjectId(user_id)
        })
        
        if not conversation:
            raise ValueError("Conversation not found or access denied")
        
        user = get_user_by_id(user_id)
        
        # Create message
        message_doc = {
            "conversation_id": ObjectId(conversation_id),
            "sender_id": ObjectId(user_id),
            "sender_name": user.get("name", "Unknown") if user else "Unknown",
            "content": content,
            "message_type": "text",
            "timestamp": datetime.utcnow(),
            "read": False
        }
        
        result = messages_collection.insert_one(message_doc)
        
        # Update conversation last message
        conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "last_message": content,
                    "last_message_time": datetime.utcnow()
                }
            }
        )
        
        # Prepare response
        message_doc["id"] = str(result.inserted_id)
        message_doc["conversation_id"] = conversation_id
        message_doc["sender_id"] = user_id
        del message_doc["_id"]
        
        return message_doc
        
    except Exception as e:
        logging.error(f"Error sending message: {e}")
        raise

def get_messages_fixed(user_id: str, conversation_id: str, skip: int = 0, limit: int = 50) -> List[Dict]:
    """Get messages from a conversation - FIXED VERSION"""
    try:
        # Verify user is part of conversation
        conversation = conversations_collection.find_one({
            "_id": ObjectId(conversation_id),
            "participant_ids": ObjectId(user_id)
        })
        
        if not conversation:
            raise ValueError("Conversation not found or access denied")
        
        # Get messages
        messages = list(messages_collection.find(
            {"conversation_id": ObjectId(conversation_id)}
        ).sort("timestamp", 1).skip(skip).limit(limit))
        
        # Convert ObjectIds to strings
        for message in messages:
            message["id"] = str(message["_id"])
            message["conversation_id"] = str(message["conversation_id"])
            message["sender_id"] = str(message["sender_id"])
            del message["_id"]
        
        return messages
        
    except Exception as e:
        logging.error(f"Error getting messages: {e}")
        return []
# =====================
# UTILITY FUNCTIONS
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