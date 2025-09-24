"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from "../../lib/api";

// Declare Google global for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, login, register } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Load Google Sign-In script
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-signin-script')) return;
      
      const script = document.createElement('script');
      script.id = 'google-signin-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
            callback: handleGoogleResponse
          });
        }
      };
    };
    
    loadGoogleScript();
  }, []);

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
      router.push('/');
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
      router.push('/');
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleResponse = async (response: any) => {
    setGoogleLoading(true);
    setError("");
    
    try {
      const result = await api('/auth/google', 'POST', { token: response.credential });
      
      // Store auth info
      localStorage.setItem('token', result.token);
      localStorage.setItem('name', result.name);
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In is not available');
    }
  };

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
        
        {/* Divider */}
        <div className="flex items-center mt-6 mb-6">
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span className="px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>
        
        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="btn" 
          style={{
            width: '100%',
            background: 'white',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}
        >
          {googleLoading ? (
            '🔄 Signing in with Google...'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
        
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
