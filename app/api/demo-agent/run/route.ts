import { NextResponse } from 'next/server'
import { createDemoCustomerSupportAgent } from '@/lib/demo-agent'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.scenario !== 'string' || !body.scenario.trim()) {
    return NextResponse.json({ error: 'scenario is required' }, { status: 400 })
  }

  const profile = body.profile === 'flawed' ? 'flawed' : 'safe'
  const agent = createDemoCustomerSupportAgent(profile)
  const result = await agent.invoke(
    { connection: {} as any, version: { configuration: { profile } } as any },
    { input: body.scenario },
  )

  return NextResponse.json({
    response: result.response ?? result.output,
    toolCalls: result.toolCalls ?? [],
    finalResult: result.finalResult ?? { ok: true, summary: result.output },
  })
}
