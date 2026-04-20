import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ArchiveViewer from './ArchiveViewer'

type Props = { params: Promise<{ slug: string }> }

export default async function ArchivePage({ params }: Props) {
  const { slug } = await params

  const { data, error } = await supabaseAdmin
    .from('archives')
    .select('slug, data_published')
    .eq('slug', slug)
    .single()

  if (error || !data) notFound()

  return <ArchiveViewer slug={slug} published={data.data_published} />
}
