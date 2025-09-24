"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, login, register } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/patients');
    }
  }, [user, router]);

  async function doLogin(e: any) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await login(email, password);
      router.push('/patients');
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }
  
  async function doRegister() {
    if (!email || !password) {
      setError("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await register(email, password, name);
      router.push('/patients');
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      doLogin(e);
    }
  };

  return (
    <div className="container">
      <div className="card fade-in" style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-color)' }}>
            🏥 Welcome to DrMedra
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to access your medical assistant
          </p>
        </div>
        
        <form onSubmit={doLogin}>
          {error && (
            <div className="mb-4" style={{ 
              padding: '0.75rem', 
              background: '#fef2f2', 
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius)',
              color: 'var(--danger-color)',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label className="label">Email Address</label>
            <input 
              className="input"
              type="email"
              placeholder="doctor@medra.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="label">Password</label>
            <input 
              className="input"
              type="password"
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="label">Full Name <span style={{ color: 'var(--text-secondary)' }}>(for new accounts)</span></label>
            <input 
              className="input"
              type="text"
              placeholder="Dr. Smith" 
              value={name} 
              onChange={e => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '🔄 Signing In...' : '🔑 Sign In'}
            </button>
            
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={doRegister}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '🔄 Creating...' : '🆕 Register'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong>Demo Account:</strong><br/>
            Email: admin@medra.com<br/>
            Password: admin123
          </div>
          
          <div className="mt-4">
            <Link href="/" className="text-sm" style={{ color: 'var(--primary-color)' }}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
