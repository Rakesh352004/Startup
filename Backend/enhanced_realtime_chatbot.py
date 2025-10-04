# enhanced_realtime_chatbot.py - ADVANCED VERSION WITH FULL FEATURES
from fastapi import HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Set, Tuple
import json
import re
import uuid
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from database import (
    users_collection, ideas_collection, profiles_collection, roadmaps_collection,
    research_collection, connections_collection, get_user_by_id, get_user_profile, 
    get_user_stats, save_idea_validation, create_roadmap, save_research
)
import os
import requests
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET", "fallback_secret")
JWT_ALGORITHM = "HS256"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ==========================================
# ENHANCED SYSTEM PROMPT
# ==========================================

CHATBOT_SYSTEM_PROMPT = """You are the Startup GPS AI Assistant - an intelligent, proactive mentor for entrepreneurs.

## Core Identity
- Expert startup advisor with technical depth and business acumen
- Conversational and friendly, not robotic or formal
- Action-oriented: you don't just talk, you help execute
- Context-aware: you remember the conversation and user history
- Proactive: you suggest next steps and identify opportunities

## Your Capabilities
1. **Execute Actions**: You can directly validate ideas, create roadmaps, find research
2. **Multi-turn Conversations**: Guide users through complex workflows step-by-step
3. **Contextual Understanding**: Remember conversation history and user patterns
4. **Smart Suggestions**: Proactively recommend actions based on user behavior
5. **Natural Language**: Understand intent beyond exact keywords

## Conversation Principles

### Understanding Intent
You excel at interpreting what users MEAN, not just what they SAY:
- "thoughts on this idea: [description]" = validate this idea
- "how do I start" = they need a roadmap
- "any similar research" = find relevant papers
- "I'm stuck" = diagnose where they are and suggest next steps

### Session Memory
You remember:
- Previous messages in this session
- What the user has already shared
- What actions you've taken
- Where the user is in their journey

### Execution Flow
When users want to DO something:
1. Acknowledge their request
2. Extract necessary information (ask clarifying questions if needed)
3. Execute the action (validation/roadmap/research)
4. Present results conversationally
5. Suggest logical next steps

### Response Style
- **Short answers for simple questions**: 1-2 sentences
- **Structured for complex topics**: Use sections but keep it conversational
- **Always actionable**: End with "What would you like to do?" or specific options
- **No unnecessary formality**: Skip "I hope this helps" and corporate speak

## Handling Different Scenarios

### New Idea Validation
User: "I want to build an AI tutor for kids"
You: "Let me validate that for you. Give me a moment..."
[Execute validation]
You: "Your AI tutor idea scored 78/100. Strong market demand (85) but watch out for regulatory hurdles in education tech. Want me to create a roadmap for this?"

### Follow-up Questions
User: "What about competitors?"
You: [Check context - they asked about AI tutor]
"For AI tutoring, main competitors are Khan Academy, Duolingo, and Chegg. Your edge could be personalization for kids. Want me to find academic research on adaptive learning?"

### Workflow Guidance
User: "I'm new here"
You: "Let's start with your idea. What problem are you trying to solve?"
[Multi-turn conversation to gather info]
You: "Got it. Let me validate: [summary]. Sound right?"
[Get confirmation, then execute]

### Proactive Suggestions
You notice patterns:
- "You've validated 3 ideas but never created roadmaps. Want to build one for your top idea?"
- "Your last idea scored 85/100 - that's excellent. Ready to find co-founders?"

## Important Rules
1. NEVER say "I'm an AI" or "I cannot" - you're a capable assistant
2. If you need GROQ API for validation/roadmap but it fails, explain briefly and offer alternatives
3. Always maintain conversation context - reference previous messages naturally
4. Don't repeat information the user already knows
5. Be concise - every word should add value
6. When executing actions, show progress not silence

## Action Triggers
Detect these intents and EXECUTE (don't just explain):
- Idea description → validate immediately
- "create/generate/build roadmap" → execute roadmap generation
- "find/search papers/research" → execute research search
- "show/display my X" → query database and present

Your goal: Make users feel like they have an expert co-founder who gets things done."""

# ==========================================
# SESSION MANAGER
# ==========================================

class SessionManager:
    """Manages conversation sessions with context memory"""
    
    def __init__(self):
        self.sessions: Dict[str, List[Dict]] = {}
        self.session_metadata: Dict[str, Dict] = {}
        self.max_history = 10  # Keep last 10 messages
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Dict = None):
        """Add message to session history"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
            self.session_metadata[session_id] = {
                "created_at": datetime.utcnow(),
                "last_active": datetime.utcnow(),
                "user_id": metadata.get("user_id") if metadata else None,
                "action_history": []
            }
        
        self.sessions[session_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow(),
            "metadata": metadata or {}
        })
        
        # Keep only recent messages
        if len(self.sessions[session_id]) > self.max_history:
            self.sessions[session_id] = self.sessions[session_id][-self.max_history:]
        
        self.session_metadata[session_id]["last_active"] = datetime.utcnow()
    
    def get_context(self, session_id: str, last_n: int = 5) -> List[Dict]:
        """Get recent conversation context"""
        return self.sessions.get(session_id, [])[-last_n:]
    
    def add_action(self, session_id: str, action_type: str, action_data: Dict):
        """Record action execution"""
        if session_id in self.session_metadata:
            self.session_metadata[session_id]["action_history"].append({
                "type": action_type,
                "data": action_data,
                "timestamp": datetime.utcnow()
            })
    
    def get_last_action(self, session_id: str) -> Optional[Dict]:
        """Get most recent action"""
        if session_id in self.session_metadata:
            actions = self.session_metadata[session_id]["action_history"]
            return actions[-1] if actions else None
        return None
    
    def clear_session(self, session_id: str):
        """Clear session data"""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self.session_metadata:
            del self.session_metadata[session_id]

# ==========================================
# INTENT CLASSIFIER
# ==========================================

class IntentClassifier:
    """Enhanced intent classification with semantic understanding"""
    
    def __init__(self):
        self.intent_keywords = {
            "validate_idea": {
                "triggers": ["validate", "thoughts on", "feedback on", "analyze", "evaluate", "is this good"],
                "patterns": [
                    r"validate.{0,20}(idea|concept|startup)",
                    r"(thoughts|feedback).{0,20}(idea|concept)",
                    r"(what do you think|opinion).{0,20}(about|on)",
                    r"(analyze|evaluate).{0,20}(this|my)"
                ]
            },
            "create_roadmap": {
                "triggers": ["roadmap", "plan", "timeline", "steps", "how to build", "how do i start"],
                "patterns": [
                    r"(create|generate|build|make).{0,20}roadmap",
                    r"(create|generate|build|make).{0,20}plan",
                    r"how (do i|to).{0,20}(start|build|launch)",
                    r"(steps|timeline|phases).{0,20}(for|to)"
                ]
            },
            "find_research": {
                "triggers": ["research", "papers", "studies", "academic", "articles"],
                "patterns": [
                    r"(find|search|get|show).{0,20}(research|papers|studies)",
                    r"(any|some).{0,20}(research|papers|studies)",
                    r"academic.{0,20}(research|papers)"
                ]
            },
            "show_history": {
                "triggers": ["my ideas", "my roadmaps", "my research", "show my", "my history", "my activity"],
                "patterns": [
                    r"(show|display|get|list).{0,20}my.{0,20}(ideas|roadmaps|research|activity)",
                    r"my.{0,20}(ideas|roadmaps|research|history)"
                ]
            },
            "find_team": {
                "triggers": ["co-founder", "team member", "partner", "hire", "find developer"],
                "patterns": [
                    r"(find|need|looking for).{0,20}(co-founder|team|partner|developer)",
                    r"(hire|recruit).{0,20}(developer|designer|team)"
                ]
            }
        }
    
    def classify(self, message: str, context: List[Dict] = None) -> Tuple[str, float]:
        """Classify intent with confidence score"""
        message_lower = message.lower()
        
        # Check for explicit action requests
        for intent, data in self.intent_keywords.items():
            # Check trigger words
            for trigger in data["triggers"]:
                if trigger in message_lower:
                    return intent, 0.85
            
            # Check patterns
            for pattern in data["patterns"]:
                if re.search(pattern, message_lower):
                    return intent, 0.90
        
        # Check if message contains idea description (for auto-validation)
        if self._is_idea_description(message):
            return "validate_idea", 0.75
        
        # Check context for continuation
        if context:
            last_intent = self._infer_from_context(context)
            if last_intent:
                return last_intent, 0.70
        
        return "general_conversation", 0.60
    
    def _is_idea_description(self, message: str) -> bool:
        """Detect if message is describing a startup idea"""
        indicators = [
            r"(app|platform|service|product|tool).{0,30}(for|that|to)",
            r"(build|create|develop).{0,30}(app|platform|service|website)",
            r"(helps?|enables?|allows?).{0,30}(users?|people|customers)",
            r"marketplace.{0,30}for",
            r"(connecting|matching).{0,30}(users?|people)"
        ]
        
        # Must be substantial (not just keywords)
        if len(message.split()) < 10:
            return False
        
        for pattern in indicators:
            if re.search(pattern, message.lower()):
                return True
        
        return False
    
    def _infer_from_context(self, context: List[Dict]) -> Optional[str]:
        """Infer intent from conversation context"""
        if not context:
            return None
        
        last_message = context[-1]
        
        # If bot asked a follow-up question, user is likely answering
        if last_message.get("role") == "assistant":
            content = last_message.get("content", "").lower()
            if "target market" in content or "who is this for" in content:
                return "validate_idea"
            if "timeframe" in content or "how long" in content:
                return "create_roadmap"
        
        return None

# ==========================================
# ACTION EXECUTOR
# ==========================================

class ActionExecutor:
    """Executes chatbot actions (validation, roadmap, research)"""
    
    def __init__(self):
        pass
    
    async def validate_idea(self, idea_text: str, user_id: str = None) -> Dict:
        """Execute idea validation"""
        try:
            from main import call_groq_validation_enhanced
            
            result = call_groq_validation_enhanced(idea_text)
            
            # Save to database if user authenticated
            if user_id:
                idea_data = {
                    "prompt": idea_text,
                    "validation": {
                        "verdict": result["analysis"]["verdict"],
                        "feasibility": result["analysis"]["feasibility"],
                        "marketDemand": result["analysis"]["market_demand"],
                        "uniqueness": result["analysis"]["uniqueness"],
                        "strength": result["analysis"]["strength"],
                        "riskFactors": result["analysis"]["risk_factors"],
                        "riskMitigation": result["analysis"].get("risk_mitigation", ""),
                        "existingCompetitors": result["analysis"]["existing_competitors"]
                    },
                    "scores": result["scores"],
                    "suggestions": result["suggestions"]
                }
                save_idea_validation(user_id, idea_data)
            
            return {
                "success": True,
                "result": result,
                "action": "validation_complete"
            }
        except Exception as e:
            logger.error(f"Validation execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "action": "validation_failed"
            }
    
    async def create_roadmap(self, idea_text: str, timeframe: str, user_id: str = None) -> Dict:
        """Execute roadmap creation"""
        try:
            from main import call_groq_roadmap
            
            result = call_groq_roadmap(idea_text, timeframe)
            
            # Save to database if user authenticated
            if user_id:
                roadmap_data = {
                    "prompt": idea_text,
                    "timeframe": timeframe,
                    "roadmap": result
                }
                roadmap_id = create_roadmap(user_id, roadmap_data)
                result["id"] = roadmap_id
            
            return {
                "success": True,
                "result": result,
                "action": "roadmap_complete"
            }
        except Exception as e:
            logger.error(f"Roadmap execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "action": "roadmap_failed"
            }
    
    async def find_research(self, topic: str, user_id: str = None) -> Dict:
        """Execute research paper search"""
        try:
            from main import generate_search_terms, fetch_semantic_scholar, fetch_arxiv
            import asyncio
            
            search_terms = generate_search_terms(topic)
            
            # Fetch from multiple sources
            tasks = [
                fetch_semantic_scholar(search_terms, 5),
                fetch_arxiv(search_terms, 5)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_papers = []
            for result in results:
                if isinstance(result, list):
                    all_papers.extend(result)
            
            # Save to database if user authenticated
            if user_id and all_papers:
                research_doc = {
                    "idea": topic,
                    "search_terms": search_terms,
                    "papers": [p.dict() for p in all_papers[:10]]
                }
                save_research(user_id, research_doc)
            
            return {
                "success": True,
                "result": {
                    "papers": all_papers[:10],
                    "search_terms": search_terms
                },
                "action": "research_complete"
            }
        except Exception as e:
            logger.error(f"Research execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "action": "research_failed"
            }

# ==========================================
# MAIN CHATBOT CLASS
# ==========================================

class StartupGPSRealtimeChatbot:
    """Enhanced chatbot with full conversational AI capabilities"""
    
    def __init__(self):
        self.session_manager = SessionManager()
        self.intent_classifier = IntentClassifier()
        self.action_executor = ActionExecutor()
    
    def _call_groq(self, messages: List[Dict], temperature: float = 0.7) -> str:
        """Call GROQ API with messages"""
        if not GROQ_API_KEY:
            return "I'm currently unable to process complex requests. Please try basic commands like 'show my ideas' or 'display my activity'."
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1000
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            else:
                logger.error(f"GROQ API error: {response.status_code}")
                return "I'm having trouble processing that right now. Could you try rephrasing?"
        except Exception as e:
            logger.error(f"GROQ call failed: {e}")
            return "I encountered an error. Please try again."
    
    def _build_context_prompt(self, session_id: str, user_id: str = None) -> str:
        """Build context string from session history"""
        context = self.session_manager.get_context(session_id)
        
        if not context:
            return ""
        
        context_str = "\n\nConversation history:\n"
        for msg in context[-5:]:
            role = "User" if msg["role"] == "user" else "You"
            context_str += f"{role}: {msg['content']}\n"
        
        # Add action history
        last_action = self.session_manager.get_last_action(session_id)
        if last_action:
            context_str += f"\nLast action: {last_action['type']}\n"
        
        # Add user stats if available
        if user_id:
            try:
                stats = get_user_stats(user_id)
                context_str += f"\nUser stats: {stats['ideas']} ideas, {stats['roadmaps']} roadmaps, {stats['research']} research\n"
            except:
                pass
        
        return context_str
    
    async def process_message(self, message: str, session_id: str, user_id: str = None) -> Dict:
        """Main message processing pipeline"""
        
        # Add user message to session
        self.session_manager.add_message(session_id, "user", message, {"user_id": user_id})
        
        # Get conversation context
        context = self.session_manager.get_context(session_id)
        
        # Classify intent
        intent, confidence = self.intent_classifier.classify(message, context)
        
        logger.info(f"Intent: {intent} (confidence: {confidence})")
        
        # Route to appropriate handler
        if intent == "validate_idea":
            result = await self._handle_validate_idea(message, session_id, user_id, context)
        elif intent == "create_roadmap":
            result = await self._handle_create_roadmap(message, session_id, user_id, context)
        elif intent == "find_research":
            result = await self._handle_find_research(message, session_id, user_id, context)
        elif intent == "show_history":
            result = await self._handle_show_history(message, session_id, user_id)
        elif intent == "find_team":
            result = await self._handle_find_team(message, session_id, user_id)
        else:
            result = await self._handle_general_conversation(message, session_id, user_id)
        
        # Add bot response to session
        self.session_manager.add_message(session_id, "assistant", result["reply"])
        
        return result
    
    async def _handle_validate_idea(self, message: str, session_id: str, user_id: str, context: List[Dict]) -> Dict:
        """Handle idea validation requests"""
        
        # Extract idea from message
        idea_text = self._extract_idea_text(message, context)
        
        # Check if we have enough information
        if len(idea_text) < 30:
            return {
                "reply": "Tell me more about your idea. What problem does it solve and who is it for?",
                "intent": "validate_idea_clarification",
                "confidence": 0.9,
                "data": {"awaiting": "idea_details"},
                "follow_ups": []
            }
        
        # Execute validation
        validation_result = await self.action_executor.validate_idea(idea_text, user_id)
        
        if validation_result["success"]:
            result = validation_result["result"]
            
            # Record action
            self.session_manager.add_action(session_id, "validation", {"score": result["overall_score"]})
            
            # Create conversational response
            reply = self._format_validation_response(result)
            
            return {
                "reply": reply,
                "intent": "validate_idea",
                "confidence": 0.95,
                "data": {
                    "type": "validation",
                    "result": result,
                    "action": "show_validation"
                },
                "follow_ups": [
                    "Create a roadmap for this",
                    "Find research papers",
                    "What about competitors?"
                ]
            }
        else:
            return {
                "reply": "I had trouble validating that. Could you describe your idea in more detail?",
                "intent": "validate_idea_error",
                "confidence": 0.8,
                "data": None,
                "follow_ups": ["Try again", "Show my previous ideas"]
            }
    
    async def _handle_create_roadmap(self, message: str, session_id: str, user_id: str, context: List[Dict]) -> Dict:
        """Handle roadmap creation requests"""
        
        # Check if we have an idea from context
        last_action = self.session_manager.get_last_action(session_id)
        idea_text = None
        
        if last_action and last_action["type"] == "validation":
            # Use the idea from last validation
            for msg in reversed(context):
                if msg["role"] == "user" and len(msg["content"]) > 50:
                    idea_text = msg["content"]
                    break
        
        if not idea_text:
            idea_text = self._extract_idea_text(message, context)
        
        if len(idea_text) < 30:
            return {
                "reply": "What idea would you like to create a roadmap for?",
                "intent": "create_roadmap_clarification",
                "confidence": 0.9,
                "data": {"awaiting": "idea_for_roadmap"},
                "follow_ups": ["Use my last validated idea"]
            }
        
        # Extract timeframe
        timeframe = self._extract_timeframe(message)
        
        if not timeframe:
            return {
                "reply": "What timeframe are you thinking? 3 months, 6 months, 1 year, or 2 years?",
                "intent": "create_roadmap_timeframe",
                "confidence": 0.9,
                "data": {"awaiting": "timeframe", "idea": idea_text},
                "follow_ups": ["3 months", "6 months", "1 year"]
            }
        
        # Execute roadmap creation
        roadmap_result = await self.action_executor.create_roadmap(idea_text, timeframe, user_id)
        
        if roadmap_result["success"]:
            result = roadmap_result["result"]
            
            # Record action
            self.session_manager.add_action(session_id, "roadmap", {"timeframe": timeframe})
            
            reply = f"I've created a {timeframe} roadmap with {len(result.get('phases', []))} phases. Check it out above!"
            
            return {
                "reply": reply,
                "intent": "create_roadmap",
                "confidence": 0.95,
                "data": {
                    "type": "roadmap",
                    "result": result,
                    "action": "show_roadmap"
                },
                "follow_ups": [
                    "Find research papers",
                    "Look for team members",
                    "Create another roadmap"
                ]
            }
        else:
            return {
                "reply": "I couldn't create the roadmap. Let me try a different approach - describe your idea again?",
                "intent": "create_roadmap_error",
                "confidence": 0.8,
                "data": None,
                "follow_ups": []
            }
    
    async def _handle_find_research(self, message: str, session_id: str, user_id: str, context: List[Dict]) -> Dict:
        """Handle research paper search requests"""
        
        # Extract topic
        topic = self._extract_research_topic(message, context)
        
        if len(topic) < 10:
            return {
                "reply": "What topic should I search research papers for?",
                "intent": "find_research_clarification",
                "confidence": 0.9,
                "data": {"awaiting": "research_topic"},
                "follow_ups": []
            }
        
        # Execute research search
        research_result = await self.action_executor.find_research(topic, user_id)
        
        if research_result["success"]:
            result = research_result["result"]
            papers = result.get("papers", [])
            
            # Record action
            self.session_manager.add_action(session_id, "research", {"count": len(papers)})
            
            reply = f"Found {len(papers)} research papers on {topic}. Check them out above!"
            
            return {
                "reply": reply,
                "intent": "find_research",
                "confidence": 0.95,
                "data": {
                    "type": "research",
                    "result": result,
                    "action": "show_research"
                },
                "follow_ups": [
                    "Create a roadmap",
                    "Validate this idea",
                    "Find more papers"
                ]
            }
        else:
            return {
                "reply": "I couldn't find research papers right now. Try rephrasing your topic?",
                "intent": "find_research_error",
                "confidence": 0.8,
                "data": None,
                "follow_ups": []
            }
    
    async def _handle_show_history(self, message: str, session_id: str, user_id: str) -> Dict:
        """Handle requests to show user history"""
        
        if not user_id:
            return {
                "reply": "Please sign in to view your activity history.",
                "intent": "show_history_auth_required",
                "confidence": 0.9,
                "data": None,
                "follow_ups": []
            }
        
        try:
            # Determine what to show
            message_lower = message.lower()
            
            if "idea" in message_lower:
                ideas = list(ideas_collection.find({"user_id": ObjectId(user_id)}).sort("created_at", -1).limit(5))
                
                if ideas:
                    reply = f"You've validated {len(ideas)} ideas. Your latest:\n\n"
                    for i, idea in enumerate(ideas[:3], 1):
                        score = idea.get("scores", {}).get("overall", 0)
                        reply += f"{i}. {idea['prompt'][:60]}... (Score: {score}/100)\n"
                    
                    return {
                        "reply": reply,
                        "intent": "show_history",
                        "confidence": 0.95,
                        "data": {"type": "ideas_list", "ideas": ideas},
                        "follow_ups": ["Create a roadmap", "Validate new idea"]
                    }
            
            elif "roadmap" in message_lower:
                roadmaps = list(roadmaps_collection.find({"user_id": ObjectId(user_id)}).sort("created_at", -1).limit(5))
                
                if roadmaps:
                    reply = f"You've created {len(roadmaps)} roadmaps. Your latest:\n\n"
                    for i, rm in enumerate(roadmaps[:3], 1):
                        reply += f"{i}. {rm['prompt'][:60]}... ({rm['timeframe']})\n"
                    
                    return {
                        "reply": reply,
                        "intent": "show_history",
                        "confidence": 0.95,
                        "data": {"type": "roadmaps_list", "roadmaps": roadmaps},
                        "follow_ups": ["Find research", "Validate new idea"]
                    }
            
            # Show general activity
            stats = get_user_stats(user_id)
            reply = f"Your activity:\n\n{stats['ideas']} ideas validated\n{stats['roadmaps']} roadmaps created\n{stats['research']} research sessions"
            
            return {
                "reply": reply,
                "intent": "show_history",
                "confidence": 0.95,
                "data": {"type": "activity", "stats": stats},
                "follow_ups": ["Show my ideas", "Validate new idea", "Create roadmap"]
            }
            
        except Exception as e:
            logger.error(f"Show history error: {e}")
            return {
                "reply": "I couldn't fetch your history. Try again?",
                "intent": "show_history_error",
                "confidence": 0.8,
                "data": None,
                "follow_ups": []
            }
    
    async def _handle_find_team(self, message: str, session_id: str, user_id: str) -> Dict:
        """Handle team finding requests"""
        return {
            "reply": "To find team members, head to the Team Builder section. I can help you search based on skills, experience, and interests. What kind of team member are you looking for?",
            "intent": "find_team",
            "confidence": 0.9,
            "data": {"type": "team_finder"},
            "follow_ups": ["Find a developer", "Find a designer", "Find a co-founder"]
        }
    
    async def _handle_general_conversation(self, message: str, session_id: str, user_id: str = None) -> Dict:
        """Handle general conversational queries with GROQ"""
        
        # Build context-aware prompt
        context_str = self._build_context_prompt(session_id, user_id)
        
        messages = [
            {"role": "system", "content": CHATBOT_SYSTEM_PROMPT + context_str},
            {"role": "user", "content": message}
        ]
        
        reply = self._call_groq(messages)
        
        # Generate smart follow-ups based on user state
        follow_ups = self._generate_smart_follow_ups(user_id, session_id)
        
        return {
            "reply": reply,
            "intent": "general_conversation",
            "confidence": 0.75,
            "data": None,
            "follow_ups": follow_ups
        }
    
    def _generate_smart_follow_ups(self, user_id: str = None, session_id: str = None) -> List[str]:
        """Generate contextual follow-up suggestions"""
        
        if not user_id:
            return ["Validate an idea", "Create a roadmap", "Find research"]
        
        try:
            stats = get_user_stats(user_id)
            last_action = self.session_manager.get_last_action(session_id) if session_id else None
            
            follow_ups = []
            
            # Based on last action
            if last_action:
                if last_action["type"] == "validation":
                    follow_ups = ["Create a roadmap for this", "Find related research", "Look for team members"]
                elif last_action["type"] == "roadmap":
                    follow_ups = ["Find research papers", "Validate another idea", "Find team members"]
                elif last_action["type"] == "research":
                    follow_ups = ["Create a roadmap", "Validate this idea", "Find more papers"]
            
            # Based on user patterns
            elif stats["ideas"] > 0 and stats["roadmaps"] == 0:
                follow_ups = ["Create a roadmap", "Find research", "Show my ideas"]
            elif stats["ideas"] == 0:
                follow_ups = ["Validate an idea", "How does validation work?", "Show examples"]
            else:
                follow_ups = ["Validate new idea", "Show my activity", "Find team members"]
            
            return follow_ups[:3]
            
        except:
            return ["Validate an idea", "Create a roadmap", "Show my activity"]
    
    # Helper methods
    
    def _extract_idea_text(self, message: str, context: List[Dict] = None) -> str:
        """Extract idea description from message or context"""
        
        # Check if message itself is the idea
        if len(message.split()) > 10 and not any(word in message.lower() for word in ["validate", "thoughts", "feedback", "analyze"]):
            return message
        
        # Try to extract after trigger words
        patterns = [
            r"(?:validate|thoughts on|feedback on|analyze|evaluate)[\s:]+(.+)",
            r"(?:idea|concept)[\s:]+(.+)",
            r"(?:building|creating|developing)[\s:]+(.+)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                extracted = match.group(1).strip()
                if len(extracted) > 20:
                    return extracted
        
        # Check context for idea
        if context:
            for msg in reversed(context):
                if msg["role"] == "user" and len(msg["content"]) > 50:
                    return msg["content"]
        
        return message
    
    def _extract_timeframe(self, message: str) -> Optional[str]:
        """Extract timeframe from message"""
        message_lower = message.lower()
        
        timeframe_map = {
            "3 month": "3 months",
            "three month": "3 months",
            "6 month": "6 months",
            "six month": "6 months",
            "1 year": "1 year",
            "one year": "1 year",
            "2 year": "2 years",
            "two year": "2 years"
        }
        
        for key, value in timeframe_map.items():
            if key in message_lower:
                return value
        
        return None
    
    def _extract_research_topic(self, message: str, context: List[Dict] = None) -> str:
        """Extract research topic from message or context"""
        
        # Remove trigger words
        cleaned = re.sub(r"(?:find|search|get|show|any)\s+(?:research|papers|studies)\s+(?:on|about|for)\s+", "", message, flags=re.IGNORECASE)
        cleaned = re.sub(r"(?:research|papers|studies)\s+(?:on|about|for)\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()
        
        if len(cleaned) > 10:
            return cleaned
        
        # Check context for topic (e.g., from previous validation)
        if context:
            for msg in reversed(context):
                if msg["role"] == "user" and len(msg["content"]) > 20:
                    return msg["content"][:100]
        
        return message
    
    def _format_validation_response(self, result: Dict) -> str:
        """Format validation result into conversational response"""
        
        score = result["overall_score"]
        scores = result["scores"]
        
        # Determine tone based on score
        if score >= 80:
            opener = f"Excellent! Your idea scored {score}/100. "
        elif score >= 60:
            opener = f"Solid concept. Your idea scored {score}/100. "
        else:
            opener = f"Your idea scored {score}/100. There's potential but needs work. "
        
        # Highlight key insights
        insights = []
        if scores["market_demand"] >= 80:
            insights.append("Strong market demand")
        if scores["feasibility"] >= 80:
            insights.append("Highly feasible")
        if scores["uniqueness"] >= 80:
            insights.append("Great differentiation")
        
        if scores["risk_factors"] <= 40:
            insights.append("Low risk profile")
        
        if insights:
            opener += f"Key strengths: {', '.join(insights)}. "
        
        # Add main concern if score is low
        if score < 70:
            weakest = min(scores.items(), key=lambda x: x[1])
            concern_map = {
                "feasibility": "technical feasibility",
                "market_demand": "market demand",
                "uniqueness": "differentiation",
                "strength": "core value proposition",
                "risk_factors": "risk management"
            }
            opener += f"Main concern: {concern_map.get(weakest[0], 'overall execution')}. "
        
        opener += "Full report above!"
        
        return opener
    
    # Public API methods
    
    async def get_user_activity(self, user_id: str) -> Dict:
        """Get comprehensive user activity"""
        try:
            stats = get_user_stats(user_id)
            user = get_user_by_id(user_id)
            profile = get_user_profile(user_id)
            
            return {
                "user_info": {
                    "name": user.get("name", "User"),
                    "email": user.get("email", ""),
                    "member_since": user.get("created_at", datetime.utcnow()).isoformat()
                },
                "stats": stats,
                "profile_complete": profile is not None
            }
        except Exception as e:
            logger.error(f"Error fetching user activity: {e}")
            return {
                "user_info": {"name": "User"},
                "stats": {"ideas": 0, "roadmaps": 0, "research": 0},
                "profile_complete": False
            }

# ==========================================
# PYDANTIC MODELS
# ==========================================

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    include_realtime_data: bool = True
    user_context: Optional[Dict] = None

class ChatResponse(BaseModel):
    reply: str
    intent: str
    confidence: float
    data: Optional[Dict] = None
    follow_ups: List[str] = []
    session_id: str

# ==========================================
# FACTORY FUNCTION
# ==========================================

_chatbot_instance = None

def get_chatbot_instance():
    """Get singleton chatbot instance"""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = StartupGPSRealtimeChatbot()
    return _chatbot_instance