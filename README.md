# AgentGuard

> **Trust, before you ship.**

AgentGuard is a reliability and safety control plane for AI agents. It gives teams one place to register agents, create immutable versions, define evaluation scenarios, and build the evidence needed to decide whether an agent is ready for production.

Built for the hackathon as a focused MVP, AgentGuard combines a high-signal reliability dashboard with a Supabase-backed foundation for agent configuration and evaluation workflows.

## The Problem

AI agents can look impressive in a happy-path demo and still fail in production. They may hallucinate, misuse tools, expose sensitive information, or behave differently after a prompt or model change. Teams need a repeatable way to test agent behavior before every release, not another manual checklist.

## Our Solution

AgentGuard turns agent quality into a visible, versioned workflow:

1. Create a project and register an agent.
2. Configure a version with its system prompt, adapter, tools, and guardrails.
3. Define scenarios that represent realistic, adversarial, and destructive behavior.
4. Run evaluations and capture results, tool traces, failures, and evidence.
5. Track reliability over time and compare versions before promotion.

## Hackathon Highlights

- **Agent workspace:** Manage projects and connected agents from a dedicated UI.
- **Version-aware configuration:** Save multiple agent versions with prompts and structured JSON configuration.
- **Safety-first validation:** Reject malformed configuration and secret-like values before they are persisted.
- **Reliability dashboard:** Surface score, trend, failure distribution, and recent evaluation activity.
- **Evaluation-ready data model:** Projects, agents, versions, scenarios, runs, results, tool traces, and failures are modeled in Supabase.
- **Secure by default:** Authenticated API routes and Supabase row-level security keep project data scoped to its owner.
- **Designed for extension:** Adapter types make it possible to connect different agent runtimes without changing the core workflow.

## Current MVP Scope

Implemented today:

- Landing page and product preview
- Login and authenticated application shell
- Dashboard with reliability and run visualizations
- Project and agent creation, listing, editing, and deletion
- Agent version creation and version history
- Guided configuration and raw JSON configuration modes
- API routes for projects, agents, versions, scenarios, and evaluation runs
- Supabase schema, repositories, authentication helpers, and RLS policies

The next product slice is the execution engine: connect an adapter to a live agent, run scenarios, capture tool traces, classify failures, and generate a persisted evaluation report. The current dashboard includes demo metrics while that execution layer is being wired in.

## Product Walkthrough

1. Open the landing page and select **Get started**.
2. Sign in or create an account through the auth flow.
3. Open **Agents** and create a project.
4. Add an agent and choose its adapter type.
5. Open configuration, add a system prompt, define tools and safety limits, then save a version.
6. Use the dashboard as the review surface for reliability signals and recent runs.

## Architecture

```text
Next.js App Router
	|
	+-- Server-rendered dashboard and application shell
	+-- Client configuration workflows
	+-- Protected REST route handlers
				|
				+-- Repository layer
				+-- Supabase Auth + SSR session handling
				+-- PostgreSQL schema with Row Level Security
```

### Main technologies

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4 and shadcn-style UI primitives
- Supabase Auth and PostgreSQL
- Recharts for dashboard visualization
- pnpm for package management

## Repository Structure

```text
app/
  (app)/agents/                Agent management and configuration screens
  (app)/dashboard/             Reliability dashboard
  api/                         Projects, agents, scenarios, and run endpoints
  auth/                        Supabase auth callback
components/               Application, dashboard, auth, landing, and UI components
lib/
  db/                          Supabase repository functions
  domain/                      Shared domain types
  supabase/                    Browser, server, and auth clients
  validation/                  Agent configuration validation
supabase/migrations/      Database schema and RLS policies
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- A Supabase project

### Install

```bash
pnpm install
```

### Configure environment

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Apply `supabase/migrations/001_agentguard_foundation.sql` in the Supabase SQL editor, then start the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production check

```bash
pnpm build
pnpm start
```

## API Surface

All data routes require an authenticated Supabase session.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/projects` | List or create projects |
| `GET` / `POST` | `/api/agents` | List or create agents for a project |
| `GET` / `PATCH` / `DELETE` | `/api/agents/:agentId` | Read, update, or remove an agent |
| `GET` / `POST` | `/api/agents/:agentId/versions` | List or create agent versions |
| `GET` / `PATCH` / `DELETE` | `/api/agents/:agentId/versions/:versionId` | Manage a specific version |
| `GET` / `POST` | `/api/scenarios` | List or create evaluation scenarios |
| `POST` | `/api/evaluation-runs` | Create an evaluation run |

## Security Notes

- Supabase Row Level Security is enabled for every core data table.
- Ownership is enforced through project relationships and `auth.uid()` policies.
- Agent configuration is validated as JSON before persistence.
- Common secret and token patterns are rejected from configuration payloads.
- Service credentials should remain server-side; only the public Supabase URL and anon key belong in `.env.local`.

## Roadmap

- Connect real agent adapters and sandboxed tool execution
- Stream run progress and capture ordered tool traces
- Add scenario generation and reusable scenario libraries
- Classify failures with evidence and severity
- Add version-to-version regression comparisons
- Persist dashboard metrics and generate shareable evaluation reports
- Add CI gating so unsafe or regressed versions cannot be promoted

## Why AgentGuard

AgentGuard is built around a simple release principle: an agent should earn trust through evidence. By making prompts, configurations, scenarios, runs, traces, and failures version-aware, teams can move from "the demo looked good" to an auditable decision about production readiness.
