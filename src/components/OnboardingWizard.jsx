import { useState } from "react";
import { TIMEZONES, generateMilestones, DEFAULT_PROFILE } from "../constants/defaults";
import { WORKOUT_TEMPLATES } from "../constants/workoutTemplates";

const inp = { background: "#111827", border: "1px solid #374151", borderRadius: 10, color: "#fff", fontSize: 14, padding: "10px 14px", width: "100%", boxSizing: "border-box", outline: "none" };
const btn = { background: "linear-gradient(135deg,#059669,#10b981)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, padding: "14px", cursor: "pointer", width: "100%", letterSpacing: 0.5 };
const btnSecondary = { ...btn, background: "#1f2937", color: "#9ca3af" };

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.displayName?.split(" ")[0] || "");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila");
  const [startWeight, setStartWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [calTarget, setCalTarget] = useState("2000");
  const [stepGoal, setStepGoal] = useState("7000");
  const [waterGoal, setWaterGoal] = useState("8");
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState("2");
  const [templateId, setTemplateId] = useState("coach-mike-2day");
  const [strengths, setStrengths] = useState("");
  const [motivation, setMotivation] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const sw = parseFloat(startWeight) || 90;
    const gw = parseFloat(goalWeight) || 75;
    const template = WORKOUT_TEMPLATES[templateId];
    const profile = {
      ...DEFAULT_PROFILE,
      displayName: name || "Friend",
      onboardingComplete: true,
      createdAt: Date.now(),
      goalWeight: gw,
      startWeight: sw,
      calTarget: parseInt(calTarget) || 2000,
      waterGoal: parseInt(waterGoal) || 8,
      stepGoal: parseInt(stepGoal) || 7000,
      workoutsPerWeek: parseInt(workoutsPerWeek) || 2,
      workoutTemplateId: templateId,
      workoutProgram: template?.program || null,
      milestones: generateMilestones(sw, gw),
      cliftonStrengths: strengths.trim() ? { raw: strengths.trim(), top5: [], top10Additional: [], summary: "" } : null,
      motivation: motivation.trim() || "",
    };
    // Save timezone
    localStorage.setItem("kensho-timezone-v1", tz);
    await onComplete(profile);
    setSaving(false);
  };

  const screens = [
    // ── Screen 0: Welcome ──
    <div key="welcome">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>見性</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: 2 }}>Welcome to KENSHO</h1>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Reveal Your True Nature</p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 6 }}>What should we call you?</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 6 }}>Your timezone</label>
        <select value={tz} onChange={e => setTz(e.target.value)} style={{ ...inp, appearance: "auto" }}>
          {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <button onClick={() => setStep(1)} style={btn}>Next →</button>
    </div>,

    // ── Screen 1: Goals ──
    <div key="goals">
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: 1 }}>🎯 Set Your Targets</h2>
      <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 20px" }}>You can change these anytime in Settings.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Current weight (kg)</label>
          <input type="number" value={startWeight} onChange={e => setStartWeight(e.target.value)} placeholder="e.g. 90" style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Goal weight (kg)</label>
          <input type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="e.g. 75" style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Daily calorie target</label>
        <input type="number" value={calTarget} onChange={e => setCalTarget(e.target.value)} style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Steps/day</label>
          <input type="number" value={stepGoal} onChange={e => setStepGoal(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Water (glasses)</label>
          <input type="number" value={waterGoal} onChange={e => setWaterGoal(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Workouts/week</label>
          <input type="number" value={workoutsPerWeek} onChange={e => setWorkoutsPerWeek(e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep(0)} style={{ ...btnSecondary, flex: 1 }}>← Back</button>
        <button onClick={() => setStep(2)} style={{ ...btn, flex: 2 }}>Next →</button>
      </div>
    </div>,

    // ── Screen 2: Workout Template ──
    <div key="workout">
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: 1 }}>💪 Choose Your Program</h2>
      <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 16px" }}>Pick a workout template to start with.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {Object.values(WORKOUT_TEMPLATES).map(t => (
          <button key={t.id} onClick={() => setTemplateId(t.id)} style={{
            background: templateId === t.id ? "rgba(16,185,129,0.15)" : "#111827",
            border: templateId === t.id ? "2px solid #34d399" : "1px solid #374151",
            borderRadius: 14, padding: "14px 16px", cursor: "pointer", textAlign: "left",
            transition: "all 0.15s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{t.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: templateId === t.id ? "#34d399" : "#fff" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{t.desc}</div>
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>{t.daysPerWeek}× per week</div>
              </div>
              {templateId === t.id && <span style={{ marginLeft: "auto", color: "#34d399", fontSize: 18 }}>✓</span>}
            </div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep(1)} style={{ ...btnSecondary, flex: 1 }}>← Back</button>
        <button onClick={() => setStep(3)} style={{ ...btn, flex: 2 }}>Next →</button>
      </div>
    </div>,

    // ── Screen 3: Personalization (Optional) ──
    <div key="personal">
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: 1 }}>✨ Make It Yours</h2>
      <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 16px" }}>Optional — skip if you'd like to set these up later.</p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>CliftonStrengths Top 5 <span style={{ color: "#4b5563" }}>(optional)</span></label>
        <textarea value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="e.g. Achiever, Learner, Strategic, Relator, Ideation" rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
        <p style={{ fontSize: 10, color: "#4b5563", margin: "4px 0 0" }}>We'll use these to personalize your coaching insights.</p>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>What motivates you? <span style={{ color: "#4b5563" }}>(optional)</span></label>
        <textarea value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="e.g. I want to feel confident, have more energy, look good for my wedding..." rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
        <p style={{ fontSize: 10, color: "#4b5563", margin: "4px 0 0" }}>Used to generate your personalized plan & daily reminders.</p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep(2)} style={{ ...btnSecondary, flex: 1 }}>← Back</button>
        <button onClick={finish} disabled={saving} style={{ ...btn, flex: 2, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Setting up…" : "🚀 Finish Setup"}
        </button>
      </div>
    </div>,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: step === i ? 24 : 8, height: 8, borderRadius: 99,
            background: i <= step ? "#34d399" : "#374151",
            transition: "all 0.3s"
          }} />
        ))}
      </div>
      {screens[step]}
    </div>
  );
}
