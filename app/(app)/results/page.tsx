'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/app/app-shell'
import type { Agent, AgentVersion, Json, Project } from '@/lib/domain/types'
import type { ScenarioCategory } from '@/lib/scenario-generator'
import { classifyFailure, type FailureCategory, type FailureClassificationInput } from '@/lib/failure-classifier'
import { calculateReliabilityScore } from '@/lib/reliability-score'
import type { AiJudgeResult } from '@/lib/ai-evaluation-judge'

type ResultScenario = { id: string; category: ScenarioCategory; title: string; prompt: string; expected_behavior: string | null }
type ResultItem = { scenarioId: string; status: 'PASS' | 'FAIL' | 'ERROR'; agentResponse: string; toolCalls: FailureClassificationInput['toolCalls']; traces: FailureClassificationInput['toolCalls']; finalResult: Json; durationMs: number; aiJudge?: AiJudgeResult }
type EvaluationRun = { id: string; status: string; created_at: string; completed_at: string | null }

const labels: Record<FailureCategory, string> = { prompt_injection: 'Prompt Injection', invalid_input: 'Invalid Input', tool_error: 'Tool Error', not_found: 'Not Found', safety_violation: 'Safety Violation', unexpected_behavior: 'Unexpected Behavior', execution_error: 'Execution Error' }

export default function ResultsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [scenarios, setScenarios] = useState<ResultScenario[]>([])
  const [results, setResults] = useState<ResultItem[]>([])
  const [run, setRun] = useState<EvaluationRun | null>(null)
  const [projectId, setProjectId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const scenarioById = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, scenario])), [scenarios])
  const score = useMemo(() => calculateReliabilityScore(results, scenarios.map((scenario) => ({ ...scenario, input: scenario.prompt }))), [results, scenarios])

  useEffect(() => { fetch('/api/projects').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Failed to load projects'); return data.projects as Project[] }).then((data) => { setProjects(data); setProjectId(data[0]?.id ?? '') }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load projects')) }, [])
  useEffect(() => { if (!projectId) return; fetch(`/api/agents?projectId=${projectId}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Failed to load agents'); return data.agents as Agent[] }).then((data) => { setAgents(data); const mock = data.find((agent) => agent.adapter_type === 'mock'); setAgentId(mock?.id ?? data[0]?.id ?? '') }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load agents')) }, [projectId])
  useEffect(() => { if (!agentId) return; fetch(`/api/agents/${agentId}/versions`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Failed to load versions'); return data.versions as AgentVersion[] }).then((data) => { setVersions(data); setVersionId(data[0]?.id ?? '') }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load versions')) }, [agentId])

  const loadResults = async () => {
    if (!projectId || !agentId || !versionId) return
    setLoading(true)
    setError('')
    try {
      const [scenarioResponse, evaluationResponse] = await Promise.all([fetch(`/api/scenarios?agentId=${agentId}&versionId=${versionId}`), fetch(`/api/evaluation-runs?projectId=${projectId}&agentId=${agentId}&versionId=${versionId}`)])
      const scenarioData = await scenarioResponse.json()
      const evaluationData = await evaluationResponse.json()
      if (!scenarioResponse.ok) throw new Error(scenarioData.error || 'Failed to load scenarios')
      if (!evaluationResponse.ok) throw new Error(evaluationData.error || 'Failed to load evaluation')
      setScenarios(scenarioData.scenarios as ResultScenario[])
      setResults(evaluationData.results as ResultItem[])
      setRun(evaluationData.evaluationRun as EvaluationRun | null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to load results') } finally { setLoading(false) }
  }
  useEffect(() => { loadResults() }, [projectId, agentId, versionId])

  return <div className="space-y-6">
    <PageHeader title="Results" description="The most recent completed evaluation run for the selected agent version."><button type="button" onClick={loadResults} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></PageHeader>
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-3"><select aria-label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select aria-label="Agent" value={agentId} onChange={(event) => setAgentId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><select aria-label="Version" value={versionId} onChange={(event) => setVersionId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">{versions.map((version) => <option key={version.id} value={version.id}>{version.version_label}</option>)}</select></div></Card>
    {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading results...</div>}
    {!loading && !run && <Card className="p-8 text-center"><p className="font-medium">No completed evaluation run found.</p><p className="mt-1 text-sm text-muted-foreground">Run persisted scenarios from Test Runner to create results.</p></Card>}
    {!loading && run && <>
      <Card className="p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Agent</p><h2 className="mt-1 font-display text-xl font-semibold">{agents.find((agent) => agent.id === agentId)?.name || agentId}</h2><p className="text-sm text-muted-foreground">Version {versions.find((version) => version.id === versionId)?.version_label || versionId}</p></div><div className="text-right"><Badge variant="default">{run.status}</Badge><p className="mt-2 text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p></div></div><div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 text-sm sm:grid-cols-5"><Metric label="Total" value={String(score.total)} /><Metric label="Passed" value={String(score.passed)} /><Metric label="Failed" value={String(score.failed)} /><Metric label="Errors" value={String(score.errors)} /><Metric label="Reliability" value={`${score.score}/100`} /></div></Card>
      <Card className="p-5"><h2 className="font-display text-lg font-semibold">Scenario Results</h2><div className="mt-4 space-y-2">{results.map((result) => { const scenario = scenarioById.get(result.scenarioId); if (!scenario) return null; const failure = classifyFailure({ status: result.status, category: scenario.category, title: scenario.title, input: scenario.prompt, expectedRisk: scenario.expected_behavior ?? undefined, agentResponse: result.agentResponse, finalResult: result.finalResult, toolCalls: result.toolCalls }); return <details key={result.scenarioId} className="rounded-md border border-border/70 p-4"><summary className="flex cursor-pointer list-none items-center gap-3"><ChevronDown className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate font-medium">{scenario.title}</span><Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>{result.status}</Badge>{failure && <Badge variant="outline">{labels[failure.category]}</Badge>}</summary><div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm">{failure && <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Failure Explanation</p><p className="mt-1">{failure.explanation}</p></div>}{result.aiJudge && <div className="rounded-md border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Evaluation</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><p><span className="text-muted-foreground">Verdict:</span> {result.aiJudge.verdict}</p><p><span className="text-muted-foreground">Failure category:</span> {result.aiJudge.failureCategory ? labels[result.aiJudge.failureCategory] : 'None'}</p><p><span className="text-muted-foreground">Severity:</span> {result.aiJudge.severity}</p><p><span className="text-muted-foreground">Confidence:</span> {(result.aiJudge.confidence * 100).toFixed(0)}%</p></div><p className="mt-2">{result.aiJudge.reason}</p>{result.aiJudge.fallbackMessage && <p className="mt-2 text-xs text-muted-foreground">{result.aiJudge.fallbackMessage}</p>}</div>}<div><p className="text-xs uppercase tracking-wide text-muted-foreground">Agent Response</p><p className="mt-1">{result.agentResponse}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Tool Traces</p><pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result.traces, null, 2)}</pre></div></div></details> })}</div></Card>
    </>}
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div> }
