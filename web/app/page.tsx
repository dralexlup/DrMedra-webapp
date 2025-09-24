import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>MedraN Medical Assistant</h1>
      <p>Welcome to the MedraN platform</p>
      
      <div style={{ marginTop: '2rem' }}>
        <Link href="/login" style={{ 
          display: 'inline-block', 
          padding: '10px 20px', 
          backgroundColor: '#0070f3',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          marginRight: '1rem'
        }}>
          Login
        </Link>
        
        <Link href="/patients" style={{ 
          display: 'inline-block', 
          padding: '10px 20px', 
          backgroundColor: '#28a745',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}>
          Patients
        </Link>
      </div>
    </div>
  )
}