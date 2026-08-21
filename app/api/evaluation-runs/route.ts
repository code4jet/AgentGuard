import { NextResponse } from 'next/server'
import {
  createEvaluationRun,
  getAgent,
  getAgentConnection,
  getAgentVersion,
  getLatestEvaluationRun,
  getProject,
  listTestResults,
  listToolTraces,
  listScenarios,
  saveTestResult,
  saveToolTrace,
  updateEvaluationRun,
} from '@/lib/db/repositories'
import { resolveAgentAdapter } from '@/lib/adapters/resolve'
import { getCurrentUser } from '@/lib/supabase/auth'
import { runScenarios } from '@/lib/test-runner'
import { deterministicJudgeResult, judgeExecution } from '@/lib/ai-evaluation-judge'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = new URL(request.url).searchParams
  const projectId = searchParams.get('projectId')
  const agentId = searchParams.get('agentId')
  const versionId = searchParams.get('versionId')
  if (!projectId || !agentId || !versionId) {
    return NextResponse.json({ error: 'projectId, agentId, and versionId are required' }, { status: 400 })
  }

  const agent = await getAgent(agentId)
  const project = agent ? await getProject(agent.project_id) : null
  if (!agent || agent.project_id !== projectId || !project || project.owner_id !== user.id) {
    return NextResponse.json({ error: 'Agent or project not found' }, { status: 404 })
  }

  const evaluationRun = await getLatestEvaluationRun({ projectId, agentId, versionId })
  if (!evaluationRun) return NextResponse.json({ evaluationRun: null, results: [] })

  const testResults = await listTestResults(evaluationRun.id)
  const traces = await listToolTraces(testResults.map((result) => result.id))
  const scenarios = await listScenarios(agent.id)
  return NextResponse.json({
    evaluationRun,
    results: testResults.map((result) => {
      const resultTraces = traces.filter((trace) => trace.test_result_id === result.id)
      const scenario = scenarios.find((item) => item.id === result.scenario_id)
      const status = result.status === 'passed' ? 'PASS' : result.status === 'failed' ? 'FAIL' : 'ERROR'
      return {
        scenarioId: result.scenario_id,
        status,
        agentResponse: result.raw_output ?? '',
        toolCalls: resultTraces,
        traces: resultTraces,
        finalResult: { ok: result.status === 'passed' },
        durationMs: 0,
        aiJudge: scenario ? deterministicJudgeResult({
          scenario: {
            id: scenario.id,
            category: scenario.category as 'normal' | 'edge' | 'adversarial' | 'safety',
            title: scenario.title,
            input: scenario.prompt,
            expectedRisk: scenario.expected_behavior ?? 'none',
            difficulty: scenario.is_destructive ? 'high' : 'medium',
          },
          status,
          agentResponse: result.raw_output ?? '',
          finalResult: { ok: result.status === 'passed' },
          traces: resultTraces,
        }) : undefined,
      }
    }),
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const projectId = typeof body?.projectId === 'string' ? body.projectId : body?.project_id
  const agentId = typeof body?.agentId === 'string' ? body.agentId : body?.agent_id
  const versionId = typeof body?.versionId === 'string' ? body.versionId : body?.agent_version_id
  const scenarioIds = body?.scenarioIds
  if (typeof projectId !== 'string' || typeof agentId !== 'string' || typeof versionId !== 'string' || !Array.isArray(scenarioIds) || scenarioIds.length === 0 || scenarioIds.some((id: unknown) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'projectId, agentId, versionId, and a non-empty scenarioIds array are required' }, { status: 400 })
  }

  const agent = await getAgent(agentId)
  const project = agent ? await getProject(agent.project_id) : null
  const version = await getAgentVersion(versionId)
  if (!agent || agent.project_id !== projectId || !project || project.owner_id !== user.id || !version || version.agent_id !== agent.id) {
    return NextResponse.json({ error: 'Agent, project, or version not found' }, { status: 404 })
  }

  const scenarios = (await listScenarios(agent.id)).filter((scenario) => scenarioIds.includes(scenario.id))
  if (scenarios.length !== scenarioIds.length) {
    return NextResponse.json({ error: 'One or more scenarios were not found for this agent' }, { status: 404 })
  }

  let adapter
  try {
    adapter = resolveAgentAdapter(agent.adapter_type)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Adapter is not executable' }, { status: 400 })
  }

  const evaluationRun = await createEvaluationRun({
    project_id: agent.project_id,
    agent_id: agent.id,
    agent_version_id: version.id,
    status: 'running',
  })
  await updateEvaluationRun(evaluationRun.id, { started_at: new Date().toISOString() })

  try {
    const connection = await getAgentConnection(agent.id)
    const results = await runScenarios(adapter, { connection: connection ?? ({} as never), version }, scenarios)

    const judgedResults = await Promise.all(results.map(async (result, index) => ({
      result,
      aiJudge: await judgeExecution({
        scenario: {
          id: scenarios[index].id,
          category: scenarios[index].category as 'normal' | 'edge' | 'adversarial' | 'safety',
          title: scenarios[index].title,
          input: scenarios[index].prompt,
          expectedRisk: scenarios[index].expected_behavior ?? 'none',
          difficulty: scenarios[index].is_destructive ? 'high' : 'medium',
        },
        execution: result,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL,
      }),
    })))

    for (const [index, { result }] of judgedResults.entries()) {
      const testResult = await saveTestResult({
        evaluation_run_id: evaluationRun.id,
        scenario_id: result.scenarioId,
        status: result.status === 'PASS' ? 'passed' : result.status === 'ERROR' ? 'error' : 'failed',
        raw_input: scenarios[index].prompt,
        raw_output: result.agentResponse,
      })

      for (const [sequenceNumber, trace] of result.traces.entries()) {
        await saveToolTrace({
          test_result_id: testResult.id,
          tool_name: trace.tool,
          arguments: trace.arguments,
          response: trace.result,
          sequence_number: sequenceNumber,
          blocked: trace.status === 'blocked',
          unsafe: trace.status === 'blocked',
        })
      }
    }

    const completedRun = await updateEvaluationRun(evaluationRun.id, {
      status: results.some((result) => result.status === 'ERROR') ? 'failed' : 'completed',
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ evaluationRun: completedRun, results: judgedResults.map(({ result, aiJudge }) => ({ ...result, aiJudge })) })
  } catch (error) {
    await updateEvaluationRun(evaluationRun.id, { status: 'failed', completed_at: new Date().toISOString() })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Evaluation run failed' }, { status: 500 })
  }
}
