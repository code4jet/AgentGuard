'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  SlidersHorizontal,
  Save,
  Bot,
  Code,
  ShieldCheck,
  Wrench,
  Loader2,
  FileText,
  AlertTriangle,
  History,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Agent, AgentVersion, Project } from '@/lib/domain/types'

function ConfigureContent() {
  const searchParams = useSearchParams()
  const initialAgentId = searchParams.get('agentId') || ''

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgentId)

  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>('')

  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [saving, setSaving] = useState(false)

  // Configuration Form State
  const [versionLabel, setVersionLabel] = useState('v1.0.0')
  const [isNewVersion, setIsNewVersion] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful customer support agent. Help users resolve order queries politely.',
  )

  // Guided Config state
  const [taskDomain, setTaskDomain] = useState('customer_support')
  const [toolsString, setToolsString] = useState('search_order, refund_order, send_email')
  const [refundEnabled, setRefundEnabled] = useState(true)
  const [refundMax, setRefundMax] = useState('5000')

  // Raw JSON state
  const [activeTab, setActiveTab] = useState<'guided' | 'raw'>('guided')
  const [rawJson, setRawJson] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Load Projects
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true)
      try {
        const res = await fetch('/api/projects')
        if (!res.ok) throw new Error('Failed to load projects')
        const data = await res.json()
        const projs: Project[] = data.projects || []
        setProjects(projs)
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id)
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load projects')
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [])

  // Load Agents when Project changes
  useEffect(() => {
    if (!selectedProjectId) return
    async function loadAgents() {
      setLoadingAgents(true)
      try {
        const res = await fetch(`/api/agents?projectId=${selectedProjectId}`)
        if (!res.ok) throw new Error('Failed to load agents')
        const data = await res.json()
        const ags: Agent[] = data.agents || []
        setAgents(ags)
        if (ags.length > 0) {
          if (!selectedAgentId || !ags.some((a) => a.id === selectedAgentId)) {
            setSelectedAgentId(ags[0].id)
          }
        } else {
          setSelectedAgentId('')
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load agents')
      } finally {
        setLoadingAgents(false)
      }
    }
    loadAgents()
  }, [selectedProjectId])

  // Load Versions when Agent changes
  useEffect(() => {
    if (!selectedAgentId) {
      setVersions([])
      return
    }
    async function loadVersions() {
      setLoadingVersions(true)
      try {
        const res = await fetch(`/api/agents/${selectedAgentId}/versions`)
        if (!res.ok) throw new Error('Failed to load agent versions')
        const data = await res.json()
        const vers: AgentVersion[] = data.versions || []
        setVersions(vers)

        if (vers.length > 0) {
          const latest = vers[vers.length - 1]
          setSelectedVersionId(latest.id)
          populateFormFromVersion(latest)
          setIsNewVersion(false)
        } else {
          setSelectedVersionId('')
          setIsNewVersion(true)
          setVersionLabel('v1.0.0')
          resetDefaultConfig()
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load version history')
      } finally {
        setLoadingVersions(false)
      }
    }
    loadVersions()
  }, [selectedAgentId])

  const resetDefaultConfig = () => {
    setSystemPrompt('You are a helpful AI agent designed to assist users safely.')
    setTaskDomain('customer_support')
    setToolsString('search_order, refund_order')
    setRefundEnabled(true)
    setRefundMax('5000')

    const defaultConfig = {
      tools: ['search_order', 'refund_order'],
      task_domain: 'customer_support',
      allowed_actions: { refund: { enabled: true, maximum: 5000 } },
    }
    setRawJson(JSON.stringify(defaultConfig, null, 2))
    setJsonError(null)
  }

  const populateFormFromVersion = (ver: AgentVersion) => {
    setVersionLabel(ver.version_label)
    setSystemPrompt(ver.system_prompt || '')
    const cfg = (ver.configuration as any) || {}
    setRawJson(JSON.stringify(cfg, null, 2))
    setJsonError(null)

    if (cfg.task_domain) setTaskDomain(cfg.task_domain)
    if (Array.isArray(cfg.tools)) setToolsString(cfg.tools.join(', '))
    if (cfg.allowed_actions?.refund) {
      setRefundEnabled(cfg.allowed_actions.refund.enabled !== false)
      setRefundMax(String(cfg.allowed_actions.refund.maximum || '5000'))
    }
  }

  const handleVersionChange = (val: string) => {
    if (val === 'NEW') {
      setIsNewVersion(true)
      setSelectedVersionId('')
      const nextVer = `v1.${versions.length}.0`
      setVersionLabel(nextVer)
      resetDefaultConfig()
    } else {
      setIsNewVersion(false)
      setSelectedVersionId(val)
      const found = versions.find((v) => v.id === val)
      if (found) populateFormFromVersion(found)
    }
  }

  const buildConfigPayload = (): any => {
    if (activeTab === 'raw') {
      try {
        const parsed = JSON.parse(rawJson)
        setJsonError(null)
        return parsed
      } catch (err: any) {
        setJsonError('Invalid JSON format: ' + err.message)
        throw new Error('Invalid JSON configuration format')
      }
    } else {
      const tools = toolsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      return {
        tools,
        task_domain: taskDomain.trim() || 'general',
        allowed_actions: {
          refund: {
            enabled: refundEnabled,
            maximum: Number(refundMax) || 0,
          },
        },
      }
    }
  }

  const handleSave = async () => {
    if (!selectedAgentId) {
      toast.error('Please select an agent first')
      return
    }

    let configPayload: any
    try {
      configPayload = buildConfigPayload()
    } catch (e: any) {
      toast.error(e.message || 'Fix configuration formatting errors before saving')
      return
    }

    setSaving(true)

    try {
      if (isNewVersion || !selectedVersionId) {
        const res = await fetch(`/api/agents/${selectedAgentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version_label: versionLabel.trim(),
            system_prompt: systemPrompt.trim() || null,
            configuration: configPayload,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save new version')
        toast.success(`Agent version ${versionLabel} deployed!`)

        const reRes = await fetch(`/api/agents/${selectedAgentId}/versions`)
        const reData = await reRes.json()
        const newVers: AgentVersion[] = reData.versions || []
        setVersions(newVers)
        if (data.version?.id) {
          setSelectedVersionId(data.version.id)
          setIsNewVersion(false)
        }
      } else {
        const res = await fetch(
          `/api/agents/${selectedAgentId}/versions/${selectedVersionId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version_label: versionLabel.trim(),
              system_prompt: systemPrompt.trim() || null,
              configuration: configPayload,
            }),
          },
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update version')
        toast.success(`Version ${versionLabel} configuration updated!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving configuration')
    } finally {
      setSaving(false)
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="size-6 text-primary" />
            Agent Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure system prompts, domain boundaries, tool permissions, and security parameters.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || !selectedAgentId}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isNewVersion ? 'Deploy New Version' : 'Save Changes'}
        </Button>
      </div>

      {/* Selectors Bar */}
      <Card className="p-4 bg-card/60 backdrop-blur border-border/60">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Project Selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Project</Label>
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Loader2 className="size-3.5 animate-spin" /> Loading...
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Agent Selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Target Agent</Label>
            {loadingAgents ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Loader2 className="size-3.5 animate-spin" /> Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <p className="text-xs text-amber-500 font-medium mt-2">No connected agents</p>
            ) : (
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.adapter_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Version Selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Active Version</span>
              <span className="text-[10px] text-primary">{versions.length} versions</span>
            </Label>
            {loadingVersions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Loader2 className="size-3.5 animate-spin" /> Loading history...
              </div>
            ) : (
              <select
                value={isNewVersion ? 'NEW' : selectedVersionId}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version_label} (Created {new Date(v.created_at).toLocaleDateString()})
                  </option>
                ))}
                <option value="NEW">+ Create New Version Label</option>
              </select>
            )}
          </div>
        </div>
      </Card>

      {!selectedAgentId ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <Bot className="size-8 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-medium">Select an Agent to Configure</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please connect an agent or select an existing agent to edit prompts and rules.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-medium flex items-center gap-2">
                  <History className="size-4 text-primary" />
                  Version Settings
                </h2>
                {isNewVersion ? (
                  <Badge variant="default">New Version Draft</Badge>
                ) : (
                  <Badge variant="outline">Deployed</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="verLabel">Version Label</Label>
                  <Input
                    id="verLabel"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="e.g. v1.0.0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Adapter Type</Label>
                  <Input value={selectedAgent?.adapter_type || 'mock'} disabled />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-base font-medium flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  System Prompt & Instructions
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Core persona, behavior guidelines, and tone instructions provided to the agent model.
                </p>
              </div>

              <Textarea
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt instructions..."
                className="font-mono text-sm"
              />
            </Card>

            <Card className="p-6 space-y-4">
              <Tabs
                value={activeTab}
                onValueChange={(val: any) => {
                  if (val === 'raw') {
                    try {
                      const cfg = buildConfigPayload()
                      setRawJson(JSON.stringify(cfg, null, 2))
                    } catch {}
                  }
                  setActiveTab(val)
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <h2 className="font-display text-base font-medium">Configuration & Guardrails</h2>
                  </div>

                  <TabsList>
                    <TabsTrigger value="guided" className="flex items-center gap-1.5">
                      <Wrench className="size-3.5" /> Guided
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="flex items-center gap-1.5">
                      <Code className="size-3.5" /> Raw JSON
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="guided" className="pt-4 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="taskDomain">Task Domain</Label>
                    <Input
                      id="taskDomain"
                      value={taskDomain}
                      onChange={(e) => setTaskDomain(e.target.value)}
                      placeholder="e.g. customer_support, finance, e_commerce"
                    />
                    <p className="text-xs text-muted-foreground">
                      Defines the domain scope evaluated during safety and hallucination tests.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tools">Allowed Tools (Comma separated)</Label>
                    <Input
                      id="tools"
                      value={toolsString}
                      onChange={(e) => setToolsString(e.target.value)}
                      placeholder="search_order, refund_order, send_email"
                    />
                  </div>

                  <div className="p-4 rounded-lg border border-border/60 bg-secondary/30 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Action Permissions & Thresholds
                    </h4>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Refund Action Enabled</Label>
                        <p className="text-xs text-muted-foreground">
                          Allows agent to initiate customer refund requests
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={refundEnabled}
                        onChange={(e) => setRefundEnabled(e.target.checked)}
                        className="size-4 rounded border-input bg-background accent-primary"
                      />
                    </div>

                    {refundEnabled && (
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <Label htmlFor="refundMax">Maximum Refund Limit ($)</Label>
                        <Input
                          id="refundMax"
                          type="number"
                          value={refundMax}
                          onChange={(e) => setRefundMax(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="pt-4 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="font-mono">JSON Configuration Object</Label>
                    {jsonError ? (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        <AlertTriangle className="size-3.5" /> {jsonError}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <ShieldCheck className="size-3.5" /> Valid JSON
                      </span>
                    )}
                  </div>

                  <Textarea
                    rows={12}
                    value={rawJson}
                    onChange={(e) => {
                      setRawJson(e.target.value)
                      try {
                        JSON.parse(e.target.value)
                        setJsonError(null)
                      } catch (err: any) {
                        setJsonError(err.message)
                      }
                    }}
                    className="font-mono text-xs"
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 space-y-4 bg-card/60 backdrop-blur">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                Security Screening
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Raw API Key Shielding</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">JSON Structure Check</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                    Enforced
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">RLS Policy Protection</span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                    Owner Restricted
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Active Configuration Preview
              </h3>

              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Target Agent</span>
                <p className="text-sm font-medium text-foreground">{selectedAgent?.name || 'N/A'}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Version</span>
                <p className="text-sm font-mono text-primary font-semibold">{versionLabel}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Task Domain</span>
                <Badge variant="secondary" className="capitalize">
                  {taskDomain}
                </Badge>
              </div>

              <div className="pt-4">
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {isNewVersion ? 'Deploy New Version' : 'Save Changes'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConfigurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-6 animate-spin text-primary" /> Loading configuration...
        </div>
      }
    >
      <ConfigureContent />
    </Suspense>
  )
}
