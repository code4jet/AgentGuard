import type { Json } from '@/lib/domain/types'

export interface ValidationResult {
  valid: boolean
  error?: string
  config?: Json
}

export function validateAgentConfiguration(input: unknown): ValidationResult {
  if (input === undefined || input === null) {
    return { valid: true, config: {} }
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'Configuration must be a valid JSON object' }
  }

  // Check for recursive depth and secret exposure in strings or key names
  try {
    const jsonString = JSON.stringify(input)
    
    // Safety check to prevent persisting raw secret patterns or API key fields in agent configurations
    const secretPatterns = [
      /sk-[a-zA-Z0-9_-]{5,}/i,
      /sbp_[a-zA-Z0-9_-]{5,}/i,
      /bearer\s+[a-zA-Z0-9_.-]{5,}/i,
      /"api_key"\s*:/i,
      /"secret_key"\s*:/i,
    ]

    for (const pattern of secretPatterns) {
      if (pattern.test(jsonString)) {
        return {
          valid: false,
          error: 'Configuration contains forbidden sensitive keys or tokens',
        }
      }
    }

    const parsed = JSON.parse(jsonString) as Json
    return { valid: true, config: parsed }
  } catch {
    return { valid: false, error: 'Invalid JSON configuration format' }
  }
}
