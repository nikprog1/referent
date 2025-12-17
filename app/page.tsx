export default function Home() {
  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Welcome to Referent
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666' }}>
        A minimal Next.js application
      </p>
    </main>
  )
}

