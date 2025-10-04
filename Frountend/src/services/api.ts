// src/services/api.ts - Updated with Fixed Chatbot Integration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const status = response.status;

      if (status === 401) {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          window.location.href = "/signin";
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: errorData.detail || `HTTP ${status}: ${response.statusText}`,
          status,
        };
      }

      const data = await response.json();
      return { data, status };
    } catch (error) {
      console.error("API Request failed:", error);
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  // ==============================================
  // CHATBOT API METHODS (FIXED)
  // ==============================================

  // Create chat session
  async createChatSession() {
    return this.makeRequest<{ session_id: string; user_authenticated: boolean; timestamp: string }>("/chat/session", {
      method: "POST",
    });
  }

  // Send real-time chat message
  async sendRealtimeMessage(messageData: {
    message: string;
    session_id?: string;
    include_realtime_data?: boolean;
    user_context?: any;
    platform_context?: any;
  }) {
    return this.makeRequest<{
      reply: string;
      intent: string;
      confidence: number;
      realtime_data?: any;
      follow_ups: string[];
      session_id: string;
      updated_user_stats?: any;
      updated_platform_stats?: any;
    }>("/chat/realtime", {
      method: "POST",
      body: JSON.stringify(messageData),
    });
  }

  // Get platform information
  async getPlatformInfo() {
    return this.makeRequest<{
      platform_stats: any;
      user_data: any;
      platform_knowledge: any;
      available_intents: string[];
      scope_keywords: string[];
      system_status: any;
      last_updated: string;
    }>("/chat/platform-info");
  }

  // Submit feedback
  async submitChatFeedback(feedbackData: {
    session_id: string;
    message: string;
    response: string;
    rating: number;
    feedback_text?: string;
    intent?: string;
  }) {
    return this.makeRequest<{ message: string }>("/chat/feedback", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });
  }

  // Get chat health status
  async getChatHealth() {
    return this.makeRequest<{
      status: string;
      components: any;
      statistics: any;
      capabilities: any;
      last_updated: string;
    }>("/chat/health");
  }

  // ==============================================
  // EXISTING API METHODS (Keep all your existing methods)
  // ==============================================

  // Authentication Methods
  async login(credentials: LoginCredentials) {
    return this.makeRequest<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterData) {
    return this.makeRequest<RegisterResponse>("/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  // User Profile Methods
  async getUserProfile() {
    return this.makeRequest<UserProfile>("/profile");
  }

  async updateUserProfile(profileData: Partial<UserProfile>) {
    return this.makeRequest<UserProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async createUserProfile(profileData: UserProfileCreate) {
    return this.makeRequest<UserProfile>("/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  }

  // Idea Validation
  async validateIdea(prompt: string) {
    return this.makeRequest<ValidationResponse>("/validate-idea-enhanced", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  // Roadmap Methods
  async generateRoadmap(roadmapData: RoadmapInput) {
    return this.makeRequest<RoadmapResponse>("/generate-roadmap", {
      method: "POST",
      body: JSON.stringify(roadmapData),
    });
  }

  async getUserRoadmaps() {
    return this.makeRequest<{ roadmaps: RoadmapResponse[]; total: number }>("/user/roadmaps");
  }

  // Research Methods
  async getResearchPapers(request: ResearchRequest) {
    return this.makeRequest<ResearchResponse>("/research-papers", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getUserResearch() {
    return this.makeRequest<{ research: ResearchHistoryItem[]; total: number }>("/user/research");
  }

  // User Data Methods
  async getUserIdeas() {
    return this.makeRequest<{ ideas: IdeaHistoryItem[]; total: number }>("/user/ideas");
  }

  async getUserActivity() {
    return this.makeRequest<UserActivityStats>("/user/activity");
  }

  // Team Finder Methods
  async searchTeamMembers(searchData: TeamSearchInput) {
    return this.makeRequest<{ profiles: TeamMemberProfile[]; total: number }>("/api/team-search", {
      method: "POST",
      body: JSON.stringify(searchData),
    });
  }

  // Connection Request Methods
  async sendConnectionRequest(receiverId: string, message = '') {
    return this.makeRequest<{ request_id: string; status: string }>("/api/connection-requests", {
      method: "POST",
      body: JSON.stringify({ receiver_id: receiverId, message }),
    });
  }

  async getReceivedConnectionRequests() {
    return this.makeRequest<{ requests: ConnectionRequest[]; total: number }>("/api/connection-requests/received");
  }

  async getSentConnectionRequests() {
    return this.makeRequest<{ requests: ConnectionRequest[]; total: number }>("/api/connection-requests/sent");
  }

  async respondToConnectionRequest(requestId: string, action: 'accept' | 'reject') {
    return this.makeRequest<{ message: string }>(`/api/connection-requests/${requestId}/respond`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }

  async checkConnectionStatus(targetUserId: string) {
    return this.makeRequest<{ status: string }>(`/api/connection-status/${targetUserId}`);
  }

  // Connection Management
  async getConnections() {
    return this.makeRequest<{ connections: TeamMemberProfile[] }>("/api/connections");
  }

  async removeConnection(targetUserId: string) {
    return this.makeRequest<{ message: string }>(`/api/connections/${targetUserId}`, {
      method: "DELETE",
    });
  }

  // Chat Methods
  async createConversation(targetUserId: string) {
    return this.makeRequest<{ id: string; participant_ids: string[]; participant_names: string[] }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
  }

  async getConversations() {
    return this.makeRequest<{ conversations: Conversation[] }>("/api/conversations");
  }

  async sendMessage(conversationId: string, content: string) {
    return this.makeRequest<Message>("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: conversationId,
        content,
        message_type: "text"
      }),
    });
  }

  async getMessages(conversationId: string, skip = 0, limit = 50) {
    return this.makeRequest<{ messages: Message[] }>(`/api/messages/${conversationId}?skip=${skip}&limit=${limit}`);
  }

  // Health Check
  async healthCheck() {
    return this.makeRequest<HealthCheckResponse>("/health");
  }

  // Legacy Chat Methods (for existing Help component compatibility)
  async sendChatMessage(message: ChatMessage) {
    return this.makeRequest<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(message),
    });
  }
}

// ==============================================
// TYPE DEFINITIONS
// ==============================================

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
}

// User Profile Types
export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  skills?: string[];
  interests?: string[];
  preferred_role?: string;
  experience?: string;
  availability?: string;
  location?: string;
  user_id: string;
  updated_at: string;
}

export interface UserProfileCreate {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  skills?: string[];
  interests?: string[];
  preferred_role?: string;
  experience?: string;
  availability?: string;
  location?: string;
}

// Idea Validation Types
export interface ValidationDetails {
  verdict: string;
  feasibility: string;
  marketDemand: string;
  uniqueness: string;
  strength: string;
  riskFactors: string;
  riskMitigation: string;
  existingCompetitors: string;
}

export interface ValidationScores {
  overall: number;
  feasibility: number;
  marketDemand: number;
  uniqueness: number;
  strength: number;
  riskFactors: number;
}

export interface Suggestions {
  critical: string[];
  recommended: string[];
  optional: string[];
}

export interface ValidationResponse {
  prompt: string;
  validation: ValidationDetails;
  scores: ValidationScores;
  suggestions: Suggestions;
  created_at: string;
}

export interface IdeaHistoryItem {
  id: string;
  prompt: string;
  validation: ValidationDetails;
  scores: ValidationScores;
  suggestions: Suggestions;
  created_at: string;
  user_id: string;
}

// Roadmap Types
export interface RoadmapInput {
  prompt: string;
  timeframe: string;
}

export interface RoadmapPhase {
  title: string;
  timeframe: string;
  description: string;
  tasks: string[];
  implementation: string[];
  resources: string[];
  team: string[];
  challenges: string[];
}

export interface RoadmapStructure {
  overview: string;
  phases: RoadmapPhase[];
}

export interface RoadmapResponse {
  id: string;
  prompt: string;
  timeframe: string;
  roadmap: RoadmapStructure;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Research Types
export interface ResearchRequest {
  idea: string;
  max_results?: number;
}

export interface ResearchPaper {
  title: string;
  authors: string[];
  abstract: string;
  published_date: string;
  source: string;
  url: string;
  doi?: string;
}

export interface ResearchResponse {
  papers: ResearchPaper[];
  search_terms: string[];
  research_id: string;
  created_at: string;
}

export interface ResearchHistoryItem {
  id: string;
  idea: string;
  search_terms: string[];
  papers: ResearchPaper[];
  created_at: string;
  user_id: string;
}

// User Activity Types
export interface UserActivityStats {
  ideas: number;
  roadmaps: number;
  research: number;
  profile_exists: boolean;
  recent_ideas: number;
  recent_roadmaps: number;
  recent_research: number;
  total_activity: number;
}

// Team Finder Core Types
export interface TeamSearchInput {
  required_skills: string[];
  preferred_role?: string;
  experience?: string;
  availability?: string;
  location?: string;
  interests: string[];
  additional_requirements?: string;
}

export interface TeamMemberProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  skills: string[];
  interests: string[];
  preferred_role: string;
  experience: string;
  availability: string;
  location: string;
  match_score: number;
  matched_skills: string[];
  matched_interests: string[];
  connection_status: 'not_connected' | 'request_sent' | 'request_received' | 'connected';
}

export interface TeamSearchResponse {
  profiles: TeamMemberProfile[];
  search_id: string;
  total_matches: number;
}

// Connection Request Types
export interface ConnectionRequestInput {
  receiver_id: string;
  message?: string;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  sender_email: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  created_at: string;
  user_profile?: any;
}

// Chat Types (for connected users)
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  participant_names: string[];
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
}

// Legacy Chat Types (for Help component)
export interface ChatMessage {
  message: string;
  session_id?: string;
  user_id?: string;
}

export interface ChatResponse {
  reply: string;
  intent: string;
  entities: Record<string, any>;
  follow_ups: string[];
  session_id: string;
  timestamp: string;
}

// Health Check Type
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  services: {
    database: string;
    groq_api: string;
    semantic_scholar: string;
  };
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;