"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Link from 'next/link';

interface PatientProfile {
  patient: {
    id: string;
    name: string;
    mrn: string;
    notes: string;
    created_at: string;
  };
  chats: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
  recent_messages: Array<{
    id: string;
    role: string;
    text: string;
    chat_id: string;
    created_at: string;
  }>;
  files: Array<{
    id: string;
    media_url: string;
    media_type: string;
    file_name: string;
    chat_id: string;
    created_at: string;
  }>;
}

export default function PatientProfilePage({ params }: { params: { patientId: string } }) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { location.href="/login"; return; }
    const savedName = localStorage.getItem("name");
    if (savedName) setDoctorName(savedName);
    
    loadPatientProfile();
  }, []);

  const loadPatientProfile = async () => {
    try {
      const data = await api(`/patients/${params.patientId}`, "GET", undefined, token!);
      setProfile(data);
    } catch (error) {
      console.error("Failed to load patient profile:", error);
      alert("Failed to load patient profile");
    } finally {
      setLoading(false);
    }
  };

  const newChat = async () => {
    try {
      const c = await api(`/chats?patient_id=${params.patientId}`, "POST", undefined, token!);
      location.href = `/chat/${c.id}`;
    } catch (error) {
      alert("Failed to create chat");
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center" style={{ padding: '3rem' }}>
          <div className="pulse text-lg">Loading patient profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container">
        <div className="card text-center">
          <h1>Patient not found</h1>
          <Link href="/patients" className="btn btn-primary mt-4">
            ← Back to Patients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
              👤 {profile.patient.name}
            </h1>
            {doctorName && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Dr. {doctorName}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={newChat} className="btn btn-success">
              💬 New Consultation
            </button>
            <Link href="/patients" className="btn btn-secondary">
              ← Back to Patients
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {/* Patient Info */}
        <div className="card fade-in">
          <h2 className="text-lg font-semibold mb-4">
            📋 Patient Information
          </h2>
          
          <div className="grid gap-3">
            <div>
              <label className="label">Name</label>
              <div className="text-lg font-semibold">{profile.patient.name}</div>
            </div>
            
            {profile.patient.mrn && (
              <div>
                <label className="label">MRN</label>
                <div>{profile.patient.mrn}</div>
              </div>
            )}
            
            {profile.patient.notes && (
              <div>
                <label className="label">Notes</label>
                <div className="text-sm" style={{ 
                  color: 'var(--text-secondary)',
                  background: 'var(--secondary-color)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {profile.patient.notes}
                </div>
              </div>
            )}
            
            <div>
              <label className="label">Created</label>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {new Date(profile.patient.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Conversations */}
        <div className="card fade-in">
          <h2 className="text-lg font-semibold mb-4">
            💬 Recent Conversations ({profile.chats.length})
          </h2>
          
          {profile.chats.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
              <div className="text-2xl mb-2">💬</div>
              <p>No conversations yet</p>
              <button onClick={newChat} className="btn btn-primary mt-2">
                Start First Consultation
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              {profile.chats.slice(0, 5).map(chat => (
                <div key={chat.id} className="card" style={{ 
                  padding: '0.75rem',
                  background: 'var(--secondary-color)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }} onClick={() => location.href = `/chat/${chat.id}`}>
                  <div className="font-semibold">{chat.title}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(chat.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {profile.chats.length > 5 && (
                <div className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  ... and {profile.chats.length - 5} more conversations
                </div>
              )}
            </div>
          )}
        </div>

        {/* Uploaded Files */}
        <div className="card fade-in">
          <h2 className="text-lg font-semibold mb-4">
            📎 Uploaded Files ({profile.files.length})
          </h2>
          
          {profile.files.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
              <div className="text-2xl mb-2">📎</div>
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {profile.files.map(file => (
                <div key={file.id} className="card" style={{ 
                  padding: '0.75rem',
                  background: 'var(--secondary-color)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div className="flex items-center gap-2">
                    <div style={{ fontSize: '1.5rem' }}>
                      {file.media_type === 'image' ? '🖼️' : 
                       file.media_type === 'audio' ? '🎤' : '📄'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">
                        {file.file_name || 'Uploaded file'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(file.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(file.media_url, '_blank')}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Messages */}
      {profile.recent_messages.length > 0 && (
        <div className="card mt-6 fade-in">
          <h2 className="text-lg font-semibold mb-4">
            💭 Recent Messages
          </h2>
          
          <div className="grid gap-2">
            {profile.recent_messages.slice(0, 5).map(message => (
              <div key={message.id} className="card" style={{ 
                padding: '0.75rem',
                background: message.role === 'user' ? 'var(--primary-color)' : 'var(--secondary-color)',
                color: message.role === 'user' ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }} onClick={() => location.href = `/chat/${message.chat_id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">
                      {message.role === 'user' ? '👨‍⚕️ You' : '🤖 AI Assistant'}
                    </div>
                    <div className="text-sm mt-1" style={{ 
                      opacity: message.role === 'user' ? 0.9 : 1 
                    }}>
                      {message.text}
                    </div>
                  </div>
                  <div className="text-xs" style={{ 
                    color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' 
                  }}>
                    {new Date(message.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}