import { NextResponse } from 'next/server'
import { deleteAgent, getAgent, updateAgent } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function GET(_: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    const agent = await getAgent(agentId)

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    const existingAgent = await getAgent(agentId)

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const updates: { name?: string; description?: string | null; adapter_type?: string } = {}

    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Agent name must be a non-empty string' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if ('description' in body) {
      if (body.description !== null && typeof body.description !== 'string') {
        return NextResponse.json({ error: 'Agent description must be a string or null' }, { status: 400 })
      }
      updates.description = body.description
    }

    if ('adapter_type' in body) {
      if (typeof body.adapter_type !== 'string' || !body.adapter_type.trim()) {
        return NextResponse.json({ error: 'adapter_type must be a non-empty string' }, { status: 400 })
      }
      updates.adapter_type = body.adapter_type.trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updatable fields (name, description, adapter_type) provided' },
        { status: 400 },
      )
    }

    const updatedAgent = await updateAgent(agentId, updates)
    return NextResponse.json({ agent: updatedAgent })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update agent'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    const existingAgent = await getAgent(agentId)

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await deleteAgent(agentId)
    return NextResponse.json({ success: true, message: 'Agent deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete agent'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
