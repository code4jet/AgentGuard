import { NextResponse } from 'next/server'
import { createEvaluationRun } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.project_id !== 'string' || typeof body.agent_id !== 'string' || typeof body.agent_version_id !== 'string') {
    return NextResponse.json({ error: 'project_id, agent_id, and agent_version_id are required' }, { status: 400 })
  }

  return NextResponse.json(
    {
      evaluationRun: await createEvaluationRun({
        project_id: body.project_id,
        agent_id: body.agent_id,
        agent_version_id: body.agent_version_id,
        status: 'created',
      }),
    },
    { status: 201 },
  )
}
