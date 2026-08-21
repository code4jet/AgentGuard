import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  Agent,
  AgentConnection,
  AgentVersion,
  CreateAgentConnectionInput,
  EvaluationRun,
  Failure,
  Project,
  Scenario,
  TestResult,
  ToolTrace,
  UpdateAgentConnectionInput,
} from '@/lib/domain/types'

async function getClient() {
  return createSupabaseServerClient()
}

export async function createProject(input: { name: string; ownerId: string }) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: input.name, owner_id: input.ownerId })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function getProject(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('projects').select().eq('id', id).maybeSingle()
  if (error) throw error
  return data as Project | null
}

export async function listProjects(ownerId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('projects').select().eq('owner_id', ownerId).order('created_at')
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function createAgent(input: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('agents').insert(input).select().single()
  if (error) throw error
  return data as Agent
}

export async function getAgent(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('agents').select().eq('id', id).maybeSingle()
  if (error) throw error
  return data as Agent | null
}

export async function listAgents(projectId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('agents').select().eq('project_id', projectId).order('created_at')
  if (error) throw error
  return (data ?? []) as Agent[]
}

export async function updateAgent(
  id: string,
  input: Partial<Omit<Agent, 'id' | 'project_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('agents')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Agent
}

export async function deleteAgent(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from('agents').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function createAgentConnection(input: CreateAgentConnectionInput) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('agent_connections')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as AgentConnection
}

export async function getAgentConnection(agentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('agent_connections')
    .select()
    .eq('agent_id', agentId)
    .maybeSingle()
  if (error) throw error
  return data as AgentConnection | null
}

export async function listAgentConnections(agentIds: string[]) {
  if (agentIds.length === 0) return [] as AgentConnection[]
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('agent_connections')
    .select()
    .in('agent_id', agentIds)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as AgentConnection[]
}

export async function updateAgentConnection(agentId: string, input: UpdateAgentConnectionInput) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('agent_connections')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('agent_id', agentId)
    .select()
    .single()
  if (error) throw error
  return data as AgentConnection
}

export async function deleteAgentConnection(agentId: string) {
  const supabase = await getClient()
  const { error } = await supabase.from('agent_connections').delete().eq('agent_id', agentId)
  if (error) throw error
  return true
}


export async function createAgentVersion(input: Omit<AgentVersion, 'id' | 'created_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('agent_versions').insert(input).select().single()
  if (error) throw error
  return data as AgentVersion
}

export async function listAgentVersions(agentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('agent_versions').select().eq('agent_id', agentId).order('created_at')
  if (error) throw error
  return (data ?? []) as AgentVersion[]
}

export async function getAgentVersion(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('agent_versions').select().eq('id', id).maybeSingle()
  if (error) throw error
  return data as AgentVersion | null
}

export async function updateAgentVersion(
  id: string,
  input: Partial<Omit<AgentVersion, 'id' | 'agent_id' | 'created_at'>>
) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('agent_versions')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as AgentVersion
}


export async function createScenario(input: Omit<Scenario, 'id' | 'created_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('scenarios').insert(input).select().single()
  if (error) throw error
  return data as Scenario
}

export async function listScenarios(agentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('scenarios').select().eq('agent_id', agentId).order('created_at')
  if (error) throw error
  return (data ?? []) as Scenario[]
}

export async function createEvaluationRun(input: Omit<EvaluationRun, 'id' | 'created_at' | 'started_at' | 'completed_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('evaluation_runs').insert(input).select().single()
  if (error) throw error
  return data as EvaluationRun
}

export async function getLatestEvaluationRun(input: { projectId: string; agentId: string; versionId: string }) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('evaluation_runs')
    .select()
    .eq('project_id', input.projectId)
    .eq('agent_id', input.agentId)
    .eq('agent_version_id', input.versionId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as EvaluationRun | null
}

export async function listCompletedEvaluationRunsByAgent(agentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('evaluation_runs')
    .select()
    .eq('agent_id', agentId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EvaluationRun[]
}

export async function listTestResults(evaluationRunId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('test_results')
    .select()
    .eq('evaluation_run_id', evaluationRunId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as TestResult[]
}

export async function listToolTraces(testResultIds: string[]) {
  if (testResultIds.length === 0) return [] as ToolTrace[]
  const supabase = await getClient()
  const { data, error } = await supabase
    .from('tool_traces')
    .select()
    .in('test_result_id', testResultIds)
    .order('sequence_number')
  if (error) throw error
  return (data ?? []) as ToolTrace[]
}

export async function updateEvaluationRun(id: string, input: Partial<Pick<EvaluationRun, 'status' | 'started_at' | 'completed_at'>>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('evaluation_runs').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as EvaluationRun
}

export async function saveTestResult(input: Omit<TestResult, 'id' | 'created_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('test_results').insert(input).select().single()
  if (error) throw error
  return data as TestResult
}

export async function saveToolTrace(input: Omit<ToolTrace, 'id' | 'created_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('tool_traces').insert(input).select().single()
  if (error) throw error
  return data as ToolTrace
}

export async function saveFailure(input: Omit<Failure, 'id' | 'created_at'>) {
  const supabase = await getClient()
  const { data, error } = await supabase.from('failures').insert(input).select().single()
  if (error) throw error
  return data as Failure
}
