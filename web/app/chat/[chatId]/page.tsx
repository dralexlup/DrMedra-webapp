"use client";
import { useEffect, useRef, useState } from "react";
import { api, stream } from "../../../lib/api";

export default function Chat({ params }: { params: { chatId: string } }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [streaming, setStreaming] = useState(false);
  const chatId = params.chatId;

  useEffect(() => {
    if (!token) { location.href="/login"; return; }
    api(`/messages?chat_id=${chatId}`,"GET",undefined, token!).then(setMessages);
  }, [chatId]);

  async function send() {
    if (!prompt.trim() && !image) return;
    let image_url: string | undefined = undefined;
    if (image) {
      const form = new FormData(); form.append("file", image);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/upload`, { method:"POST", headers:{Authorization:`Bearer ${token}`}, body: form });
      const data = await res.json(); image_url = data.url.startsWith("/") ? `${process.env.NEXT_PUBLIC_API_BASE}${data.url}` : data.url;
      setImage(null as any);
    }
    setMessages(m => [...m, {role:"user", text:prompt, media_url:image_url}]);
    setPrompt(""); setStreaming(true);
    let acc = "";
    await stream("/stream", { chat_id: chatId, prompt, image_url: image_url }, token!, (t) => {
      acc += t;
      // update last assistant message progressively
      setMessages(m => {
        const copy = [...m];
        const last = copy[copy.length-1];
        if (!last || last.role !== "assistant") copy.push({role:"assistant", text:t});
        else last.text += t;
        return copy;
      });
    });
    setStreaming(false);
  }

  return (
    <div style={{maxWidth:900, margin:"30px auto", fontFamily:"system-ui"}}>
      <h2>Chat</h2>
      <div style={{border:"1px solid #ddd", padding:16, minHeight:400}}>
        {messages.map((m,i)=>(
          <div key={i} style={{margin:"10px 0"}}>
            <div><b>{m.role === "user" ? "You" : "Assistant"}</b></div>
            {m.media_url && <img src={m.media_url} style={{maxWidth:200}} />}
            <div style={{whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12}}>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3} style={{width:"100%"}} placeholder="Type a question..." />
        <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
          <input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0] ?? null)} />
          <button onClick={send} disabled={streaming}>{streaming ? "Thinking…" : "Send"}</button>
        </div>
      </div>
    </div>
  );
}