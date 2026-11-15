import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req) => {
  const store = getStore("most-signal");

  if (req.method === "POST") {
    const { room, from, to, type, data } = await req.json();
    if (!room || !from || !to || !type) return json({ error: "bad request" }, 400);
    const key = `${room}__${to}__${String(Date.now()).padStart(15, "0")}_${crypto.randomUUID()}`;
    await store.setJSON(key, { from, type, data });
    return json({ ok: true });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const room = url.searchParams.get("room");
    const peer = url.searchParams.get("peer");
    if (!room || !peer) return json({ error: "bad request" }, 400);

    const { blobs } = await store.list({ prefix: `${room}__${peer}__` });
    const keys = blobs.map((b) => b.key).sort();
    const msgs = [];
    for (const key of keys) {
      const m = await store.get(key, { type: "json" });
      if (m) msgs.push(m);
      await store.delete(key);
    }
    return json(msgs);
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/signal" };
