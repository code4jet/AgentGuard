'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, GitCompareArrows, Loader2, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/app/app-shell'
import type { Agent, Project } from '@/lib/domain/types'
import type { RegressionComparison } from '@/lib/regression-tracker'

function responseError(status: number, message?: string) {
  if (status === 401) return 'Please sign in.'
  if (status === 404) return 'The requested evaluation context was not found.'
  return message || 'The regression report could not be loaded.'
}

export default function RegressionTrackerPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [projectId, setProjectId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [comparison, setComparison] = useState<RegressionComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const statusLabel = useMemo(() => {
    if (!comparison) return 'No data'
    if (comparison.status === 'regressed') return 'REGRESSION DETECTED'
    if (comparison.status === 'improved') return 'IMPROVED'
    return 'STABLE'
  }, [comparison])

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
        setAgentId(data[0]?.id ?? '')
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load agents'))
  }, [projectId])

  useEffect(() => {
    if (!projectId || !agentId) {
      setComparison(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    fetch(`/api/regressions?projectId=${projectId}&agentId=${agentId}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(responseError(response.status, data.error))
        return data.comparison as RegressionComparison | null
      })
      .then((data) => {
        setComparison(data)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load regression report'))
      .finally(() => setLoading(false))
  }, [projectId, agentId])

  return (
    <div className="space-y-6">
      <PageHeader title="Regression Tracker" description="Compare reliability across completed evaluation runs." />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
        </div>
      </Card>

      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading regression comparison...</div>}

      {!loading && !comparison && !error && (
        <Card className="p-10 text-center">
          <GitCompareArrows className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-4 font-display text-lg font-semibold">No comparable evaluation runs yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Run the same agent across at least two completed evaluations to compare versions.</p>
        </Card>
      )}

      {!loading && comparison && (
        <>
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Version</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{comparison.currentVersion}</h2>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Previous Version</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{comparison.previousVersion}</h2>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Previous Score</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{comparison.previousScore}/100</h2>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Score</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{comparison.currentScore}/100</h2>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Change</p>
                <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
                  {comparison.scoreDifference >= 0 ? <ArrowUpRight className="size-5 text-emerald-500" /> : <ArrowDownRight className="size-5 text-red-500" />}
                  <span className={comparison.scoreDifference >= 0 ? 'text-emerald-500' : 'text-red-500'}>{comparison.scoreDifference > 0 ? '+' : ''}{comparison.scoreDifference}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                <Badge variant={comparison.status === 'regressed' ? 'destructive' : comparison.status === 'improved' ? 'default' : 'outline'} className="mt-2">
                  {comparison.status === 'regressed' ? 'REGRESSION DETECTED' : comparison.status === 'improved' ? 'IMPROVED' : 'STABLE'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Regressed Scenarios</h2>
                <p className="text-sm text-muted-foreground">Scenario deltas from the previous completed run.</p>
              </div>
              <Badge variant="outline">{comparison.regressedScenarios.length}</Badge>
            </div>

            {comparison.regressedScenarios.length === 0 ? (
              <p className="mt-4 text-sm text-emerald-600">No scenario-level regressions detected.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-md border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted/70 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Scenario</th>
                      <th className="px-3 py-2 font-medium">Previous</th>
                      <th className="px-3 py-2 font-medium">Current</th>
                      <th className="px-3 py-2 font-medium">Failure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.regressedScenarios.map((entry) => (
                      <tr key={entry.scenarioId} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{entry.scenarioId}</td>
                        <td className="px-3 py-2">{entry.previousStatus ?? '—'}</td>
                        <td className="px-3 py-2">{entry.currentStatus ?? '—'}</td>
                        <td className="px-3 py-2 text-red-500">{entry.failure ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">New Failure Modes</h2>
                <p className="text-sm text-muted-foreground">Failure categories introduced in the current run.</p>
              </div>
              <ShieldCheck className="size-4 text-muted-foreground" />
            </div>

            {comparison.newFailureModes.length === 0 ? (
              <p className="mt-4 text-sm text-emerald-600">No new failure modes were introduced.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.newFailureModes.map((mode) => (
                  <Badge key={mode} variant="destructive" className="rounded-full">{mode}</Badge>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
