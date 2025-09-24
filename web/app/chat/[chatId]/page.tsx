"use client";
import { useEffect, useRef, useState } from "react";
import { api, stream } from "../../../lib/api";
import Link from 'next/link';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled: boolean;
}

function VoiceRecorder({ onRecordingComplete, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const startRecording = async () => {
    if (disabled) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        setAudioChunks([]);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <button
      type="button"
      className={`btn ${isRecording ? 'btn-danger recording' : 'btn-secondary'}`}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      title={isRecording ? 'Click to stop recording' : 'Click to start voice recording'}
    >
      {isRecording ? '🛑 Stop' : '🎤 Voice'}
    </button>
  );
}

export default function Chat({ params }: { params: { chatId: string } }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentChatInfo, setCurrentChatInfo] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatId = params.chatId;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!token) { location.href="/login"; return; }
    const savedName = localStorage.getItem("name");
    if (savedName) setDoctorName(savedName);
    
    // Load current chat messages
    api(`/messages?chat_id=${chatId}`,"GET",undefined, token!).then(setMessages);
    
    // Load all conversations for sidebar
    Promise.all([
      api(`/chats/general`, "GET", undefined, token!),
      api(`/chats`, "GET", undefined, token!)
    ]).then(([generalChats, patientChats]) => {
      const allChats = [...generalChats, ...patientChats];
      setConversations(allChats);
      
      // Find current chat info
      const currentChat = allChats.find(c => c.id === chatId);
      setCurrentChatInfo(currentChat);
    });
  }, [chatId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleVoiceRecording = (audioBlob: Blob) => {
    setAudioBlob(audioBlob);
    // Keep the prompt empty and let the audio speak for itself
    setPrompt("");
  };

  async function send() {
    if (!prompt.trim() && !image && !audioBlob) return;
    
    let image_url: string | undefined = undefined;
    let finalPrompt = prompt;
    
    // Handle image upload
    if (image) {
      const form = new FormData(); 
      form.append("file", image);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/upload`, { 
          method: "POST", 
          headers: { Authorization: `Bearer ${token}` }, 
          body: form 
        });
        const data = await res.json(); 
        image_url = data.url.startsWith("/") ? `${process.env.NEXT_PUBLIC_API_BASE}${data.url}` : data.url;
        setImage(null);
      } catch (error) {
        alert("Failed to upload image");
        return;
      }
    }
    
    // Handle audio upload
    if (audioBlob) {
      const form = new FormData();
      form.append("file", audioBlob, "voice_message.webm");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
        const data = await res.json();
        
        // Set the uploaded file as the image_url so it gets sent to the model
        image_url = data.url.startsWith("/") ? `${process.env.NEXT_PUBLIC_API_BASE}${data.url}` : data.url;
        
        // Create a meaningful prompt for voice messages
        if (!finalPrompt.trim()) {
          finalPrompt = "I've uploaded a voice message. Please listen to it and provide a medical response based on what you hear. If you cannot process audio directly, please let me know and I can provide a text transcription.";
        } else {
          finalPrompt = `[Voice Message] ${finalPrompt}`;
        }
        setAudioBlob(null);
      } catch (error) {
        alert("Failed to upload voice message");
        return;
      }
    }
    
    // Add user message to UI immediately
    const userMessage = {
      role: "user", 
      text: finalPrompt, 
      media_url: image_url,
      isVoice: !!audioBlob,
      media_type: audioBlob ? "audio" : (image ? "image" : null)
    };
    setMessages(m => [...m, userMessage]);
    setPrompt(""); 
    setStreaming(true);
    
    // Start streaming response
    try {
      let acc = "";
      await stream("/stream", { 
        chat_id: chatId, 
        prompt: finalPrompt, 
        image_url: image_url 
      }, token!, (t) => {
        acc += t;
        setMessages(m => {
          const copy = [...m];
          const last = copy[copy.length-1];
          if (!last || last.role !== "assistant") {
            copy.push({role: "assistant", text: t});
          } else {
            last.text += t;
          }
          return copy;
        });
      });
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages(m => [...m, {
        role: "assistant", 
        text: "Sorry, I encountered an error. Please try again.",
        isError: true
      }]);
    } finally {
      setStreaming(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !streaming) {
      e.preventDefault();
      send();
    }
  };

  const handleImageRemove = () => {
    setImage(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '320px' : '0',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        background: 'var(--secondary-color)',
        borderRight: '1px solid var(--border-color)'
      }}>
        <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Conversations</h3>
            <Link href="/patients" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
              👥 Patients
            </Link>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
                <div className="text-xl mb-2">💬</div>
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  style={{
                    display: 'block',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: 'var(--radius)',
                    background: conv.id === chatId ? 'var(--primary-color)' : 'white',
                    color: conv.id === chatId ? 'white' : 'var(--text-primary)',
                    textDecoration: 'none',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s ease'
                  }}
                  className={conv.id === chatId ? '' : 'hover:bg-gray-50'}
                >
                  <div className="font-medium text-sm" style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {conv.is_general ? '💬 General Chat' : `👤 ${conv.patient_name || 'Patient Chat'}`}
                  </div>
                  <div className="text-xs mt-1" style={{ opacity: 0.7 }}>
                    {conv.title || 'New conversation'}
                  </div>
                  {conv.created_at && (
                    <div className="text-xs mt-1" style={{ opacity: 0.5 }}>
                      {new Date(conv.created_at).toLocaleDateString()}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-secondary"
            style={{ padding: '0.5rem' }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          
          <div style={{ flex: 1 }}>
            <h1 className="text-xl font-bold" style={{ color: 'var(--primary-color)' }}>
              {currentChatInfo?.is_general ? '💬 General Medical Chat' : 
               currentChatInfo?.patient_name ? `👤 Chat with ${currentChatInfo.patient_name}` : 
               '💬 Medical Consultation'}
            </h1>
            {doctorName && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Dr. {doctorName}
              </p>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: '#f8fafc'
        }}>
          {messages.length === 0 ? (
            <div className="text-center" style={{ 
              padding: '3rem', 
              color: 'var(--text-secondary)',
              alignSelf: 'center'
            }}>
              <div className="text-3xl mb-2">🤖</div>
              <p>Start a conversation with your AI medical assistant</p>
              <p className="text-sm">Type a message, upload an image, or record a voice note</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`fade-in`} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    🤖
                  </div>
                )}
                
                <div style={{
                  maxWidth: '70%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)',
                  background: m.role === 'user' 
                    ? 'var(--primary-color)' 
                    : m.isError 
                    ? '#fef2f2'
                    : 'var(--secondary-color)',
                  color: m.role === 'user' 
                    ? 'white' 
                    : m.isError 
                    ? 'var(--danger-color)'
                    : 'var(--text-primary)',
                  border: m.isError ? '1px solid #fecaca' : 'none'
                }}>
                  {m.isVoice && (
                    <div className="text-sm mb-2" style={{ 
                      opacity: 0.8,
                      fontStyle: 'italic'
                    }}>
                      🎤 Voice Message
                    </div>
                  )}
                  
                  {m.media_url && (
                    <img 
                      src={m.media_url} 
                      alt="Uploaded content"
                      style={{
                        maxWidth: '200px',
                        borderRadius: 'var(--radius)',
                        marginBottom: '0.5rem',
                        display: 'block'
                      }}
                    />
                  )}
                  
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                </div>
                
                {m.role === 'user' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--success-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    👨‍⚕️
                  </div>
                )}
              </div>
            ))
          )}
          
          {streaming && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px'
              }}>
                🤖
              </div>
              <div className="pulse" style={{
                padding: '0.75rem 1rem',
                background: 'var(--secondary-color)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-secondary)'
              }}>
                AI is thinking...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          background: 'white',
          padding: '1rem'
        }}>
        {/* Image Preview */}
        {image && (
          <div className="mb-4" style={{
            padding: '1rem',
            background: 'var(--secondary-color)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <img 
              src={URL.createObjectURL(image)} 
              alt="Upload preview"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: 'var(--radius)'
              }}
            />
            <div style={{ flex: 1 }}>
              <div className="font-semibold">{image.name}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {(image.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <button 
              onClick={handleImageRemove}
              className="btn btn-danger"
              style={{ padding: '0.5rem' }}
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Audio Preview */}
        {audioBlob && (
          <div className="mb-4" style={{
            padding: '1rem',
            background: 'var(--secondary-color)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'var(--primary-color)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px'
            }}>
              🎤
            </div>
            <div style={{ flex: 1 }}>
              <div className="font-semibold">Voice Message Recorded</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Ready to send for transcription
              </div>
            </div>
            <button 
              onClick={() => setAudioBlob(null)}
              className="btn btn-danger"
              style={{ padding: '0.5rem' }}
            >
              ✕
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              className="textarea"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your medical question... (Press Enter to send, Shift+Enter for new line)"
              disabled={streaming}
              rows={3}
              style={{ minHeight: '80px', resize: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="file"
              accept="image/*"
              onChange={e => setImage(e.target.files?.[0] ?? null)}
              disabled={streaming}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="btn btn-secondary"
              style={{ cursor: streaming ? 'not-allowed' : 'pointer' }}
            >
              📷 Image
            </label>
            
            <VoiceRecorder 
              onRecordingComplete={handleVoiceRecording}
              disabled={streaming}
            />
            
            <button
              onClick={send}
              disabled={streaming || (!prompt.trim() && !image && !audioBlob)}
              className="btn btn-primary"
              style={{ minHeight: '44px' }}
            >
              {streaming ? '🔄 Sending...' : '📤 Send'}
            </button>
          </div>
        </div>
        
          <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            ⚠️ This is an AI assistant. Always verify medical information with qualified healthcare professionals.
          </div>
        </div>
      </div>
    </div>
  );
}
