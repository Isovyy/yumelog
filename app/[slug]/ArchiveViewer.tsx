'use client'

import { useEffect } from 'react'
import Script from 'next/script'

type Props = { slug: string; published: any }

export default function ArchiveViewer({ slug, published }: Props) {
  useEffect(() => {
    document.body.classList.add('preview-mode')
    return () => document.body.classList.remove('preview-mode')
  }, [])

  return (
    <>
      <link rel="stylesheet" href="/builder.css" />
      <Script
        src="/builder.js"
        strategy="afterInteractive"
        onReady={() => {
          document.body.classList.add('preview-mode')
          ;(window as any).initViewer(slug, published)
        }}
      />
      <div className="page" id="page">
        {!published && (
          <p style={{ textAlign: 'center', color: '#888', padding: '4rem 1rem', fontFamily: 'system-ui' }}>
            This archive hasn&apos;t been published yet.
          </p>
        )}
      </div>
    </>
  )
}
