import { Injectable } from '@nestjs/common';

@Injectable()
export class GuardrailsService {
  // PII patterns
  private readonly piiPatterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  };

  // Prompt injection patterns
  private readonly injectionPatterns = [
    /ignore\s+(previous|all)\s+(instructions|commands)/i,
    /forget\s+(previous|all)/i,
    /you\s+are\s+(now|a)/i,
    /system\s*:\s*override/i,
    /disregard\s+(previous|all)/i,
    /new\s+instructions\s*:/i,
  ];

  maskPII(text: string): { masked: string; detected: string[] } {
    const detected: string[] = [];
    let masked = text;

    // Detect and mask emails
    masked = masked.replace(this.piiPatterns.email, (match) => {
      detected.push(`email: ${match}`);
      return '[EMAIL_REDACTED]';
    });

    // Detect and mask phones
    masked = masked.replace(this.piiPatterns.phone, (match) => {
      detected.push(`phone: ${match}`);
      return '[PHONE_REDACTED]';
    });

    // Detect and mask SSN
    masked = masked.replace(this.piiPatterns.ssn, (match) => {
      detected.push(`ssn: ${match}`);
      return '[SSN_REDACTED]';
    });

    // Detect and mask credit cards
    masked = masked.replace(this.piiPatterns.creditCard, (match) => {
      detected.push(`creditCard: ${match}`);
      return '[CARD_REDACTED]';
    });

    return { masked, detected };
  }

  detectPromptInjection(text: string): {
    isInjection: boolean;
    patterns: string[];
  } {
    const matchedPatterns: string[] = [];

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(text)) {
        matchedPatterns.push(pattern.toString());
      }
    }

    return {
      isInjection: matchedPatterns.length > 0,
      patterns: matchedPatterns,
    };
  }

  filterPromptInjection(text: string): {
    filtered: string;
    flagged: boolean;
  } {
    const detection = this.detectPromptInjection(text);

    if (!detection.isInjection) {
      return { filtered: text, flagged: false };
    }

    // Remove injection patterns
    let filtered = text;
    for (const pattern of this.injectionPatterns) {
      filtered = filtered.replace(pattern, '');
    }

    // Clean up extra whitespace
    filtered = filtered.replace(/\s+/g, ' ').trim();

    return { filtered, flagged: true };
  }

  sanitizeForLogging(text: string): string {
    const { masked } = this.maskPII(text);
    const { filtered } = this.filterPromptInjection(masked);
    return filtered;
  }
}

