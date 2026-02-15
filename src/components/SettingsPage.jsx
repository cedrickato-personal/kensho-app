import { useState, useEffect } from "react";
import { TIMEZONES, generateMilestones } from "../constants/defaults";
import { WORKOUT_TEMPLATES } from "../constants/workoutTemplates";

const inp = { background: "#111827", border: "1px solid #374151", borderRadius: 10, color: "#fff", fontSize: 14, padding: "10px 14px", width: "100%", boxSizing: "border-box", outline: "none" };
const sectionTitle = { fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 };

export default function SettingsPage({ profile, saveProfile, timezone, onTimezoneChange, onSignOut }) {
  const [goalWeight, setGoalWeight] = useState(String(profile.goalWeight || ""));
  const [startWeight, setStartWeight] = useState(String(profile.startWeight || ""));
  const [calTarget, setCalTarget] = useState(String(profile.calTarget || ""));
  const [stepGoal, setStepGoal] = useState(String(profile.stepGoal || ""));
  const [waterGoal, setWaterGoal] = useState(String(profile.waterGoal || ""));
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(String(profile.workoutsPerWeek || ""));
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [templateId, setTemplateId] = useState(profile.workoutTemplateId || "coach-mike-2day");
  const [saved, setSaved] = useState(false);
  const [tz, setTz] = useState(timezone);

  useEffect(() => { if (saved) { const t = setTimeout(() => setSaved(false), 2000); return () => clearTimeout(t); } }, [saved]);

  const handleSave = async () => {
    const sw = parseFloat(startWeight) || profile.startWeight;
    const gw = parseFloat(goalWeight) || profile.goalWeight;
    const template = WORKOUT_TEMPLATES[templateId];
    const updates = {
      displayName: displayName || profile.displayName,
      goalWeight: gw,
      startWeight: sw,
      calTarget: parseInt(calTarget) || profile.calTarget,
      waterGoal: parseInt(waterGoal) || profile.waterGoal,
      stepGoal: parseInt(stepGoal) || profile.stepGoal,
      workoutsPerWeek: parseInt(workoutsPerWeek) || profile.workoutsPerWeek,
      workoutTemplateId: templateId,
      workoutProgram: template?.program || profile.workoutProgram,
      milestones: generateMilestones(sw, gw),
    };
    await saveProfile(updates);
    if (tz !== timezone) onTimezoneChange(tz);
    setSaved(true);
  };

  const card = { background: "rgba(17,24,39,0.7)", borderRadius: 20, padding: "18px 16px", marginBottom: 10, border: "1px solid #1f2937" };

  return (
    <>
      {/* Profile */}
      <div style={card}>
        <div style={sectionTitle}>👤 Profile</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Display Name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Timezone</label>
          <select value={tz} onChange={e => setTz(e.target.value)} style={{ ...inp, appearance: "auto" }}>
            {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Goals */}
      <div style={card}>
        <div style={sectionTitle}>🎯 Goals</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Start Weight (kg)</label>
            <input type="number" value={startWeight} onChange={e => setStartWeight(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Goal Weight (kg)</label>
            <input type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Daily Calorie Target</label>
          <input type="number" value={calTarget} onChange={e => setCalTarget(e.target.value)} style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: "#6b7280", display: "block", marginBottom: 4 }}>Steps/day</label>
            <input type="number" value={stepGoal} onChange={e => setStepGoal(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#6b7280", display: "block", marginBottom: 4 }}>Water</label>
            <input type="number" value={waterGoal} onChange={e => setWaterGoal(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#6b7280", display: "block", marginBottom: 4 }}>Workouts/wk</label>
            <input type="number" value={workoutsPerWeek} onChange={e => setWorkoutsPerWeek(e.target.value)} style={inp} />
          </div>
        </div>
      </div>

      {/* Workout Program */}
      <div style={card}>
        <div style={sectionTitle}>💪 Workout Program</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.values(WORKOUT_TEMPLATES).map(t => (
            <button key={t.id} onClick={() => setTemplateId(t.id)} style={{
              background: templateId === t.id ? "rgba(16,185,129,0.15)" : "transparent",
              border: templateId === t.id ? "2px solid #34d399" : "1px solid #374151",
              borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: templateId === t.id ? "#34d399" : "#d1d5db" }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{t.desc}</div>
                </div>
                {templateId === t.id && <span style={{ marginLeft: "auto", color: "#34d399" }}>✓</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ padding: "0 0 10px" }}>
        <button onClick={handleSave} style={{
          width: "100%", background: "linear-gradient(135deg,#059669,#10b981)", border: "none",
          borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, padding: "14px",
          cursor: "pointer", letterSpacing: 0.5,
        }}>
          {saved ? "✅ Saved!" : "💾 Save Changes"}
        </button>
      </div>

      {/* Account */}
      <div style={card}>
        <div style={sectionTitle}>🔒 Account</div>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
          Signed in as <strong style={{ color: "#d1d5db" }}>{profile.displayName}</strong>
        </p>
        <button onClick={onSignOut} style={{
          background: "transparent", border: "1px solid #374151", borderRadius: 10,
          color: "#6b7280", fontSize: 12, padding: "8px 16px", cursor: "pointer", width: "100%",
        }}>
          Sign Out
        </button>
      </div>
    </>
  );
}
