import type {
  AuthenticationType,
  ConnectionType,
  CreateAgentConnectionInput,
  HttpMethod,
  Json,
} from '@/lib/domain/types'

const connectionTypes: ConnectionType[] = ['mock', 'http_webhook', 'openai_assistant', 'custom_api']
const authenticationTypes: AuthenticationType[] = [
  'none',
  'api_key_reference',
  'bearer_reference',
  'provider_key_reference',
]
const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export interface ConnectionValidationResult {
  valid: boolean
  error?: string
  input?: CreateAgentConnectionInput
}

function isJsonObject(value: unknown): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateEndpoint(endpoint: unknown): string | null {
  if (typeof endpoint !== 'string' || !endpoint.trim()) return 'endpoint_url is required'

  try {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) {
      return 'endpoint_url must be a valid HTTP or HTTPS URL without embedded credentials'
    }
  } catch {
    return 'endpoint_url must be a valid HTTP or HTTPS URL'
  }

  return null
}

function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKey)
  if (!isJsonObject(value)) return false

  return Object.entries(value).some(([key, child]) => {
    if (/^(authorization|api[_-]?key|secret|token|password)$/i.test(key)) return true
    return containsSensitiveKey(child)
  })
}

export function validateAgentConnection(input: unknown): ConnectionValidationResult {
  if (!isJsonObject(input)) return { valid: false, error: 'Connection body must be a JSON object' }

  const connectionType = input.connection_type
  if (!connectionTypes.includes(connectionType as ConnectionType)) {
    return { valid: false, error: 'connection_type is invalid' }
  }

  const authenticationType = (input.authentication_type ?? 'none') as AuthenticationType
  if (!authenticationTypes.includes(authenticationType)) {
    return { valid: false, error: 'authentication_type is invalid' }
  }

  const httpMethod = (input.http_method ?? 'POST') as HttpMethod
  if (!httpMethods.includes(httpMethod)) return { valid: false, error: 'http_method is invalid' }

  const endpointUrl = input.endpoint_url === null ? null : input.endpoint_url
  if (connectionType === 'http_webhook' || connectionType === 'custom_api') {
    const endpointError = validateEndpoint(endpointUrl)
    if (endpointError) return { valid: false, error: endpointError }
  } else if (connectionType === 'mock' && endpointUrl !== undefined && endpointUrl !== null) {
    return { valid: false, error: 'mock connections cannot define endpoint_url' }
  }

  if (connectionType === 'mock' && (authenticationType !== 'none' || input.credential_reference)) {
    return { valid: false, error: 'mock connections cannot define authentication or credentials' }
  }

  const provider = input.provider === null ? null : input.provider
  const model = input.model === null ? null : input.model
  const assistantId = input.assistant_id === null ? null : input.assistant_id
  if (connectionType === 'openai_assistant') {
    if (provider !== undefined && provider !== null && typeof provider !== 'string') {
      return { valid: false, error: 'provider must be a string or null' }
    }
    if (model !== undefined && model !== null && typeof model !== 'string') {
      return { valid: false, error: 'model must be a string or null' }
    }
    if (assistantId !== undefined && assistantId !== null && typeof assistantId !== 'string') {
      return { valid: false, error: 'assistant_id must be a string or null' }
    }
    if (!model && !assistantId) {
      return { valid: false, error: 'openai_assistant requires model or assistant_id' }
    }
  }

  const credentialReference = input.credential_reference === null ? null : input.credential_reference
  if (authenticationType === 'none' && credentialReference) {
    return { valid: false, error: 'credential_reference requires an authentication_type' }
  }
  if (authenticationType !== 'none') {
    if (typeof credentialReference !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(credentialReference)) {
      return { valid: false, error: 'credential_reference must be a safe reference identifier' }
    }
  }

  const requestHeaders = input.request_headers ?? {}
  const requestBodyTemplate = input.request_body_template ?? {}
  if (!isJsonObject(requestHeaders) || !isJsonObject(requestBodyTemplate)) {
    return { valid: false, error: 'request_headers and request_body_template must be JSON objects' }
  }
  if (containsSensitiveKey(requestHeaders) || containsSensitiveKey(requestBodyTemplate)) {
    return { valid: false, error: 'Raw credentials and sensitive headers are not allowed' }
  }

  const timeoutMs = input.timeout_ms ?? 10000
  if (typeof timeoutMs !== 'number' || !Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    return { valid: false, error: 'timeout_ms must be an integer between 1000 and 120000' }
  }

  return {
    valid: true,
    input: {
      agent_id: typeof input.agent_id === 'string' ? input.agent_id : '',
      connection_type: connectionType as ConnectionType,
      provider: typeof provider === 'string' ? provider.trim() || null : null,
      model: typeof model === 'string' ? model.trim() || null : null,
      assistant_id: typeof assistantId === 'string' ? assistantId.trim() || null : null,
      endpoint_url: typeof endpointUrl === 'string' ? endpointUrl.trim() || null : null,
      http_method: httpMethod,
      authentication_type: authenticationType,
      request_headers: requestHeaders,
      request_body_template: requestBodyTemplate,
      credential_reference: typeof credentialReference === 'string' ? credentialReference : null,
      timeout_ms: timeoutMs,
    },
  }
}
