import { api } from './api';

export interface PatientExportData {
  patient: {
    id: string;
    name: string;
    mrn?: string;
    notes?: string;
    created_at: string;
  };
  chats: Array<{
    id: string;
    title: string;
    created_at: string;
    messages: Array<{
      id: string;
      content: string;
      role: 'user' | 'assistant';
      timestamp: string;
    }>;
  }>;
  files?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
}

export async function exportPatientData(patientId: string, token: string): Promise<PatientExportData> {
  try {
    // Fetch patient details
    const patient = await api(`/patients/${patientId}`, 'GET', undefined, token);
    
    // Fetch patient chats
    const chats = await api(`/chats?patient_id=${patientId}`, 'GET', undefined, token);
    
    // Fetch messages for each chat
    const chatsWithMessages = await Promise.all(
      chats.map(async (chat: any) => {
        try {
          const messages = await api(`/chats/${chat.id}/messages`, 'GET', undefined, token);
          return {
            ...chat,
            messages: messages || []
          };
        } catch (error) {
          console.error(`Failed to fetch messages for chat ${chat.id}:`, error);
          return {
            ...chat,
            messages: []
          };
        }
      })
    );

    // TODO: Fetch patient files if file upload is implemented
    const files: any[] = [];

    return {
      patient,
      chats: chatsWithMessages,
      files
    };
  } catch (error) {
    console.error('Failed to export patient data:', error);
    throw new Error('Failed to export patient data');
  }
}

export function downloadAsJSON(data: PatientExportData, filename?: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `patient-${data.patient.name}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function downloadAsPDF(data: PatientExportData, filename?: string) {
  // Create a formatted text content for PDF
  let content = `PATIENT RECORD EXPORT\n`;
  content += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  content += `PATIENT INFORMATION\n`;
  content += `Name: ${data.patient.name}\n`;
  if (data.patient.mrn) content += `MRN: ${data.patient.mrn}\n`;
  if (data.patient.notes) content += `Notes: ${data.patient.notes}\n`;
  content += `Record Created: ${new Date(data.patient.created_at).toLocaleString()}\n\n`;
  
  content += `CONSULTATION HISTORY\n`;
  content += `Total Consultations: ${data.chats.length}\n\n`;
  
  data.chats.forEach((chat, index) => {
    content += `CONSULTATION ${index + 1}: ${chat.title}\n`;
    content += `Date: ${new Date(chat.created_at).toLocaleString()}\n`;
    content += `Messages: ${chat.messages.length}\n\n`;
    
    chat.messages.forEach((message, msgIndex) => {
      const role = message.role === 'user' ? 'DOCTOR' : 'AI ASSISTANT';
      content += `${role} [${new Date(message.timestamp).toLocaleString()}]:\n`;
      content += `${message.content}\n\n`;
    });
    
    content += `--- END CONSULTATION ${index + 1} ---\n\n`;
  });
  
  if (data.files && data.files.length > 0) {
    content += `ATTACHED FILES\n`;
    data.files.forEach(file => {
      content += `- ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)\n`;
    });
  }
  
  // Create and download as text file (simple PDF alternative)
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `patient-${data.patient.name}-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}