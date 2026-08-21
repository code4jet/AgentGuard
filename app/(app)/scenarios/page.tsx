'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Agent, AgentVersion, Json, Project } from '@/lib/domain/types'
import type { ScenarioCategory, ScenarioDifficulty } from '@/lib/scenario-generator'
import { classifyFailure } from '@/lib/failure-classifier'
import type { FailureClassificationInput } from '@/lib/failure-classifier'
import { calculateReliabilityScore } from '@/lib/reliability-score'

type GeneratedScenario = {
  id: string
  category: ScenarioCategory
  title: string
  input: string
  expectedRisk: string
  difficulty: ScenarioDifficulty
}

type ScenarioRow = GeneratedScenario & { persistedId: string }
type RunResult = {
  scenarioId: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  agentResponse: string
  toolCalls: FailureClassificationInput['toolCalls']
  traces: FailureClassificationInput['toolCalls']
  finalResult: Json
  durationMs: number
}

const scenarioCategories: ScenarioCategory[] = ['normal', 'edge', 'adversarial', 'safety']

function responseError(status: number, message?: string) {
  if (status === 401) return 'Please sign in.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'Requested agent/version/project was not found.'
  if (status === 400) return 'Invalid scenario generation request.'
  if (status === 500) return 'Scenario generation failed. Please try again.'
  return message || 'The request could not be completed.'
}

export default function ScenariosPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [projectId, setProjectId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [count, setCount] = useState('5')
  const [generationMode, setGenerationMode] = useState<'ai' | 'deterministic'>('ai')
  const [generationStatus, setGenerationStatus] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<ScenarioCategory[]>(scenarioCategories)
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [results, setResults] = useState<RunResult[]>([])
  const [generating, setGenerating] = useState(false)
  const [running, setRunning] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [error, setError] = useState('')
  const runLock = useRef(false)

  const selectedAgent = agents.find((agent) => agent.id === agentId)
  const [generatedCount, setGeneratedCount] = useState(0)
  const resultByScenarioId = useMemo(
    () => new Map(results.map((result) => [result.scenarioId, result])),
    [results],
  )
  const summary = useMemo(() => calculateReliabilityScore(results, scenarios.map((scenario) => ({
    id: scenario.persistedId,
    category: scenario.category,
    title: scenario.title,
    input: scenario.input,
    expectedRisk: scenario.expectedRisk,
  }))), [results, scenarios])

  useEffect(() => {
    fetch('/api/projects')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data.projects as Project[]
      })
      .then((data) => {
        setProjects(data)
        if (data[0]) setProjectId(data[0].id)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load projects'))
      .finally(() => setLoadingProjects(false))
  }, [])

  useEffect(() => {
    if (!projectId) {
      setAgents([])
      setAgentId('')
      return
    }
    setLoadingAgents(true)
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
      .finally(() => setLoadingAgents(false))
  }, [projectId])

  useEffect(() => {
    if (!agentId) {
      setVersions([])
      setVersionId('')
      return
    }
    setLoadingVersions(true)
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
      .finally(() => setLoadingVersions(false))
  }, [agentId])

  useEffect(() => {
    if (!projectId || !agentId || !versionId) return
    Promise.all([
      fetch(`/api/scenarios?agentId=${agentId}&versionId=${versionId}`).then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data.scenarios as Array<{
          id: string
          category: ScenarioCategory
          title: string
          prompt: string
          expected_behavior: string | null
          is_destructive: boolean
        }>
      }),
      fetch(`/api/evaluation-runs?projectId=${projectId}&agentId=${agentId}&versionId=${versionId}`).then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data as { results: RunResult[] }
      }),
    ]).then(([persistedScenarios, evaluation]) => {
      const rows = persistedScenarios.map((scenario) => ({
        id: scenario.id,
        persistedId: scenario.id,
        category: scenario.category,
        title: scenario.title,
        input: scenario.prompt,
        expectedRisk: scenario.expected_behavior ?? 'none',
        difficulty: (scenario.is_destructive ? 'high' : 'medium') as ScenarioDifficulty,
      }))
      setScenarios(rows)
      setGeneratedCount(rows.length)
      setSelectedIds([])
      setResults(evaluation.results)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load saved scenarios'))
  }, [projectId, agentId, versionId])

  const generate = async () => {
    const requestedCount = Number(count)
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 20) {
      setError('Choose a scenario count from 1 to 20.')
      return
    }
    if (!projectId) {
      setError('Select a project before generating scenarios.')
      return
    }
    if (!agentId) {
      setError('Select an agent before generating scenarios.')
      return
    }
    if (!versionId) {
      setError('Select an active version before generating scenarios.')
      return
    }
    if (!selectedCategories.length) {
      setError('Select at least one scenario category.')
      return
    }
    setGenerating(true)
    setError('')
    setGenerationStatus('')
    setResults([])
    setScenarios([])
    setSelectedIds([])
    try {
      const categoryCounts = selectedCategories.map((value, index) => ({
        category: value,
        count: Math.floor(requestedCount / selectedCategories.length) + (index < requestedCount % selectedCategories.length ? 1 : 0),
      })).filter((request) => request.count > 0)
      const generatedGroups = await Promise.all(categoryCounts.map(async (request) => {
        const response = await fetch('/api/scenarios/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: request.count,
            category: request.category,
            categories: selectedCategories,
            mode: generationMode,
            agent: {
              name: selectedAgent?.name ?? 'Demo Agent',
              description: selectedAgent?.description ?? null,
              adapterType: selectedAgent?.adapter_type ?? 'mock',
              tools: ['search_customer', 'get_order', 'refund_order', 'send_email'],
            },
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return { scenarios: data.scenarios as GeneratedScenario[], mode: data.mode as string }
      }))
      const generated = generatedGroups.flatMap((group) => group.scenarios)
      if (!generated.length) throw new Error('The generator returned no scenarios.')
      setGenerationStatus(generatedGroups.some((group) => group.mode === 'deterministic-fallback' || group.mode === 'deterministic')
        ? 'Generated with deterministic fallback'
        : 'Generated with AI')

      const persisted = await Promise.all(generated.map(async (scenario) => {
        const persistResponse = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            agent_id: agentId,
            agent_version_id: versionId || null,
            category: scenario.category,
            title: scenario.title,
            prompt: scenario.input || 'Empty input',
            expected_behavior: scenario.expectedRisk,
            is_destructive: scenario.category === 'safety',
          }),
        })
        const persistData = await persistResponse.json()
        if (!persistResponse.ok) throw new Error(responseError(persistResponse.status, persistData.error))
        return { ...scenario, persistedId: persistData.scenario.id } as ScenarioRow
      }))
      setScenarios(persisted)
      setSelectedIds(persisted.map((scenario) => scenario.persistedId))
      setGeneratedCount(persisted.length)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Scenario generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const runTests = async () => {
    if (runLock.current) return
    if (!agentId) return setError('Select an agent before running tests.')
    if (!versionId) return setError('Select an agent version before running tests.')
    if (!selectedIds.length) return setError('Select at least one scenario before running tests.')
    runLock.current = true
    setRunning(true)
    setError('')
    try {
      const response = await fetch('/api/evaluation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, agentId, versionId, scenarioIds: selectedIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(responseError(response.status, data.error))
      setResults(data.results as RunResult[])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Test run failed.')
    } finally {
      runLock.current = false
      setRunning(false)
    }
  }

  const toggleScenario = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  const statusVariant = (status: RunResult['status']) => status === 'PASS' ? 'default' : status === 'FAIL' ? 'destructive' : 'outline'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Scenario Generator</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate deterministic tests and run them against the Demo Agent.</p>
        </div>
        <Button onClick={runTests} disabled={running || generating || !scenarios.length}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {running ? 'Running tests...' : 'Run Tests'}
        </Button>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="scenarioProject">Project</Label>
            <select id="scenarioProject" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={loadingProjects} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{loadingProjects ? 'Loading...' : 'Select project'}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenarioAgent">Agent</Label>
            <select id="scenarioAgent" value={agentId} onChange={(event) => setAgentId(event.target.value)} disabled={loadingAgents} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{loadingAgents ? 'Loading...' : 'Select agent'}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} ({agent.adapter_type})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenarioVersion">Version</Label>
            <select id="scenarioVersion" value={versionId} onChange={(event) => setVersionId(event.target.value)} disabled={loadingVersions || !agentId} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{loadingVersions ? 'Loading...' : 'Select version'}</option>
              {versions.map((version) => <option key={version.id} value={version.id}>{version.version_label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenarioCount">Count</Label>
            <Input id="scenarioCount" type="number" min={1} max={20} value={count} onChange={(event) => setCount(event.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {scenarioCategories.map((value) => {
                const checked = selectedCategories.includes(value)
                return <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-2.5 py-2 text-sm capitalize">
                  <input type="checkbox" checked={checked} onChange={() => setSelectedCategories((current) => checked ? current.filter((item) => item !== value) : [...current, value])} />
                  {value}
                </label>
              })}
            </div>
          </div>
          <Button onClick={generate} disabled={generating || running || !projectId || !agentId}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? 'Generating...' : 'Generate Scenarios'}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Label htmlFor="generationMode">Generation Mode</Label>
          <select id="generationMode" value={generationMode} onChange={(event) => setGenerationMode(event.target.value as 'ai' | 'deterministic')} disabled={generating || running} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="ai">AI</option>
            <option value="deterministic">Deterministic</option>
          </select>
          {generationStatus && <span role="status" className="text-xs text-muted-foreground">{generationStatus}</span>}
        </div>
        {selectedAgent && selectedAgent.adapter_type !== 'mock' && <p className="mt-3 text-xs text-amber-600">Only the Demo Agent mock adapter is executable in this MVP.</p>}
        {generatedCount > 0 && <p className="mt-3 text-sm text-emerald-600">Generated {generatedCount} scenarios</p>}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Generated scenarios</h2>
            <p className="text-sm text-muted-foreground">{selectedIds.length} of {scenarios.length} selected</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(scenarios.map((scenario) => scenario.persistedId))} disabled={!scenarios.length}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Clear Selection</Button>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {!scenarios.length ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Generate scenarios to begin a test run.</p> : scenarios.map((scenario) => {
            const result = resultByScenarioId.get(scenario.persistedId)
            const selected = selectedIds.includes(scenario.persistedId)
            const failure = result && classifyFailure({
              status: result.status,
              category: scenario.category,
              title: scenario.title,
              input: scenario.input,
              expectedRisk: scenario.expectedRisk,
              agentResponse: result.agentResponse,
              finalResult: result.finalResult,
              toolCalls: result.toolCalls,
            })
            return (
              <div key={scenario.persistedId} className={`rounded-lg border p-4 transition-colors ${selected ? 'border-primary/50 bg-primary/5' : 'border-border/60'}`}>
                <div className="flex items-start gap-3">
                  <button type="button" aria-label={`${selected ? 'Deselect' : 'Select'} ${scenario.title}`} onClick={() => toggleScenario(scenario.persistedId)} className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                    {selected && <Check className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{scenario.title}</h3>
                      <Badge variant="outline" className="capitalize">{scenario.category}</Badge>
                      <Badge variant="secondary">{scenario.difficulty}</Badge>
                      {result && <Badge variant={statusVariant(result.status)}>{result.status}</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{scenario.input || '(empty input)'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Expected risk: <span className="font-medium text-foreground">{scenario.expectedRisk}</span></p>
                    {failure && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-medium text-muted-foreground">Failure category</p><p className="mt-1 font-medium">{failure.category}</p><p className="mt-1 text-sm text-muted-foreground">{failure.explanation}</p><p className="mt-2 text-xs font-medium text-muted-foreground">Tool trace</p><pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(result.traces, null, 2)}</pre></div>}
                    {result && <details className="mt-3 rounded-md border border-border/60 p-3 text-sm">
                      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><ChevronDown className="size-4" />Execution details <span className="text-xs text-muted-foreground">{result.durationMs}ms</span></summary>
                      <div className="mt-3 space-y-3">
                        <div><p className="text-xs font-medium text-muted-foreground">Agent response</p><p className="mt-1">{result.agentResponse}</p></div>
                        <div><p className="text-xs font-medium text-muted-foreground">Tool calls</p><pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(result.toolCalls, null, 2)}</pre></div>
                        <div><p className="text-xs font-medium text-muted-foreground">Tool traces</p><pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(result.traces, null, 2)}</pre></div>
                        <div><p className="text-xs font-medium text-muted-foreground">Final result</p><pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(result.finalResult, null, 2)}</pre></div>
                      </div>
                    </details>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {results.length > 0 && <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-display text-lg font-semibold">Agent Reliability</h2><p className="text-sm text-muted-foreground">Deterministic score for {selectedAgent?.name || 'Agent'}</p></div>
          <div className="flex items-baseline gap-1"><p className="font-display text-3xl font-semibold">{summary.score}</p><p className="text-sm text-muted-foreground">/ 100</p></div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><p className="text-xs text-muted-foreground">Passed</p><p className="mt-1 font-semibold text-emerald-600">{summary.passed}</p></div>
          <div><p className="text-xs text-muted-foreground">Failed</p><p className="mt-1 font-semibold text-destructive">{summary.failed}</p></div>
          <div><p className="text-xs text-muted-foreground">Errors</p><p className="mt-1 font-semibold">{summary.errors}</p></div>
          <div><p className="text-xs text-muted-foreground">Critical</p><p className="mt-1 font-semibold">{summary.criticalFailures}</p></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 font-semibold">{summary.total}</p></div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
          {(['normal', 'edge', 'adversarial', 'safety'] as const).map((category) => <div key={category} className="flex items-center justify-between text-sm"><span className="capitalize text-muted-foreground">{category}</span><span className="font-semibold">{summary.categories[category].score}%</span></div>)}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Failures are weighted by scenario risk and existing failure category. This is AgentGuard&apos;s deterministic platform score, not an industry benchmark.</p>
      </Card>}

      <div className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="size-3.5" />Scenarios are deterministic and execute through the Mock Sandbox.</div>
    </div>
  )
}
