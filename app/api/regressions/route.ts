import { NextResponse } from 'next/server'
import {
  getAgent,
  getAgentVersion,
  getProject,
  listCompletedEvaluationRunsByAgent,
  listScenarios,
  listTestResults,
  listToolTraces,
} from '@/lib/db/repositories'
import { getCurrentUser } from '@/lib/supabase/auth'
import { calculateReliabilityScore } from '@/lib/reliability-score'
import { compareEvaluationRuns, type RegressionRunSummary } from '@/lib/regression-tracker'

function toStatus(value: string): 'PASS' | 'FAIL' | 'ERROR' {
  if (value === 'passed') return 'PASS'
  if (value === 'failed') return 'FAIL'
  return 'ERROR'
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = new URL(request.url).searchParams
  const projectId = searchParams.get('projectId')
  const agentId = searchParams.get('agentId')
  if (!projectId || !agentId) {
    return NextResponse.json({ error: 'projectId and agentId are required' }, { status: 400 })
  }

  const agent = await getAgent(agentId)
  const project = agent ? await getProject(agent.project_id) : null
  if (!agent || agent.project_id !== projectId || !project || project.owner_id !== user.id) {
    return NextResponse.json({ error: 'Agent or project not found' }, { status: 404 })
  }

  const runs = (await listCompletedEvaluationRunsByAgent(agentId))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const uniqueRuns = [] as typeof runs
  const seenVersionIds = new Set<string>()
  for (const run of runs) {
    if (seenVersionIds.has(run.agent_version_id)) continue
    seenVersionIds.add(run.agent_version_id)
    uniqueRuns.push(run)
  }

  if (uniqueRuns.length < 2) {
    return NextResponse.json({ comparison: null })
  }

  const currentRun = uniqueRuns[0]
  const previousRun = uniqueRuns.find((run) => run.id !== currentRun.id && run.agent_version_id !== currentRun.agent_version_id) ?? uniqueRuns[1]
  if (!previousRun || previousRun.agent_version_id === currentRun.agent_version_id) {
    return NextResponse.json({ comparison: null })
  }

  const versionById = new Map<string, string>()
  const allVersions = await Promise.all(
    [currentRun.agent_version_id, previousRun.agent_version_id].map(async (versionId) => {
      const version = await getAgentVersion(versionId)
      if (!version) return null
      versionById.set(version.id, version.version_label)
      return version
    }),
  )

  const scenarioMap = new Map((await listScenarios(agentId)).map((scenario) => [scenario.id, scenario]))

  async function summarizeRun(run: (typeof runs)[number]): Promise<RegressionRunSummary> {
    const testResults = await listTestResults(run.id)
    const traceIds = testResults.map((result) => result.id)
    const traces = await listToolTraces(traceIds)
    const results = testResults.map((result) => {
      const status = toStatus(result.status)
      const scenario = scenarioMap.get(result.scenario_id)
      const scenarioTraces = traces.filter((trace) => trace.test_result_id === result.id)
      const normalizedResult = {
        scenarioId: result.scenario_id,
        status,
        agentResponse: result.raw_output ?? '',
        toolCalls: scenarioTraces,
        traces: scenarioTraces,
        finalResult: { ok: status === 'PASS' },
      }
      return normalizedResult
    })

    const summary = calculateReliabilityScore(
      results,
      testResults
        .map((result) => scenarioMap.get(result.scenario_id))
        .filter((scenario): scenario is NonNullable<typeof scenario> => Boolean(scenario))
        .map((scenario) => ({
          id: scenario.id,
          category: scenario.category as 'normal' | 'edge' | 'adversarial' | 'safety',
          title: scenario.title,
          input: scenario.prompt,
          expectedRisk: scenario.expected_behavior ?? undefined,
        })),
    )

    return {
      versionLabel: versionById.get(run.agent_version_id) ?? 'unknown',
      agentId: run.agent_id,
      score: summary.score,
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      errors: summary.errors,
      results: results.map((result) => ({ scenarioId: result.scenarioId, status: result.status })),
      failures: summary.failures.map((failure) => ({
        scenarioId: failure.scenarioId,
        failureCategory: failure.failureCategory,
      })),
    }
  }

  const [previousSummary, currentSummary] = await Promise.all([summarizeRun(previousRun), summarizeRun(currentRun)])
  const comparison = compareEvaluationRuns(previousSummary, currentSummary)

  return NextResponse.json({ comparison })
}
