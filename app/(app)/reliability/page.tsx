'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/app/app-shell'
import type { Agent, AgentVersion, Json, Project } from '@/lib/domain/types'
import type { ScenarioCategory } from '@/lib/scenario-generator'
import { classifyFailure, type FailureCategory, type FailureClassificationInput } from '@/lib/failure-classifier'
import { calculateReliabilityScore } from '@/lib/reliability-score'

type ReportScenario = {
  id: string
  category: ScenarioCategory
  title: string
  prompt: string
  expected_behavior: string | null
  is_destructive: boolean
}

type ReportResult = {
  scenarioId: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  agentResponse: string
  toolCalls: FailureClassificationInput['toolCalls']
  traces: FailureClassificationInput['toolCalls']
  finalResult: Json
  durationMs: number
}

function responseError(status: number, message?: string) {
  if (status === 401) return 'Please sign in.'
  if (status === 404) return 'The requested evaluation context was not found.'
  return message || 'The report could not be loaded.'
}

const failureLabels: Record<FailureCategory, string> = {
  prompt_injection: 'Prompt Injection',
  invalid_input: 'Invalid Input',
  tool_error: 'Tool Error',
  not_found: 'Not Found',
  safety_violation: 'Safety Violation',
  unexpected_behavior: 'Unexpected Behavior',
  execution_error: 'Execution Error',
}

export default function ReliabilityPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [projectId, setProjectId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [scenarios, setScenarios] = useState<ReportScenario[]>([])
  const [results, setResults] = useState<ReportResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const scenarioById = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, scenario])), [scenarios])
  const evaluatedScenarios = useMemo(() => results
    .map((result) => scenarioById.get(result.scenarioId))
    .filter((scenario): scenario is ReportScenario => Boolean(scenario)), [results, scenarioById])
  const summary = useMemo(() => calculateReliabilityScore(results, evaluatedScenarios.map((scenario) => ({
    id: scenario.id,
    category: scenario.category,
    title: scenario.title,
    input: scenario.prompt,
    expectedRisk: scenario.expected_behavior ?? undefined,
  }))), [results, evaluatedScenarios])
  const failures = useMemo(() => results.map((result) => {
    const scenario = scenarioById.get(result.scenarioId)
    if (!scenario) return null
    return classifyFailure({
      status: result.status,
      category: scenario.category,
      title: scenario.title,
      input: scenario.prompt,
      expectedRisk: scenario.expected_behavior ?? undefined,
      agentResponse: result.agentResponse,
      finalResult: result.finalResult,
      toolCalls: result.toolCalls,
    })
  }).filter((failure): failure is NonNullable<typeof failure> => failure !== null), [results, scenarioById])
  const failureModes = useMemo(() => {
    const counts = new Map<FailureCategory, number>()
    failures.forEach((failure) => counts.set(failure.category, (counts.get(failure.category) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [failures])

  useEffect(() => {
    fetch('/api/projects')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data.projects as Project[]
      })
      .then((data) => {
        setProjects(data)
        setProjectId(data[0]?.id ?? '')
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load projects'))
  }, [])

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/agents?projectId=${projectId}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data.agents as Agent[]
      })
      .then((data) => {
        setAgents(data)
        const mockAgent = data.find((agent) => agent.adapter_type === 'mock')
        setAgentId(mockAgent?.id ?? data[0]?.id ?? '')
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load agents'))
  }, [projectId])

  useEffect(() => {
    if (!agentId) return
    fetch(`/api/agents/${agentId}/versions`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data.versions as AgentVersion[]
      })
      .then((data) => {
        setVersions(data)
        setVersionId(data[0]?.id ?? '')
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load versions'))
  }, [agentId])

  const loadReport = async () => {
    if (!projectId || !agentId || !versionId) return
    setLoading(true)
    setError('')
    try {
      const [scenarioResponse, evaluationResponse] = await Promise.all([
        fetch(`/api/scenarios?agentId=${agentId}&versionId=${versionId}`),
        fetch(`/api/evaluation-runs?projectId=${projectId}&agentId=${agentId}&versionId=${versionId}`),
      ])
      const scenarioData = await scenarioResponse.json()
      const evaluationData = await evaluationResponse.json()
      if (!scenarioResponse.ok) throw new Error(responseError(scenarioResponse.status, scenarioData.error))
      if (!evaluationResponse.ok) throw new Error(responseError(evaluationResponse.status, evaluationData.error))
      setScenarios(scenarioData.scenarios as ReportScenario[])
      setResults(evaluationData.results as ReportResult[])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load reliability report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [projectId, agentId, versionId])

  return (
    <div className="space-y-6">
      <PageHeader title="Reliability Report" description="A compact view of the latest completed evaluation run.">
        <button type="button" onClick={loadReport} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </PageHeader>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          <select value={versionId} onChange={(event) => setVersionId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {versions.map((version) => <option key={version.id} value={version.id}>{version.version_label}</option>)}
          </select>
        </div>
      </Card>

      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading evaluation report...</div>}
      {!loading && !results.length && <Card className="p-8 text-center"><ShieldCheck className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">No completed evaluation run found.</p><p className="mt-1 text-sm text-muted-foreground">Run scenarios first, then return here for the report.</p></Card>}

      {!loading && results.length > 0 && <>
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AgentGuard Platform Evaluation Score</p><h2 className="mt-1 font-display text-4xl font-semibold">{summary.score}<span className="text-lg text-muted-foreground">/100</span></h2><p className="mt-1 text-sm text-muted-foreground">Deterministic score for the selected completed run.</p></div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
              <Metric label="Pass Rate" value={`${summary.passed}/${summary.total}`} />
              <Metric label="Failures" value={String(summary.failed + summary.errors)} />
              <Metric label="Safety" value={`${summary.categories.safety.score}%`} />
              <Metric label="Adversarial" value={`${summary.categories.adversarial.score}%`} />
              <Metric label="Edge Cases" value={`${summary.categories.edge.score}%`} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold">Failure Modes</h2><p className="text-sm text-muted-foreground">Deterministic classifications from failed scenarios and traces.</p></div><Badge variant="outline">{failures.length} total</Badge></div>
          {failureModes.length ? <div className="mt-4 flex flex-wrap gap-2">{failureModes.map(([category, count]) => <div key={category} className="rounded-md border px-3 py-2 text-sm"><span className="font-medium">{failureLabels[category]}</span><span className="ml-2 text-muted-foreground">{count}</span></div>)}</div> : <p className="mt-4 text-sm text-emerald-600">No failure modes detected in this run.</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold">Scenario Results</h2><p className="text-sm text-muted-foreground">Expand any scenario to inspect the agent response and sandbox trace.</p></div><span className="text-sm text-muted-foreground">{summary.passed} passed, {summary.failed + summary.errors} failed</span></div>
          <div className="mt-4 space-y-2">{results.map((result) => {
            const scenario = scenarioById.get(result.scenarioId)
            if (!scenario) return null
            const failure = classifyFailure({ status: result.status, category: scenario.category, title: scenario.title, input: scenario.prompt, expectedRisk: scenario.expected_behavior ?? undefined, agentResponse: result.agentResponse, finalResult: result.finalResult, toolCalls: result.toolCalls })
            return <details key={result.scenarioId} className="rounded-md border border-border/70 p-4"><summary className="flex cursor-pointer list-none items-center gap-3"><ChevronDown className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate font-medium">{scenario.title}</span><Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>{result.status}</Badge>{failure && <Badge variant="outline">{failureLabels[failure.category]}</Badge>}</summary><div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm"><p className="text-muted-foreground">{scenario.prompt}</p>{failure && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Explanation</p><p className="mt-1">{failure.explanation}</p></div>}<div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent Response</p><p className="mt-1">{result.agentResponse}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tool Trace</p><pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result.traces, null, 2)}</pre></div></div></details>
          })}</div>
        </Card>
      </>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}
