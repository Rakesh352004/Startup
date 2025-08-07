from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")

print("🔑 Groq Key:", GROQ_API_KEY[:10], "..." if GROQ_API_KEY else "❌ Missing")
print("🗂️ Mongo URI:", MONGO_URI)
print("📁 DB Name:", MONGO_DB)

# Set up MongoDB
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
ideas_collection = db["ideas"]

app = FastAPI()

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input model
class Idea(BaseModel):
    text: str

# Helper to parse LLM response
def parse_llm_response(response_text: str) -> dict:
    sections = {
        "market_opportunity": "",
        "competition_level": "",
        "insight": ""
    }

    lines = [line.strip() for line in response_text.split('\n') if line.strip()]
    current_section = None

    for line in lines:
        if "1. Market Opportunity" in line:
            current_section = "market_opportunity"
            line = line.replace("1. Market Opportunity", "").strip(": ").strip()
        elif "2. Competition Level" in line:
            current_section = "competition_level"
            line = line.replace("2. Competition Level", "").strip(": ").strip()
        elif "3. Insight" in line:
            current_section = "insight"
            line = line.replace("3. Insight", "").strip(": ").strip()

        if current_section and line:
            if sections[current_section]:
                sections[current_section] += "\n" + line
            else:
                sections[current_section] = line

    return sections

# Call Groq API
def call_groq_validation(idea: str) -> dict:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""
    Analyze this startup idea:
    "{idea}"

    Provide your response with these 3 exact section headers:
    1. Market Opportunity
    2. Competition Level
    3. Insight

    Make each section 2-3 sentences and be concise.
    """

    payload = {
        "model": "llama3-70b-8192",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        full_text = response.json()["choices"][0]["message"]["content"].strip()
        parsed_response = parse_llm_response(full_text)
        parsed_response["raw"] = full_text
        return parsed_response
    else:
        return {
            "error": f"Groq API Error: {response.status_code}",
            "details": response.text
        }

# Main API route to validate idea and save to MongoDB
@app.post("/validate-idea")
def validate_idea(idea: Idea):
    result = call_groq_validation(idea.text)

    if "error" in result:
        return result

    # Save to MongoDB
    ideas_collection.insert_one({
        "idea": idea.text,
        "market_opportunity": result["market_opportunity"],
        "competition_level": result["competition_level"],
        "insight": result["insight"],
        "raw_response": result["raw"],
        "timestamp": datetime.utcnow()
    })

    return {
        "idea": idea.text,
        **result
    }
