"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function doLogin(e:any){ e.preventDefault();
    const r = await api("/auth/login", "POST", {email, password});
    localStorage.setItem("token", r.token);
    localStorage.setItem("name", r.name);
    location.href = "/patients";
  }
  async function doRegister(){ 
    const r = await api("/auth/register", "POST", {email, password, name: name || email.split("@")[0]});
    localStorage.setItem("token", r.token); localStorage.setItem("name", r.name);
    location.href = "/patients";
  }

  return (
    <div style={{maxWidth:420, margin:"80px auto", fontFamily:"system-ui"}}>
      <h1>Medra Login</h1>
      <form onSubmit={doLogin}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:8,margin:"8px 0"}}/>
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"100%",padding:8,margin:"8px 0"}}/>
        <input placeholder="Name (register only)" value={name} onChange={e=>setName(e.target.value)} style={{width:"100%",padding:8,margin:"8px 0"}}/>
        <button type="submit">Login</button>{" "}
        <button type="button" onClick={doRegister}>Register</button>
      </form>
    </div>
  );
}