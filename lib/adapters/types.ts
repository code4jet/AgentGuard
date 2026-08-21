import type { AgentConnection, AgentVersion, Json } from '@/lib/domain/types'

export type AgentAdapterType = AgentConnection['connection_type']

export interface AgentAdapterContext {
  connection: AgentConnection
  version: AgentVersion
}

export interface AgentAdapterRequest {
  input: string
  metadata?: Json
}

export interface AgentToolCall {
  tool: string
  arguments: Json
  result: Json
  timestamp: string
  status?: 'success' | 'failed' | 'blocked'
}

export interface AgentAdapterResponse {
  output: string
  response?: string
  toolCalls?: AgentToolCall[]
  finalResult?: Json
  metadata?: Json
}

/** Runtime contract for future mock, OpenAI, webhook, and custom API adapters. */
export interface AgentAdapter {
  readonly type: AgentAdapterType
  invoke(context: AgentAdapterContext, request: AgentAdapterRequest): Promise<AgentAdapterResponse>
}
