import { NextResponse } from 'next/server'
import { createAgentVersion, listAgentVersions } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'
import type { Json } from '@/lib/domain/types'

export async function GET(_: Request, context: { params: Promise<{ agentId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { agentId } = await context.params
  return NextResponse.json({ versions: await listAgentVersions(agentId) })
}

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { agentId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body.version_label !== 'string' || !body.version_label.trim()) {
    return NextResponse.json({ error: 'version_label is required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      version: await createAgentVersion({
        agent_id: agentId,
        version_label: body.version_label.trim(),
        system_prompt: typeof body.system_prompt === 'string' ? body.system_prompt : null,
        configuration: (body.configuration ?? {}) as Json,
      }),
    },
    { status: 201 },
  )
}
