import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { createProject, listProjects } from '@/lib/db/repositories'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ projects: await listProjects(user.id) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'A project name is required' }, { status: 400 })
  }

  return NextResponse.json(
    { project: await createProject({ name: body.name.trim(), ownerId: user.id }) },
    { status: 201 },
  )
}
