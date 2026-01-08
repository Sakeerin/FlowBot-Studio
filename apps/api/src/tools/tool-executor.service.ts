import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ToolDto, HTTPToolConfig } from '@shared/schemas/tool';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime?: number;
  state: 'closed' | 'open' | 'half-open';
}

@Injectable()
export class ToolExecutorService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly maxFailures = 5;
  private readonly openTimeout = 60000; // 1 minute
  private readonly defaultTimeout = 30000; // 30 seconds

  async execute(
    tool: ToolDto,
    input: Record<string, any>,
    secrets: Record<string, string>
  ): Promise<any> {
    if (tool.type === 'http') {
      return this.executeHttpTool(tool, input, secrets);
    } else {
      throw new BadRequestException(`Tool type ${tool.type} not supported`);
    }
  }

  private async executeHttpTool(
    tool: ToolDto,
    input: Record<string, any>,
    secrets: Record<string, string>
  ): Promise<any> {
    const config = tool.config as HTTPToolConfig;
    const circuitBreakerKey = `tool:${tool.id}`;

    // Check circuit breaker
    const circuitState = this.getCircuitBreakerState(circuitBreakerKey);
    if (circuitState.state === 'open') {
      if (Date.now() - (circuitState.lastFailureTime || 0) < this.openTimeout) {
        throw new ServiceUnavailableException('Tool circuit breaker is open. Too many failures.');
      } else {
        // Try to close circuit
        circuitState.state = 'half-open';
        circuitState.failures = 0;
      }
    }

    // Build URL with query params and variable substitution
    let url = this.substituteVariables(config.url, input, secrets);
    if (config.queryParams) {
      const queryString = Object.entries(config.queryParams)
        .map(([key, value]) => {
          const substituted = this.substituteVariables(value, input, secrets);
          return `${encodeURIComponent(key)}=${encodeURIComponent(substituted)}`;
        })
        .join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    // Build headers with secrets
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add authentication header if configured
    if (config.auth) {
      const secretValue = secrets[config.auth.key];
      if (!secretValue) {
        throw new BadRequestException(
          `Secret key ${config.auth.key} not found for tool authentication`
        );
      }

      switch (config.auth.type) {
        case 'apiKey':
          headers['X-API-Key'] = secretValue;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${secretValue}`;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${Buffer.from(secretValue).toString('base64')}`;
          break;
      }
    }

    // Substitute variables in headers
    for (const [key, value] of Object.entries(headers)) {
      headers[key] = this.substituteVariables(value, input, secrets);
    }

    // Build request body if needed
    let body: string | undefined;
    if (config.bodyTemplate && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      body = this.substituteVariables(config.bodyTemplate, input, secrets);
    }

    // Execute with retry logic
    const maxRetries = config.retries || 0;
    const timeout = config.timeout || this.defaultTimeout;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: config.method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json().catch(() => response.text());

        // Reset circuit breaker on success
        this.resetCircuitBreaker(circuitBreakerKey);

        return {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries()),
        };
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // Record failure in circuit breaker
    this.recordFailure(circuitBreakerKey);

    throw new BadRequestException(
      `Tool execution failed after ${maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private substituteVariables(
    template: string,
    variables: Record<string, any>,
    secrets: Record<string, string>
  ): string {
    let result = template;

    // Replace {{variable}} with actual values
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (variables[key] !== undefined) {
        return String(variables[key]);
      }
      if (secrets[key] !== undefined) {
        return secrets[key];
      }
      return match; // Keep original if not found
    });

    return result;
  }

  private getCircuitBreakerState(key: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        state: 'closed',
      });
    }
    return this.circuitBreakers.get(key)!;
  }

  private recordFailure(key: string): void {
    const state = this.getCircuitBreakerState(key);
    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.maxFailures) {
      state.state = 'open';
    }
  }

  private resetCircuitBreaker(key: string): void {
    const state = this.getCircuitBreakerState(key);
    state.failures = 0;
    state.state = 'closed';
    delete state.lastFailureTime;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
