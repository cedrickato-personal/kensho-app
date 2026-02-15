export const WORKOUT_TEMPLATES = {
  "coach-mike-2day": {
    id: "coach-mike-2day",
    name: "Coach Mike's 2-Day Full Body",
    desc: "Dumbbell + bench supersets, 2×/week, ~31 min each",
    emoji: "🏋️",
    daysPerWeek: 2,
    program: {
      block: "",
      1: {
        name: "Day 1 — Dumbbell Only",
        time: "~31 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Front Squat", reps: "6-10" }, b: { name: "Dumbbell Bent Over Row", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Goblet Side Lunge", reps: "6-10 each" }, b: { name: "Dumbbell Bent Over Reverse Fly", reps: "12-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Supinating Bicep Curl", reps: "8-12" }, b: { name: "Weighted Straight Leg Crunch", reps: "12-20" } },
        ],
      },
      2: {
        name: "Day 2 — Bench + Dumbbell",
        time: "~31 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Romanian Deadlift", reps: "6-10" }, b: { name: "Dumbbell Bench Press", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Hip Thrust", reps: "8-12" }, b: { name: "Dumbbell Standing Shoulder Press", reps: "8-12" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Lateral Raise", reps: "12-20" }, b: { name: "Dumbbell Lying Tricep Extension", reps: "12-20" } },
        ],
      },
      warmup: ["Jumping Jacks", "Arm Circles", "Leg Swings", "Hip Circles", "Bodyweight Squats", "Torso Twists"],
      cooldown: ["Quad Stretch", "Hamstring Stretch", "Chest Stretch", "Shoulder Stretch", "Hip Flexor Stretch", "Calf Stretch", "Child's Pose"],
    },
  },
  "ppl-3day": {
    id: "ppl-3day",
    name: "Push / Pull / Legs",
    desc: "Classic 3-day split, great for intermediate lifters",
    emoji: "💪",
    daysPerWeek: 3,
    program: {
      block: "",
      1: {
        name: "Day 1 — Push",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Bench Press", reps: "8-12" }, b: { name: "Dumbbell Standing Shoulder Press", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Incline Dumbbell Press", reps: "8-12" }, b: { name: "Dumbbell Lateral Raise", reps: "12-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Lying Tricep Extension", reps: "10-15" }, b: { name: "Push-Ups", reps: "to failure" } },
        ],
      },
      2: {
        name: "Day 2 — Pull",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Bent Over Row", reps: "8-12" }, b: { name: "Dumbbell Reverse Fly", reps: "12-15" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Pullover", reps: "8-12" }, b: { name: "Dumbbell Shrug", reps: "12-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Supinating Bicep Curl", reps: "8-12" }, b: { name: "Dumbbell Hammer Curl", reps: "10-12" } },
        ],
      },
      3: {
        name: "Day 3 — Legs",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Front Squat", reps: "8-12" }, b: { name: "Dumbbell Romanian Deadlift", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Goblet Side Lunge", reps: "8-10 each" }, b: { name: "Dumbbell Hip Thrust", reps: "10-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Calf Raise", reps: "15-20" }, b: { name: "Weighted Straight Leg Crunch", reps: "15-20" } },
        ],
      },
      warmup: ["Jumping Jacks", "Arm Circles", "Leg Swings", "Hip Circles", "Bodyweight Squats", "Torso Twists"],
      cooldown: ["Quad Stretch", "Hamstring Stretch", "Chest Stretch", "Shoulder Stretch", "Hip Flexor Stretch", "Calf Stretch", "Child's Pose"],
    },
  },
  "full-body-3day": {
    id: "full-body-3day",
    name: "Full Body 3-Day",
    desc: "3 different full body sessions per week, balanced approach",
    emoji: "🔄",
    daysPerWeek: 3,
    program: {
      block: "",
      1: {
        name: "Day A — Squat Focus",
        time: "~35 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Front Squat", reps: "6-10" }, b: { name: "Dumbbell Bench Press", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Romanian Deadlift", reps: "8-12" }, b: { name: "Dumbbell Bent Over Row", reps: "8-12" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Supinating Bicep Curl", reps: "10-12" }, b: { name: "Dumbbell Lying Tricep Extension", reps: "10-15" } },
        ],
      },
      2: {
        name: "Day B — Press Focus",
        time: "~35 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Standing Shoulder Press", reps: "8-12" }, b: { name: "Dumbbell Hip Thrust", reps: "10-15" } },
          { set: 2, rounds: 3, a: { name: "Incline Dumbbell Press", reps: "8-12" }, b: { name: "Goblet Side Lunge", reps: "8-10 each" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Lateral Raise", reps: "12-20" }, b: { name: "Weighted Straight Leg Crunch", reps: "12-20" } },
        ],
      },
      3: {
        name: "Day C — Hinge Focus",
        time: "~35 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Romanian Deadlift", reps: "6-10" }, b: { name: "Dumbbell Bench Press", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Front Squat", reps: "8-12" }, b: { name: "Dumbbell Reverse Fly", reps: "12-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Hammer Curl", reps: "10-12" }, b: { name: "Dumbbell Calf Raise", reps: "15-20" } },
        ],
      },
      warmup: ["Jumping Jacks", "Arm Circles", "Leg Swings", "Hip Circles", "Bodyweight Squats", "Torso Twists"],
      cooldown: ["Quad Stretch", "Hamstring Stretch", "Chest Stretch", "Shoulder Stretch", "Hip Flexor Stretch", "Calf Stretch", "Child's Pose"],
    },
  },
  "upper-lower-4day": {
    id: "upper-lower-4day",
    name: "Upper / Lower 4-Day",
    desc: "4-day split alternating upper and lower body",
    emoji: "⚡",
    daysPerWeek: 4,
    program: {
      block: "",
      1: {
        name: "Day 1 — Upper A",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Bench Press", reps: "6-10" }, b: { name: "Dumbbell Bent Over Row", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Standing Shoulder Press", reps: "8-12" }, b: { name: "Dumbbell Reverse Fly", reps: "12-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Supinating Bicep Curl", reps: "10-12" }, b: { name: "Dumbbell Lying Tricep Extension", reps: "10-15" } },
        ],
      },
      2: {
        name: "Day 2 — Lower A",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Front Squat", reps: "6-10" }, b: { name: "Dumbbell Romanian Deadlift", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Goblet Side Lunge", reps: "8-10 each" }, b: { name: "Dumbbell Hip Thrust", reps: "10-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Calf Raise", reps: "15-20" }, b: { name: "Weighted Straight Leg Crunch", reps: "15-20" } },
        ],
      },
      3: {
        name: "Day 3 — Upper B",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Incline Dumbbell Press", reps: "8-12" }, b: { name: "Dumbbell Pullover", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Lateral Raise", reps: "12-20" }, b: { name: "Dumbbell Shrug", reps: "12-15" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Hammer Curl", reps: "10-12" }, b: { name: "Push-Ups", reps: "to failure" } },
        ],
      },
      4: {
        name: "Day 4 — Lower B",
        time: "~40 min",
        supersets: [
          { set: 1, rounds: 3, a: { name: "Dumbbell Romanian Deadlift", reps: "6-10" }, b: { name: "Dumbbell Front Squat", reps: "8-12" } },
          { set: 2, rounds: 3, a: { name: "Dumbbell Hip Thrust", reps: "10-15" }, b: { name: "Goblet Side Lunge", reps: "8-10 each" } },
          { set: 3, rounds: 3, a: { name: "Dumbbell Calf Raise", reps: "15-20" }, b: { name: "Weighted Straight Leg Crunch", reps: "15-20" } },
        ],
      },
      warmup: ["Jumping Jacks", "Arm Circles", "Leg Swings", "Hip Circles", "Bodyweight Squats", "Torso Twists"],
      cooldown: ["Quad Stretch", "Hamstring Stretch", "Chest Stretch", "Shoulder Stretch", "Hip Flexor Stretch", "Calf Stretch", "Child's Pose"],
    },
  },
};

// Helper: get max workout day number for a template
export function getMaxDay(program) {
  let max = 0;
  for (const key of Object.keys(program)) {
    const n = parseInt(key);
    if (!isNaN(n) && n > max) max = n;
  }
  return max;
}
