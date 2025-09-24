"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [name, setName] = useState(""); const [mrn, setMrn] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { location.href="/login"; return; }
    api("/patients","GET",undefined,token).then(setPatients).catch(()=>location.href="/login");
  }, []);

  async function addPatient(){
    const p = await api("/patients","POST",{name, mrn}, token!);
    setPatients([p, ...patients]); setName(""); setMrn("");
  }
  async function newChat(patientId:string){
    const c = await api(`/chats?patient_id=${patientId}`,"POST",undefined, token!);
    location.href = `/chat/${c.id}`;
  }

  return (
    <div style={{maxWidth:800, margin:"40px auto", fontFamily:"system-ui"}}>
      <h1>Patients</h1>
      <div>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="MRN" value={mrn} onChange={e=>setMrn(e.target.value)} />
        <button onClick={addPatient}>Add</button>
      </div>
      <ul>
        {patients.map(p => (
          <li key={p.id} style={{margin:"8px 0"}}>
            <b>{p.name}</b> {p.mrn && `• ${p.mrn}`}{" "}
            <button onClick={()=>newChat(p.id)}>New Chat</button>
          </li>
        ))}
      </ul>
    </div>
  );
}