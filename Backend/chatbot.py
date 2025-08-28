from typing import Dict

class StartupGPSChatbot:
    def __init__(self):
        # Expandable knowledge base
        self.knowledge_base: Dict[str, str] = {
            "what is startup gps": (
                "Startup GPS is a platform designed to help entrepreneurs navigate "
                "their journey from idea to execution with mentorship, tools, and resources."
            ),
            "how can i register": (
                "You can register on the Startup GPS platform by visiting the signup page "
                "and providing your basic details like name, email, and password."
            ),
            "do you provide funding": (
                "Startup GPS itself does not directly fund startups, but it connects you "
                "with investors and venture capital networks."
            ),
            "what services do you offer": (
                "Startup GPS offers mentorship, market research tools, investor connections, "
                "pitch deck reviews, and networking opportunities."
            ),
            "who can use startup gps": (
                "Startup GPS is designed for entrepreneurs, early-stage startups, students with ideas, "
                "and even investors looking to connect with founders."
            )
        }

    def get_response(self, query: str) -> str:
        query_lower = query.lower().strip()

        # Exact match
        if query_lower in self.knowledge_base:
            return self.knowledge_base[query_lower]

        # Keyword-based answers
        if "mentor" in query_lower:
            return "Startup GPS connects you with experienced mentors across industries."
        elif "funding" in query_lower or "investor" in query_lower:
            return "We provide access to investors and VCs who are interested in early-stage startups."
        elif "pitch deck" in query_lower:
            return "Startup GPS offers pitch deck review sessions with experts to improve your chances with investors."
        elif "market research" in query_lower:
            return "Yes, Startup GPS provides AI-driven tools for market research and competitor analysis."
        elif "network" in query_lower or "community" in query_lower:
            return "Startup GPS has a strong founder community where you can network, collaborate, and grow together."

        # Default fallback
        return (
            "That's a great question! 🚀 Startup GPS helps with mentorship, "
            "funding connections, and startup growth. Could you clarify what "
            "specifically you'd like to know?"
        )
