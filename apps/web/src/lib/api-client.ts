import axios, { AxiosInstance } from 'axios';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  CreateBot,
  UpdateBot,
  PublishBotRequest,
  FlowGraphDto,
} from '@flowbot/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
              const { accessToken, refreshToken: newRefreshToken } = response.data;
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              error.config.headers.Authorization = `Bearer ${accessToken}`;
              return this.client.request(error.config);
            } catch {
              // Refresh failed, redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  // Bots
  async getBots() {
    const response = await this.client.get('/bots');
    return response.data;
  }

  async getBot(id: string) {
    const response = await this.client.get(`/bots/${id}`);
    return response.data;
  }

  async createBot(data: CreateBot) {
    const response = await this.client.post('/bots', data);
    return response.data;
  }

  async updateBot(id: string, data: UpdateBot) {
    const response = await this.client.put(`/bots/${id}`, data);
    return response.data;
  }

  async deleteBot(id: string) {
    await this.client.delete(`/bots/${id}`);
  }

  async getDraftFlow(botId: string) {
    const response = await this.client.get(`/bots/${botId}/draft/flow`);
    return response.data;
  }

  async saveDraftFlow(botId: string, flowGraph: FlowGraphDto) {
    const response = await this.client.put(`/bots/${botId}/draft/flow`, flowGraph);
    return response.data;
  }

  async publishBot(botId: string, data: PublishBotRequest) {
    const response = await this.client.post(`/bots/${botId}/publish`, data);
    return response.data;
  }

  async rollbackBot(botId: string, version: number) {
    const response = await this.client.post(`/bots/${botId}/rollback?version=${version}`);
    return response.data;
  }

  // Runtime
  async simulate(botId: string, message: string) {
    const response = await this.client.post(`/runtime/simulate/${botId}`, {
      message,
    });
    return response.data;
  }

  // Handoff
  async getTickets(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
  }) {
    const response = await this.client.get('/handoff', { params: filters });
    return response.data;
  }

  async getTicket(ticketId: string) {
    const response = await this.client.get(`/handoff/${ticketId}`);
    return response.data;
  }

  async updateTicket(
    ticketId: string,
    data: {
      status?: string;
      priority?: string;
      assignedTo?: string;
    }
  ) {
    const response = await this.client.put(`/handoff/${ticketId}`, data);
    return response.data;
  }

  async sendTicketMessage(ticketId: string, content: string) {
    const response = await this.client.post(`/handoff/${ticketId}/message`, {
      content,
    });
    return response.data;
  }

  async addTicketNote(ticketId: string, note: string) {
    const response = await this.client.post(`/handoff/${ticketId}/notes`, {
      note,
    });
    return response.data;
  }

  async addTicketTags(ticketId: string, tags: string[]) {
    const response = await this.client.post(`/handoff/${ticketId}/tags`, {
      tags,
    });
    return response.data;
  }

  async removeTicketTag(ticketId: string, tag: string) {
    await this.client.delete(`/handoff/${ticketId}/tags/${encodeURIComponent(tag)}`);
  }

  async getSLAAlerts() {
    const response = await this.client.get('/handoff/alerts');
    return response.data;
  }

  async getSLStatus(ticketId: string) {
    const response = await this.client.get(`/handoff/${ticketId}/sla`);
    return response.data;
  }

  // Analytics
  async getConversationLogs(filters?: {
    startDate?: string;
    endDate?: string;
    botId?: string;
    channel?: string;
    hasHandoff?: boolean;
    hasFallback?: boolean;
    search?: string;
  }) {
    const response = await this.client.get('/analytics/logs', { params: filters });
    return response.data;
  }

  async getSessionTrace(sessionId: string) {
    const response = await this.client.get(`/analytics/sessions/${sessionId}/trace`);
    return response.data;
  }

  async getAnalyticsOverview(startDate?: string, endDate?: string) {
    const response = await this.client.get('/analytics/overview', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getDailyRollups(startDate?: string, endDate?: string) {
    const response = await this.client.get('/analytics/rollups', {
      params: { startDate, endDate },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
