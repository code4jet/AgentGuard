import { NextResponse } from 'next/server'
import { createAgent, listAgents } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  return NextResponse.json({ agents: await listAgents(projectId) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.project_id !== 'string' || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      agent: await createAgent({
        project_id: body.project_id,
        name: body.name.trim(),
        description: typeof body.description === 'string' ? body.description : null,
        adapter_type: typeof body.adapter_type === 'string' ? body.adapter_type : 'mock',
      }),
    },
    { status: 201 },
  )
}
