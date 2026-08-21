import { NextResponse } from 'next/server'
import { createScenario, listScenarios } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const agentId = new URL(request.url).searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  const versionId = new URL(request.url).searchParams.get('versionId')
  const scenarios = await listScenarios(agentId)
  return NextResponse.json({ scenarios: versionId ? scenarios.filter((scenario) => scenario.agent_version_id === versionId) : scenarios })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const required = ['project_id', 'agent_id', 'category', 'title', 'prompt']
  if (!body || required.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
    return NextResponse.json({ error: 'project_id, agent_id, category, title, and prompt are required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      scenario: await createScenario({
        project_id: body.project_id,
        agent_id: body.agent_id,
        agent_version_id: typeof body.agent_version_id === 'string' ? body.agent_version_id : null,
        category: body.category,
        title: body.title.trim(),
        prompt: body.prompt,
        expected_behavior: typeof body.expected_behavior === 'string' ? body.expected_behavior : null,
        is_destructive: body.is_destructive === true,
      }),
    },
    { status: 201 },
  )
}
