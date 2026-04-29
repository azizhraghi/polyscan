import { useState, useEffect, useRef, useCallback } from "react";

// ── Design tokens (same as desktop) ────────────────────────────────────────
const C = {
  bg:"#060d1c", surface:"#0b1528", card:"#0f1e35", border:"#192d4a",
  accent:"#22d3ee", text:"#ccdaeb", muted:"#46607a",
  danger:"#ef4444", warning:"#f59e0b", success:"#10b981",
};

const severityFor = (count) =>
  count === 0 ? { label: "RAS", color: C.success, bg: "#052e16", border: "#065f46" }
  : count <= 2 ? { label: "Faible", color: "#34d399", bg: "#052e16", border: "#065f46" }
  : count <= 5 ? { label: "Moyenne", color: "#fbbf24", bg: "#2d1500", border: "#78350f" }
  :              { label: "Élevée", color: "#f87171", bg: "#2d0808", border: "#7f1d1d" };

export default function MobileScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [gps, setGps] = useState(null);
  const [captures, setCaptures] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [backendOk, setBackendOk] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  // ── Check backend health ─────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/health").then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));
  }, []);

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing) => {
    try {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing || facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setStreaming(false);
    }
  }, [facingMode]);

  useEffect(() => { startCamera(); }, []);

  // ── GPS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // ── Capture & Analyze ───────────────────────────────────────────────────
  const capture = async () => {
    if (!videoRef.current || loading) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    setLoading(true);
    setResult(null);
    setError(null);
    setShowResults(true);

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
      const formData = new FormData();
      formData.append("image", blob, `scan_${Date.now()}.jpg`);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      setResult(data);

      // Save to history
      const sev = severityFor(data.defect_count);
      const thumbUrl = canvas.toDataURL("image/jpeg", 0.3);
      setCaptures(prev => [{ id: Date.now(), result: data, severity: sev, thumb: thumbUrl, time: new Date().toLocaleTimeString("fr-FR"), gps: gps ? { ...gps } : null }, ...prev]);

      // Auto-save to backend history
      try {
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predictions: data.predictions,
            defect_count: data.defect_count,
            timestamp: data.timestamp,
            severity: sev.label,
            thumbnail: thumbUrl,
            filename: `mobile_scan_${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.jpg`,
          }),
        });
      } catch {}
    } catch (err) {
      setError(err.message || "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes scanLine { 0% { top: 5% } 100% { top: 90% } }
      `}</style>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ── Status bar ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(6,13,28,0.92)", backdropFilter: "blur(12px)", zIndex: 10, borderBottom: `1px solid ${C.border}44` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #0ea5e9)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#060d1c" }}>P</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>PolyScan</span>
          <span style={{ fontSize: 11, color: C.muted }}>Mobile</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {gps && <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>📍 {gps.lat}, {gps.lng}</span>}
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: backendOk === true ? C.success : backendOk === false ? C.danger : C.warning, animation: backendOk === null ? "pulse 1.5s infinite" : "none" }} />
        </div>
      </div>

      {/* ── Camera viewfinder ──────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />

        {/* Scan overlay */}
        {streaming && !showResults && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {/* Corner brackets */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {[[8, 8], [85, 8], [8, 82], [85, 82]].map(([cx, cy], i) => (
                <g key={i}>
                  <line x1={`${cx}%`} y1={`${cy + 4}%`} x2={`${cx}%`} y2={`${cy}%`} stroke={C.accent} strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={`${cx}%`} y1={`${cy}%`} x2={`${cx + 7}%`} y2={`${cy}%`} stroke={C.accent} strokeWidth={2.5} strokeLinecap="round" />
                </g>
              ))}
            </svg>
            {/* Scan line animation */}
            {loading && (
              <div style={{ position: "absolute", left: "8%", right: "8%", height: 2, background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`, animation: "scanLine 1.5s ease-in-out infinite alternate", boxShadow: `0 0 20px ${C.accent}` }} />
            )}
            {/* Center crosshair */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 28, height: 28 }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: `${C.accent}44` }} />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: `${C.accent}44` }} />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,13,28,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, backdropFilter: "blur(4px)" }}>
            <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: C.accent }}>Analyse IA en cours…</span>
            <span style={{ fontSize: 12, color: C.muted }}>Envoi à Roboflow</span>
          </div>
        )}

        {/* Results panel (slides up from bottom) */}
        {showResults && !loading && result && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "65%", background: "rgba(6,13,28,0.95)", backdropFilter: "blur(16px)", borderTop: `2px solid ${C.accent}33`, borderRadius: "20px 20px 0 0", padding: "20px 16px 100px", overflowY: "auto" }}>
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 16px" }} />

            {/* Summary */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {/* Defect count */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Défauts</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: result.defect_count > 0 ? C.danger : C.success }}>{result.defect_count}</div>
              </div>
              {/* Severity */}
              {(() => { const sev = severityFor(result.defect_count); return (
                <div style={{ flex: 1, background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Sévérité</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: sev.color }}>{sev.label}</div>
                </div>
              ); })()}
              {/* Predictions */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Prédictions</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.accent }}>{result.predictions?.length || 0}</div>
              </div>
            </div>

            {/* Prediction list */}
            {result.predictions?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.predictions.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{p.class}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Position: ({Math.round(p.x)}, {Math.round(p.y)})</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: p.confidence >= 80 ? C.accent : C.warning }}>{p.confidence}%</div>
                      <div style={{ fontSize: 10, color: C.muted }}>conf.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.defect_count === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.success, fontSize: 14, fontWeight: 500 }}>
                ✓ Aucun défaut détecté — Surface en bon état
              </div>
            )}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{ position: "absolute", bottom: 100, left: 16, right: 16, background: "rgba(45,8,8,0.95)", border: "1px solid #7f1d1d", borderRadius: 12, padding: "14px 16px", backdropFilter: "blur(8px)" }}>
            <div style={{ fontSize: 13, color: "#f87171", fontWeight: 600, marginBottom: 4 }}>Erreur</div>
            <div style={{ fontSize: 12, color: C.muted }}>{error}</div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "16px 20px 28px", background: "rgba(6,13,28,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.border}44` }}>
        {/* Session counter */}
        <button onClick={() => { setShowResults(false); setResult(null); }} style={{ width: 48, height: 48, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <span style={{ fontSize: 16 }}>{captures.length}</span>
          <span style={{ fontSize: 8, color: C.muted, textTransform: "uppercase" }}>scans</span>
        </button>

        {/* Capture button */}
        <button onClick={capture} disabled={loading || !streaming} style={{ width: 72, height: 72, borderRadius: "50%", background: loading ? C.border : "transparent", border: `4px solid ${loading ? C.muted : C.accent}`, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: loading ? "none" : `0 0 24px ${C.accent}33` }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: loading ? C.muted : C.accent, transition: "all 0.15s" }} />
        </button>

        {/* Flip camera */}
        <button onClick={flipCamera} style={{ width: 48, height: 48, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><path d="m18 22-3-3 3-3"/><path d="m6 2 3 3-3 3"/></svg>
        </button>
      </div>

      {/* ── Session history (bottom sheet) ─────────────────────────────── */}
      {captures.length > 0 && !showResults && (
        <div style={{ position: "absolute", bottom: 110, left: 12, right: 12, maxHeight: 140, overflowX: "auto", display: "flex", gap: 8, padding: "8px 4px" }}>
          {captures.map(c => (
            <div key={c.id} onClick={() => { setResult(c.result); setShowResults(true); }} style={{ flexShrink: 0, width: 80, borderRadius: 10, overflow: "hidden", border: `2px solid ${c.severity.border}`, cursor: "pointer", position: "relative" }}>
              <img src={c.thumb} alt="" style={{ width: 80, height: 60, objectFit: "cover", display: "block" }} />
              <div style={{ background: c.severity.bg, padding: "4px 6px", textAlign: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.severity.color }}>{c.result.defect_count} déf.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
