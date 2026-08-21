import { NextResponse } from 'next/server'
import {
  createAgentConnection,
  deleteAgentConnection,
  getAgent,
  getAgentConnection,
  updateAgentConnection,
} from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'
import { validateAgentConnection } from '@/lib/validation/connection'
import type { AgentConnection } from '@/lib/domain/types'

function safeConnection(connection: AgentConnection) {
  return {
    id: connection.id,
    agent_id: connection.agent_id,
    connection_type: connection.connection_type,
    provider: connection.provider,
    model: connection.model,
    assistant_id: connection.assistant_id,
    endpoint_url: connection.endpoint_url,
    http_method: connection.http_method,
    authentication_type: connection.authentication_type,
    timeout_ms: connection.timeout_ms,
    created_at: connection.created_at,
    updated_at: connection.updated_at,
  }
}

async function getAccessibleAgent(agentId: string) {
  const agent = await getAgent(agentId)
  return agent
}

export async function GET(_: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    if (!(await getAccessibleAgent(agentId))) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const connection = await getAgentConnection(agentId)
    return NextResponse.json({ connection: connection ? safeConnection(connection) : null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load agent connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    if (!(await getAccessibleAgent(agentId))) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (await getAgentConnection(agentId)) {
      return NextResponse.json({ error: 'Agent already has a connection' }, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    const validation = validateAgentConnection({ ...(body || {}), agent_id: agentId })
    if (!validation.valid || !validation.input) {
      return NextResponse.json({ error: validation.error || 'Invalid connection configuration' }, { status: 400 })
    }

    const connection = await createAgentConnection(validation.input)
    return NextResponse.json({ connection: safeConnection(connection) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agent connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    if (!(await getAccessibleAgent(agentId))) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const existing = await getAgentConnection(agentId)
    if (!existing) return NextResponse.json({ error: 'Agent connection not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const validation = validateAgentConnection({
      ...existing,
      ...body,
      agent_id: agentId,
      request_headers: 'request_headers' in body ? body.request_headers : existing.request_headers,
      request_body_template:
        'request_body_template' in body ? body.request_body_template : existing.request_body_template,
    })
    if (!validation.valid || !validation.input) {
      return NextResponse.json({ error: validation.error || 'Invalid connection configuration' }, { status: 400 })
    }

    const { agent_id: _, ...updates } = validation.input
    const connection = await updateAgentConnection(agentId, updates)
    return NextResponse.json({ connection: safeConnection(connection) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update agent connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    if (!(await getAccessibleAgent(agentId))) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await deleteAgentConnection(agentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete agent connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
