import { NextResponse } from 'next/server'
import { getAgent, getAgentVersion, updateAgentVersion } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'
import { validateAgentConfiguration } from '@/lib/validation/config'
import type { Json } from '@/lib/domain/types'

export async function GET(
  _: Request,
  context: { params: Promise<{ agentId: string; versionId: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId, versionId } = await context.params

    const agent = await getAgent(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const version = await getAgentVersion(versionId)
    if (!version || version.agent_id !== agentId) {
      return NextResponse.json({ error: 'Agent version not found' }, { status: 404 })
    }

    return NextResponse.json({ version })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ agentId: string; versionId: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId, versionId } = await context.params

    const agent = await getAgent(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const existingVersion = await getAgentVersion(versionId)
    if (!existingVersion || existingVersion.agent_id !== agentId) {
      return NextResponse.json({ error: 'Agent version not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const updates: { version_label?: string; system_prompt?: string | null; configuration?: Json } = {}

    if ('version_label' in body) {
      if (typeof body.version_label !== 'string' || !body.version_label.trim()) {
        return NextResponse.json({ error: 'version_label must be a non-empty string' }, { status: 400 })
      }
      updates.version_label = body.version_label.trim()
    }

    if ('system_prompt' in body) {
      if (body.system_prompt !== null && typeof body.system_prompt !== 'string') {
        return NextResponse.json({ error: 'system_prompt must be a string or null' }, { status: 400 })
      }
      updates.system_prompt = body.system_prompt
    }

    if ('configuration' in body) {
      const validation = validateAgentConfiguration(body.configuration)
      if (!validation.valid || !validation.config) {
        return NextResponse.json(
          { error: validation.error || 'Invalid configuration format' },
          { status: 400 },
        )
      }
      updates.configuration = validation.config
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updatable fields (version_label, system_prompt, configuration) provided' },
        { status: 400 },
      )
    }

    const updatedVersion = await updateAgentVersion(versionId, updates)
    return NextResponse.json({ version: updatedVersion })
  } catch (error: any) {
    // Handle unique constraint violation for (agent_id, version_label)
    if (error && typeof error === 'object' && error.code === '23505') {
      return NextResponse.json(
        { error: 'An agent version with this label already exists' },
        { status: 409 },
      )
    }
    const message = error instanceof Error ? error.message : 'Failed to update agent version'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
