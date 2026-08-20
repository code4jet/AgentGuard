create extension if not exists "pgcrypto";

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  adapter_type text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  version_label text not null,
  system_prompt text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agent_id, version_label)
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid references public.agent_versions(id) on delete set null,
  category text not null,
  title text not null,
  prompt text not null,
  expected_behavior text,
  is_destructive boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid not null references public.agent_versions(id) on delete restrict,
  status text not null default 'created' check (status in ('created', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  evaluation_run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete restrict,
  status text not null check (status in ('passed', 'failed', 'blocked', 'error')),
  raw_input text,
  raw_output text,
  created_at timestamptz not null default now()
);

create table public.tool_traces (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references public.test_results(id) on delete cascade,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  response jsonb,
  sequence_number integer not null default 0,
  blocked boolean not null default false,
  unsafe boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.failures (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references public.test_results(id) on delete cascade,
  category text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  evidence text,
  created_at timestamptz not null default now()
);

create index agents_project_id_idx on public.agents(project_id);
create index agent_versions_agent_id_idx on public.agent_versions(agent_id);
create index scenarios_agent_id_idx on public.scenarios(agent_id);
create index evaluation_runs_project_id_idx on public.evaluation_runs(project_id);
create index test_results_evaluation_run_id_idx on public.test_results(evaluation_run_id);
create index tool_traces_test_result_id_idx on public.tool_traces(test_result_id);
create index failures_test_result_id_idx on public.failures(test_result_id);

alter table public.projects enable row level security;
alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;
alter table public.scenarios enable row level security;
alter table public.evaluation_runs enable row level security;
alter table public.test_results enable row level security;
alter table public.tool_traces enable row level security;
alter table public.failures enable row level security;

create policy "owners can manage projects" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "project owners can manage agents" on public.agents
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "agent owners can manage versions" on public.agent_versions
  for all using (exists (select 1 from public.agents a join public.projects p on p.id = a.project_id where a.id = agent_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.agents a join public.projects p on p.id = a.project_id where a.id = agent_id and p.owner_id = auth.uid()));

create policy "project owners can manage scenarios" on public.scenarios
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "project owners can manage evaluation runs" on public.evaluation_runs
  for all using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "run owners can manage test results" on public.test_results
  for all using (exists (select 1 from public.evaluation_runs r join public.projects p on p.id = r.project_id where r.id = evaluation_run_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.evaluation_runs r join public.projects p on p.id = r.project_id where r.id = evaluation_run_id and p.owner_id = auth.uid()));

create policy "result owners can manage tool traces" on public.tool_traces
  for all using (exists (select 1 from public.test_results tr join public.evaluation_runs r on r.id = tr.evaluation_run_id join public.projects p on p.id = r.project_id where tr.id = test_result_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.test_results tr join public.evaluation_runs r on r.id = tr.evaluation_run_id join public.projects p on p.id = r.project_id where tr.id = test_result_id and p.owner_id = auth.uid()));

create policy "result owners can manage failures" on public.failures
  for all using (exists (select 1 from public.test_results tr join public.evaluation_runs r on r.id = tr.evaluation_run_id join public.projects p on p.id = r.project_id where tr.id = test_result_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.test_results tr join public.evaluation_runs r on r.id = tr.evaluation_run_id join public.projects p on p.id = r.project_id where tr.id = test_result_id and p.owner_id = auth.uid()));
