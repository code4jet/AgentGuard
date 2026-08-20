export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EvaluationRunStatus = 'created' | 'running' | 'completed' | 'failed'
export type TestResultStatus = 'passed' | 'failed' | 'blocked' | 'error'
export type FailureSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Project {
  id: string
  owner_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  project_id: string
  name: string
  description: string | null
  adapter_type: string
  created_at: string
  updated_at: string
}

export interface AgentVersion {
  id: string
  agent_id: string
  version_label: string
  system_prompt: string | null
  configuration: Json
  created_at: string
}

export interface Scenario {
  id: string
  project_id: string
  agent_id: string
  agent_version_id: string | null
  category: string
  title: string
  prompt: string
  expected_behavior: string | null
  is_destructive: boolean
  created_at: string
}

export interface EvaluationRun {
  id: string
  project_id: string
  agent_id: string
  agent_version_id: string
  status: EvaluationRunStatus
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface TestResult {
  id: string
  evaluation_run_id: string
  scenario_id: string
  status: TestResultStatus
  raw_input: string | null
  raw_output: string | null
  created_at: string
}

export interface ToolTrace {
  id: string
  test_result_id: string
  tool_name: string
  arguments: Json
  response: Json | null
  sequence_number: number
  blocked: boolean
  unsafe: boolean
  created_at: string
}

export interface Failure {
  id: string
  test_result_id: string
  category: string
  severity: FailureSeverity
  evidence: string | null
  created_at: string
}
