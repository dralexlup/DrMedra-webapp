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
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [doctorName, setDoctorName] = useState("");
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
    
    api(`/messages?chat_id=${chatId}`,"GET",undefined, token!).then(setMessages);
  }, [chatId]);

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
    <div className="container" style={{ maxWidth: '1000px' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
              💬 Medical Consultation
            </h1>
            {doctorName && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Dr. {doctorName} • Chat ID: {chatId.slice(0, 8)}...
              </p>
            )}
          </div>
          <Link href="/patients" className="btn btn-secondary">
            👥 Back to Patients
          </Link>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="card mb-6" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
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
      </div>

      {/* Message Input */}
      <div className="card">
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
  );
}
