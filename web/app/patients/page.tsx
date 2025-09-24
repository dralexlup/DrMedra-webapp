"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { exportPatientData, downloadAsJSON, downloadAsPDF } from "../../lib/export";
import { useAuth, withAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [mrn, setMrn] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingPatients, setExportingPatients] = useState<Set<string>>(new Set());
  const [deletingPatients, setDeletingPatients] = useState<Set<string>>(new Set());
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      api("/patients","GET",undefined,token)
        .then(setPatients)
        .catch((error) => {
          console.error("Failed to fetch patients:", error);
        });
    }
  }, [token]);

  async function addPatient() {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const p = await api("/patients","POST",{name, mrn, notes}, token!);
      setPatients([p, ...patients]);
      setName(""); 
      setMrn(""); 
      setNotes("");
    } catch (error) {
      alert("Failed to add patient");
    } finally {
      setLoading(false);
    }
  }
  
  async function newChat(patientId: string) {
    try {
      const c = await api(`/chats?patient_id=${patientId}`,"POST",undefined, token!);
      router.push(`/chat/${c.id}`);
    } catch (error) {
      alert("Failed to create chat");
    }
  }

  async function newGeneralChat() {
    try {
      const c = await api(`/chats/general`,"POST",undefined, token!);
      router.push(`/chat/${c.id}`);
    } catch (error) {
      alert("Failed to create general chat");
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      addPatient();
    }
  };

  async function exportPatient(patientId: string, format: 'json' | 'txt') {
    if (!token) return;
    
    setExportingPatients(prev => new Set([...prev, patientId]));
    
    try {
      const data = await exportPatientData(patientId, token);
      
      if (format === 'json') {
        downloadAsJSON(data);
      } else {
        downloadAsPDF(data);
      }
    } catch (error) {
      alert('Failed to export patient data');
    } finally {
      setExportingPatients(prev => {
        const updated = new Set(prev);
        updated.delete(patientId);
        return updated;
      });
    }
  }

  async function deletePatient(patientId: string, patientName: string) {
    if (!token) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete patient "${patientName}"? This will also delete all associated chats and cannot be undone.`);
    if (!confirmed) return;
    
    setDeletingPatients(prev => new Set([...prev, patientId]));
    
    try {
      await api(`/patients/${patientId}`, 'DELETE', undefined, token);
      setPatients(prev => prev.filter(p => p.id !== patientId));
    } catch (error) {
      alert('Failed to delete patient');
    } finally {
      setDeletingPatients(prev => {
        const updated = new Set(prev);
        updated.delete(patientId);
        return updated;
      });
    }
  }

  return (
    <div className="container">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
              👥 Patient Management
            </h1>
            {user && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Welcome, Dr. {user.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ minWidth: 'auto', padding: '0.5rem' }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button 
              className="btn btn-success"
              onClick={newGeneralChat}
            >
              💬 General Chat
            </button>
            <Link href="/" className="btn btn-secondary">
              🏠 Home
            </Link>
            <button 
              className="btn btn-danger"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: '400px 1fr' }}>
        <div className="card fade-in">
          <h2 className="text-lg font-semibold mb-4">
            ➕ Add New Patient
          </h2>
          
          <div className="form-group">
            <label className="label">Patient Name</label>
            <input 
              className="input"
              placeholder="John Doe" 
              value={name} 
              onChange={e => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label className="label">Medical Record Number (MRN)</label>
            <input 
              className="input"
              placeholder="MRN001" 
              value={mrn} 
              onChange={e => setMrn(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label className="label">Initial Notes</label>
            <textarea 
              className="textarea"
              placeholder="Patient medical history, allergies, etc." 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={addPatient}
            disabled={loading || !name.trim()}
            style={{ width: '100%' }}
          >
            {loading ? '🔄 Adding...' : '➕ Add Patient'}
          </button>
        </div>
        
        <div className="card fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              📈 Patient List ({patients.length})
            </h2>
          </div>
          
          {patients.length === 0 ? (
            <div className="text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
              <div className="text-3xl mb-2">👥</div>
              <p>No patients yet</p>
              <p className="text-sm">Add your first patient to get started</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {patients.map(p => (
                <div key={p.id} className="card" style={{ 
                  padding: '1rem',
                  background: 'var(--secondary-color)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div className="flex justify-between items-start">
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-lg mb-1">
                        👤 {p.name}
                      </div>
                      {p.mrn && (
                        <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                          MRN: {p.mrn}
                        </div>
                      )}
                      {p.notes && (
                        <div className="text-sm" style={{ 
                          color: 'var(--text-secondary)',
                          maxHeight: '60px',
                          overflow: 'hidden'
                        }}>
                          {p.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Link 
                        href={`/patients/${p.id}`}
                        className="btn btn-secondary"
                        style={{ minWidth: '80px', fontSize: '0.75rem' }}
                      >
                        👀 View
                      </Link>
                      <button 
                        className="btn btn-primary"
                        onClick={() => newChat(p.id)}
                        style={{ minWidth: '80px', fontSize: '0.75rem' }}
                      >
                        💬 Chat
                      </button>
                      <div className="flex gap-1">
                        <button 
                          className="btn btn-success"
                          onClick={() => exportPatient(p.id, 'json')}
                          disabled={exportingPatients.has(p.id)}
                          style={{ minWidth: '70px', fontSize: '0.75rem', padding: '0.5rem' }}
                          title="Export as JSON"
                        >
                          {exportingPatients.has(p.id) ? '🔄' : '📄 JSON'}
                        </button>
                        <button 
                          className="btn btn-warning"
                          onClick={() => exportPatient(p.id, 'txt')}
                          disabled={exportingPatients.has(p.id)}
                          style={{ minWidth: '70px', fontSize: '0.75rem', padding: '0.5rem' }}
                          title="Export as Text"
                        >
                          {exportingPatients.has(p.id) ? '🔄' : '📋 TXT'}
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => deletePatient(p.id, p.name)}
                          disabled={deletingPatients.has(p.id)}
                          style={{ minWidth: '70px', fontSize: '0.75rem', padding: '0.5rem' }}
                          title="Delete Patient"
                        >
                          {deletingPatients.has(p.id) ? '🔄' : '🗑️ DEL'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(Patients);
