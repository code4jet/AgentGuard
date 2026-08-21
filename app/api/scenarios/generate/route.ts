import { NextResponse } from 'next/server'
import { generateScenarios, type ScenarioCategory } from '@/lib/scenario-generator'
import { DEMO_AGENT_TOOLS, generateAiScenarios } from '@/lib/ai-scenario-generator'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const count = body?.count
  const category = body?.category as ScenarioCategory | undefined
  const mode = body?.mode === 'deterministic' ? 'deterministic' : 'ai'
  const categories = Array.isArray(body?.categories) ? body.categories as ScenarioCategory[] : category ? [category] : ['normal', 'edge', 'adversarial', 'safety'] as ScenarioCategory[]
  const agent = {
    name: typeof body?.agent?.name === 'string' ? body.agent.name : 'Demo Agent',
    description: typeof body?.agent?.description === 'string' ? body.agent.description : null,
    adapterType: typeof body?.agent?.adapterType === 'string' ? body.agent.adapterType : 'mock',
    tools: Array.isArray(body?.agent?.tools) ? body.agent.tools.filter((tool: unknown): tool is string => typeof tool === 'string') : DEMO_AGENT_TOOLS,
  }

  try {
    if (mode === 'deterministic') return NextResponse.json({ scenarios: generateScenarios({ count, category }), mode: 'deterministic' })
    const result = await generateAiScenarios({
      count,
      categories,
      category,
      agent,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid generation options' }, { status: 400 })
  }
}