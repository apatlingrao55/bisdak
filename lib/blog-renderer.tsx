import React from 'react'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function applyInlineMarkdown(line: string): string {
  // Escape HTML first, then apply safe markdown transformations
  const escaped = escapeHtml(line)
  const withLinks = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    // Only allow http/https links
    if (!/^https?:\/\//.test(url)) return text
    return `<a href="${url}" style="color:#36F4A4;text-decoration:none;">${text}</a>`
  })
  const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return withBold.replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function renderContent(content: string): React.ReactNode[] {
  const lines = content.split('\n')
  const out: React.ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    const items = listBuffer
    listBuffer = []
    out.push(
      <ul key={`ul-${out.length}`} style={{ color: '#A1A1AA', fontSize: '18px', lineHeight: 1.7, margin: '8px 0 16px', paddingLeft: '24px' }}>
        {items.map((item, j) => (
          <li key={j} style={{ margin: '0 0 6px' }} dangerouslySetInnerHTML={{ __html: applyInlineMarkdown(item) }} />
        ))}
      </ul>
    )
  }

  lines.forEach((line, i) => {
    // List item — buffer consecutive `- ` lines into a single <ul>
    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
      return
    }
    // Any non-list line closes the current list
    flushList()

    if (line.startsWith('**') && line.endsWith('**')) {
      out.push(
        <h3 key={i} style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, margin: '32px 0 12px' }}>{line.slice(2, -2)}</h3>
      )
      return
    }
    if (line.startsWith('---')) {
      out.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #1E2C31', margin: '32px 0' }} />)
      return
    }
    if (line.startsWith('> ')) {
      out.push(
        <blockquote
          key={i}
          style={{
            color: '#A1A1AA',
            fontSize: '18px',
            lineHeight: 1.7,
            margin: '16px 0',
            padding: '4px 0 4px 20px',
            borderLeft: '3px solid #36F4A4',
            fontStyle: 'italic',
          }}
          dangerouslySetInnerHTML={{ __html: applyInlineMarkdown(line.slice(2)) }}
        />
      )
      return
    }
    if (line.trim() === '') {
      out.push(<div key={i} style={{ height: '12px' }} />)
      return
    }
    out.push(
      <p
        key={i}
        style={{ color: '#A1A1AA', fontSize: '18px', lineHeight: 1.7, margin: '0 0 4px' }}
        dangerouslySetInnerHTML={{ __html: applyInlineMarkdown(line) }}
      />
    )
  })

  flushList()

  out.push(<LegalDisclaimer key="legal-disclaimer" />)

  return out
}

const LINK_STYLE: React.CSSProperties = { color: '#36F4A4', textDecoration: 'none' }

export function LegalDisclaimer() {
  return (
    <aside
      style={{
        marginTop: '48px',
        background: '#0A1416',
        border: '1px solid #1E2C31',
        borderRadius: '12px',
        padding: '20px 24px',
        fontSize: '14px',
        lineHeight: 1.6,
        color: '#71717A',
      }}
    >
      <strong style={{ color: '#A1A1AA' }}>Disclaimer.</strong>{' '}
      This article is general information only — not legal, immigration,
      financial, or medical advice. Rules change; verify the current position
      with the relevant official source (
      <a href="https://immigration.govt.nz" target="_blank" rel="noopener" style={LINK_STYLE}>immigration.govt.nz</a>,{' '}
      <a href="https://employment.govt.nz" target="_blank" rel="noopener" style={LINK_STYLE}>employment.govt.nz</a>,{' '}
      the <a href="https://philembassy.org.nz" target="_blank" rel="noopener" style={LINK_STYLE}>Philippine Embassy in NZ</a>
      ) and consult a licensed adviser before acting on anything specific to
      your situation.
    </aside>
  )
}
