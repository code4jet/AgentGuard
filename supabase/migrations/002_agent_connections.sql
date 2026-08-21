create table public.agent_connections (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.agents(id) on delete cascade,
  connection_type text not null check (connection_type in ('mock', 'http_webhook', 'openai_assistant', 'custom_api')),
  provider text,
  model text,
  assistant_id text,
  endpoint_url text,
  http_method text not null default 'POST' check (http_method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  authentication_type text not null default 'none' check (authentication_type in ('none', 'api_key_reference', 'bearer_reference', 'provider_key_reference')),
  request_headers jsonb not null default '{}'::jsonb,
  request_body_template jsonb not null default '{}'::jsonb,
  credential_reference text,
  timeout_ms integer not null default 10000 check (timeout_ms between 1000 and 120000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint endpoint_required_for_network_connections check (
    connection_type in ('mock', 'openai_assistant') or endpoint_url is not null
  ),
  constraint credentials_required_for_authenticated_connections check (
    authentication_type = 'none' or credential_reference is not null
  )
);

create index agent_connections_agent_id_idx on public.agent_connections(agent_id);

alter table public.agent_connections enable row level security;

create policy "agent owners can manage connections" on public.agent_connections
  for all using (
    exists (
      select 1
      from public.agents a
      join public.projects p on p.id = a.project_id
      where a.id = agent_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.agents a
      join public.projects p on p.id = a.project_id
      where a.id = agent_id and p.owner_id = auth.uid()
    )
  );
