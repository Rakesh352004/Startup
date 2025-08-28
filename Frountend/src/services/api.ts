// src/services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token");
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
        // Token expired or invalid
        localStorage.removeItem("token");
        window.location.href = "/signin";
        throw new Error("Authentication required");
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

  // Idea Validation
  async validateIdea(prompt: string) {
    return this.makeRequest<IdeaResponse>("/validate-idea", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  // Roadmap Methods
  async createRoadmap(roadmapData: RoadmapInput) {
    return this.makeRequest<RoadmapResponse>("/roadmaps", {
      method: "POST",
      body: JSON.stringify(roadmapData),
    });
  }

  async getUserRoadmaps(userId: string) {
    return this.makeRequest<RoadmapResponse[]>(`/users/${userId}/roadmaps`);
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
}

// Type Definitions
export interface UserProfile {
  name: string;
  email: string;
  role?: string;
  skills?: string[];
  interests?: string[];
  preferred_role?: string;
  experience?: string;
  availability?: number;
  location?: string;
  user_id: string;
  updated_at: string;
}

export interface UserProfileCreate {
  name: string;
  email: string;
  role?: string;
  skills?: string[];
  interests?: string[];
  preferred_role?: string;
  experience?: string;
  availability?: number;
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

export interface IdeaResponse {
  prompt: string;
  validation: string;
  score: number;
  suggestions: string[];
  created_at: string;
}

export interface RoadmapInput {
  prompt: string;
  timeframe: string;
}

export interface RoadmapResponse {
  id: string;
  prompt: string;
  timeframe: string;
  roadmap: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

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

// Export singleton instance
export const apiService = new ApiService();
export default apiService;