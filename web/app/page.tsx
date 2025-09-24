import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container">
      <div className="card text-center fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            🏥 DrMedra Medical Assistant
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            AI-powered medical consultations with real-time streaming responses
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card" style={{ padding: '1.5rem', background: 'var(--secondary-color)' }}>
            <div className="text-2xl mb-2">🤖</div>
            <div className="font-semibold mb-1">AI Consultations</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Real-time medical advice
            </div>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', background: 'var(--secondary-color)' }}>
            <div className="text-2xl mb-2">👥</div>
            <div className="font-semibold mb-1">Patient Management</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Comprehensive records
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Link href="/login" className="btn btn-primary">
            🔑 Get Started
          </Link>
          
          <Link href="/patients" className="btn btn-secondary">
            👨‍⚕️ View Patients
          </Link>
        </div>
        
        <div className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          ⚠️ For educational purposes only. Always consult healthcare professionals.
        </div>
      </div>
    </div>
  )
}
