// src/services/api.ts
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
        // Token expired or invalid - only redirect if user was expecting to be authenticated
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          // Only redirect if they had a token (were logged in)
          window.location.href = "/signin";
        }
        // For endpoints that work without auth, continue processing
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

  // Idea Validation - Updated endpoint and response type
  async validateIdea(prompt: string) {
    return this.makeRequest<ValidationResponse>("/validate-idea", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  // Roadmap Methods - Updated endpoints
  async generateRoadmap(roadmapData: RoadmapInput) {
    return this.makeRequest<RoadmapResponse>("/generate-roadmap", {
      method: "POST",
      body: JSON.stringify(roadmapData),
    });
  }

  async getUserRoadmaps() {
    return this.makeRequest<{ roadmaps: RoadmapResponse[]; total: number }>("/user/roadmaps");
  }

  async getRoadmap(roadmapId: string) {
    return this.makeRequest<RoadmapResponse>(`/roadmaps/${roadmapId}`);
  }

  async updateRoadmap(roadmapId: string, updateData: Partial<RoadmapInput>) {
    return this.makeRequest<RoadmapResponse>(`/roadmaps/${roadmapId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async deleteRoadmap(roadmapId: string) {
    return this.makeRequest<{ message: string }>(`/roadmaps/${roadmapId}`, {
      method: "DELETE",
    });
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

  async getResearchById(researchId: string) {
    return this.makeRequest<ResearchHistoryItem>(`/research/${researchId}`);
  }

  // User Data Methods
  async getUserIdeas() {
    return this.makeRequest<{ ideas: IdeaHistoryItem[]; total: number }>("/user/ideas");
  }

  async getUserActivity() {
    return this.makeRequest<UserActivityStats>("/user/activity");
  }

  async exportUserData() {
    return this.makeRequest<{ data: any }>("/user/export");
  }

  async deleteUserData() {
    return this.makeRequest<{ message: string }>("/user/data", {
      method: "DELETE",
    });
  }

  // Team Building Methods
  async searchTeamMembers(searchData: TeamSearchInput) {
    return this.makeRequest<TeamSearchResponse>("/api/team-searches", {
      method: "POST",
      body: JSON.stringify(searchData),
    });
  }

  async getAllProfiles() {
    return this.makeRequest<{ profiles: ProfileResponse[] }>("/api/profiles/all");
  }

  async getMyTeamSearches() {
    return this.makeRequest<{ searches: TeamSearchHistory[] }>("/api/my-team-searches");
  }

  // Chat Methods
  async sendChatMessage(message: ChatMessage) {
    return this.makeRequest<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(message),
    });
  }

  async getChatSessions() {
    return this.makeRequest<ChatHistoryResponse>("/chat/sessions");
  }

  async deleteChatSession(sessionId: string) {
    return this.makeRequest<{ message: string }>(`/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  async clearChatSession(sessionId: string) {
    return this.makeRequest<{ message: string }>(`/chat/sessions/${sessionId}/clear`, {
      method: "POST",
    });
  }

  async getChatSuggestions() {
    return this.makeRequest<ChatSuggestionsResponse>("/chat/suggestions");
  }

  // Health Check
  async healthCheck() {
    return this.makeRequest<HealthCheckResponse>("/health");
  }
}

// Updated Type Definitions
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

export interface ValidationDetails {
  verdict: string;
  feasibility: string;
  marketDemand: string;
  uniqueness: string;
  strength: string;
  riskFactors: string;
  riskMitigation: string;  // This must be here
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

// Updated Roadmap Types
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

// Team Building Types
export interface TeamSearchInput {
  required_skills: string[];
  preferred_role?: string;
  experience?: string;
  availability?: string;
  location?: string;
  interests: string[];
  additional_requirements?: string;
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  skills: string[];
  interests: string[];
  preferred_role?: string;
  experience?: string;
  availability?: string;
  location?: string;
  match_score?: number;
  matched_skills?: string[];
  matched_interests?: string[];
}

export interface TeamSearchResponse {
  profiles: ProfileResponse[];
  search_id: string;
  total_matches: number;
}

export interface TeamSearchHistory {
  id: string;
  search_criteria: TeamSearchInput;
  created_at: string;
}

// Chat Types
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

export interface ChatSession {
  session_id: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  created_at: string;
  last_activity: string;
}

export interface ChatHistoryResponse {
  sessions: ChatSession[];
  total_sessions: number;
}

export interface ChatSuggestionsResponse {
  suggestions: string[];
  categories: Record<string, string[]>;
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