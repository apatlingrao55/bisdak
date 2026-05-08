import Link from 'next/link'

type Category = { id: number; name: string; slug: string; icon: string }

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '16px',
    }}>
      {categories.map(cat => (
        <Link
          key={cat.id}
          href={`/search?category=${cat.slug}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            background: '#061A1C',
            border: '1px solid #1E2C31',
            borderRadius: '9999px',
            padding: '20px 16px',
            textDecoration: 'none',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'center',
            transition: 'border-color 200ms ease, background 200ms ease',
          }}
          className="hover:border-[#36F4A4] hover:bg-[#102620]"
        >
          <span style={{ fontSize: '28px', lineHeight: 1 }}>{cat.icon}</span>
          <span style={{ lineHeight: 1.3 }}>{cat.name}</span>
        </Link>
      ))}
    </div>
  )
}
