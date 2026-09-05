'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f6f7f3', color: '#102719' }}>
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Farm Machine Specs
          </p>
          <h1 style={{ margin: '0 0 18px', fontSize: 'clamp(32px, 6vw, 56px)', lineHeight: 1.05 }}>
            The site could not finish loading
          </h1>
          <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6 }}>
            A temporary application error interrupted the request. Retry the page first. If the problem continues, return to the catalog home page and try again.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ border: 0, borderRadius: 10, padding: '13px 18px', fontWeight: 800, cursor: 'pointer', background: '#1f6b3a', color: '#fff' }}
            >
              Retry
            </button>
            <a
              href="/"
              style={{ borderRadius: 10, padding: '13px 18px', fontWeight: 800, textDecoration: 'none', background: '#fff', color: '#102719', border: '1px solid #d9ded7' }}
            >
              Return home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
