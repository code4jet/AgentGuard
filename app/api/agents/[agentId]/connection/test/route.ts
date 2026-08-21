import { NextResponse } from 'next/server'
import { getAgent } from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'
import { validateAgentConnection } from '@/lib/validation/connection'

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId } = await context.params
    if (!(await getAgent(agentId))) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const validation = validateAgentConnection({ ...(body || {}), agent_id: agentId })
    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          connection_type_valid: false,
          endpoint_format_valid: false,
          error: validation.error || 'Invalid connection configuration',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      valid: true,
      connection_type_valid: true,
      endpoint_format_valid: true,
      network_request_performed: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate agent connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
