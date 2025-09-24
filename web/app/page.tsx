"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeLoaded, setThemeLoaded] = useState(false);
  
  // Ensure this component only renders on the client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme as 'light' | 'dark' || systemPreference;
    
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    setThemeLoaded(true);
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  const handleChatClick = async () => {
    if (!token) {
      // Not logged in, go to login
      router.push('/login');
      return;
    }
    
    // User is logged in, create a general chat
    setLoading(true);
    try {
      const chat = await api('/chats/general', 'POST', {}, token);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while mounting, auth is loading, or theme is loading
  if (!mounted || authLoading || !themeLoaded) {
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
            <div className="mt-4" style={{ color: 'var(--text-secondary)' }}>
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card text-center fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Theme toggle button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ minWidth: 'auto', padding: '0.5rem' }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            🏥 DrMedra Medical Assistant
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            AI-powered medical consultations with real-time streaming responses
          </p>
          {user && (
            <div className="mt-4" style={{ color: 'var(--primary-color)' }}>
              Welcome back, Dr. {user.name}! 👨‍⚕️
            </div>
          )}
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
          <button 
            onClick={handleChatClick}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '🔄 Starting Chat...' : '💬 Chat'}
          </button>
          
          {user ? (
            <Link href="/patients" className="btn btn-secondary">
              👨‍⚕️ View Patients
            </Link>
          ) : (
            <Link href="/login" className="btn btn-secondary">
              🔑 Login
            </Link>
          )}
        </div>
        
        <div className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          ⚠️ For educational purposes only. Always consult healthcare professionals.
        </div>
      </div>
    </div>
  );
}