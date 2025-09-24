"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleChatClick = async () => {
    console.log('Chat button clicked, user:', user, 'token:', token ? 'present' : 'missing');
    
    if (!token) {
      console.log('No token, redirecting to login');
      // Not logged in, go to login
      router.push('/login');
      return;
    }
    
    // User is logged in, create a general chat
    setLoading(true);
    try {
      console.log('Creating general chat...');
      const chat = await api('/chats/general', 'POST', {}, token);
      console.log('Chat created successfully:', chat);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat: ' + error.message);
      // Don't redirect to patients on error, let user try again
    } finally {
      setLoading(false);
    }
  };
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
          {user && (
            <div className="mt-4" style={{ color: 'var(--primary-color)' }}>
              Welcome back, Dr. {user.name}! 👨‍⚕️
            </div>
          )}
          {/* Debug info - remove in production */}
          <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Debug: User {user ? 'logged in' : 'not logged in'}, Token {token ? 'present' : 'missing'}
          </div>
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
  )
}
