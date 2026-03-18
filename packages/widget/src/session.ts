export class SessionManager {
  private storageKey: string;
  private sessionId: string | null = null;

  constructor(
    private userId?: string,
    botId?: string
  ) {
    this.storageKey = botId ? `flowbot_session_${botId}` : 'flowbot_session';
    this.loadSession();
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessionId = data.sessionId || null;
      }
    } catch (e) {
      console.warn('Failed to load session from storage:', e);
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          sessionId,
          userId: this.userId,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn('Failed to save session to storage:', e);
    }
  }

  clearSession(): void {
    this.sessionId = null;
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('Failed to clear session from storage:', e);
    }
  }
}
