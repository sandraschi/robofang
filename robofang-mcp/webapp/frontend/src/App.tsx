import { useEffect, useState } from "react";

interface Health {
  backend: string;
  bridge_url: string;
  bridge_ok: boolean;
  bridge_error?: string;
  bridge?: { service?: string; status?: string; connectors?: Record<string, boolean> };
}

interface Deliberation {
  id?: number;
  role?: string;
  content?: string;
  ts?: string;
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [deliberations, setDeliberations] = useState<Deliberation[]>([]);
  const [askMessage, setAskMessage] = useState("");
  const [askCouncil, setAskCouncil] = useState(false);
  const [askResult, setAskResult] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      const r = await fetch("/api/health");
      const data = await r.json();
      setHealth(data);
    } catch (e) {
      setHealth({
        backend: "ok",
        bridge_url: "?",
        bridge_ok: false,
        bridge_error: String(e),
      });
    }
  };

  const fetchDeliberations = async () => {
    try {
      const r = await fetch("/api/deliberations?limit=20");
      const data = await r.json();
      setDeliberations(data.deliberations || []);
    } catch {
      setDeliberations([]);
    }
  };

  useEffect(() => {
    fetchHealth();
    const t = setInterval(fetchHealth, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (health?.bridge_ok) {
      fetchDeliberations();
      const t = setInterval(fetchDeliberations, 10000);
      return () => clearInterval(t);
    }
  }, [health?.bridge_ok]);

  const onAsk = async () => {
    if (!askMessage.trim()) return;
    setAskLoading(true);
    setAskResult(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: askMessage.trim(),
          use_council: askCouncil,
          use_rag: true,
        }),
      });
      const data = await r.json();
      setAskResult(data.reply ?? data.error ?? JSON.stringify(data));
      fetchDeliberations();
    } catch (e) {
      setAskResult(`Error: ${e}`);
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>RoboFang MCP — Operator</h1>
      <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Status and tool test for the robofang-mcp server. Bridge must be running.
      </p>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Status</h2>
        {health ? (
          <>
            <p style={{ margin: "0.25rem 0" }}>
              Bridge: <code style={{ background: "#1e293b", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{health.bridge_url}</code>{" "}
              <span className={`badge ${health.bridge_ok ? "badge-ok" : "badge-err"}`}>
                {health.bridge_ok ? "OK" : health.bridge_error ?? "Unreachable"}
              </span>
            </p>
            {health.bridge?.connectors && (
              <p style={{ margin: "0.25rem 0", fontSize: "0.875rem", color: "#94a3b8" }}>
                Connectors: {Object.keys(health.bridge.connectors).filter((k) => health.bridge!.connectors![k]).length} online
              </p>
            )}
            <button type="button" onClick={fetchHealth} style={{ marginTop: "0.5rem" }}>
              Refresh
            </button>
          </>
        ) : (
          <p>Loading…</p>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Test Ask</h2>
        <label className="label">Message</label>
        <textarea
          value={askMessage}
          onChange={(e) => setAskMessage(e.target.value)}
          placeholder="e.g. What is the fleet status?"
          style={{ marginBottom: "0.5rem" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input type="checkbox" checked={askCouncil} onChange={(e) => setAskCouncil(e.target.checked)} />
          <span className="label" style={{ marginBottom: 0 }}>Use council</span>
        </label>
        <button type="button" onClick={onAsk} disabled={askLoading || !health?.bridge_ok}>
          {askLoading ? "Sending…" : "Send"}
        </button>
        {askResult && (
          <div className="card" style={{ marginTop: "1rem", whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>
            {askResult}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Deliberations (tail)</h2>
        <button type="button" onClick={fetchDeliberations} disabled={!health?.bridge_ok} style={{ marginBottom: "0.75rem" }}>
          Refresh
        </button>
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {deliberations.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>None or bridge offline.</p>
          ) : (
            deliberations.map((d, i) => (
              <div key={d.id ?? i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #334155", fontSize: "0.8125rem" }}>
                {d.role && <span style={{ color: "#94a3b8", marginRight: "0.5rem" }}>{d.role}</span>}
                {(d.content ?? "").slice(0, 200)}{(d.content?.length ?? 0) > 200 ? "…" : ""}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
