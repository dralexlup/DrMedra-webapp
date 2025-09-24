const BASE = process.env.NEXT_PUBLIC_API_BASE!;

export async function api(path: string, method = "GET", body?: any, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function stream(path: string, body: any, token: string, onToken: (t:string)=>void) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  }).then(async res => {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const chunk = await reader!.read();
      done = chunk.done!;
      if (done) break;
      const text = decoder.decode(chunk.value, { stream: true });
      const lines = text.split("\n\n").filter(Boolean);
      for (const line of lines) {
        if (line.startsWith("data: ")) onToken(line.slice(6));
      }
    }
  });
}