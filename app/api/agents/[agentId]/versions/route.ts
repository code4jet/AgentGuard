import { NextResponse } from 'next/server'
import { createAgentVersion, getAgent, listAgentVersions } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'
import { validateAgentConfiguration } from '@/lib/validation/config'

export async function GET(_: Request, context: { params: Promise<{ agentId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { agentId } = await context.params

  const agent = await getAgent(agentId)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({ versions: await listAgentVersions(agentId) })
}

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { agentId } = await context.params

  const agent = await getAgent(agentId)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.version_label !== 'string' || !body.version_label.trim()) {
    return NextResponse.json({ error: 'version_label is required' }, { status: 400 })
  }

  const configValidation = validateAgentConfiguration(body.configuration)
  if (!configValidation.valid || !configValidation.config) {
    return NextResponse.json(
      { error: configValidation.error || 'Invalid configuration format' },
      { status: 400 },
    )
  }

  try {
    const version = await createAgentVersion({
      agent_id: agentId,
      version_label: body.version_label.trim(),
      system_prompt: typeof body.system_prompt === 'string' ? body.system_prompt : null,
      configuration: configValidation.config,
    })
    return NextResponse.json({ version }, { status: 201 })
  } catch (error: any) {
    if (error && typeof error === 'object' && error.code === '23505') {
      return NextResponse.json(
        { error: 'An agent version with this label already exists' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Failed to create agent version' }, { status: 500 })
  }
}
