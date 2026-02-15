// ── CK's current hardcoded values (for migration) ──
export const CK_PROFILE = {
  displayName: "CK",
  onboardingComplete: true,
  goalWeight: 75,
  startWeight: 94,
  calTarget: 1850,
  waterGoal: 8,
  stepGoal: 7000,
  workoutsPerWeek: 2,
  workoutTemplateId: "coach-mike-2day",
  enableSkincare: true,
  enableOmad: true,
  enableFasting: true,
  enableHygiene: true,
  hygieneItems: [
    { name: "Brush teeth", emoji: "🪥", twiceDaily: true },
    { name: "Shower/bathe", emoji: "🚿", twiceDaily: false },
    { name: "Laundry", emoji: "👕", twiceDaily: false },
    { name: "Clean room", emoji: "🧹", twiceDaily: false },
  ],
  milestones: [
    { kg: 90, label: "First 4kg down", emoji: "🔥", face: "Neck thins out, clothes looser" },
    { kg: 88, label: "People notice", emoji: "👀", face: "Under-chin tightens, jawline hints" },
    { kg: 85, label: "20% body fat", emoji: "💪", face: "\"Have you lost weight?\" begins" },
    { kg: 80, label: "Transformation zone", emoji: "✨", face: "Cheekbones visible, jawline defined" },
    { kg: 75, label: "K-Drama Territory", emoji: "🏆", face: "Sharp jaw, cheekbones, the full look" },
  ],
  constantQuote: "Never exercise without feeding your brain. Your strengths — Input, Intellection, Learner, Ideation — demand it. Walks are study time. Workouts are K-drama time. Dead time guarantees quitting.",
  dailyReminders: [
    "Two walks today. That's it. Podcast on, shoes on, door open.",
    "Your jawline is under there. Every step carves it out.",
    "The guy at 75kg is being built right now. By you.",
    "Put K-drama on screen 2. Do a set. Watch during rest. Repeat.",
    "You don't need motivation. You need shoes and a podcast.",
    "Today's walk is tomorrow's cheekbone.",
    "Don't count up from 1. Count down from 12. Squeeze one more.",
    "Your brain wants stimulation, not rest. Feed it while you move.",
    "One meal. Two walks. Two workouts this week. That's the whole plan.",
    "The awkward hair phase is temporary. The discipline isn't.",
    "You're not fighting your nature anymore. You're using it.",
    "Skip the perfect routine. Just put on shoes.",
    "94 → 75. You've already started. Keep the line moving down.",
    "Every podcast episode you finish on a walk is 300+ calories gone.",
    "Coach Mike's program works. But only if you show up.",
    "Discomfort at rep 10 isn't danger. It's where growth lives.",
    "The mirror lies daily. The scale lies weekly. The trend never lies.",
    "Your Learner strength craves progress. Log it. See the data move.",
    "3 green dots today. That's the mission. Everything else is bonus.",
    "The barber trim keeps the flow clean. The walks keep the jaw sharp.",
    "Rest days aren't cheat days. OMAD still counts.",
    "Morning walk: Coursera lecture. Evening walk: decompress podcast.",
    "You chose the minimum effective dose. Now be effective at the minimum.",
    "Your Input strength collects knowledge. Collect steps too.",
    "Imagine the fit check at 80kg with shoulder-length waves. Keep going.",
    "Two sessions this week. Not three. Not four. Two done well.",
    "The PHP 10,000 test: could you do 2 more reps? Then do them.",
    "Stop when your muscles fail, not when your brain complains.",
    "Consistency > intensity. Always.",
    "You're an architect. You're rebuilding the structure. Trust the blueprint.",
    "Cleanser tonight. Moisturizer. Sunscreen tomorrow. Non-negotiable.",
  ],
  cliftonStrengths: {
    top5: [
      { rank: 1, name: "Input", domain: "Strategic Thinking", color: "#8b5cf6", emoji: "📥", desc: "You collect and archive everything — information, ideas, resources.", fitness: "Track every meal, every rep, every step. Your data archive IS your edge. The more you log, the sharper your decisions." },
      { rank: 2, name: "Intellection", domain: "Strategic Thinking", color: "#8b5cf6", emoji: "🧠", desc: "You need mental activity. Deep thinking is your natural state.", fitness: "Walks aren't just cardio — they're thinking time. Podcasts, audiobooks, strategy sessions with yourself. Pair movement with mental fuel." },
      { rank: 3, name: "Connectedness", domain: "Relationship Building", color: "#3b82f6", emoji: "🔗", desc: "You see how everything is linked. Nothing happens in isolation.", fitness: "Your body, your confidence, Arcadia, your future relationships — they're all one system. Every rep connects to the man at 75kg who builds cities." },
      { rank: 4, name: "Learner", domain: "Strategic Thinking", color: "#8b5cf6", emoji: "📚", desc: "The process of learning excites you more than the outcome.", fitness: "Treat fitness as a subject to master. Study form, nutrition science, recovery. The learning curve from 95kg → 75kg is your classroom." },
      { rank: 5, name: "Ideation", domain: "Strategic Thinking", color: "#8b5cf6", emoji: "💡", desc: "You see connections others miss. New perspectives energize you.", fitness: "You built this tracker. You reimagined walks as podcast university. Keep innovating your approach — that creativity prevents plateaus." },
    ],
    top10Additional: ["#6 Context", "#7 Futuristic", "#8 Relator", "#9 Maximizer", "#10 Analytical"],
    domains: [
      { label: "Strategic Thinking", count: 4, color: "#8b5cf6" },
      { label: "Relationship Building", count: 1, color: "#3b82f6" },
    ],
    summary: "You lead with Strategic Thinking — you absorb, analyze, and decide. Your fitness advantage isn't discipline or willpower. It's intelligence applied to the body. Track smarter. Think deeper. Connect everything.",
  },
  planSections: [
    { id: "protocol", title: "Minimum Effective Protocol", icon: "📋", color: "rgba(16,185,129,0.3)", items: [
      { title: "7,000 steps daily", desc: "Two walks with podcasts or Coursera. Morning + evening." },
      { title: "2 full body sessions/week", desc: "Coach Mike's superset program. Day 1 (DB Only) + Day 2 (Bench+DB)." },
      { title: "OMAD at 1,850 cal", desc: "Switch to 2,200-2,400 cal maintenance at 75kg." },
      { title: "8 glasses of water", desc: "Spread throughout the day. Suppresses hunger during fasting." },
      { title: "Skincare every night", desc: "Cleanser → Moisturizer. Sunscreen in AM." },
      { title: "Hygiene basics", desc: "Brush AM+PM, daily bath, weekly laundry + room clean." },
    ]},
    { id: "overload", title: "Progressive Overload", icon: "💪", color: "rgba(251,191,36,0.3)", content: "Hit 12 reps with good form → add 1-2kg → drop to 8 reps → build back up.\nCount DOWN from 12. Your brain lies at 60%." },
    { id: "timeline", title: "Timeline", icon: "⏱", color: "rgba(251,113,133,0.3)", items: [
      { title: "2 sessions + 7k steps", desc: "75kg in 9-10 months" },
      { title: "3 sessions + 7k steps", desc: "8 months" },
      { title: "4 sessions + 7k steps", desc: "7 months" },
    ]},
  ],
};

// ── Generic defaults for new users ──
export const DEFAULT_PROFILE = {
  displayName: "",
  onboardingComplete: false,
  goalWeight: 70,
  startWeight: 85,
  calTarget: 2000,
  waterGoal: 8,
  stepGoal: 10000,
  workoutsPerWeek: 3,
  workoutTemplateId: "full-body-3day",
  enableSkincare: true,
  enableOmad: false,
  enableFasting: false,
  enableHygiene: true,
  hygieneItems: [
    { name: "Brush teeth", emoji: "🪥", twiceDaily: true },
    { name: "Shower/bathe", emoji: "🚿", twiceDaily: false },
    { name: "Laundry", emoji: "👕", twiceDaily: false },
    { name: "Clean room", emoji: "🧹", twiceDaily: false },
  ],
  workoutProgram: null, // filled from template selection
  milestones: [], // auto-generated
  constantQuote: "The minimum effective dose: show up, track everything, trust the process.",
  dailyReminders: [
    "Put on your shoes. That's step one.",
    "Your future self is watching. Make them proud.",
    "Consistency beats intensity. Always.",
    "One good meal. One good walk. One good choice.",
    "You don't need motivation. You need momentum.",
    "The scale moves slowly. The habits move fast.",
    "Log it. If you didn't track it, it didn't happen.",
    "Drink water. Walk. Repeat.",
    "Every step counts. Literally.",
    "Your body is adapting. Trust the process.",
    "Small daily improvements compound into massive results.",
    "Don't aim for perfect. Aim for better than yesterday.",
    "Rest is part of the plan. Not a break from it.",
    "The hardest part is starting. You've already done that.",
    "One rep at a time. One meal at a time. One day at a time.",
    "Sleep, water, movement — the non-negotiables.",
    "You chose this. Own it.",
    "Progress photos don't lie. Take one today.",
    "The goal isn't to be perfect. It's to never quit.",
    "You're stronger than your excuses.",
  ],
  cliftonStrengths: null,
  planSections: [],
};

// ── Auto-generate milestones from start/goal weight ──
export function generateMilestones(startWeight, goalWeight) {
  const total = startWeight - goalWeight;
  if (total <= 0) return [];
  const steps = [0.2, 0.4, 0.6, 0.8, 1.0];
  const emojis = ["🔥", "👀", "💪", "✨", "🏆"];
  const labels = ["Getting Started", "People Notice", "Halfway There", "Transformation Zone", "Goal Reached!"];
  const faces = [
    "Clothes start fitting looser",
    "Friends start commenting",
    "Visible changes in the mirror",
    "Major physical transformation",
    "You did it. New chapter begins.",
  ];
  return steps.map((pct, i) => ({
    kg: Math.round(startWeight - total * pct),
    label: labels[i],
    emoji: emojis[i],
    face: faces[i],
  }));
}

// ── Timezones (shared across all users) ──
export const TIMEZONES = [
  { value: "Asia/Manila", label: "🇵🇭 Philippines (PHT)" },
  { value: "America/New_York", label: "🇺🇸 Eastern (EST/EDT)" },
  { value: "America/Chicago", label: "🇺🇸 Central (CST/CDT)" },
  { value: "America/Denver", label: "🇺🇸 Mountain (MST/MDT)" },
  { value: "America/Los_Angeles", label: "🇺🇸 Pacific (PST/PDT)" },
  { value: "UTC", label: "🌐 UTC" },
  { value: "Asia/Tokyo", label: "🇯🇵 Japan (JST)" },
  { value: "Asia/Singapore", label: "🇸🇬 Singapore (SGT)" },
  { value: "Australia/Sydney", label: "🇦🇺 Sydney (AEST)" },
  { value: "Europe/London", label: "🇬🇧 London (GMT/BST)" },
];

export const PROFILE_KEY = "kensho-profile-v1";
