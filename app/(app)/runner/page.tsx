'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Play, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/app/app-shell'
import type { Agent, AgentVersion, Project } from '@/lib/domain/types'
import type { ScenarioCategory } from '@/lib/scenario-generator'

type RunnerScenario = { id: string; title: string; category: ScenarioCategory; prompt: string }
type RunnerResult = { scenarioId: string; status: 'PASS' | 'FAIL' | 'ERROR' }

function messageFor(status: number, fallback?: string) {
  if (status === 401) return 'Please sign in.'
  if (status === 404) return 'The selected evaluation context was not found.'
  return fallback || 'The request could not be completed.'
}

export default function RunnerPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [scenarios, setScenarios] = useState<RunnerScenario[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [projectId, setProjectId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [results, setResults] = useState<RunnerResult[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/projects').then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(messageFor(response.status, data.error))
      return data.projects as Project[]
    }).then((data) => {
      setProjects(data)
      setProjectId(data[0]?.id ?? '')
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load projects')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/agents?projectId=${projectId}`).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(messageFor(response.status, data.error))
      return data.agents as Agent[]
    }).then((data) => {
      setAgents(data)
      const mockAgent = data.find((agent) => agent.adapter_type === 'mock')
      setAgentId(mockAgent?.id ?? data[0]?.id ?? '')
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load agents'))
  }, [projectId])

  useEffect(() => {
    if (!agentId) return
    fetch(`/api/agents/${agentId}/versions`).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(messageFor(response.status, data.error))
      return data.versions as AgentVersion[]
    }).then((data) => {
      setVersions(data)
      setVersionId(data[0]?.id ?? '')
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load versions'))
  }, [agentId])

  const loadScenarios = async () => {
    if (!agentId || !versionId) return
    setError('')
    const response = await fetch(`/api/scenarios?agentId=${agentId}&versionId=${versionId}`)
    const data = await response.json()
    if (!response.ok) throw new Error(messageFor(response.status, data.error))
    setScenarios(data.scenarios as RunnerScenario[])
    setSelectedIds([])
  }

  useEffect(() => {
    loadScenarios().catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load scenarios'))
  }, [agentId, versionId])

  const runTests = async () => {
    if (!projectId || !agentId || !versionId) return setError('Select a project, agent, and version.')
    if (!selectedIds.length) return setError('Select at least one persisted scenario.')
    setRunning(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/evaluation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, agentId, versionId, scenarioIds: selectedIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(messageFor(response.status, data.error))
      setResults(data.results as RunnerResult[])
      setMessage(`Completed ${data.results.length} scenario${data.results.length === 1 ? '' : 's'}.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Test run failed.')
    } finally {
      setRunning(false)
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Test Runner" description="Select persisted scenarios and execute the Demo Agent evaluation run." />
    {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {message && <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">{message} <Link className="font-medium underline" href="/results">View Results</Link> or <Link className="font-medium underline" href="/reliability">Reliability Report</Link>.</div>}
    <Card className="p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <select aria-label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={loading} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select aria-label="Agent" value={agentId} onChange={(event) => setAgentId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} ({agent.adapter_type})</option>)}</select>
        <select aria-label="Version" value={versionId} onChange={(event) => setVersionId(event.target.value)} disabled={!agentId} className="rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select version</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.version_label}</option>)}</select>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4"><p className="text-sm text-muted-foreground">{selectedIds.length} of {scenarios.length} persisted scenarios selected</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => loadScenarios()}><RefreshCw className="size-4" />Refresh</Button><Button variant="outline" size="sm" onClick={() => setSelectedIds(scenarios.map((scenario) => scenario.id))} disabled={!scenarios.length}>Select All</Button><Button onClick={runTests} disabled={running || !selectedIds.length}><>{running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}</>{running ? 'Running tests...' : 'Run Tests'}</Button></div></div>
    </Card>
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">Available scenarios</h2>
      <div className="mt-4 space-y-2">{scenarios.length ? scenarios.map((scenario) => { const selected = selectedIds.includes(scenario.id); const result = results.find((item) => item.scenarioId === scenario.id); return <button type="button" key={scenario.id} onClick={() => setSelectedIds((current) => selected ? current.filter((id) => id !== scenario.id) : [...current, scenario.id])} className={`flex w-full items-start gap-3 rounded-md border p-4 text-left ${selected ? 'border-primary/50 bg-primary/5' : 'border-border/70'}`}><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{selected && <Check className="size-3.5" />}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 font-medium">{scenario.title}<Badge variant="outline" className="capitalize">{scenario.category}</Badge>{result && <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>{result.status}</Badge>}</span><span className="mt-1 block text-sm text-muted-foreground">{scenario.prompt}</span></span></button> }) : <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Generate and persist scenarios before running tests.</p>}</div>
    </Card>
  </div>
}
