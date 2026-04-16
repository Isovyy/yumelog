// GET  /api/archive/[slug]        — fetch published archive data
// PUT  /api/archive/[slug]        — publish (requires password)
// POST /api/archive/[slug]/verify — verify password

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: Promise<{ slug: string }> }

// ── GET — fetch published archive data ─────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params

  const { data, error } = await supabaseAdmin
    .from('archives')
    .select('slug, data_published, updated_at')
    .eq('slug', slug)
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  return NextResponse.json(data)
}

// ── PUT — publish archive data ──────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { password, data } = await req.json()

  if (!password || !data)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: archive, error } = await supabaseAdmin
    .from('archives')
    .select('password_hash')
    .eq('slug', slug)
    .single()

  if (error || !archive)
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  const valid = await bcrypt.compare(password, archive.password_hash)
  if (!valid)
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })

  const { error: updateError } = await supabaseAdmin
    .from('archives')
    .update({ data_published: data })
    .eq('slug', slug)

  if (updateError)
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// ── POST — verify password ──────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { password } = await req.json()

  const { data: archive, error } = await supabaseAdmin
    .from('archives')
    .select('password_hash')
    .eq('slug', slug)
    .single()

  if (error || !archive)
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  const valid = await bcrypt.compare(password, archive.password_hash)
  if (!valid)
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })

  return NextResponse.json({ ok: true })
}
