'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plug,
  Plus,
  SlidersHorizontal,
  Trash2,
  Edit,
  Building,
  CheckCircle2,
  Bot,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { Agent, Project } from '@/lib/domain/types'

export default function AgentsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)

  // New project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  // New agent modal state
  const [showNewAgentModal, setShowNewAgentModal] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [agentDesc, setAgentDesc] = useState('')
  const [adapterType, setAdapterType] = useState('mock')
  const [creatingAgent, setCreatingAgent] = useState(false)

  // Edit agent modal state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editAdapter, setEditAdapter] = useState('mock')
  const [updatingAgent, setUpdatingAgent] = useState(false)

  const [connectionConfig, setConnectionConfig] = useState({
    endpoint_url: '',
    http_method: 'POST',
    authentication_type: 'none',
    credential_reference: '',
    request_headers: '{}',
    request_body_template: '{}',
    timeout_ms: '10000',
    provider: '',
    model: '',
    assistant_id: '',
  })
  const [connectionLoading, setConnectionLoading] = useState(false)
  const [connectionTesting, setConnectionTesting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const resetConnectionConfig = () => {
    setConnectionConfig({
      endpoint_url: '',
      http_method: 'POST',
      authentication_type: 'none',
      credential_reference: '',
      request_headers: '{}',
      request_body_template: '{}',
      timeout_ms: '10000',
      provider: '',
      model: '',
      assistant_id: '',
    })
    setConnectionError(null)
  }

  const readJsonObjectField = (raw: string, fieldName: string) => {
    const value = raw.trim()
    if (!value) return {}
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`${fieldName} must be a JSON object`)
      }
      return parsed
    } catch (error: any) {
      throw new Error(`${fieldName} is invalid JSON: ${error.message || 'Bad JSON'}`)
    }
  }

  const buildConnectionPayload = (agentId: string, type: string) => {
    const timeoutMs = Number(connectionConfig.timeout_ms)
    const basePayload: Record<string, any> = {
      agent_id: agentId,
      connection_type: type,
      http_method: connectionConfig.http_method || 'POST',
      authentication_type: connectionConfig.authentication_type || 'none',
      timeout_ms: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
    }

    if (type === 'mock') {
      return {
        ...basePayload,
        connection_type: 'mock',
        authentication_type: 'none',
        endpoint_url: null,
        credential_reference: null,
        request_headers: {},
        request_body_template: {},
      }
    }

    if (type === 'http_webhook' || type === 'custom_api') {
      if (!connectionConfig.endpoint_url.trim()) {
        throw new Error('Endpoint URL is required for HTTP-based connections')
      }
      const requestHeaders = readJsonObjectField(connectionConfig.request_headers, 'Request Headers')
      const requestBodyTemplate = readJsonObjectField(
        connectionConfig.request_body_template,
        'Request Body Template',
      )
      return {
        ...basePayload,
        endpoint_url: connectionConfig.endpoint_url.trim(),
        request_headers: requestHeaders,
        request_body_template: requestBodyTemplate,
        credential_reference: connectionConfig.credential_reference.trim() || null,
      }
    }

    if (type === 'openai_assistant') {
      const provider = connectionConfig.provider.trim()
      const model = connectionConfig.model.trim()
      const assistantId = connectionConfig.assistant_id.trim()
      if (!provider && !model && !assistantId) {
        throw new Error('Provide a provider, model, or assistant ID for the OpenAI connection')
      }
      return {
        ...basePayload,
        provider: provider || null,
        model: model || null,
        assistant_id: assistantId || null,
        endpoint_url: null,
        credential_reference: connectionConfig.credential_reference.trim() || null,
        request_headers: {},
        request_body_template: {},
      }
    }

    return basePayload
  }

  const fetchAgentConnection = async (agentId: string) => {
    setConnectionLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/connection`)
      if (!res.ok) {
        if (res.status === 404) {
          resetConnectionConfig()
          return
        }
        throw new Error('Failed to load connection settings')
      }
      const data = await res.json()
      const connection = data.connection
      if (!connection) {
        resetConnectionConfig()
        return
      }

      setConnectionConfig({
        endpoint_url: connection.endpoint_url || '',
        http_method: connection.http_method || 'POST',
        authentication_type: connection.authentication_type || 'none',
        credential_reference: connection.credential_reference || '',
        request_headers: connection.request_headers
          ? JSON.stringify(connection.request_headers, null, 2)
          : '{}',
        request_body_template: connection.request_body_template
          ? JSON.stringify(connection.request_body_template, null, 2)
          : '{}',
        timeout_ms: String(connection.timeout_ms ?? 10000),
        provider: connection.provider || '',
        model: connection.model || '',
        assistant_id: connection.assistant_id || '',
      })
      if (connection.connection_type) {
        setEditAdapter(connection.connection_type)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading connection settings')
    } finally {
      setConnectionLoading(false)
    }
  }

  const handleTestConnection = async (agentId: string, type: string) => {
    setConnectionTesting(true)
    setConnectionError(null)
    try {
      const payload = buildConnectionPayload(agentId, type)
      const res = await fetch(`/api/agents/${agentId}/connection/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection configuration is invalid')
      toast.success(data.message || 'Configuration valid')
    } catch (err: any) {
      toast.error(err.message || 'Test connection failed')
      setConnectionError(err.message || 'Connection configuration is invalid')
    } finally {
      setConnectionTesting(false)
    }
  }

  // Fetch Projects
  const fetchProjects = async () => {
    setLoadingProjects(true)
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to load projects')
      const data = await res.json()
      const projs: Project[] = data.projects || []
      setProjects(projs)
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching projects')
    } finally {
      setLoadingProjects(false)
    }
  }

  // Fetch Agents
  const fetchAgents = async (projectId: string) => {
    if (!projectId) {
      setAgents([])
      return
    }
    setLoadingAgents(true)
    try {
      const res = await fetch(`/api/agents?projectId=${projectId}`)
      if (!res.ok) throw new Error('Failed to load agents')
      const data = await res.json()
      setAgents(data.agents || [])
    } catch (err: any) {
      toast.error(err.message || 'Error fetching agents')
    } finally {
      setLoadingAgents(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchAgents(selectedProjectId)
    }
  }, [selectedProjectId])

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    setCreatingProject(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')
      toast.success('Project created successfully')
      setNewProjectName('')
      setShowNewProjectModal(false)
      await fetchProjects()
      if (data.project?.id) {
        setSelectedProjectId(data.project.id)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating project')
    } finally {
      setCreatingProject(false)
    }
  }

  // Create Agent
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId) {
      toast.error('Please select or create a project first')
      return
    }
    if (!agentName.trim()) return

    setCreatingAgent(true)
    setConnectionError(null)
    try {
      const agentRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: agentName.trim(),
          description: agentDesc.trim() || null,
          adapter_type: adapterType,
        }),
      })
      const agentData = await agentRes.json()
      if (!agentRes.ok) throw new Error(agentData.error || 'Failed to create agent')

      const createdAgent = agentData.agent
      const payload = buildConnectionPayload(createdAgent.id, adapterType)
      const connectionRes = await fetch(`/api/agents/${createdAgent.id}/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const connectionData = await connectionRes.json().catch(() => ({}))
      if (!connectionRes.ok) {
        throw new Error(connectionData.error || 'Failed to create agent connection')
      }

      toast.success('Agent connected successfully')
      setAgentName('')
      setAgentDesc('')
      setAdapterType('mock')
      resetConnectionConfig()
      setShowNewAgentModal(false)
      fetchAgents(selectedProjectId)
    } catch (err: any) {
      toast.error(err.message || 'Error connecting agent')
      setConnectionError(err.message || 'Error connecting agent')
    } finally {
      setCreatingAgent(false)
    }
  }

  // Edit Agent
  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAgent || !editName.trim()) return

    setUpdatingAgent(true)
    setConnectionError(null)
    try {
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
          adapter_type: editAdapter,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update agent')

      const payload = buildConnectionPayload(editingAgent.id, editAdapter)
      const connectionRes = await fetch(`/api/agents/${editingAgent.id}/connection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const connectionData = await connectionRes.json().catch(() => ({}))
      if (!connectionRes.ok) {
        throw new Error(connectionData.error || 'Failed to update agent connection')
      }

      toast.success('Agent updated successfully')
      setEditingAgent(null)
      resetConnectionConfig()
      fetchAgents(selectedProjectId)
    } catch (err: any) {
      toast.error(err.message || 'Error updating agent')
      setConnectionError(err.message || 'Error updating agent')
    } finally {
      setUpdatingAgent(false)
    }
  }

  // Delete Agent
  const handleDeleteAgent = async (agent: Agent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) return

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete agent')
      toast.success('Agent deleted')
      fetchAgents(selectedProjectId)
    } catch (err: any) {
      toast.error(err.message || 'Error deleting agent')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Plug className="size-6 text-primary" />
            Agent Connection
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect, view, and manage your AI agent integrations and backend endpoints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedProjectId && fetchAgents(selectedProjectId)}
            disabled={loadingAgents}
          >
            <RefreshCw className={`size-4 ${loadingAgents ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowNewAgentModal(true)} disabled={!selectedProjectId}>
            <Plus className="size-4" />
            Connect Agent
          </Button>
        </div>
      </div>

      {/* Project Selector Bar */}
      <Card className="p-4 bg-card/60 backdrop-blur border-border/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building className="size-5" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Active Project Context</Label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  <Loader2 className="size-3.5 animate-spin" /> Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <p className="text-sm font-medium text-amber-500 mt-0.5">No projects created yet</p>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="mt-1 block w-64 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowNewProjectModal(true)}>
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </Card>

      {/* Agents Grid */}
      {loadingAgents ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading connected agents...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Building className="size-6" />
            </div>
            <h3 className="font-display text-lg font-medium">No project created</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first project to connect and configure your AI agents.
            </p>
            <Button className="mt-6" onClick={() => setShowNewProjectModal(true)}>
              <Plus className="size-4" />
              Create Project
            </Button>
          </div>
        </Card>
      ) : agents.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Bot className="size-6" />
            </div>
            <h3 className="font-display text-lg font-medium">No agents connected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven&apos;t connected any AI agents to this project yet.
            </p>
            <Button className="mt-6" onClick={() => setShowNewAgentModal(true)}>
              <Plus className="size-4" />
              Connect Agent
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="flex flex-col justify-between p-6 hover:border-primary/50 transition-colors group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Bot className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium mt-0.5">
                        <CheckCircle2 className="size-3.5" />
                        Connected
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="capitalize text-xs">
                    {agent.adapter_type}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-6">
                  {agent.description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {new Date(agent.created_at).toLocaleDateString()}</span>
                  <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                    ID: {agent.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    nativeButton={false}
                    render={<Link href={`/agents/configure?agentId=${agent.id}`} />}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    Configure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setEditingAgent(agent)
                      setEditName(agent.name)
                      setEditDesc(agent.description || '')
                      setEditAdapter(agent.adapter_type)
                      resetConnectionConfig()
                      await fetchAgentConnection(agent.id)
                    }}
                  >
                    <Edit className="size-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAgent(agent)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Create New Project</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowNewProjectModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="e.g. AgentGuard Core Platform"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingProject || !newProjectName.trim()}>
                  {creatingProject ? <Loader2 className="size-4 animate-spin" /> : 'Create Project'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* New Agent Modal */}
      {showNewAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg max-h-[90vh] flex flex-col p-6 space-y-6 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-card">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Plug className="size-5 text-primary" />
                Connect New Agent
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowNewAgentModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateAgent} className="min-h-0 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  placeholder="e.g. Customer Support Bot"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentDesc">Description</Label>
                <Textarea
                  id="agentDesc"
                  placeholder="Describe what this agent does..."
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adapterType">Adapter Type</Label>
                <select
                  id="adapterType"
                  value={adapterType}
                  onChange={(e) => {
                    setAdapterType(e.target.value)
                    if (e.target.value !== 'mock') {
                      setConnectionError(null)
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="mock">Mock Adapter (Built-in Simulator)</option>
                  <option value="http_webhook">HTTP Webhook Endpoint</option>
                  <option value="openai_assistant">OpenAI Assistant API</option>
                  <option value="custom_api">Custom REST API</option>
                </select>
              </div>

              {adapterType !== 'mock' && (
                <div className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3">
                  {(adapterType === 'http_webhook' || adapterType === 'custom_api') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="endpointUrl">Endpoint URL</Label>
                        <Input
                          id="endpointUrl"
                          value={connectionConfig.endpoint_url}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, endpoint_url: e.target.value }))
                          }
                          placeholder="https://company.example/api/agent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="httpMethod">HTTP Method</Label>
                          <select
                            id="httpMethod"
                            value={connectionConfig.http_method}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, http_method: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="timeout_ms">Timeout (ms)</Label>
                          <Input
                            id="timeout_ms"
                            type="number"
                            min={1000}
                            max={120000}
                            value={connectionConfig.timeout_ms}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, timeout_ms: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="authType">Authentication Type</Label>
                        <select
                          id="authType"
                          value={connectionConfig.authentication_type}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              authentication_type: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="none">None</option>
                          <option value="api_key_reference">API Key Reference</option>
                          <option value="bearer_reference">Bearer Reference</option>
                          <option value="provider_key_reference">Provider Key Reference</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="credentialReference">Credential Reference</Label>
                        <Input
                          id="credentialReference"
                          value={connectionConfig.credential_reference}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              credential_reference: e.target.value,
                            }))
                          }
                          placeholder="e.g. company_api_key_ref"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="requestHeaders">Request Headers (JSON)</Label>
                        <Textarea
                          id="requestHeaders"
                          value={connectionConfig.request_headers}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, request_headers: e.target.value }))
                          }
                          rows={3}
                          placeholder='{"Content-Type":"application/json"}'
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="requestBodyTemplate">Request Body Template (JSON)</Label>
                        <Textarea
                          id="requestBodyTemplate"
                          value={connectionConfig.request_body_template}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              request_body_template: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder='{"message":"{{scenario}}"}'
                        />
                      </div>
                    </>
                  )}

                  {adapterType === 'openai_assistant' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Input
                          id="provider"
                          value={connectionConfig.provider}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, provider: e.target.value }))
                          }
                          placeholder="openai"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="model">Model</Label>
                          <Input
                            id="model"
                            value={connectionConfig.model}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, model: e.target.value }))
                            }
                            placeholder="gpt-4o-mini"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="assistantId">Assistant ID</Label>
                          <Input
                            id="assistantId"
                            value={connectionConfig.assistant_id}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, assistant_id: e.target.value }))
                            }
                            placeholder="asst_abc123"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="openAiAuthType">Authentication Type</Label>
                        <select
                          id="openAiAuthType"
                          value={connectionConfig.authentication_type}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              authentication_type: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="none">None</option>
                          <option value="api_key_reference">API Key Reference</option>
                          <option value="bearer_reference">Bearer Reference</option>
                          <option value="provider_key_reference">Provider Key Reference</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="openAiCredentialReference">Credential Reference</Label>
                        <Input
                          id="openAiCredentialReference"
                          value={connectionConfig.credential_reference}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              credential_reference: e.target.value,
                            }))
                          }
                          placeholder="e.g. openai_provider_ref"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="openAiTimeout">Timeout (ms)</Label>
                        <Input
                          id="openAiTimeout"
                          type="number"
                          min={1000}
                          max={120000}
                          value={connectionConfig.timeout_ms}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, timeout_ms: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {connectionError && (
                    <p className="text-xs text-destructive">{connectionError}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewAgentModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingAgent || !agentName.trim()}>
                  {creatingAgent ? <Loader2 className="size-4 animate-spin" /> : 'Connect Agent'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Edit className="size-5 text-primary" />
                Edit Agent
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingAgent(null)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleUpdateAgent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Agent Name</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDesc">Description</Label>
                <Textarea
                  id="editDesc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAdapter">Adapter Type</Label>
                <select
                  id="editAdapter"
                  value={editAdapter}
                  onChange={(e) => {
                    setEditAdapter(e.target.value)
                    setConnectionError(null)
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="mock">Mock Adapter (Built-in Simulator)</option>
                  <option value="http_webhook">HTTP Webhook Endpoint</option>
                  <option value="openai_assistant">OpenAI Assistant API</option>
                  <option value="custom_api">Custom REST API</option>
                </select>
              </div>

              {editAdapter !== 'mock' && (
                <div className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3">
                  {(editAdapter === 'http_webhook' || editAdapter === 'custom_api') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="editEndpointUrl">Endpoint URL</Label>
                        <Input
                          id="editEndpointUrl"
                          value={connectionConfig.endpoint_url}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, endpoint_url: e.target.value }))
                          }
                          placeholder="https://company.example/api/agent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="editHttpMethod">HTTP Method</Label>
                          <select
                            id="editHttpMethod"
                            value={connectionConfig.http_method}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, http_method: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editTimeoutMs">Timeout (ms)</Label>
                          <Input
                            id="editTimeoutMs"
                            type="number"
                            min={1000}
                            max={120000}
                            value={connectionConfig.timeout_ms}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, timeout_ms: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editAuthType">Authentication Type</Label>
                        <select
                          id="editAuthType"
                          value={connectionConfig.authentication_type}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              authentication_type: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="none">None</option>
                          <option value="api_key_reference">API Key Reference</option>
                          <option value="bearer_reference">Bearer Reference</option>
                          <option value="provider_key_reference">Provider Key Reference</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editCredentialReference">Credential Reference</Label>
                        <Input
                          id="editCredentialReference"
                          value={connectionConfig.credential_reference}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              credential_reference: e.target.value,
                            }))
                          }
                          placeholder="e.g. company_api_key_ref"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editRequestHeaders">Request Headers (JSON)</Label>
                        <Textarea
                          id="editRequestHeaders"
                          value={connectionConfig.request_headers}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, request_headers: e.target.value }))
                          }
                          rows={3}
                          placeholder='{"Content-Type":"application/json"}'
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editRequestBodyTemplate">Request Body Template (JSON)</Label>
                        <Textarea
                          id="editRequestBodyTemplate"
                          value={connectionConfig.request_body_template}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              request_body_template: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder='{"message":"{{scenario}}"}'
                        />
                      </div>
                    </>
                  )}

                  {editAdapter === 'openai_assistant' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="editProvider">Provider</Label>
                        <Input
                          id="editProvider"
                          value={connectionConfig.provider}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, provider: e.target.value }))
                          }
                          placeholder="openai"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="editModel">Model</Label>
                          <Input
                            id="editModel"
                            value={connectionConfig.model}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, model: e.target.value }))
                            }
                            placeholder="gpt-4o-mini"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editAssistantId">Assistant ID</Label>
                          <Input
                            id="editAssistantId"
                            value={connectionConfig.assistant_id}
                            onChange={(e) =>
                              setConnectionConfig((prev) => ({ ...prev, assistant_id: e.target.value }))
                            }
                            placeholder="asst_abc123"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editOpenAiAuthType">Authentication Type</Label>
                        <select
                          id="editOpenAiAuthType"
                          value={connectionConfig.authentication_type}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              authentication_type: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="none">None</option>
                          <option value="api_key_reference">API Key Reference</option>
                          <option value="bearer_reference">Bearer Reference</option>
                          <option value="provider_key_reference">Provider Key Reference</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editOpenAiCredentialReference">Credential Reference</Label>
                        <Input
                          id="editOpenAiCredentialReference"
                          value={connectionConfig.credential_reference}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({
                              ...prev,
                              credential_reference: e.target.value,
                            }))
                          }
                          placeholder="e.g. openai_provider_ref"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editOpenAiTimeout">Timeout (ms)</Label>
                        <Input
                          id="editOpenAiTimeout"
                          type="number"
                          min={1000}
                          max={120000}
                          value={connectionConfig.timeout_ms}
                          onChange={(e) =>
                            setConnectionConfig((prev) => ({ ...prev, timeout_ms: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {connectionError && (
                    <p className="text-xs text-destructive">{connectionError}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAgent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleTestConnection(editingAgent.id, editAdapter)}
                  disabled={connectionTesting || !editingAgent}
                >
                  {connectionTesting ? <Loader2 className="size-4 animate-spin" /> : 'Test Connection'}
                </Button>
                <Button type="submit" disabled={updatingAgent || !editName.trim()}>
                  {updatingAgent ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
