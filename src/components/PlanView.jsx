import { useState } from "react";

const st = { card: { background: "rgba(17,24,39,0.7)", borderRadius: 20, padding: "18px 16px", marginBottom: 10, border: "1px solid #1f2937" } };

export default function PlanView({ profile, saveProfile }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const sections = profile?.planSections || [];
  const strengths = profile?.cliftonStrengths;

  const generatePlan = async () => {
    setGenerating(true);
    setGenError("");
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) { setGenError("No API key configured."); setGenerating(false); return; }

      const prompt = `You are a fitness and lifestyle coach. Based on this user's profile, generate a personalized action plan as JSON.

User Profile:
- Name: ${profile.displayName}
- Current Weight: ${profile.startWeight}kg → Goal: ${profile.goalWeight}kg
- Daily Calorie Target: ${profile.calTarget}
- Step Goal: ${profile.stepGoal}/day
- Water: ${profile.waterGoal} glasses/day
- Workouts: ${profile.workoutsPerWeek}×/week
${profile.workoutProgram?.[1]?.name ? `- Program: ${profile.workoutProgram[1].name}` : ""}
${strengths?.raw ? `- CliftonStrengths: ${strengths.raw}` : ""}
${profile.motivation ? `- Motivation: ${profile.motivation}` : ""}

Return ONLY valid JSON:
{
  "sections": [
    { "id": "protocol", "title": "Your Minimum Effective Protocol", "icon": "📋", "color": "rgba(16,185,129,0.3)", "items": [{"title":"...","desc":"..."}] },
    { "id": "overload", "title": "Progressive Overload", "icon": "💪", "color": "rgba(251,191,36,0.3)", "content": "How to progress..." },
    { "id": "timeline", "title": "Your Timeline", "icon": "⏱", "color": "rgba(251,113,133,0.3)", "items": [{"title":"...","desc":"..."}] }
  ],
  "constantQuote": "A personalized motivational quote for this person...",
  "dailyReminders": ["reminder 1", "reminder 2", ... up to 20 personalized daily reminders]
  ${strengths?.raw ? `, "cliftonStrengths": { "top5": [{"rank":1,"name":"...","domain":"...","color":"#8b5cf6","emoji":"...","desc":"...","fitness":"How this strength helps fitness..."}], "domains": [{"label":"...","count":1,"color":"#8b5cf6"}], "summary": "A strengths DNA summary..." }` : ""}
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
      });
      const result = await response.json();
      const text = result.content?.map(c => c.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      const updates = { planSections: parsed.sections || [] };
      if (parsed.constantQuote) updates.constantQuote = parsed.constantQuote;
      if (parsed.dailyReminders?.length) updates.dailyReminders = parsed.dailyReminders;
      if (parsed.cliftonStrengths?.top5?.length) updates.cliftonStrengths = { ...strengths, ...parsed.cliftonStrengths };

      await saveProfile(updates);
    } catch (err) {
      console.error("Plan generation failed:", err);
      setGenError("Generation failed. Try again.");
    }
    setGenerating(false);
  };

  // ── Empty state ──
  if (sections.length === 0 && !strengths?.top5?.length) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Your Personalized Plan</h3>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px", lineHeight: 1.5 }}>
          Generate an AI-powered plan tailored to your goals, workout program, and strengths.
        </p>
        <button onClick={generatePlan} disabled={generating} style={{
          background: "linear-gradient(135deg,#059669,#10b981)", border: "none", borderRadius: 12,
          color: "#fff", fontSize: 14, fontWeight: 700, padding: "14px 28px", cursor: "pointer",
          opacity: generating ? 0.6 : 1,
        }}>
          {generating ? "⏳ Generating…" : "✨ Generate My Plan"}
        </button>
        {genError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{genError}</p>}
      </div>
    );
  }

  // ── Render plan sections ──
  return (
    <>
      {sections.map((section, si) => (
        <div key={section.id || si} style={{ ...st.card, border: `1px solid ${section.color || "#1f2937"}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            {section.icon} {section.title}
          </div>
          {section.items ? section.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>{i + 1}.</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            </div>
          )) : section.content ? (
            <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>{section.content}</p>
          ) : null}
        </div>
      ))}

      {/* CliftonStrengths section */}
      {strengths?.top5?.length > 0 && (
        <div style={{ ...st.card, border: "1px solid rgba(139,92,246,0.3)", background: "linear-gradient(135deg, rgba(17,24,39,0.8), rgba(49,46,129,0.15))" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🧠 CliftonStrengths Insights</div>
          <p style={{ fontSize: 10, color: "#6b7280", margin: "0 0 12px 0", fontStyle: "italic" }}>Your Gallup Top 5 — and how they fuel KENSHO</p>
          {strengths.top5.map((s, i) => (
            <div key={i} style={{ marginBottom: i < 4 ? 14 : 0, paddingBottom: i < 4 ? 14 : 0, borderBottom: i < 4 ? "1px solid rgba(55,65,81,0.3)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{s.emoji}</span>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>#{s.rank} {s.name}</span>
                  <span style={{ fontSize: 10, color: s.color || "#a78bfa", marginLeft: 8, padding: "1px 6px", borderRadius: 99, border: `1px solid ${(s.color || "#a78bfa")}33` }}>{s.domain}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px 0", lineHeight: 1.4 }}>{s.desc}</p>
              {s.fitness && <p style={{ fontSize: 12, color: "#c4b5fd", margin: 0, lineHeight: 1.4 }}>→ {s.fitness}</p>}
            </div>
          ))}
          {strengths.domains?.length > 0 && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(139,92,246,0.1)", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>Your Strengths DNA</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {strengths.domains.map((d, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, background: `${d.color}22`, color: d.color, border: `1px solid ${d.color}33` }}>{d.label} ×{d.count}</span>
                ))}
              </div>
              {strengths.summary && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>{strengths.summary}</p>}
            </div>
          )}
          {strengths.top10Additional?.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(49,46,129,0.15)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Also in your Top 10</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {strengths.top10Additional.map((t, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(55,65,81,0.5)", color: "#9ca3af" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regenerate button */}
      <div style={{ textAlign: "center", padding: "8px 16px 16px" }}>
        <button onClick={generatePlan} disabled={generating} style={{
          background: "transparent", border: "1px solid #374151", borderRadius: 10,
          color: "#6b7280", fontSize: 11, padding: "8px 16px", cursor: "pointer",
          opacity: generating ? 0.5 : 1,
        }}>
          {generating ? "⏳ Regenerating…" : "🔄 Regenerate Plan"}
        </button>
        {genError && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{genError}</p>}
      </div>
    </>
  );
}
