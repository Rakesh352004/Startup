
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import json
from bson import ObjectId

# Database integration utilities
class ChatSessionManager:
    """Manages chat sessions in MongoDB"""
    
    def __init__(self, chat_sessions_collection):
        self.collection = chat_sessions_collection
    
    def create_session(self, user_id: str, session_data: Dict) -> str:
        """Create a new chat session"""
        session_doc = {
            "session_id": str(uuid.uuid4()),
            "user_id": ObjectId(user_id) if user_id != "anonymous" else user_id,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "messages": [],
            "metadata": session_data
        }
        result = self.collection.insert_one(session_doc)
        return session_doc["session_id"]
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get chat session by ID"""
        return self.collection.find_one({"session_id": session_id})
    
    def update_session(self, session_id: str, messages: List[Dict]):
        """Update session with new messages"""
        self.collection.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "messages": messages,
                    "last_activity": datetime.utcnow()
                }
            }
        )
    
    def get_user_sessions(self, user_id: str) -> List[Dict]:
        """Get all sessions for a user"""
        query = {"user_id": ObjectId(user_id) if user_id != "anonymous" else user_id}
        return list(self.collection.find(query).sort("last_activity", -1))
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session"""
        result = self.collection.delete_one({"session_id": session_id})
        return result.deleted_count > 0

# Enhanced response formatter
class ResponseFormatter:
    """Formats chatbot responses for consistent API output"""
    
    @staticmethod
    def format_chat_response(bot_response: Dict, session_id: str) -> Dict:
        """Format the chatbot response for API output"""
        return {
            "reply": bot_response.get("response", "I apologize, but I couldn't process that request."),
            "intent": bot_response.get("intent", "unknown"),
            "entities": bot_response.get("entities", {}),
            "follow_ups": bot_response.get("follow_ups", []),
            "session_id": session_id,
            "timestamp": bot_response.get("timestamp", datetime.utcnow().isoformat()),
            "confidence": bot_response.get("confidence", 0.8),
            "source": "startup_gps_ai"
        }
    
    @staticmethod
    def format_error_response(error_message: str, session_id: str) -> Dict:
        """Format error response"""
        return {
            "reply": f"I apologize, but I encountered an issue: {error_message}. However, I'm still here to help with your startup journey!",
            "intent": "error",
            "entities": {},
            "follow_ups": [
                "Tell me about Startup GPS services",
                "How can I validate my idea?",
                "Connect me with support"
            ],
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": 1.0,
            "source": "error_handler"
        }

# Analytics and monitoring
class ChatAnalytics:
    """Track chatbot usage and performance"""
    
    def __init__(self, analytics_collection):
        self.collection = analytics_collection
    
    def log_interaction(self, user_id: str, session_id: str, query: str, 
                       response: str, intent: str, entities: Dict):
        """Log chat interaction for analytics"""
        log_entry = {
            "user_id": user_id,
            "session_id": session_id,
            "query": query,
            "response_length": len(response),
            "intent": intent,
            "entities": entities,
            "timestamp": datetime.utcnow(),
            "response_time": None  # Can be calculated if needed
        }
        self.collection.insert_one(log_entry)
    
    def get_popular_intents(self, days: int = 30) -> List[Dict]:
        """Get most popular intents in the last N days"""
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {"_id": "$intent", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        return list(self.collection.aggregate(pipeline))
    
    def get_user_engagement_stats(self, user_id: str) -> Dict:
        """Get engagement statistics for a specific user"""
        user_logs = list(self.collection.find({"user_id": user_id}))
        
        if not user_logs:
            return {"total_interactions": 0, "unique_sessions": 0, "top_intents": []}
        
        unique_sessions = len(set(log["session_id"] for log in user_logs))
        intent_counts = {}
        
        for log in user_logs:
            intent = log["intent"]
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        top_intents = sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_interactions": len(user_logs),
            "unique_sessions": unique_sessions,
            "top_intents": top_intents,
            "first_interaction": min(log["timestamp"] for log in user_logs).isoformat(),
            "last_interaction": max(log["timestamp"] for log in user_logs).isoformat()
        }

# Configuration and settings
CHATBOT_CONFIG = {
    "max_message_length": 2000,
    "max_conversation_history": 50,
    "session_timeout_hours": 24,
    "response_timeout_seconds": 30,
    "fallback_responses": {
        "greeting": "Hello! Welcome to Startup GPS! How can I help you today?",
        "error": "I'm experiencing some technical difficulties, but I'm still here to help with your startup journey!",
        "timeout": "I'm taking a bit longer to respond than usual. Let me try to help you with that.",
        "unknown": "I'm not sure about that specific topic, but I can definitely help with startup guidance, mentorship, and business development."
    },
    "supported_languages": ["en"],
    "features": {
        "intent_classification": True,
        "entity_extraction": True,
        "context_awareness": True,
        "follow_up_suggestions": True,
        "session_persistence": True,
        "analytics_tracking": True
    }
}

# Rate limiting utilities
class RateLimiter:
    """Simple rate limiter for chat interactions"""
    
    def __init__(self):
        self.user_requests = {}
    
    def is_rate_limited(self, user_id: str, max_requests: int = 30, 
                       time_window: int = 60) -> bool:
        """Check if user is rate limited"""
        import time
        current_time = time.time()
        
        if user_id not in self.user_requests:
            self.user_requests[user_id] = []
        
        # Clean old requests
        self.user_requests[user_id] = [
            req_time for req_time in self.user_requests[user_id]
            if current_time - req_time < time_window
        ]
        
        # Check if limit exceeded
        if len(self.user_requests[user_id]) >= max_requests:
            return True
        
        # Add current request
        self.user_requests[user_id].append(current_time)
        return False

# Health check utilities
class HealthChecker:
    """Health check utilities for the chatbot system"""
    
    @staticmethod
    def check_groq_api(api_key: str) -> Dict[str, Any]:
        """Check GROQ API health"""
        if not api_key:
            return {"status": "error", "message": "API key not configured"}
        
        try:
            import requests
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 10
                },
                timeout=10
            )
            
            if response.status_code == 200:
                return {"status": "healthy", "message": "API connection successful"}
            else:
                return {"status": "error", "message": f"API returned status {response.status_code}"}
        
        except Exception as e:
            return {"status": "error", "message": f"API connection failed: {str(e)}"}
    
    @staticmethod
    def check_database(collection) -> Dict[str, Any]:
        """Check database connection"""
        try:
            collection.find_one({})
            return {"status": "healthy", "message": "Database connection successful"}
        except Exception as e:
            return {"status": "error", "message": f"Database connection failed: {str(e)}"}
    
    @staticmethod
    def get_system_health(api_key: str, db_collection) -> Dict[str, Any]:
        """Get overall system health"""
        groq_health = HealthChecker.check_groq_api(api_key)
        db_health = HealthChecker.check_database(db_collection)
        
        overall_status = "healthy"
        if groq_health["status"] == "error" or db_health["status"] == "error":
            overall_status = "degraded" if groq_health["status"] == "healthy" or db_health["status"] == "healthy" else "error"
        
        return {
            "overall_status": overall_status,
            "components": {
                "groq_api": groq_health,
                "database": db_health
            },
            "timestamp": datetime.utcnow().isoformat()
        }

# Message validation utilities
def validate_chat_message(message: str) -> Dict[str, Any]:
    """Validate incoming chat message"""
    errors = []
    
    if not message or not message.strip():
        errors.append("Message cannot be empty")
    
    if len(message) > CHATBOT_CONFIG["max_message_length"]:
        errors.append(f"Message too long (max {CHATBOT_CONFIG['max_message_length']} characters)")
    
    # Check for potentially harmful content
    harmful_patterns = [
        r'<script.*?>',
        r'javascript:',
        r'onclick=',
        r'onerror=',
        r'<iframe.*?>'
    ]
    
    import re
    for pattern in harmful_patterns:
        if re.search(pattern, message, re.IGNORECASE):
            errors.append("Message contains potentially harmful content")
            break
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "cleaned_message": message.strip()[:CHATBOT_CONFIG["max_message_length"]]
    }

# Context management utilities
def serialize_context(context) -> Dict:
    """Serialize ChatContext for storage"""
    return {
        "user_id": context.user_id,
        "conversation_history": context.conversation_history[-CHATBOT_CONFIG["max_conversation_history"]:],
        "current_intent": context.current_intent.value if context.current_intent else None,
        "entities": context.entities,
        "last_updated": datetime.utcnow().isoformat()
    }

def deserialize_context(data: Dict):
    """Deserialize ChatContext from storage"""
    from Backend.enhanced_chatbot import ChatContext, IntentType
    
    context = ChatContext()
    context.user_id = data.get("user_id")
    context.conversation_history = data.get("conversation_history", [])
    context.entities = data.get("entities", {})
    
    intent_str = data.get("current_intent")
    if intent_str:
        try:
            context.current_intent = IntentType(intent_str)
        except ValueError:
            context.current_intent = IntentType.UNKNOWN
    
    return context

# Integration with existing main.py
def integrate_with_main_app(app, enhanced_chatbot, chat_sessions_collection=None):
    """
    Integration function to add chatbot endpoints to existing FastAPI app
    Call this function in your main.py after creating the FastAPI app
    """
    
    # Initialize utilities
    session_manager = ChatSessionManager(chat_sessions_collection) if chat_sessions_collection else None
    rate_limiter = RateLimiter()
    analytics = ChatAnalytics(chat_sessions_collection) if chat_sessions_collection else None
    
    @app.middleware("http")
    async def chatbot_middleware(request, call_next):
        """Middleware for chatbot requests"""
        response = await call_next(request)
        
        # Add chatbot-specific headers
        if request.url.path.startswith("/chat"):
            response.headers["X-Chatbot-Version"] = "2.0"
            response.headers["X-Powered-By"] = "Startup-GPS-AI"
        
        return response
    
    @app.get("/health/chatbot")
    async def chatbot_health():
        """Chatbot health check endpoint"""
        import os
        api_key = os.getenv("GROQ_API_KEY")
        return HealthChecker.get_system_health(api_key, chat_sessions_collection)
    
    print("Enhanced chatbot integrated successfully!")

# Utility functions for testing
def test_chatbot_integration():
    """Test the chatbot integration"""
    from Backend.enhanced_chatbot import enhanced_chatbot, ChatContext
    
    test_cases = [
        "Hello!",
        "What is Startup GPS?",
        "I need help with funding",
        "Can you validate my startup idea?",
        "Connect me with a mentor"
    ]
    
    context = ChatContext()
    results = []
    
    print("Testing Enhanced Chatbot Integration...")
    print("=" * 50)
    
    for i, query in enumerate(test_cases, 1):
        try:
            response = enhanced_chatbot.get_response(query, context)
            results.append({
                "test": i,
                "query": query,
                "success": True,
                "intent": response.get("intent"),
                "has_followups": len(response.get("follow_ups", [])) > 0
            })
            print(f"✅ Test {i}: {query} -> {response['intent']}")
        except Exception as e:
            results.append({
                "test": i,
                "query": query,
                "success": False,
                "error": str(e)
            })
            print(f"❌ Test {i}: {query} -> Error: {e}")
    
    success_rate = sum(1 for r in results if r["success"]) / len(results) * 100
    print(f"\nTest Results: {success_rate:.1f}% success rate")
    
    return results

if __name__ == "__main__":
    # Run tests if this file is executed directly
    test_chatbot_integration()