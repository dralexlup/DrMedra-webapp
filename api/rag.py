import json
import os
from typing import List, Dict, Optional
from datetime import datetime
import re

# Simple in-memory storage for conversation context
# In production, this would be a proper vector database
CONVERSATION_STORE = "conversation_store.json"

def save_conversation_context(doctor_id: str, patient_id: Optional[str], chat_id: str, 
                            role: str, text: str, patient_name: Optional[str] = None):
    """
    Save conversation message to local context store for RAG retrieval
    """
    try:
        # Load existing store
        if os.path.exists(CONVERSATION_STORE):
            with open(CONVERSATION_STORE, 'r') as f:
                store = json.load(f)
        else:
            store = {}
        
        # Create key for doctor's conversations
        if doctor_id not in store:
            store[doctor_id] = {}
        
        # Store message with metadata
        message_id = f"{chat_id}_{datetime.utcnow().isoformat()}"
        store[doctor_id][message_id] = {
            "chat_id": chat_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "role": role,
            "text": text,
            "timestamp": datetime.utcnow().isoformat(),
            "keywords": extract_medical_keywords(text)
        }
        
        # Keep only last 1000 messages per doctor to prevent unbounded growth
        messages = list(store[doctor_id].items())
        if len(messages) > 1000:
            # Keep most recent 1000
            store[doctor_id] = dict(messages[-1000:])
        
        # Save back to file
        with open(CONVERSATION_STORE, 'w') as f:
            json.dump(store, f, indent=2)
            
    except Exception as e:
        print(f"Error saving conversation context: {e}")

def extract_medical_keywords(text: str) -> List[str]:
    """
    Extract basic medical keywords from text for simple matching
    """
    # Basic medical terms - in production, use proper medical NLP
    medical_terms = [
        'symptom', 'pain', 'fever', 'headache', 'nausea', 'vomiting', 'diarrhea',
        'blood pressure', 'hypertension', 'diabetes', 'medication', 'treatment',
        'diagnosis', 'chest pain', 'shortness of breath', 'fatigue', 'dizziness',
        'heart rate', 'pulse', 'temperature', 'weight', 'appetite', 'sleep',
        'allergy', 'rash', 'swelling', 'infection', 'inflammation', 'chronic',
        'acute', 'prescription', 'dosage', 'side effect', 'contraindication'
    ]
    
    text_lower = text.lower()
    found_terms = []
    
    for term in medical_terms:
        if term in text_lower:
            found_terms.append(term)
    
    # Add any words that look medical (ending in common suffixes)
    medical_suffixes = ['itis', 'osis', 'emia', 'pathy', 'ology', 'ectomy']
    words = re.findall(r'\b\w+\b', text_lower)
    
    for word in words:
        if any(word.endswith(suffix) for suffix in medical_suffixes):
            found_terms.append(word)
    
    return list(set(found_terms))  # Remove duplicates

def retrieve_context(query: str, doctor_id: str, patient_id: str | None = None) -> List[Dict]:
    """
    Retrieve relevant conversation context for the query.
    
    Args:
        query: The user's medical question
        doctor_id: Doctor's ID to scope the search
        patient_id: Optional patient ID for personalized context
        
    Returns:
        List of {text, source, timestamp} dictionaries
    """
    
    try:
        if not os.path.exists(CONVERSATION_STORE):
            return []
        
        with open(CONVERSATION_STORE, 'r') as f:
            store = json.load(f)
        
        if doctor_id not in store:
            return []
        
        # Extract keywords from query
        query_keywords = extract_medical_keywords(query)
        if not query_keywords:
            return []
        
        # Find relevant messages
        relevant_messages = []
        doctor_messages = store[doctor_id]
        
        for message_id, message_data in doctor_messages.items():
            # Skip if patient-specific search and doesn't match
            if patient_id and message_data.get('patient_id') != patient_id:
                continue
                
            # Check for keyword overlap
            message_keywords = message_data.get('keywords', [])
            overlap = set(query_keywords) & set(message_keywords)
            
            if overlap:
                score = len(overlap) / len(query_keywords)  # Simple relevance score
                relevant_messages.append({
                    "text": message_data['text'][:300] + ("..." if len(message_data['text']) > 300 else ""),
                    "source": f"Previous conversation with {message_data.get('patient_name', 'patient')}",
                    "timestamp": message_data['timestamp'],
                    "score": score,
                    "role": message_data['role']
                })
        
        # Sort by relevance score and return top 3
        relevant_messages.sort(key=lambda x: x['score'], reverse=True)
        return relevant_messages[:3]
        
    except Exception as e:
        print(f"Error retrieving context: {e}")
        return []
