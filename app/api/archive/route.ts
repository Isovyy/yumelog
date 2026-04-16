// POST /api/archive — create a new anonymous archive
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

const SLUG_RE = /^[a-z0-9-]{3,60}$/

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json()

  if (!SLUG_RE.test(slug))
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })

  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Password too short' }, { status: 400 })

  // Check slug is available
  const { data: existing } = await supabaseAdmin
    .from('archives')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (existing)
    return NextResponse.json({ error: 'That URL is already taken' }, { status: 409 })

  const password_hash = await bcrypt.hash(password, 12)

  const { error } = await supabaseAdmin
    .from('archives')
    .insert({ slug, password_hash })

  if (error)
    return NextResponse.json({ error: 'Failed to create archive' }, { status: 500 })

  return NextResponse.json({ slug }, { status: 201 })
}
