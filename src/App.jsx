import { useState, useEffect, useCallback, useRef, Component } from "react";
import useFirebaseSync from "./useFirebaseSync";
import useUserProfile from "./hooks/useUserProfile";
import OnboardingWizard from "./components/OnboardingWizard";
import SettingsPage from "./components/SettingsPage";
import PlanView from "./components/PlanView";
import { TIMEZONES } from "./constants/defaults";
import { WORKOUT_TEMPLATES } from "./constants/workoutTemplates";

// ── Error boundary to prevent blank-screen crashes ──
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("KENSHO crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, color: "#e5e7eb", fontFamily: "-apple-system, sans-serif" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>KENSHO crashed</h2>
          <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{this.state.error?.message || "Unknown error"}</p>
          <button onClick={() => { localStorage.removeItem("kensho-profile-v1"); window.location.reload(); }} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 10, padding: "10px 20px", color: "#d1d5db", cursor: "pointer", fontSize: 13, marginBottom: 8 }}>Reset Profile & Reload</button>
          <button onClick={() => window.location.reload()} style={{ background: "transparent", border: "1px solid #374151", borderRadius: 10, padding: "10px 20px", color: "#9ca3af", cursor: "pointer", fontSize: 13 }}>Just Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}


const STORAGE_KEY = "arcadia-tracker-v2";
const PHOTO_KEY = "kensho-photos-v1";
const TZ_KEY = "kensho-timezone-v1";

const getNowInTz = (tz) => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch { return new Date().toISOString().split("T")[0]; }
};
const getTimeInTz = (tz) => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
  } catch { return ""; }
};

const getWeekStart = (ds) => { const d = new Date(ds + "T00:00:00"); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0]; };
const getWeekId = (ds) => { const d = new Date(ds + "T00:00:00"); const jan1 = new Date(d.getFullYear(), 0, 1); const days = Math.floor((d - jan1) / 86400000); return `${d.getFullYear()}-W${String(Math.ceil((days + jan1.getDay() + 1) / 7)).padStart(2, "0")}`; };
const defaultDay = () => ({ steps: 0, workout: false, workoutDay: null, workoutSets: [], workoutChecks: {}, warmupDone: false, cooldownDone: false, skincare: false, omad: false, water: 0, weight: null, note: "", foods: [], lastMealTime: null, brushAM: false, brushPM: false, bathing: false, laundry: false, roomCleaned: false });
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
const shiftDate = (dateStr, days) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; };

const formatDateLabel = (dateStr, todayStr) => {
  if (dateStr === todayStr) return "Today";
  if (dateStr === shiftDate(todayStr, -1)) return "Yesterday";
  if (dateStr === shiftDate(todayStr, 1)) return "Tomorrow";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
};

const getWeekDates = (dateStr) => {
  const ws = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => shiftDate(ws, i));
};

const KenshoLogo = () => (
  <svg viewBox="0 0 48 48" width="44" height="44" style={{ display: "block" }}>
    <path d="M24 4 C36 4, 44 12, 44 24 C44 36, 36 44, 24 44 C12 44, 4 36, 4 24 C4 14, 10 6, 18 4.5" fill="none" stroke="url(#enso)" strokeWidth="3.5" strokeLinecap="round" />
    <text x="24" y="26" textAnchor="middle" dominantBaseline="middle" fill="#d1d5db" fontSize="11" fontWeight="700" fontFamily="-apple-system,sans-serif">見性</text>
    <defs><linearGradient id="enso" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#60a5fa" /></linearGradient></defs>
  </svg>
);

function KenshoTracker() {
  const [data, setData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("today");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [weightInput, setWeightInput] = useState("");
  const [stepsInput, setStepsInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [foodInput, setFoodInput] = useState("");
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError] = useState("");
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [showSetLogger, setShowSetLogger] = useState(false);
  const [setExercise, setSetExercise] = useState("");
  const [setWeight, setSetWeight] = useState("");
  const [setReps, setSetReps] = useState("");
  const [reviewWorked, setReviewWorked] = useState("");
  const [reviewDidnt, setReviewDidnt] = useState("");
  const [reviewAdjust, setReviewAdjust] = useState("");
  const [fastingNow, setFastingNow] = useState("");
  const [photoView, setPhotoView] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exportText, setExportText] = useState("");
  const fileRef = useRef(null);

  const today = getNowInTz(timezone);
  const activeDate = selectedDate || today;
  const isToday = activeDate === today;
  const isFutureDate = activeDate > today;
  const weekId = getWeekId(activeDate);
  const isSunday = new Date(activeDate + "T00:00:00").getDay() === 0;

  useEffect(() => {
    try {
      const tz = localStorage.getItem(TZ_KEY);
      if (tz) { setTimezone(tz); setSelectedDate(getNowInTz(tz)); }
      else { setSelectedDate(getNowInTz("Asia/Manila")); }
    } catch { setSelectedDate(getNowInTz("Asia/Manila")); }
  }, []);

  const saveTz = (tz) => {
    setTimezone(tz);
    setSelectedDate(getNowInTz(tz));
    try { localStorage.setItem(TZ_KEY, tz); } catch { }
    setShowTzPicker(false);
  };

  const loadData = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.weeklyReviews) parsed.weeklyReviews = {};
        setData(parsed);
      } else {
        let init = { days: {}, startDate: getNowInTz("Asia/Manila"), weeklyReviews: {} };
        try {
          const v1Raw = localStorage.getItem("arcadia-tracker-v1");
          if (v1Raw) {
            const v1d = JSON.parse(v1Raw);
            Object.entries(v1d.days || {}).forEach(([date, day]) => { init.days[date] = { ...defaultDay(), ...day, foods: day.foods || [] }; });
            init.startDate = v1d.startDate || getNowInTz("Asia/Manila");
          }
        } catch { }
        setData(init);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      }
    } catch { setData({ days: {}, startDate: getNowInTz("Asia/Manila"), weeklyReviews: {} }); }
    try { const pr = localStorage.getItem(PHOTO_KEY); if (pr) setPhotos(JSON.parse(pr)); } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const tick = () => {
      setCurrentTime(getTimeInTz(timezone));
      if (!data) return;
      const td = data.days?.[activeDate];
      if (td?.lastMealTime) {
        const diff = Date.now() - new Date(td.lastMealTime).getTime();
        setFastingNow(`${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`);
      } else { setFastingNow(""); }
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [data, activeDate, timezone]);

  // ── Firebase sync ──
  const { firebaseEnabled: fbEnabled, user: fbUser, syncStatus, signIn, signOut: fbSignOut, pushDay, pushMeta } = useFirebaseSync();

  const { profile, profileLoaded, saveProfile, needsOnboarding } = useUserProfile(fbUser);

  const GOAL_WEIGHT = profile?.goalWeight || 70;
  const START_WEIGHT = profile?.startWeight || 85;
  const CAL_TARGET = profile?.calTarget || 2000;
  const WATER_GOAL = profile?.waterGoal || 8;
  const STEP_GOAL = profile?.stepGoal || 10000;
  const MILESTONES = profile?.milestones || [];
  const WORKOUT_PROGRAM = profile?.workoutProgram || {};
  const EXERCISES_DERIVED = {};
  const maxDay = Object.keys(WORKOUT_PROGRAM).filter(k => !isNaN(parseInt(k))).length;
  for (let i = 1; i <= maxDay; i++) {
    if (WORKOUT_PROGRAM[i]) {
      EXERCISES_DERIVED[i] = WORKOUT_PROGRAM[i].supersets?.flatMap(s => [s.a.name, s.b.name]) || [];
    }
  }

  const getDailyReminder = (dateStr) => {
    const reminders = profile?.dailyReminders || ["Put on your shoes. That's step one."];
    let h = 0; for (let i = 0; i < dateStr.length; i++) { h = ((h << 5) - h) + dateStr.charCodeAt(i); h |= 0; }
    return reminders[Math.abs(h) % reminders.length];
  };
  const dailyReminder = getDailyReminder(activeDate);

  // Listen for cross-device sync events
  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener("kensho-sync", handler);
    return () => window.removeEventListener("kensho-sync", handler);
  }, [loadData]);

  const save = (nd) => { setData(nd); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nd)); } catch { } };
  const savePhotos = (p) => { setPhotos(p); try { localStorage.setItem(PHOTO_KEY, JSON.stringify(p)); } catch { } };
  const td = data?.days?.[activeDate] || defaultDay();

  const updateDay = async (updater) => {
    const u = { ...data, days: { ...data.days }, weeklyReviews: { ...data.weeklyReviews } };
    const day = { ...(u.days[activeDate] || defaultDay()), foods: [...(u.days[activeDate]?.foods || [])], workoutSets: [...(u.days[activeDate]?.workoutSets || [])], workoutChecks: { ...(u.days[activeDate]?.workoutChecks || {}) } };
    updater(day);
    day.lastModified = Date.now();
    u.days[activeDate] = day;
    save(u);
    // Push to Firestore (async, non-blocking)
    pushDay(activeDate, day);
  };

  const toggle = (field) => updateDay(day => { day[field] = !day[field]; if (field === "workout" && !day[field]) { day.workoutDay = null; day.workoutSets = []; day.workoutChecks = {}; day.warmupDone = false; day.cooldownDone = false; } });
  const logSteps = async () => { const s = parseInt(stepsInput); if (isNaN(s) || s < 0) return; await updateDay(day => { day.steps = s; }); setStepsInput(""); };
  const pickWorkout = (num) => updateDay(day => { day.workout = true; day.workoutDay = num; });
  const setWater = (n) => updateDay(day => { day.water = n; });
  const logWeight = async () => { const w = parseFloat(weightInput); if (isNaN(w) || w < 50 || w > 150) return; await updateDay(day => { day.weight = w; }); setWeightInput(""); };
  const logNote = async () => { if (!noteInput.trim()) return; await updateDay(day => { day.note = noteInput.trim(); }); setNoteInput(""); };
  const unlogWeight = async () => { await updateDay(day => { day.weight = null; }); };
  const unlogNote = async () => { await updateDay(day => { day.note = ""; }); setNoteInput(""); };
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const addSet = async () => { if (!setExercise || !setWeight || !setReps) return; await updateDay(day => { day.workoutSets.push({ exercise: setExercise, weight: parseFloat(setWeight), reps: parseInt(setReps) }); }); setSetWeight(""); setSetReps(""); };
  const removeSet = async (idx) => { await updateDay(day => { day.workoutSets.splice(idx, 1); }); };
  const saveWeeklyReview = async () => { if (!reviewWorked.trim() && !reviewDidnt.trim() && !reviewAdjust.trim()) return; const u = { ...data, days: { ...data.days }, weeklyReviews: { ...data.weeklyReviews } }; u.weeklyReviews[weekId] = { worked: reviewWorked.trim(), didnt: reviewDidnt.trim(), adjust: reviewAdjust.trim(), date: activeDate }; save(u); pushMeta(u); setReviewWorked(""); setReviewDidnt(""); setReviewAdjust(""); };

  const analyzeFood = async () => {
    if (!foodInput.trim()) return;
    setFoodLoading(true); setFoodError("");
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) { setFoodError("No API key configured. Add VITE_ANTHROPIC_API_KEY to .env"); setFoodLoading(false); return; }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: `You are a Filipino food nutrition expert. Analyze this food entry and return ONLY valid JSON, no other text:\n{"items":[{"name":"item name","qty":"amount","cal":number,"protein":number,"carbs":number,"fat":number}],"total":{"cal":number,"protein":number,"carbs":number,"fat":number}}\n\nUse common Filipino serving sizes. Round to whole numbers. If unclear amounts, assume typical single serving.\n\nFood: ${foodInput.trim()}` }] })
      });
      const result = await response.json();
      const text = result.content.map(c => c.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (parsed?.items && parsed?.total) {
        await updateDay(day => {
          day.foods.push({ id: Date.now().toString(), input: foodInput.trim(), items: parsed.items, total: parsed.total, time: new Date().toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", timeZone: timezone }) });
          day.lastMealTime = new Date().toISOString();
        });
        setFoodInput("");
      } else { setFoodError("Couldn't parse. Try again."); }
    } catch { setFoodError("Analysis failed. Try describing differently."); }
    setFoodLoading(false);
  };

  const removeFood = async (foodId) => { await updateDay(day => { day.foods = day.foods.filter(f => f.id !== foodId); }); };

  const getDateRange = (start, end) => {
    const dates = [];
    let d = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    while (d <= e) { dates.push(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
    return dates;
  };

  const generateExportText = () => {
    if (!exportStart || !exportEnd || exportStart > exportEnd) return;
    const dates = getDateRange(exportStart, exportEnd);
    const lines = dates.map(dateStr => {
      const dd = data?.days?.[dateStr] || defaultDay();
      const dt = new Date(dateStr + "T00:00:00");
      const dayName = dt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
      const cal = (dd.foods || []).reduce((a, f) => a + (f.total?.cal || 0), 0);
      const pro = (dd.foods || []).reduce((a, f) => a + (f.total?.protein || 0), 0);
      const stepVal = typeof dd.steps === "number" ? dd.steps : (dd.steps === true ? STEP_GOAL : 0);
      const parts = [`=== ${dayName} ===`];
      if (dd.weight) parts.push(`Weight: ${dd.weight} kg`);
      parts.push(`Calories: ${cal} / ${CAL_TARGET} target`);
      parts.push(`Protein: ${pro}g`);
      parts.push(`Water: ${dd.water || 0}/${WATER_GOAL} glasses`);
      parts.push(`Steps: ${stepVal.toLocaleString()} / ${STEP_GOAL.toLocaleString()} target`);
      if (dd.workout) parts.push(`Workout: ${WORKOUT_PROGRAM[dd.workoutDay]?.name || `Day ${dd.workoutDay}`} completed`);
      parts.push(`OMAD: ${dd.omad ? "Yes" : "No"} | Skincare: ${dd.skincare ? "Yes" : "No"}`);
      parts.push(`Hygiene: Brush AM ${dd.brushAM ? "✓" : "✗"} | PM ${dd.brushPM ? "✓" : "✗"} | Bath ${dd.bathing ? "✓" : "✗"}`);
      if (dd.note) parts.push(`Notes: ${dd.note}`);
      parts.push(`Points: ${getDayPoints(dd)}`);
      return parts.join("\n");
    });
    setExportText(lines.join("\n\n"));
  };

  const exportCSV = () => {
    if (!exportStart || !exportEnd || exportStart > exportEnd) return;
    const dates = getDateRange(exportStart, exportEnd);
    const header = "Date,Weight (kg),Calories,Protein (g),Water,Steps,Workout,OMAD,Skincare,Brush AM,Brush PM,Bathing,Laundry,Room Cleaned,Points,Notes";
    const rows = dates.map(dateStr => {
      const dd = data?.days?.[dateStr] || defaultDay();
      const cal = (dd.foods || []).reduce((a, f) => a + (f.total?.cal || 0), 0);
      const pro = (dd.foods || []).reduce((a, f) => a + (f.total?.protein || 0), 0);
      const stepVal = typeof dd.steps === "number" ? dd.steps : (dd.steps === true ? STEP_GOAL : 0);
      const wk = dd.workout ? (WORKOUT_PROGRAM[dd.workoutDay]?.name || `Day ${dd.workoutDay}`) : "";
      const note = (dd.note || "").replace(/"/g, '""');
      return `${dateStr},${dd.weight || ""},${cal},${pro},${dd.water || 0},${stepVal},${wk},${dd.omad ? "Yes" : "No"},${dd.skincare ? "Yes" : "No"},${dd.brushAM ? "Yes" : "No"},${dd.brushPM ? "Yes" : "No"},${dd.bathing ? "Yes" : "No"},${dd.laundry ? "Yes" : "No"},${dd.roomCleaned ? "Yes" : "No"},${getDayPoints(dd)},"${note}"`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `kensho-export-${exportStart}-to-${exportEnd}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const canvas = document.createElement("canvas"); const img = new Image();
    img.onload = async () => { const maxW = 400, scale = maxW / img.width; canvas.width = maxW; canvas.height = img.height * scale; canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height); const np = [...photos, { date: activeDate, data: canvas.toDataURL("image/jpeg", 0.7) }]; await savePhotos(np); };
    img.src = URL.createObjectURL(file);
  };

  const getDayTotals = (dayData) => (dayData?.foods || []).reduce((acc, f) => ({ cal: acc.cal + (f.total?.cal || 0), protein: acc.protein + (f.total?.protein || 0), carbs: acc.carbs + (f.total?.carbs || 0), fat: acc.fat + (f.total?.fat || 0) }), { cal: 0, protein: 0, carbs: 0, fat: 0 });
  const dayTotals = getDayTotals(td);
  const calPct = Math.min(100, Math.round((dayTotals.cal / CAL_TARGET) * 100));
  const calOver = dayTotals.cal > CAL_TARGET;

  const getStreak = () => { let s = 0, d = new Date(today + "T00:00:00"); while (true) { const k = d.toISOString().split("T")[0]; const dd = data?.days?.[k]; const stepsOk = dd && ((typeof dd.steps === 'number' && dd.steps >= STEP_GOAL) || dd.steps === true); const skincareOk = profile?.enableSkincare === false || dd?.skincare; const omadOk = !profile?.enableOmad || dd?.omad; if (dd && stepsOk && skincareOk && omadOk) { s++; d.setDate(d.getDate() - 1); } else break; } return s; };
  const weekWorkouts = () => { const ws = getWeekStart(activeDate); return Object.entries(data?.days || {}).filter(([date, d]) => getWeekStart(date) === ws && d.workout).length; };
  const latestWeight = () => { const e = Object.entries(data?.days || {}).filter(([_, d]) => d.weight).sort((a, b) => b[0].localeCompare(a[0])); return e.length > 0 ? e[0][1].weight : START_WEIGHT; };
  const weightHistory = () => Object.entries(data?.days || {}).filter(([_, d]) => d.weight).sort((a, b) => a[0].localeCompare(b[0])).slice(-20).map(([date, d]) => ({ date, weight: d.weight }));
  const completionRate = () => { const entries = Object.entries(data?.days || {}); if (!entries.length) return 0; let total = 0, done = 0; entries.forEach(([_, d]) => { total += 3; if ((typeof d.steps === 'number' && d.steps >= STEP_GOAL) || d.steps === true) done++; if (d.skincare) done++; if (d.omad) done++; }); return Math.round((done / total) * 100); };
  const nextMilestone = () => { if (!MILESTONES.length) return { kg: GOAL_WEIGHT, label: "Goal weight", emoji: "🎯", face: "" }; const cw = latestWeight(); for (const m of MILESTONES) { if (cw > m.kg) return m; } return MILESTONES[MILESTONES.length - 1]; };
  const getDayScore = (dateStr) => { const dd = data?.days?.[dateStr]; if (!dd) return 0; let s = 0; if ((typeof dd.steps === 'number' && dd.steps >= STEP_GOAL) || dd.steps === true) s++; if (dd.skincare) s++; if (dd.omad) s++; if (dd.workout) s++; return s; };

  const getDayPoints = (dd) => {
    if (!dd) return 0;
    let pts = 0;
    if (dd.brushAM) pts += 5;
    if (dd.brushPM) pts += 5;
    if (dd.bathing) pts += 10;
    if (dd.skincare) pts += 10;
    if (dd.workout) pts += 25;
    if (dd.water >= WATER_GOAL) pts += 10;
    if ((typeof dd.steps === 'number' && dd.steps >= STEP_GOAL) || dd.steps === true) pts += 15;
    if (dd.laundry) pts += 20;
    if (dd.roomCleaned) pts += 20;
    return pts;
  };
  const todayPoints = getDayPoints(td);
  const weekPoints = (() => { const wd = getWeekDates(activeDate); return wd.reduce((sum, d) => sum + getDayPoints(data?.days?.[d]), 0); })();
  const allTimePoints = Object.values(data?.days || {}).reduce((sum, d) => sum + getDayPoints(d), 0);

  const goDay = (offset) => setSelectedDate(shiftDate(activeDate, offset));
  const goToday = () => setSelectedDate(today);

  if (!profileLoaded || loading) return <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#6b7280", fontSize: 14 }}>Loading…</div></div>;

  // ── Sign-in portal for unauthenticated visitors ──
  if (fbEnabled && !fbUser) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <img src="/kensho-logo-white.png" alt="Kensho" style={{ width: 360, height: 360, objectFit: "contain", marginBottom: -16, opacity: 0.95 }} />
      <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 8px", letterSpacing: 1.5, textTransform: "uppercase" }}>Reveal Your True Nature</p>
      <p style={{ color: "#4b5563", fontSize: 13, margin: "0 0 32px", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>Track your fitness, nutrition, and daily habits. Personalized goals, AI-powered insights, and real-time sync across devices.</p>
      <button onClick={signIn} style={{ background: "linear-gradient(135deg, #34d399, #60a5fa)", border: "none", borderRadius: 14, padding: "14px 32px", color: "#030712", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>G</span> Sign in with Google
      </button>
      <p style={{ color: "#374151", fontSize: 11, marginTop: 8 }}>Your data syncs securely via Google account</p>
    </div>
  );

  if (needsOnboarding && fbUser) return <OnboardingWizard user={fbUser} onComplete={saveProfile} />;

  if (!data || !selectedDate) return <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#9ca3af" }}>Loading...</p></div>;

  const cw = latestWeight(); const lost = START_WEIGHT - cw; const remain = cw - GOAL_WEIGHT;
  const pct = Math.min(100, Math.max(0, Math.round((lost / (START_WEIGHT - GOAL_WEIGHT)) * 100)));
  const streak = getStreak(); const ww = weekWorkouts(); const nm = nextMilestone(); const wh = weightHistory();
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const calDays = getDaysInMonth(calMonth.year, calMonth.month);
  const calFirstDay = getFirstDayOfMonth(calMonth.year, calMonth.month);
  const calendarCells = []; for (let i = 0; i < calFirstDay; i++) calendarCells.push(null); for (let d = 1; d <= calDays; d++) calendarCells.push(d);
  const currentReview = data.weeklyReviews?.[weekId];
  const st = { card: { background: "rgba(17,24,39,0.5)", borderRadius: 16, padding: 16, border: "1px solid rgba(55,65,81,0.5)", marginBottom: 12 }, label: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 } };
  const inp = { background: "#1f2937", border: "1px solid #374151", borderRadius: 12, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const tzLabel = TIMEZONES.find(t => t.value === timezone)?.label || timezone;

  const DayNav = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, background: "rgba(17,24,39,0.6)", borderRadius: 14, padding: "8px 6px", border: "1px solid rgba(55,65,81,0.4)" }}>
      <button onClick={() => goDay(-1)} style={{ background: "rgba(31,41,55,0.8)", border: "1px solid #374151", borderRadius: 10, width: 36, height: 36, color: "#d1d5db", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
      <div style={{ textAlign: "center", flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? "#34d399" : "#e5e7eb" }}>{formatDateLabel(activeDate, today)}</div>
        <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace", marginTop: 1 }}>{activeDate}</div>
      </div>
      {!isToday && <button onClick={goToday} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 10, padding: "6px 10px", color: "#34d399", fontSize: 10, fontWeight: 700, cursor: "pointer", marginRight: 6 }}>TODAY</button>}
      <button onClick={() => goDay(1)} disabled={isFutureDate} style={{ background: "rgba(31,41,55,0.8)", border: "1px solid #374151", borderRadius: 10, width: 36, height: 36, color: isFutureDate ? "#374151" : "#d1d5db", fontSize: 16, cursor: isFutureDate ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isFutureDate ? 0.4 : 1 }}>›</button>
    </div>
  );

  const WeekDots = () => {
    const weekDates = getWeekDates(activeDate);
    const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
        {weekDates.map((d, i) => {
          const score = getDayScore(d);
          const isActive = d === activeDate;
          const isFut = d > today;
          let bg = "rgba(31,41,55,0.6)", color = "#4b5563";
          if (!isFut && score > 0) { if (score >= 3) { bg = "rgba(16,185,129,0.4)"; color = "#34d399"; } else { bg = "rgba(251,191,36,0.25)"; color = "#fbbf24"; } }
          return (
            <button key={d} onClick={() => !isFut && setSelectedDate(d)} style={{ width: 38, height: 44, borderRadius: 10, border: isActive ? "2px solid #34d399" : "1px solid transparent", background: bg, cursor: isFut ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, opacity: isFut ? 0.3 : 1 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color }}>{DAY_LABELS[i]}</span>
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, color: isActive ? "#34d399" : color }}>{d.slice(8)}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto" }}>
      {/* CUSTOM TITLE BAR */}
      {window.kensho?.isElectron && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", height: 32, WebkitAppRegion: "drag", background: "#030712", padding: "0 4px", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => window.kensho.minimize()} style={{ WebkitAppRegion: "no-drag", width: 36, height: 28, border: "none", background: "transparent", color: "#6b7280", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }} onMouseEnter={e => e.target.style.background = "#1f2937"} onMouseLeave={e => e.target.style.background = "transparent"}>─</button>
          <button onClick={() => window.kensho.maximize()} style={{ WebkitAppRegion: "no-drag", width: 36, height: 28, border: "none", background: "transparent", color: "#6b7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }} onMouseEnter={e => e.target.style.background = "#1f2937"} onMouseLeave={e => e.target.style.background = "transparent"}>☐</button>
          <button onClick={() => window.kensho.close()} style={{ WebkitAppRegion: "no-drag", width: 36, height: 28, border: "none", background: "transparent", color: "#6b7280", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }} onMouseEnter={e => { e.target.style.background = "#dc2626"; e.target.style.color = "#fff"; }} onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#6b7280"; }}>✕</button>
        </div>
      )}
      {/* HEADER */}
      <div style={{ background: "linear-gradient(to bottom,#111827,#030712)", padding: "20px 16px 16px", paddingTop: "calc(env(titlebar-area-height, 0px) + 20px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KenshoLogo />
            <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: 2 }}>KENSHO</h1><p style={{ fontSize: 9, color: "#6b7280", margin: "1px 0 0", letterSpacing: 1 }}>REVEAL YOUR TRUE NATURE</p></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={() => setShowTzPicker(!showTzPicker)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>{currentTime}</div>
              <div style={{ fontSize: 9, color: "#4b5563", marginTop: 1 }}>{tzLabel.split(") ")[0]})</div>
            </button>
            {isToday && fastingNow && <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>⏱ {fastingNow} fasted</div>}
          </div>
        </div>
        {showTzPicker && (
          <div style={{ marginTop: 10, background: "rgba(17,24,39,0.95)", borderRadius: 14, border: "1px solid #374151", padding: 8, maxHeight: 200, overflowY: "auto" }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "4px 8px", marginBottom: 4 }}>Select Timezone</div>
            {TIMEZONES.map(tz => (
              <button key={tz.value} onClick={() => saveTz(tz.value)} style={{ display: "block", width: "100%", textAlign: "left", background: timezone === tz.value ? "rgba(16,185,129,0.15)" : "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: timezone === tz.value ? "#34d399" : "#d1d5db", fontSize: 12, cursor: "pointer", marginBottom: 2 }}>
                {timezone === tz.value && "✓ "}{tz.label}
              </button>
            ))}
          </div>
        )}
        {/* AUTH / SYNC BAR */}
        {fbEnabled && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 8, minHeight: 24 }}>
            {fbUser ? (
              <>
                <span style={{ fontSize: 10, color: syncStatus === "synced" ? "#34d399" : syncStatus === "syncing" ? "#f59e0b" : syncStatus === "error" ? "#ef4444" : "#6b7280" }}>
                  {syncStatus === "synced" ? "☁️ Synced" : syncStatus === "syncing" ? "⏳ Syncing…" : syncStatus === "error" ? "⚠️ Sync error" : "☁️ Cloud"}
                </span>
                <span style={{ fontSize: 10, color: "#6b7280", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fbUser.displayName?.split(" ")[0]}</span>
                <button onClick={fbSignOut} style={{ fontSize: 10, color: "#6b7280", background: "transparent", border: "1px solid #374151", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>Sign Out</button>
              </>
            ) : (
              <button onClick={signIn} style={{ fontSize: 11, color: "#d1d5db", background: "rgba(17,24,39,0.7)", border: "1px solid #374151", borderRadius: 8, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.8 33.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.2-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.8-3.6-11.3-8.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.8 39.3 44 34 44 24c0-1.3-.2-2.6-.4-3.9z"/></svg>
                Sign in to sync
              </button>
            )}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280" }}><span>{START_WEIGHT}kg</span><span style={{ color: "#34d399", fontWeight: 700 }}>{cw}kg</span><span>{GOAL_WEIGHT}kg</span></div>
          <div style={{ width: "100%", height: 12, background: "#1f2937", borderRadius: 99, overflow: "hidden", marginTop: 4 }}><div style={{ height: "100%", background: "linear-gradient(to right,#059669,#34d399)", borderRadius: 99, width: `${pct}%`, transition: "width 0.5s" }} /></div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#6b7280", marginTop: 4 }}>{lost > 0 ? `${lost.toFixed(1)}kg lost` : "Log weight to start"} · {remain.toFixed(1)}kg to go</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          <div style={{ background: "rgba(17,24,39,0.7)", borderRadius: 16, padding: "10px 8px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: "#fb923c" }}>🔥 {streak}</div><div style={{ fontSize: 10, color: "#6b7280" }}>Streak</div></div>
          <div style={{ background: "rgba(17,24,39,0.7)", borderRadius: 16, padding: "10px 8px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: ww >= (profile?.workoutsPerWeek || maxDay) ? "#34d399" : "#6b7280" }}>💪 {ww}/{profile?.workoutsPerWeek || maxDay}</div><div style={{ fontSize: 10, color: "#6b7280" }}>This Week</div></div>
          <div style={{ background: "rgba(17,24,39,0.7)", borderRadius: 16, padding: "10px 8px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa" }}>📊 {completionRate()}%</div><div style={{ fontSize: 10, color: "#6b7280" }}>All-Time</div></div>
        </div>
      </div>

      {/* NAV */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2937", position: "sticky", top: 0, zIndex: 10, background: "rgba(3,7,18,0.97)" }}>
        {[["today", "Today"], ["food", "Food"], ["calendar", "Cal"], ["stats", "Stats"], ["plan", "Plan"], ["settings", "⚙️"]].map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: "12px 0", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: view === k ? "#34d399" : "#6b7280", borderBottom: view === k ? "2px solid #34d399" : "2px solid transparent" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 40px" }}>
        {/* ===== TODAY ===== */}
        {view === "today" && <>
          <DayNav />
          <WeekDots />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ background: "rgba(251,191,36,0.1)", borderRadius: 12, padding: "8px 6px", textAlign: "center", border: "1px solid rgba(251,191,36,0.2)" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24" }}>⭐ {todayPoints}</div><div style={{ fontSize: 9, color: "#6b7280" }}>Today</div></div>
            <div style={{ background: "rgba(139,92,246,0.1)", borderRadius: 12, padding: "8px 6px", textAlign: "center", border: "1px solid rgba(139,92,246,0.2)" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#a78bfa" }}>🏅 {weekPoints}</div><div style={{ fontSize: 9, color: "#6b7280" }}>This Week</div></div>
            <div style={{ background: "rgba(59,130,246,0.1)", borderRadius: 12, padding: "8px 6px", textAlign: "center", border: "1px solid rgba(59,130,246,0.2)" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#60a5fa" }}>🏆 {allTimePoints}</div><div style={{ fontSize: 9, color: "#6b7280" }}>All-Time</div></div>
          </div>
          {!isToday && <div style={{ background: "rgba(59,130,246,0.1)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(59,130,246,0.3)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: "#93c5fd" }}>📅 Viewing {formatDateLabel(activeDate, today)}</span><button onClick={goToday} style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "4px 10px", color: "#34d399", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Back to Today</button></div>}
          <div style={{ background: "linear-gradient(to right,rgba(49,46,129,0.3),rgba(88,28,135,0.3))", borderRadius: 16, padding: 16, border: "1px solid rgba(67,56,202,0.3)", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,139,250,0.6)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{isToday ? "Today's Reminder" : formatDateLabel(activeDate, today)}</div>
            <p style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.5, margin: 0 }}>{dailyReminder}</p>
          </div>
          {isToday && fastingNow && (profile?.enableFasting || profile?.enableOmad) && <div style={{ ...st.card, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(120,53,15,0.15)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 10, color: "#d97706", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Fasting Timer</div><div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", marginTop: 4 }}>⏱ {fastingNow}</div></div><div style={{ fontSize: 11, color: "#6b7280" }}>since last meal</div></div></div>}
          <div style={{ ...st.card, border: `1px solid ${calOver ? "rgba(239,68,68,0.4)" : "rgba(55,65,81,0.5)"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>🍽 CALORIES</span><span style={{ fontSize: 14, fontWeight: 700, color: calOver ? "#ef4444" : dayTotals.cal > 0 ? "#fbbf24" : "#6b7280" }}>{dayTotals.cal} / {CAL_TARGET}</span></div>
            <div style={{ width: "100%", height: 8, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", background: calOver ? "#ef4444" : calPct > 80 ? "#f59e0b" : "#10b981", borderRadius: 99, width: `${calPct}%`, transition: "width 0.3s" }} /></div>
            {dayTotals.cal > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#6b7280" }}><span>P: {dayTotals.protein}g</span><span>C: {dayTotals.carbs}g</span><span>F: {dayTotals.fat}g</span><span style={{ color: calOver ? "#ef4444" : "#6b7280" }}>{CAL_TARGET - dayTotals.cal > 0 ? `${CAL_TARGET - dayTotals.cal} left` : `${dayTotals.cal - CAL_TARGET} over`}</span></div>}
          </div>
          <div style={st.label}>Daily Habits</div>
          <div style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: `2px solid ${td.steps >= STEP_GOAL ? "rgba(16,185,129,0.5)" : "rgba(55,65,81,0.5)"}`, background: td.steps >= STEP_GOAL ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 99, border: `2px solid ${td.steps >= STEP_GOAL ? "#10b981" : "#4b5563"}`, background: td.steps >= STEP_GOAL ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, color: "#fff", fontWeight: 700 }}>{td.steps >= STEP_GOAL ? "✓" : ""}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb", margin: 0 }}>🚶 Steps</p>
              {td.steps > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: td.steps >= STEP_GOAL ? "#34d399" : "#fbbf24" }}>{td.steps.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>/ {STEP_GOAL.toLocaleString()}</span>
                  <button onClick={() => updateDay(day => { day.steps = 0; })} style={{ background: "transparent", border: "none", color: "#4b5563", fontSize: 11, cursor: "pointer", marginLeft: "auto" }}>Edit</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input type="number" placeholder="e.g. 7500" value={stepsInput} onChange={e => setStepsInput(e.target.value)} style={{ ...inp, flex: 1, padding: "8px 10px", fontSize: 13 }} onClick={e => e.stopPropagation()} />
                  <button onClick={logSteps} style={{ background: "#059669", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Log</button>
                </div>
              )}
            </div>
          </div>
          {profile?.enableSkincare !== false && (
            <button onClick={() => toggle("skincare")} style={{ width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 16, border: `2px solid ${td.skincare ? "rgba(16,185,129,0.5)" : "rgba(55,65,81,0.5)"}`, background: td.skincare ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 99, border: `2px solid ${td.skincare ? "#10b981" : "#4b5563"}`, background: td.skincare ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, color: "#fff", fontWeight: 700 }}>{td.skincare ? "✓" : ""}</div>
              <div><p style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb", margin: 0 }}>Skincare Routine</p><p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Cleanser → Moisturizer → Sunscreen (AM)</p></div>
            </button>
          )}
          {profile?.enableOmad && (
            <button onClick={() => toggle("omad")} style={{ width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 16, border: `2px solid ${td.omad ? "rgba(16,185,129,0.5)" : "rgba(55,65,81,0.5)"}`, background: td.omad ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 99, border: `2px solid ${td.omad ? "#10b981" : "#4b5563"}`, background: td.omad ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, color: "#fff", fontWeight: 700 }}>{td.omad ? "✓" : ""}</div>
              <div><p style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb", margin: 0 }}>OMAD — {CAL_TARGET} cal</p><p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>One meal, stay the course</p></div>
            </button>
          )}
          {profile?.enableHygiene !== false && <>
          <div style={{ ...st.label, marginTop: 16 }}>🧼 Hygiene</div>
          <div style={st.card}>
            {(profile?.hygieneItems || [{ name: "Brush teeth", emoji: "🪥", twiceDaily: true }, { name: "Shower/bathe", emoji: "🚿", twiceDaily: false }, { name: "Laundry", emoji: "👕", twiceDaily: false }, { name: "Clean room", emoji: "🧹", twiceDaily: false }]).map((rawItem, idx) => {
              const item = typeof rawItem === "string" ? { name: rawItem, emoji: "✅", twiceDaily: false } : rawItem;
              if (item.twiceDaily) {
                const amKey = `hygiene_${idx}_am`;
                const pmKey = `hygiene_${idx}_pm`;
                const amDone = td[amKey] || false;
                const pmDone = td[pmKey] || false;
                return (
                  <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <button onClick={() => updateDay(day => { day[amKey] = !day[amKey]; })} style={{ flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `2px solid ${amDone ? "rgba(16,185,129,0.5)" : "rgba(55,65,81,0.5)"}`, background: amDone ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 99, border: `2px solid ${amDone ? "#10b981" : "#4b5563"}`, background: amDone ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: "#fff", fontWeight: 700 }}>{amDone ? "✓" : ""}</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{item.emoji} {item.name}</span>
                      <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>AM</span>
                    </button>
                    <button onClick={() => updateDay(day => { day[pmKey] = !day[pmKey]; })} style={{ flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `2px solid ${pmDone ? "rgba(16,185,129,0.5)" : "rgba(55,65,81,0.5)"}`, background: pmDone ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 99, border: `2px solid ${pmDone ? "#10b981" : "#4b5563"}`, background: pmDone ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: "#fff", fontWeight: 700 }}>{pmDone ? "✓" : ""}</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{item.emoji} {item.name}</span>
                      <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>PM</span>
                    </button>
                  </div>
                );
              }
              const fieldKey = `hygiene_${idx}`;
              const isDone = td[fieldKey] || false;
              return (
                <button key={fieldKey} onClick={() => updateDay(day => { day[fieldKey] = !day[fieldKey]; })} style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 12, border: `2px solid ${isDone ? "rgba(16,185,129,0.5)" : "rgba(55,65,81,0.5)"}`, background: isDone ? "rgba(6,78,59,0.3)" : "rgba(17,24,39,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${isDone ? "#10b981" : "#4b5563"}`, background: isDone ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#fff", fontWeight: 700 }}>{isDone ? "✓" : ""}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>{item.emoji} {item.name}</span>
                </button>
              );
            })}
          </div>
          </>}
          <div style={{ ...st.label, marginTop: 16 }}>💧 Water ({td.water}/{WATER_GOAL} glasses)</div>
          <div style={st.card}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {Array.from({ length: WATER_GOAL }, (_, i) => (<button key={i} onClick={() => setWater(td.water === i + 1 ? i : i + 1)} style={{ width: 38, height: 42, borderRadius: 10, border: "none", cursor: "pointer", background: i < td.water ? "rgba(59,130,246,0.3)" : "rgba(31,41,55,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.2s" }}>{i < td.water ? "💧" : "○"}</button>))}
            </div>
            {td.water >= WATER_GOAL && <p style={{ textAlign: "center", fontSize: 11, color: "#60a5fa", marginTop: 8, fontWeight: 600 }}>✓ Hydration complete!</p>}
          </div>
          <div style={{ ...st.label, marginTop: 16 }}>Workout ({profile?.workoutsPerWeek || maxDay}x/week){WORKOUT_PROGRAM.block ? ` · ${WORKOUT_PROGRAM.block}` : ""}</div>
          {!td.workout ? (
            <div style={st.card}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 8px" }}>Did you train{isToday ? " today" : ` on ${formatDateLabel(activeDate, today)}`}?</p>
              <div style={{ display: "grid", gridTemplateColumns: maxDay > 2 ? "1fr 1fr" : "1fr 1fr", gap: 8 }}>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map(n => WORKOUT_PROGRAM[n] && (<button key={n} onClick={() => pickWorkout(n)} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 12, padding: "12px", color: "#d1d5db", fontSize: 13, cursor: "pointer", textAlign: "left" }}><div style={{ fontWeight: 700, marginBottom: 2 }}>{WORKOUT_PROGRAM[n].name}</div><div style={{ fontSize: 10, color: "#6b7280" }}>{WORKOUT_PROGRAM[n].time}{WORKOUT_PROGRAM[n].supersets ? ` · ${WORKOUT_PROGRAM[n].supersets.length} supersets` : ""}</div></button>))}
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(6,78,59,0.3)", borderRadius: 16, padding: 16, border: "2px solid rgba(16,185,129,0.5)", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>✅ {WORKOUT_PROGRAM[td.workoutDay]?.name || `Day ${td.workoutDay}`}</p><p style={{ margin: "4px 0 0", fontSize: 11, color: "#34d399" }}>Count down from 12. Squeeze one more.</p></div><button onClick={() => toggle("workout")} style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 11, cursor: "pointer" }}>Undo</button></div>
              <button onClick={() => updateDay(day => { day.warmupDone = !day.warmupDone; })} style={{ marginTop: 10, width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${td.warmupDone ? "rgba(16,185,129,0.4)" : "#374151"}`, background: td.warmupDone ? "rgba(6,78,59,0.2)" : "rgba(17,24,39,0.5)", color: td.warmupDone ? "#34d399" : "#9ca3af", fontSize: 12, cursor: "pointer", textAlign: "left" }}>{td.warmupDone ? "✅" : "⬜"} Dynamic Warm Up (~7 min)</button>
              {WORKOUT_PROGRAM[td.workoutDay]?.supersets.map(ss => {
                const checks = td.workoutChecks || {};
                const keyA = `s${ss.set}a`, keyB = `s${ss.set}b`;
                return (
                  <div key={ss.set} style={{ marginTop: 8, background: "rgba(17,24,39,0.4)", borderRadius: 10, padding: "8px 10px", border: "1px solid rgba(55,65,81,0.3)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Superset {ss.set} (×{ss.rounds})</div>
                    <button onClick={() => updateDay(day => { if (!day.workoutChecks) day.workoutChecks = {}; day.workoutChecks[keyA] = !day.workoutChecks[keyA]; })} style={{ width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 8, border: "none", background: checks[keyA] ? "rgba(16,185,129,0.15)" : "transparent", color: checks[keyA] ? "#34d399" : "#d1d5db", fontSize: 12, cursor: "pointer", marginBottom: 4, display: "flex", justifyContent: "space-between" }}><span>{checks[keyA] ? "✅" : "⬜"} A: {ss.a.name}</span><span style={{ color: "#6b7280", fontSize: 11 }}>{ss.a.reps}</span></button>
                    <button onClick={() => updateDay(day => { if (!day.workoutChecks) day.workoutChecks = {}; day.workoutChecks[keyB] = !day.workoutChecks[keyB]; })} style={{ width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 8, border: "none", background: checks[keyB] ? "rgba(16,185,129,0.15)" : "transparent", color: checks[keyB] ? "#34d399" : "#d1d5db", fontSize: 12, cursor: "pointer", display: "flex", justifyContent: "space-between" }}><span>{checks[keyB] ? "✅" : "⬜"} B: {ss.b.name}</span><span style={{ color: "#6b7280", fontSize: 11 }}>{ss.b.reps}</span></button>
                  </div>
                );
              })}
              <button onClick={() => updateDay(day => { day.cooldownDone = !day.cooldownDone; })} style={{ marginTop: 8, width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${td.cooldownDone ? "rgba(16,185,129,0.4)" : "#374151"}`, background: td.cooldownDone ? "rgba(6,78,59,0.2)" : "rgba(17,24,39,0.5)", color: td.cooldownDone ? "#34d399" : "#9ca3af", fontSize: 12, cursor: "pointer", textAlign: "left" }}>{td.cooldownDone ? "✅" : "⬜"} Cool Down (~5 min)</button>
              <button onClick={() => setShowSetLogger(!showSetLogger)} style={{ marginTop: 10, background: "rgba(17,24,39,0.5)", border: "1px solid #374151", borderRadius: 10, padding: "8px 12px", color: "#9ca3af", fontSize: 11, cursor: "pointer", width: "100%" }}>{showSetLogger ? "▾ Hide Set Logger" : "▸ Log Sets (optional)"}</button>
              {showSetLogger && <div style={{ marginTop: 10 }}>
                {(td.workoutSets || []).map((ws, idx) => (<div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12, color: "#d1d5db" }}><span>{ws.exercise}: {ws.weight}kg × {ws.reps}</span><button onClick={() => removeSet(idx)} style={{ background: "transparent", border: "none", color: "#4b5563", fontSize: 14, cursor: "pointer" }}>×</button></div>))}
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <select value={setExercise} onChange={e => setSetExercise(e.target.value)} style={{ ...inp, flex: "1 1 100%", padding: "8px 10px" }}><option value="">Exercise...</option>{(EXERCISES_DERIVED[td.workoutDay] || []).map(ex => <option key={ex} value={ex}>{ex}</option>)}<option value="Other">Other</option></select>
                  <input type="number" placeholder="kg" value={setWeight} onChange={e => setSetWeight(e.target.value)} style={{ ...inp, flex: "1 1 40%", padding: "8px 10px" }} />
                  <input type="number" placeholder="reps" value={setReps} onChange={e => setSetReps(e.target.value)} style={{ ...inp, flex: "1 1 40%", padding: "8px 10px" }} />
                </div>
                <button onClick={addSet} disabled={!setExercise || !setWeight || !setReps} style={{ marginTop: 6, width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 10, padding: "8px", color: "#d1d5db", fontSize: 12, cursor: "pointer", opacity: (!setExercise || !setWeight || !setReps) ? 0.4 : 1 }}>+ Add Set</button>
              </div>}
            </div>
          )}
          <div style={{ ...st.label, marginTop: 16 }}>Weight Check-in</div>
          <div style={st.card}><div style={st.label}>Weight Check-in</div>{td.weight && !editingWeight ? (<div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 700 }}>{td.weight} kg</div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Logged{isToday ? " today" : ` on ${activeDate}`}</div><div style={{ display: "flex", justifyContent: "center", gap: 8 }}><button onClick={() => { setWeightInput(String(td.weight)); setEditingWeight(true); }} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "5px 12px", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button><button onClick={unlogWeight} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "5px 12px", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Remove</button></div></div>) : (<div style={{ display: "flex", gap: 8 }}><input type="number" step="0.1" placeholder="e.g. 93.5" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ ...inp, flex: 1 }} /><button onClick={() => { logWeight(); setEditingWeight(false); }} style={{ background: "#059669", border: "none", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{editingWeight ? "Update" : "Log"}</button>{editingWeight && <button onClick={() => { setEditingWeight(false); setWeightInput(""); }} style={{ background: "#374151", border: "none", borderRadius: 12, padding: "10px 14px", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>Cancel</button>}</div>)}</div>
          <div style={st.card}><p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px" }}>Quick note</p>{td.note && !editingNote ? (<div><p style={{ fontSize: 13, color: "#d1d5db", fontStyle: "italic", margin: "0 0 8px" }}>"{td.note}"</p><div style={{ display: "flex", gap: 8 }}><button onClick={() => { setNoteInput(td.note); setEditingNote(true); }} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "5px 12px", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button><button onClick={unlogNote} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "5px 12px", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕ Remove</button></div></div>) : (<div style={{ display: "flex", gap: 8 }}><input type="text" placeholder="How you feel, what you learned..." value={noteInput} onChange={e => setNoteInput(e.target.value)} style={{ ...inp, flex: 1 }} /><button onClick={() => { logNote(); setEditingNote(false); }} style={{ background: "#374151", border: "none", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 13, cursor: "pointer" }}>{editingNote ? "Update" : "Save"}</button>{editingNote && <button onClick={() => { setEditingNote(false); setNoteInput(""); }} style={{ background: "rgba(75,85,99,0.3)", border: "none", borderRadius: 12, padding: "10px 14px", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>Cancel</button>}</div>)}</div>
          <div style={{ background: "linear-gradient(to right,rgba(120,53,15,0.2),rgba(154,52,18,0.2))", borderRadius: 16, padding: 16, border: "1px solid rgba(180,83,9,0.3)" }}>
            <div style={{ fontSize: 10, color: "rgba(251,191,36,0.7)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Next Milestone</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fcd34d", marginTop: 4 }}>{nm.emoji} {nm.label}</div>
            <div style={{ fontSize: 13, color: "rgba(252,211,77,0.6)", marginTop: 2 }}>{nm.face}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>{(cw - nm.kg).toFixed(1)}kg away</div>
          </div>
        </>}

        {/* ===== FOOD ===== */}
        {view === "food" && <>
          <DayNav />
          <WeekDots />
          <div style={{ ...st.card, border: `1px solid ${calOver ? "rgba(239,68,68,0.4)" : "rgba(55,65,81,0.5)"}` }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}><div style={{ fontSize: 32, fontWeight: 800, color: calOver ? "#ef4444" : dayTotals.cal > 0 ? "#fff" : "#6b7280" }}>{dayTotals.cal}</div><div style={{ fontSize: 12, color: "#6b7280" }}>of {CAL_TARGET} cal target</div></div>
            <div style={{ width: "100%", height: 10, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", background: calOver ? "#ef4444" : calPct > 80 ? "#f59e0b" : "#10b981", borderRadius: 99, width: `${calPct}%` }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#60a5fa" }}>{dayTotals.protein}g</div><div style={{ fontSize: 10, color: "#6b7280" }}>Protein</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24" }}>{dayTotals.carbs}g</div><div style={{ fontSize: 10, color: "#6b7280" }}>Carbs</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: "#f472b6" }}>{dayTotals.fat}g</div><div style={{ fontSize: 10, color: "#6b7280" }}>Fat</div></div>
            </div>
            {dayTotals.cal > 0 && <div style={{ textAlign: "center", marginTop: 8 }}><span style={{ fontSize: 12, color: calOver ? "#ef4444" : "#34d399", fontWeight: 600 }}>{calOver ? `${dayTotals.cal - CAL_TARGET} cal over ⚠️` : `${CAL_TARGET - dayTotals.cal} cal remaining ✓`}</span></div>}
          </div>
          <div style={st.card}>
            <div style={st.label}>🤖 AI Food Analysis</div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>Describe what you ate. Filipino food, fast food, anything.</p>
            <textarea placeholder={"e.g. 2 cups rice, chicken adobo (2 thighs),\n1 fried egg, glass of Coke"} value={foodInput} onChange={e => setFoodInput(e.target.value)} rows={3} style={{ ...inp, width: "100%", resize: "vertical" }} />
            <button onClick={analyzeFood} disabled={foodLoading || !foodInput.trim()} style={{ width: "100%", marginTop: 8, background: foodLoading ? "#374151" : "#059669", border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: foodLoading ? "wait" : "pointer", opacity: (!foodInput.trim() && !foodLoading) ? 0.5 : 1 }}>{foodLoading ? "🔄 Analyzing..." : "Analyze Food"}</button>
            {foodError && <p style={{ fontSize: 12, color: "#ef4444", margin: "8px 0 0" }}>{foodError}</p>}
          </div>
          <div style={st.label}>{isToday ? "Today's" : formatDateLabel(activeDate, today) + "'s"} Log</div>
          {(td.foods || []).length === 0 ? (<div style={{ textAlign: "center", padding: "32px 0" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🍽</div><p style={{ fontSize: 13, color: "#6b7280" }}>No food logged{isToday ? " yet" : ""}</p></div>) : (td.foods || []).map((food, idx) => (
            <div key={food.id || idx} style={st.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}><div><p style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", margin: 0 }}>{food.input}</p><p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>{food.time}</p></div><button onClick={() => removeFood(food.id)} style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>×</button></div>
              {(food.items || []).map((item, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: i === 0 ? "1px solid rgba(55,65,81,0.3)" : "none", fontSize: 12 }}><span style={{ color: "#d1d5db" }}>{item.name} {item.qty ? `(${item.qty})` : ""}</span><span style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{item.cal} cal</span></div>))}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(55,65,81,0.3)", paddingTop: 8, marginTop: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{food.total.cal} cal</span><div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6b7280" }}><span>P:{food.total.protein}g</span><span>C:{food.total.carbs}g</span><span>F:{food.total.fat}g</span></div></div>
            </div>
          ))}
        </>}

        {/* ===== CALENDAR ===== */}
        {view === "calendar" && <>
          <div style={st.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={() => { const m = calMonth.month === 0 ? 11 : calMonth.month - 1; setCalMonth({ year: calMonth.month === 0 ? calMonth.year - 1 : calMonth.year, month: m }); }} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "6px 12px", color: "#d1d5db", fontSize: 14, cursor: "pointer" }}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>{MONTH_NAMES[calMonth.month]} {calMonth.year}</span>
              <button onClick={() => { const m = calMonth.month === 11 ? 0 : calMonth.month + 1; setCalMonth({ year: calMonth.month === 11 ? calMonth.year + 1 : calMonth.year, month: m }); }} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "6px 12px", color: "#d1d5db", fontSize: 14, cursor: "pointer" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>{["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (<div key={d} style={{ textAlign: "center", fontSize: 10, color: "#6b7280", fontWeight: 600, padding: "4px 0" }}>{d}</div>))}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={`e${idx}`} />;
                const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const score = getDayScore(dateStr); const isActiveDay = dateStr === activeDate; const isTodayDate = dateStr === today; const isFuture = dateStr > today;
                let bg = "transparent", color = isFuture ? "#374151" : "#6b7280", border = "1px solid transparent";
                if (!isFuture && score > 0) { if (score === 4) { bg = "#059669"; color = "#fff"; } else if (score === 3) { bg = "rgba(16,185,129,0.5)"; color = "#fff"; } else if (score === 2) { bg = "rgba(251,191,36,0.3)"; color = "#fbbf24"; } else { bg = "rgba(251,191,36,0.15)"; color = "#d97706"; } }
                if (isTodayDate) border = "2px solid #34d399";
                if (isActiveDay && !isTodayDate) border = "2px solid #60a5fa";
                return <div key={dateStr} onClick={() => { if (!isFuture) { setSelectedDate(dateStr); setView("today"); } }} style={{ textAlign: "center", padding: "8px 2px", borderRadius: 8, background: bg, border, fontSize: 12, fontWeight: isTodayDate || isActiveDay ? 700 : 400, color, cursor: isFuture ? "default" : "pointer" }}>{day}</div>;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>{[{ bg: "#059669", label: "4/4" }, { bg: "rgba(16,185,129,0.5)", label: "3/4" }, { bg: "rgba(251,191,36,0.3)", label: "2/4" }, { bg: "rgba(251,191,36,0.15)", label: "1/4" }].map(({ bg, label }) => (<div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 4, background: bg }} /><span style={{ fontSize: 10, color: "#6b7280" }}>{label}</span></div>))}</div>
            <p style={{ fontSize: 10, color: "#4b5563", textAlign: "center", marginTop: 6 }}>Tap any date to view/edit · Steps · Skincare · OMAD · Workout</p>
          </div>
          <div style={st.card}><div style={st.label}>Month Summary</div>{(() => { let perfect = 0, partial = 0, missed = 0; for (let d = 1; d <= calDays; d++) { const ds = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (ds > today) continue; const sc = getDayScore(ds); if (sc === 4) perfect++; else if (sc > 0) partial++; else missed++; } return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{perfect}</div><div style={{ fontSize: 10, color: "#6b7280" }}>Perfect</div></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24" }}>{partial}</div><div style={{ fontSize: 10, color: "#6b7280" }}>Partial</div></div><div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#374151" }}>{missed}</div><div style={{ fontSize: 10, color: "#6b7280" }}>Missed</div></div></div>; })()}</div>
        </>}

        {/* ===== STATS ===== */}
        {view === "stats" && <>
          <div style={{ background: "linear-gradient(to right,rgba(49,46,129,0.3),rgba(88,28,135,0.3))", borderRadius: 16, padding: 16, border: "1px solid rgba(67,56,202,0.3)", marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: "rgba(167,139,250,0.6)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Core Principle</div><p style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.5, margin: 0 }}>{profile?.constantQuote || "The minimum effective dose: show up, track everything, trust the process."}</p></div>
          <div style={{ ...st.card, border: isSunday && !currentReview ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(55,65,81,0.5)", background: isSunday && !currentReview ? "rgba(120,53,15,0.1)" : "rgba(17,24,39,0.5)" }}>
            <div style={st.label}>{isSunday ? "📝 Weekly Review — It's Sunday!" : "📝 Weekly Review"}</div>
            {currentReview ? (<div>{currentReview.worked && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>What worked:</div><p style={{ fontSize: 12, color: "#d1d5db", margin: "2px 0 0" }}>{currentReview.worked}</p></div>}{currentReview.didnt && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>What didn't:</div><p style={{ fontSize: 12, color: "#d1d5db", margin: "2px 0 0" }}>{currentReview.didnt}</p></div>}{currentReview.adjust && <div><div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>Adjusting:</div><p style={{ fontSize: 12, color: "#d1d5db", margin: "2px 0 0" }}>{currentReview.adjust}</p></div>}<p style={{ fontSize: 10, color: "#4b5563", marginTop: 8 }}>Week of {weekId}</p></div>) : (<div><input placeholder="What worked this week?" value={reviewWorked} onChange={e => setReviewWorked(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 6 }} /><input placeholder="What didn't work?" value={reviewDidnt} onChange={e => setReviewDidnt(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 6 }} /><input placeholder="One thing to adjust next week?" value={reviewAdjust} onChange={e => setReviewAdjust(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 8 }} /><button onClick={saveWeeklyReview} style={{ width: "100%", background: "#059669", border: "none", borderRadius: 12, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Review</button></div>)}
          </div>
          {Object.keys(data.weeklyReviews || {}).length > 0 && (<div style={st.card}><div style={st.label}>Past Reviews</div>{Object.entries(data.weeklyReviews).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).map(([wk, r]) => (<div key={wk} style={{ padding: "8px 0", borderBottom: "1px solid rgba(55,65,81,0.3)" }}><div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>{wk}</div>{r.worked && <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0" }}>✓ {r.worked}</p>}{r.didnt && <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0" }}>✗ {r.didnt}</p>}{r.adjust && <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0" }}>→ {r.adjust}</p>}</div>))}</div>)}
          <div style={st.card}><div style={st.label}>Weight History</div>{wh.length > 1 ? (<svg viewBox="0 0 300 120" style={{ width: "100%", height: 140 }}>{(() => { const ws = wh.map(w => w.weight); const mn = Math.min(...ws, GOAL_WEIGHT) - 1; const mx = Math.max(...ws) + 1; const rng = mx - mn; const goalY = 110 - ((GOAL_WEIGHT - mn) / rng) * 90; const pts = wh.map((w, i) => ({ x: 20 + (i / (wh.length - 1)) * 260, y: 110 - ((w.weight - mn) / rng) * 90, w: w.weight })); return <><line x1="20" y1={goalY} x2="280" y2={goalY} stroke="#10b981" strokeWidth="0.5" strokeDasharray="4,4" /><text x="282" y={goalY + 3} fill="#10b981" fontSize="8">{GOAL_WEIGHT}kg</text><polyline fill="none" stroke="#10b981" strokeWidth="2" points={pts.map(p => `${p.x},${p.y}`).join(" ")} />{pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10b981" />)}{pts.filter((_, i) => i === 0 || i === pts.length - 1).map((p, i) => <text key={`t${i}`} x={p.x} y={p.y - 8} fill="#9ca3af" fontSize="8" textAnchor="middle">{p.w}kg</text>)}</>; })()}</svg>) : <p style={{ textAlign: "center", color: "#4b5563", padding: "24px 0", fontSize: 13 }}>Log weight 2+ days to see chart</p>}</div>
          <div style={st.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={st.label}>📸 Progress Photos</div><div><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} /><button onClick={() => fileRef.current?.click()} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 10, padding: "6px 12px", color: "#d1d5db", fontSize: 11, cursor: "pointer" }}>+ Add Photo</button></div></div>
            {photos.length === 0 ? (<p style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "16px 0" }}>Take a monthly progress photo to see changes over time</p>) : (<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>{photos.map((p, i) => (<div key={i} onClick={() => setPhotoView(photoView === i ? null : i)} style={{ cursor: "pointer", position: "relative" }}><img src={p.data} style={{ width: "100%", borderRadius: 8, display: "block" }} /><div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#d1d5db" }}>{p.date.slice(5)}</div></div>))}</div>)}
            {photoView !== null && photos[photoView] && (<div style={{ marginTop: 8 }}><img src={photos[photoView].data} style={{ width: "100%", borderRadius: 12 }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}><span style={{ fontSize: 12, color: "#9ca3af" }}>{photos[photoView].date}</span><button onClick={async () => { const np = photos.filter((_, i) => i !== photoView); await savePhotos(np); setPhotoView(null); }} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Delete</button></div></div>)}
          </div>
          <div style={st.card}><div style={st.label}>Face Milestones</div>{MILESTONES.map(m => { const reached = cw <= m.kg; return (<div key={m.kg} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 0", opacity: reached ? 1 : 0.4 }}><div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${reached ? "#10b981" : "#4b5563"}`, background: reached ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#fff", fontWeight: 700 }}>{reached ? "✓" : ""}</div><div><div style={{ fontSize: 13, fontWeight: 600, color: reached ? "#fff" : "#9ca3af" }}>{m.emoji} {m.label} — {m.kg}kg</div><div style={{ fontSize: 11, color: "#6b7280" }}>{m.face}</div></div></div>); })}</div>
          <div style={st.card}><div style={st.label}>Last 7 Days</div>{Array.from({ length: 7 }, (_, i) => { const d = new Date(today + "T00:00:00"); d.setDate(d.getDate() - i); const k = d.toISOString().split("T")[0]; const dd = data.days[k]; const name = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }); const stepsOk = dd && ((typeof dd.steps === 'number' && dd.steps >= STEP_GOAL) || dd.steps === true); const checks = dd ? [stepsOk, dd.skincare, dd.omad].filter(Boolean).length : 0; const stepVal = dd ? (typeof dd.steps === 'number' ? dd.steps : (dd.steps === true ? STEP_GOAL : 0)) : 0; const dayCal = (dd?.foods || []).reduce((a, f) => a + (f.total?.cal || 0), 0); const w = dd?.water || 0; return (<div key={k} onClick={() => { setSelectedDate(k); setView("today"); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", cursor: "pointer" }}><span style={{ fontSize: 12, color: "#9ca3af" }}>{name}</span><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{stepVal > 0 && <span style={{ fontSize: 10, color: stepVal >= STEP_GOAL ? "#10b981" : "#6b7280" }}>🚶{(stepVal/1000).toFixed(1)}k</span>}{dayCal > 0 && <span style={{ fontSize: 10, color: dayCal > CAL_TARGET ? "#ef4444" : "#6b7280" }}>{dayCal}cal</span>}{w > 0 && <span style={{ fontSize: 10, color: "#60a5fa" }}>💧{w}</span>}{dd?.workout && <span style={{ fontSize: 10, background: "rgba(37,99,235,0.2)", color: "#60a5fa", padding: "2px 6px", borderRadius: 99 }}>D{dd.workoutDay}</span>}<div style={{ display: "flex", gap: 3 }}>{[0,1,2].map(j => <div key={j} style={{ width: 8, height: 8, borderRadius: 99, background: j < checks ? "#10b981" : "#374151" }} />)}</div>{dd?.weight && <span style={{ fontSize: 10, color: "#6b7280" }}>{dd.weight}kg</span>}</div></div>); })}</div>
          <div style={st.card}>
            <div style={st.label}>📤 Export for Coach Mike</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: "#6b7280", display: "block", marginBottom: 4 }}>Start</label><input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} style={{ ...inp, width: "100%", padding: "8px 10px" }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: "#6b7280", display: "block", marginBottom: 4 }}>End</label><input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} style={{ ...inp, width: "100%", padding: "8px 10px" }} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={generateExportText} disabled={!exportStart || !exportEnd} style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 12, padding: "10px", color: "#d1d5db", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!exportStart || !exportEnd) ? 0.4 : 1 }}>📋 Plain Text</button>
              <button onClick={exportCSV} disabled={!exportStart || !exportEnd} style={{ background: "#059669", border: "none", borderRadius: 12, padding: "10px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!exportStart || !exportEnd) ? 0.4 : 1 }}>📥 CSV Download</button>
            </div>
            {exportText && <div style={{ marginTop: 10 }}><textarea value={exportText} readOnly rows={12} style={{ ...inp, width: "100%", fontSize: 11, fontFamily: "monospace", resize: "vertical" }} onClick={e => e.target.select()} /><p style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>Click text to select all, then copy</p></div>}
          </div>
          <button onClick={async () => { if (confirm("Erase ALL tracker data?")) { await save({ days: {}, startDate: getNowInTz(timezone), weeklyReviews: {} }); await savePhotos([]); } }} style={{ width: "100%", background: "transparent", border: "none", color: "#374151", fontSize: 11, padding: 16, cursor: "pointer" }}>Reset All Data</button>
        </>}

        {/* ===== PLAN ===== */}
        {view === "plan" && <PlanView profile={profile} saveProfile={saveProfile} latestWeight={latestWeight()} />}

        {/* ===== SETTINGS ===== */}
        {view === "settings" && <SettingsPage profile={profile} saveProfile={saveProfile} timezone={timezone} onTimezoneChange={saveTz} onSignOut={fbSignOut} />}
      </div>
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><KenshoTracker /></ErrorBoundary>;
}
