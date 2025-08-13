import os
from pymongo import MongoClient, errors
from passlib.context import CryptContext
from dotenv import load_dotenv
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import jwt

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
JWT_SECRET = os.getenv("JWT_SECRET", "R9AwDobUDMrtgJ_KBySMyOQkpAZAo3Eh0JFXPdUfEBI")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

if not MONGO_URI or not MONGO_DB:
    raise Exception("MONGO_URI and MONGO_DB must be set in environment")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Collections
users_collection = db["users"]
ideas_collection = db["ideas"]
profiles_collection = db["profiles"]
roadmaps_collection = db["roadmaps"]
research_collection = db["research"]

# Create indexes
try:
    users_collection.create_index("email", unique=True)
    profiles_collection.create_index("user_id", unique=True)
    roadmaps_collection.create_index("user_id")
    research_collection.create_index("user_id")
except Exception as e:
    print(f"Index creation error: {e}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# =====================
# Auth helpers
# =====================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str, expires_minutes: int = JWT_EXPIRES_MINUTES):
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode = {"sub": str(subject), "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

# =====================
# User/Profile helpers
# =====================
def get_user_by_id(user_id: str):
    return users_collection.find_one({"_id": ObjectId(user_id)})

def get_user_profile(user_id: str):
    return profiles_collection.find_one({"user_id": ObjectId(user_id)})

def update_user_profile(user_id: str, profile_data: dict):
    return profiles_collection.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": profile_data},
        upsert=True
    )

# =====================
# Roadmap CRUD
# =====================
def create_roadmap(user_id: str, data: dict) -> str:
    now = datetime.utcnow()
    data.update({
        "created_at": now,
        "updated_at": now,
        "user_id": user_id
    })
    result = roadmaps_collection.insert_one(data)
    return str(result.inserted_id)

def get_roadmap_by_id(roadmap_id: str):
    roadmap = roadmaps_collection.find_one({"_id": ObjectId(roadmap_id)})
    if roadmap:
        roadmap["id"] = str(roadmap["_id"])
        del roadmap["_id"]
    return roadmap

def get_user_roadmaps(user_id: str):
    roadmaps = list(roadmaps_collection.find({"user_id": user_id}))
    for roadmap in roadmaps:
        roadmap["id"] = str(roadmap["_id"])
        del roadmap["_id"]
    return roadmaps

def update_roadmap(roadmap_id: str, update_data: dict):
    update_data["updated_at"] = datetime.utcnow()
    return roadmaps_collection.update_one(
        {"_id": ObjectId(roadmap_id)},
        {"$set": update_data}
    )

def delete_roadmap(roadmap_id: str):
    return roadmaps_collection.delete_one({"_id": ObjectId(roadmap_id)})

# =====================
# Research CRUD
# =====================
def save_research(user_id: str, research_data: dict) -> str:
    research_doc = {
        "user_id": ObjectId(user_id),
        "idea": research_data["idea"],
        "search_terms": research_data.get("search_terms", []),
        "papers": research_data.get("papers", []),
        "validation": research_data.get("validation", {}),
        "sources": research_data.get("sources", {}),
        "created_at": research_data.get("created_at", datetime.utcnow())
    }
    result = research_collection.insert_one(research_doc)
    return str(result.inserted_id)

def get_user_research_history(user_id: str, limit: int = 10) -> list:
    return list(
        research_collection.find(
            {"user_id": ObjectId(user_id)},
            {"papers": 0}  # exclude papers for list view
        ).sort("created_at", -1).limit(limit)
    )

def get_research_by_id(user_id: str, research_id: str) -> dict:
    return research_collection.find_one({
        "_id": ObjectId(research_id),
        "user_id": ObjectId(user_id)
    })

def get_research_count(user_id: str) -> int:
    return research_collection.count_documents({"user_id": ObjectId(user_id)})
# Activity Summary
# =====================
def get_user_activity(user_id: str) -> dict:
    user_obj_id = ObjectId(user_id)
    return {
        "ideas": ideas_collection.count_documents({"user_id": user_obj_id}),
        "roadmaps": roadmaps_collection.count_documents({"user_id": user_obj_id}),
        "research": research_collection.count_documents({"user_id": user_obj_id}),
        "profile_exists": profiles_collection.count_documents({"user_id": user_obj_id}) > 0
    }
