import { CommunityHabit, ProgramWeek, ExerciseFormGuide } from '@/types/habit';
import { HABIT_COLORS } from '@/constants/colors';

const splitFormGuides: Record<string, ExerciseFormGuide> = {
  'Barbell Bench Press': {
    musclesWorked: ['Chest', 'Front Delts', 'Triceps'],
    setup: 'Lie flat on the bench with eyes directly under the bar. Feet planted, shoulder blades retracted and pinched down into the bench, slight arch in upper back. Grip the bar slightly wider than shoulder-width.',
    steps: ['Unrack the bar and hold it stacked over your shoulders', 'Lower the bar in a controlled arc to your mid-chest/nipple line', 'Touch chest lightly — no bouncing', 'Press the bar up and slightly back toward your face', 'Lock out arms at the top, keeping shoulder blades tight'],
    commonMistakes: ['Flaring elbows 90° — keep them tucked around 70-75°', 'Bouncing the bar off the chest', 'Hips rising off the bench', 'Losing scap retraction mid-set'],
    tips: ['Always use a spotter or safety arms on heavy sets', 'Grip the bar hard — it activates more fibers', 'Drive your feet into the floor (leg drive)', 'Aim for 2-3 reps in reserve on each set'],
  },
  'Incline Dumbbell Press': {
    musclesWorked: ['Upper Chest', 'Front Delts', 'Triceps'],
    setup: 'Set a bench to 30-45°. Sit with dumbbells resting on thighs, then kick them up as you lie back. Plant feet, brace core.',
    steps: ['Start with dumbbells at chest height, palms facing forward', 'Press the dumbbells up and slightly together', 'Stop just before locking out to keep tension on the chest', 'Lower under control until you feel a deep stretch', 'Keep wrists stacked over elbows the entire rep'],
    commonMistakes: ['Setting bench too steep (>45°) — turns it into a shoulder press', 'Letting dumbbells drift outward', 'Bouncing the bottom of the rep'],
    tips: ['A 30° incline is the sweet spot for upper chest', 'Squeeze the chest at the top', 'Control the eccentric — 2-3 seconds down'],
  },
  'Cable Fly': {
    musclesWorked: ['Chest (Inner/Outer)', 'Front Delts'],
    setup: 'Set cable pulleys at shoulder height (or slightly above for lower chest bias). Grab handles, step forward into a split stance, slight forward lean.',
    steps: ['Start with arms wide and a slight bend in the elbows', 'Bring handles together in a wide arc, hugging forward', 'Cross hands slightly at the end for max contraction', 'Squeeze chest for 1 second', 'Return slowly until you feel a stretch'],
    commonMistakes: ['Bending elbows too much — turns it into a press', 'Using too much weight and losing form', 'Rushing the negative'],
    tips: ['Think "hug a tree"', 'Keep the elbow angle locked throughout', 'Use slow tempo — flies are about stretch + squeeze'],
  },
  'Chest Dip': {
    musclesWorked: ['Lower Chest', 'Triceps', 'Front Delts'],
    setup: 'Grip parallel dip bars, arms locked out. Lean torso forward about 30° to bias the chest.',
    steps: ['Lower yourself under control with elbows flaring slightly out', 'Descend until upper arms are parallel to the floor', 'Feel a stretch across the chest', 'Press back up powerfully to lockout', 'Squeeze chest at the top'],
    commonMistakes: ['Going too deep — shoulder strain', 'Staying upright — hits triceps instead of chest', 'Swinging legs for momentum'],
    tips: ['Lean forward for chest, stay upright for triceps', 'Add weight with a dip belt once bodyweight is easy', 'Use assisted dip machine if needed'],
  },
  'Overhead Tricep Extension': {
    musclesWorked: ['Triceps (Long Head)', 'Shoulders'],
    setup: 'Sit or stand tall. Hold a single dumbbell with both hands or use a rope on a cable. Raise arms overhead with elbows close to ears.',
    steps: ['Keep upper arms fixed, elbows pointing up', 'Lower the weight behind your head by bending the elbows', 'Feel a deep stretch in the triceps', 'Extend arms back to the top', 'Squeeze triceps at lockout'],
    commonMistakes: ['Flaring elbows outward', 'Moving upper arms — only elbow should bend', 'Going too heavy and cheating'],
    tips: ['Long-head focus — keep arms vertical', 'Control the stretch at the bottom', 'Use moderate weight, higher reps (10-15)'],
  },
  'Tricep Pushdown': {
    musclesWorked: ['Triceps (Lateral + Medial)'],
    setup: 'Stand at a cable machine with a rope or straight bar at the top. Grab the attachment, tuck elbows to your sides, slight forward lean.',
    steps: ['Start with forearms parallel to the floor', 'Press the attachment down by extending elbows', 'Keep elbows pinned to your ribs', 'Lock out at the bottom and squeeze', 'Return under control to 90°'],
    commonMistakes: ['Elbows drifting forward — uses shoulders', 'Leaning too much — using bodyweight', 'Going too wide on a straight bar'],
    tips: ['Rope attachment allows better squeeze at the bottom', 'Slight forward lean is fine, but stay braced', 'Perfect finisher after heavy pressing'],
  },
  'Close-Grip Bench': {
    musclesWorked: ['Triceps', 'Inner Chest', 'Front Delts'],
    setup: 'Lie on a flat bench. Grip the bar roughly shoulder-width (not too narrow — protect your wrists). Retract scapula, plant feet.',
    steps: ['Unrack and hold the bar over your chest', 'Lower the bar to your lower chest/sternum with elbows tucked', 'Touch lightly — no bounce', 'Press straight up, driving through the triceps', 'Lock out at the top'],
    commonMistakes: ['Gripping too narrow — wrist pain', 'Flaring elbows — turns it into a regular bench', 'Bouncing off chest'],
    tips: ['Shoulder-width grip is usually ideal', 'Think "elbows to hips" as you press', 'Great carryover to bench press lockout strength'],
  },
  'Deadlift': {
    musclesWorked: ['Posterior Chain', 'Hamstrings', 'Glutes', 'Lower Back', 'Traps', 'Forearms'],
    setup: 'Bar over mid-foot, feet hip-width. Bend down, grip bar just outside knees. Drop hips, chest up, lats engaged (squeeze oranges in armpits).',
    steps: ['Take a huge breath, brace core hard', 'Push the floor away with your legs', 'Keep bar in contact with your body', 'As bar clears knees, drive hips forward', 'Stand tall, lock hips and knees together', 'Reverse by hinging hips first, then bending knees'],
    commonMistakes: ['Rounded lower back — most dangerous error', 'Bar drifting away from legs', 'Hips shooting up first (stiff-leg deadlift)', 'Hyperextending at the top'],
    tips: ['Reset each rep — no touch-and-go on heavy sets', 'Use chalk or straps once grip becomes limiting', 'Mixed grip helps on max sets'],
  },
  'Pull-ups': {
    musclesWorked: ['Lats', 'Biceps', 'Rear Delts', 'Core'],
    setup: 'Overhand grip, slightly wider than shoulder-width. Hang with arms fully extended.',
    steps: ['Depress and retract your shoulder blades', 'Pull elbows down and back toward your hips', 'Continue until chin clears the bar', 'Squeeze lats hard at the top', 'Lower under control to full extension'],
    commonMistakes: ['Kipping/swinging', 'Partial reps at the bottom', 'Chin not clearing the bar'],
    tips: ['Band-assisted if you can’t do bodyweight', 'Add weight with a belt once you can do 8+ clean', 'Scap pull-ups build the initiation strength'],
  },
  'Lat Pulldown': {
    musclesWorked: ['Lats', 'Biceps', 'Rear Delts'],
    setup: 'Sit at a lat pulldown machine, knees under the pad. Grab the bar slightly wider than shoulder-width, overhand grip.',
    steps: ['Lean back 10-15° and stick chest up', 'Pull the bar down to your upper chest', 'Drive elbows down and back', 'Squeeze lats at the bottom', 'Return under control, letting scap rotate up'],
    commonMistakes: ['Excessive leaning back — turns it into a row', 'Pulling with arms only', 'Not achieving full stretch at the top'],
    tips: ['Think "elbows into your pockets"', 'Wide grip biases lats, narrow grip biases biceps', 'Control the eccentric'],
  },
  'Barbell Row': {
    musclesWorked: ['Upper Back', 'Lats', 'Rear Delts', 'Biceps'],
    setup: 'Stand with feet shoulder-width, hinge to ~45°. Grip bar slightly wider than shoulders, overhand.',
    steps: ['Brace core, flat back', 'Row bar to lower chest/upper abs', 'Drive elbows up and back, squeeze shoulder blades', 'Pause at the top', 'Lower under control'],
    commonMistakes: ['Jerking with momentum', 'Standing too upright', 'Rounding the lower back'],
    tips: ['Think "pull elbows to your hips"', 'Use straps if grip fails first', 'Consider a Pendlay row for strict form'],
  },
  'Seated Cable Row': {
    musclesWorked: ['Mid Back', 'Lats', 'Rear Delts', 'Biceps'],
    setup: 'Sit at the cable row station, feet on the platform, slight bend in knees. Grab the handle with neutral grip.',
    steps: ['Sit tall with chest up', 'Pull the handle to your lower ribs', 'Drive elbows back, squeeze shoulder blades together', 'Pause 1 second at the contracted position', 'Return slowly, letting shoulders stretch forward'],
    commonMistakes: ['Rocking torso for momentum', 'Shrugging instead of rowing', 'Short range of motion'],
    tips: ['Keep torso mostly upright', 'Pause and squeeze at the top of each rep', 'Use a V-handle for lats, wide bar for upper back'],
  },
  'Barbell Curl': {
    musclesWorked: ['Biceps', 'Forearms'],
    setup: 'Stand tall, feet shoulder-width. Grip barbell underhand at shoulder-width. Elbows pinned to sides.',
    steps: ['Keep elbows locked at your sides', 'Curl the bar up by flexing biceps only', 'Stop just before vertical forearms — keep tension', 'Squeeze biceps hard at the top', 'Lower slowly under control'],
    commonMistakes: ['Swinging with the back (body english)', 'Elbows drifting forward', 'Partial reps'],
    tips: ['Stand with back against a wall to prevent cheating', 'Slow 3-second negatives build size fast', 'EZ bar if straight bar bothers your wrists'],
  },
  'Hammer Curl': {
    musclesWorked: ['Biceps (Brachialis)', 'Brachioradialis', 'Forearms'],
    setup: 'Stand with a dumbbell in each hand, palms facing each other (neutral grip). Elbows at your sides.',
    steps: ['Keep wrists neutral, palms facing in', 'Curl dumbbells up by flexing at the elbow', 'Squeeze at the top', 'Lower slowly to full extension', 'Alternate or curl both together'],
    commonMistakes: ['Rotating wrists (turning it into a regular curl)', 'Swinging the weight', 'Not going full range'],
    tips: ['Builds arm thickness and grip', 'Cross-body hammer curls bias the brachialis even more', 'Pair with regular curls in a superset'],
  },
  'Back Squat': {
    musclesWorked: ['Quads', 'Glutes', 'Hamstrings', 'Core', 'Lower Back'],
    setup: 'Bar on upper traps (high bar) or rear delts (low bar). Unrack, step back, feet shoulder-width, toes slightly out.',
    steps: ['Take a big breath, brace core', 'Push hips back and bend knees together', 'Keep chest up, back neutral', 'Descend until hip crease is below the knee', 'Drive through whole foot to stand', 'Exhale at the top'],
    commonMistakes: ['Knees caving inward', 'Rising on toes', 'Rounding lower back (butt wink)', 'Not hitting depth'],
    tips: ['Film from the side to check depth', 'Widen stance slightly if you lack ankle mobility', 'Rest 3-5 min between heavy sets'],
  },
  'Romanian Deadlift': {
    musclesWorked: ['Hamstrings', 'Glutes', 'Lower Back'],
    setup: 'Stand holding a barbell at hip height. Feet hip-width, slight bend in the knees.',
    steps: ['Push hips straight back (not down)', 'Keep bar sliding down your thighs', 'Lower until you feel a deep hamstring stretch (around mid-shin)', 'Keep back flat the entire time', 'Drive hips forward to stand up, squeeze glutes at the top'],
    commonMistakes: ['Bending knees too much (turns it into a deadlift)', 'Rounding the lower back', 'Letting the bar drift forward'],
    tips: ['Hinge, don’t squat — hips move back', '3-second eccentric builds massive hamstrings', 'Stop when you lose back neutrality'],
  },
  'Leg Press': {
    musclesWorked: ['Quads', 'Glutes', 'Hamstrings'],
    setup: 'Sit in the leg press, feet shoulder-width on the platform, lower back flat against the pad.',
    steps: ['Unrack the sled and lower it under control', 'Bend knees to at least 90° (or deeper if mobility allows)', 'Knees track over toes', 'Press up powerfully without locking out knees', 'Keep butt and lower back on the pad'],
    commonMistakes: ['Locking out knees (dangerous)', 'Letting lower back round (butt lifts off pad)', 'Half reps'],
    tips: ['Higher foot placement = more glute/ham; lower = more quad', 'Use full range of motion for growth', 'Safe exercise to push hard on'],
  },
  'Walking Lunges': {
    musclesWorked: ['Quads', 'Glutes', 'Hamstrings', 'Core'],
    setup: 'Stand tall holding dumbbells at your sides (or bar on back). Clear a straight path.',
    steps: ['Step forward into a long lunge', 'Lower back knee toward the floor (don’t smash it)', 'Front thigh parallel to the floor', 'Drive through the front heel and step forward into the next lunge', 'Alternate legs each step'],
    commonMistakes: ['Short strides — hits the quad too much, stresses the knee', 'Leaning forward excessively', 'Knee caving inward'],
    tips: ['Long stride = more glute/hamstring focus', 'Control the descent — don’t crash knee down', 'Great finisher after heavy squats'],
  },
  'Leg Curl': {
    musclesWorked: ['Hamstrings'],
    setup: 'Lie face down or sit on the leg curl machine. Align knees with the pivot point. Pads rest on Achilles.',
    steps: ['Flex hamstrings to curl the pad toward glutes', 'Squeeze hamstrings hard at the top', 'Lower under control to full extension', 'Keep hips pressed into the pad'],
    commonMistakes: ['Lifting hips to cheat', 'Using momentum', 'Partial range of motion'],
    tips: ['Pointing toes up biases inner hamstring, toes down biases outer', 'Slow 3s negatives = max hypertrophy', 'Finish leg day with these'],
  },
  'Standing Calf Raise': {
    musclesWorked: ['Gastrocnemius', 'Soleus'],
    setup: 'Stand on a calf block or step with heels hanging off. Hold dumbbells or use a machine for resistance.',
    steps: ['Drop heels as low as possible for a big stretch', 'Press up onto your toes as high as possible', 'Hold the peak contraction 1-2 seconds', 'Lower slowly', 'Do not bounce'],
    commonMistakes: ['Bouncing out of the stretch', 'Partial range of motion', 'Bending knees during the rep'],
    tips: ['Calves respond to high reps (12-20) AND heavy weight', 'Stretch hard at the bottom — 2 full seconds', 'Train calves 2-3x per week for growth'],
  },
  'Overhead Press': {
    musclesWorked: ['Shoulders', 'Triceps', 'Upper Chest', 'Core'],
    setup: 'Unrack bar at collarbone height. Grip just outside shoulders. Feet shoulder-width.',
    steps: ['Brace core tight, squeeze glutes', 'Press bar straight up', 'As it passes forehead, push head through the "window"', 'Lock out overhead with bar over mid-foot', 'Lower under control back to front delts'],
    commonMistakes: ['Excessive back lean', 'Pressing bar forward', 'Not locking out fully', 'Flaring ribs'],
    tips: ['Glute + core brace prevents overarching', 'Micro-plates (1.25lb) for progression', 'This lift progresses slow — be patient'],
  },
  'Seated Dumbbell Press': {
    musclesWorked: ['Shoulders', 'Triceps'],
    setup: 'Seat inclined to ~85-90°. Kick dumbbells up from thighs to shoulder height. Palms forward, elbows out.',
    steps: ['Press dumbbells up and slightly together', 'Stop just short of lockout to keep tension', 'Lower under control until dumbbells are at ear level', 'Keep core braced the whole time'],
    commonMistakes: ['Arching excessively', 'Clanking dumbbells together at the top', 'Going too heavy and cheating with legs'],
    tips: ['Neutral-grip variation is easier on shoulders', 'Great alternative to the barbell OHP', 'Use moderate weight for quality reps'],
  },
  'Lateral Raise': {
    musclesWorked: ['Lateral (Side) Delts'],
    setup: 'Stand with dumbbells at your sides, slight forward lean, slight bend in elbows.',
    steps: ['Lead with elbows — lift arms out to the sides', 'Raise until arms are parallel to the floor', 'Pinkies slightly higher than thumbs (like pouring water)', 'Pause at the top', 'Lower slowly'],
    commonMistakes: ['Going too heavy — traps take over', 'Swinging with momentum', 'Raising arms too high'],
    tips: ['Lighter than you think — 10-20 lbs is plenty', 'Slow eccentrics build capped shoulders', 'Can be done with cables for constant tension'],
  },
  'Face Pull': {
    musclesWorked: ['Rear Delts', 'Rotator Cuff', 'Upper Back'],
    setup: 'Attach a rope to a cable at face height. Step back, grip rope with palms facing each other.',
    steps: ['Pull rope toward your face', 'Separate hands at the end, thumbs pointing back', 'Squeeze rear delts and upper back hard', 'External rotate at the end position', 'Return slowly'],
    commonMistakes: ['Using too much weight', 'Not externally rotating', 'Pulling to chest instead of face'],
    tips: ['Best exercise for shoulder health — never skip', '15-20 reps, constant tension', 'Do 2-3 sets every upper body day'],
  },
  'Rear Delt Fly': {
    musclesWorked: ['Rear Delts', 'Rhomboids', 'Mid Traps'],
    setup: 'Bend over at the hips with light dumbbells hanging beneath chest. Slight bend in elbows.',
    steps: ['Raise dumbbells out to the sides in a wide arc', 'Lead with the elbows', 'Squeeze shoulder blades together at the top', 'Pause briefly', 'Lower under control'],
    commonMistakes: ['Standing too upright — hits side delts instead', 'Using too much weight — traps take over', 'Swinging'],
    tips: ['Go lighter than your ego wants', 'Reverse pec deck machine is a great alternative', 'High reps (15-20) work best here'],
  },
  'Hanging Leg Raise': {
    musclesWorked: ['Lower Abs', 'Hip Flexors', 'Obliques'],
    setup: 'Hang from a pull-up bar, shoulder-width grip. Engage lats to stop swinging.',
    steps: ['Brace core', 'Raise legs (straight or bent knee) toward your chest', 'Curl pelvis up at the top — this is where abs fire', 'Hold 1 second', 'Lower slowly under control'],
    commonMistakes: ['Swinging for momentum', 'Only using hip flexors — must curl pelvis', 'Dropping legs quickly'],
    tips: ['Bent-knee version first, then progress to straight legs', 'Use ab straps if grip gives out', 'Quality over quantity'],
  },
  'Cable Crunch': {
    musclesWorked: ['Rectus Abdominis'],
    setup: 'Kneel in front of a high cable with a rope attachment. Hold the rope next to your ears/head.',
    steps: ['Hinge forward from the waist by flexing your abs', 'Bring elbows toward thighs by rounding your upper back', 'Squeeze abs hard at the bottom', 'Return slowly by un-rounding the spine', 'Keep hips stationary'],
    commonMistakes: ['Using arms to pull the rope — abs should do the work', 'Hinging at the hips instead of the spine', 'Going too heavy and losing form'],
    tips: ['Think "shorten the space between ribs and hips"', 'Slow, controlled reps in the 10-20 range', 'Exhale hard at the bottom to increase ab contraction'],
  },
};

const buildSplitWeeks = (): ProgramWeek[] => {
  const weekTemplates: Array<{ title: string; description: string; chest: string[]; back: string[]; legs: string[]; shoulders: string[]; notes: Record<string, string> }> = [
    {
      title: 'Week 2 - Build Volume',
      description: 'Add one set to each main lift. Same weights, more total work.',
      chest: ['Barbell Bench Press: 5x8 @ 67% 1RM', 'Incline Dumbbell Press: 4x10', 'Cable Fly: 3x12', 'Overhead Rope Extension: 3x12', 'Tricep Pushdown: 3x15', 'Close-Grip Bench: 3x10'],
      back: ['Deadlift: 4x5 @ 72% 1RM', 'Lat Pulldown: 5x10', 'Barbell Row: 4x10', 'Seated Cable Row: 3x12', 'Barbell Curl: 4x10', 'Hammer Curl: 3x12'],
      legs: ['Back Squat: 5x8 @ 67% 1RM', 'Romanian Deadlift: 4x10', 'Leg Press: 3x12', 'Walking Lunges: 3x12 each leg', 'Leg Curl: 3x15', 'Standing Calf Raise: 4x15'],
      shoulders: ['Overhead Press: 5x8 @ 67% 1RM', 'Seated Dumbbell Press: 3x10', 'Lateral Raise: 4x15', 'Face Pull: 3x15', 'Rear Delt Fly: 3x15', 'Hanging Leg Raise: 3x12', 'Cable Crunch: 3x15'],
      notes: { chest: 'Still leave 2 reps in reserve. Perfect form over heavier weight.', back: 'Feel every rep in your lats and upper back.', legs: 'Extra squat set - expect a little more soreness.', shoulders: 'Controlled lateral raises are the key to wider shoulders.' },
    },
    {
      title: 'Week 3 - First Weight Jump',
      description: 'Add 5 lbs to upper lifts, 10 lbs to lower lifts on the first set.',
      chest: ['Barbell Bench Press: 4x8 @ 70% 1RM', 'Incline Dumbbell Press: 4x10', 'Cable Fly: 3x12', 'Skull Crushers: 3x10', 'Tricep Pushdown: 3x15', 'Close-Grip Bench: 3x10'],
      back: ['Deadlift: 4x5 @ 75% 1RM', 'Pull-ups: 4x8', 'Barbell Row: 4x10', 'Seated Cable Row: 3x12', 'Barbell Curl: 3x10', 'Incline Dumbbell Curl: 3x12'],
      legs: ['Back Squat: 4x8 @ 70% 1RM', 'Romanian Deadlift: 4x10', 'Leg Press: 3x12', 'Bulgarian Split Squat: 3x10 each leg', 'Leg Curl: 3x15', 'Standing Calf Raise: 4x15'],
      shoulders: ['Overhead Press: 4x8 @ 70% 1RM', 'Arnold Press: 3x10', 'Lateral Raise: 4x15', 'Face Pull: 3x15', 'Rear Delt Fly: 3x15', 'Hanging Leg Raise: 3x12', 'Cable Crunch: 3x15'],
      notes: { chest: 'First PR opportunity - focus on bar path.', back: 'Deadlifts will start feeling heavy. Reset between each rep.', legs: 'Squat depth is non-negotiable even as weight climbs.', shoulders: 'OHP is the slowest-progressing lift. Tiny gains count.' },
    },
    {
      title: 'Week 4 - Deload Lite',
      description: 'Same weights as Week 3 but drop one set per exercise. Recovery week.',
      chest: ['Barbell Bench Press: 3x8 @ 70% 1RM', 'Incline Dumbbell Press: 3x10', 'Cable Fly: 2x12', 'Skull Crushers: 2x10', 'Tricep Pushdown: 2x15'],
      back: ['Deadlift: 3x5 @ 72% 1RM', 'Pull-ups: 3x8', 'Barbell Row: 3x10', 'Seated Cable Row: 2x12', 'Barbell Curl: 2x10'],
      legs: ['Back Squat: 3x8 @ 70% 1RM', 'Romanian Deadlift: 3x10', 'Leg Press: 2x12', 'Leg Curl: 2x15', 'Standing Calf Raise: 3x15'],
      shoulders: ['Overhead Press: 3x8 @ 70% 1RM', 'Seated Dumbbell Press: 3x10', 'Lateral Raise: 3x15', 'Face Pull: 3x15', 'Hanging Leg Raise: 2x12'],
      notes: { chest: 'Reduced volume helps connective tissue recover.', back: 'Lighter back day — sleep will feel amazing.', legs: 'Quality over quantity this week.', shoulders: 'Use the extra energy for better technique.' },
    },
    {
      title: 'Week 5 - Accumulation Start',
      description: 'Phase 2 begins. Bump working weight by 5-10 lbs and drop reps slightly.',
      chest: ['Barbell Bench Press: 4x6 @ 75% 1RM', 'Incline Dumbbell Press: 4x8-10', 'Cable Fly: 3x12', 'Overhead Tricep Extension: 3x10', 'Tricep Pushdown: 3x12-15', 'Close-Grip Bench: 3x8'],
      back: ['Deadlift: 4x5 @ 77% 1RM', 'Pull-ups: 4x8', 'T-Bar Row: 4x8', 'Seated Cable Row: 3x10-12', 'Barbell Curl: 4x8', 'Hammer Curl: 3x10'],
      legs: ['Back Squat: 4x6 @ 75% 1RM', 'Romanian Deadlift: 4x8', 'Leg Press: 3x10', 'Walking Lunges: 3x12 each leg', 'Leg Curl: 3x12', 'Standing Calf Raise: 4x12'],
      shoulders: ['Overhead Press: 4x6 @ 75% 1RM', 'Seated Dumbbell Press: 3x8-10', 'Lateral Raise: 4x12-15', 'Face Pull: 3x15', 'Rear Delt Fly: 3x12', 'Hanging Leg Raise: 3x10', 'Cable Crunch: 3x12'],
      notes: { chest: 'Heavier, fewer reps. Keep 1-2 reps in reserve.', back: 'Focus on pulling with elbows, not hands.', legs: 'Go deep on squats. Brace hard.', shoulders: 'Strict OHP — no push press.' },
    },
    {
      title: 'Week 6 - Volume Peak',
      description: 'Peak accumulation volume. Add a top set on main lifts.',
      chest: ['Barbell Bench Press: 5x6 @ 77% 1RM', 'Incline Dumbbell Press: 4x8', 'Cable Fly: 4x12', 'Overhead Tricep Extension: 3x10', 'Tricep Pushdown: 4x12-15', 'Close-Grip Bench: 3x8'],
      back: ['Deadlift: 4x4 @ 80% 1RM', 'Pull-ups: 5x6-8', 'T-Bar Row: 4x8', 'Seated Cable Row: 4x10', 'Barbell Curl: 4x8', 'Preacher Curl: 3x10'],
      legs: ['Back Squat: 5x6 @ 77% 1RM', 'Romanian Deadlift: 4x8', 'Leg Press: 4x10', 'Bulgarian Split Squat: 3x10 each leg', 'Leg Curl: 4x12', 'Standing Calf Raise: 4x12'],
      shoulders: ['Overhead Press: 5x6 @ 77% 1RM', 'Arnold Press: 3x8', 'Lateral Raise: 5x12-15', 'Face Pull: 4x15', 'Rear Delt Fly: 3x12', 'Hanging Leg Raise: 3x10', 'Cable Crunch: 3x12'],
      notes: { chest: 'Volume is highest this week. Expect fatigue.', back: 'Deadlifts heavy — warm up thoroughly.', legs: 'Squat fives will feel brutal. Earn them.', shoulders: 'Most growth week for delts.' },
    },
    {
      title: 'Week 7 - Progressive Push',
      description: 'Add weight while keeping Week 6 volume. Your hardest week yet.',
      chest: ['Barbell Bench Press: 5x5 @ 80% 1RM', 'Incline Dumbbell Press: 4x8', 'Cable Fly: 4x10-12', 'Skull Crushers: 3x10', 'Tricep Pushdown: 4x12', 'Close-Grip Bench: 3x8'],
      back: ['Deadlift: 4x4 @ 82% 1RM', 'Pull-ups: 5x6-8 (add weight if needed)', 'T-Bar Row: 4x8', 'Seated Cable Row: 4x10', 'Barbell Curl: 4x8', 'Incline Dumbbell Curl: 3x10'],
      legs: ['Back Squat: 5x5 @ 80% 1RM', 'Romanian Deadlift: 4x8', 'Leg Press: 4x10', 'Walking Lunges: 3x12 each leg', 'Leg Curl: 4x12', 'Standing Calf Raise: 4x12', 'Seated Calf Raise: 3x15'],
      shoulders: ['Overhead Press: 5x5 @ 80% 1RM', 'Seated Dumbbell Press: 3x8', 'Lateral Raise: 5x12-15', 'Face Pull: 4x15', 'Rear Delt Fly: 3x12', 'Hanging Leg Raise: 4x10', 'Cable Crunch: 4x12'],
      notes: { chest: 'Heaviest bench week so far. Use a spotter.', back: 'Mixed grip on heavy deadlift sets is fine.', legs: 'Rest 3 min between heavy squat sets.', shoulders: 'OHP PR opportunity — brace hard.' },
    },
    {
      title: 'Week 8 - Mini Deload',
      description: 'Cut volume 40% but keep intensity. Prime the nervous system for intensification.',
      chest: ['Barbell Bench Press: 3x5 @ 80% 1RM', 'Incline Dumbbell Press: 3x8', 'Cable Fly: 2x12', 'Tricep Pushdown: 2x12', 'Close-Grip Bench: 2x8'],
      back: ['Deadlift: 2x3 @ 80% 1RM', 'Pull-ups: 3x6', 'T-Bar Row: 3x8', 'Seated Cable Row: 2x10', 'Barbell Curl: 2x8'],
      legs: ['Back Squat: 3x5 @ 80% 1RM', 'Romanian Deadlift: 3x8', 'Leg Press: 2x10', 'Leg Curl: 2x12', 'Standing Calf Raise: 3x12'],
      shoulders: ['Overhead Press: 3x5 @ 80% 1RM', 'Seated Dumbbell Press: 2x8', 'Lateral Raise: 3x15', 'Face Pull: 3x15', 'Hanging Leg Raise: 2x10'],
      notes: { chest: 'Sharp and fresh. Each set should feel fast.', back: 'Light deadlift day. Focus on bar speed.', legs: 'Quality squats, full recovery.', shoulders: 'Use extra energy for perfect lateral raises.' },
    },
    {
      title: 'Week 9 - Intensification Begins',
      description: 'Heavy weights, lower reps. Phase 3 starts.',
      chest: ['Barbell Bench Press: 5x4 @ 85% 1RM', 'Incline Dumbbell Press: 4x6-8', 'Chest Dip: 3x8 (add weight)', 'Skull Crushers: 3x8', 'Tricep Pushdown: 3x10', 'Close-Grip Bench: 3x6'],
      back: ['Deadlift: 5x3 @ 85% 1RM', 'Pull-ups: 4x6 (weighted)', 'Barbell Row: 4x6', 'Seated Cable Row: 3x10', 'Barbell Curl: 4x6', 'Hammer Curl: 3x8'],
      legs: ['Back Squat: 5x4 @ 85% 1RM', 'Front Squat: 3x6', 'Leg Press: 4x8', 'Leg Curl: 3x10', 'Standing Calf Raise: 4x10', 'Seated Calf Raise: 3x12'],
      shoulders: ['Overhead Press: 5x4 @ 85% 1RM', 'Arnold Press: 3x6', 'Lateral Raise: 4x12', 'Face Pull: 3x15', 'Rear Delt Fly: 3x12', 'Hanging Leg Raise: 3x10', 'Ab Wheel: 3x10'],
      notes: { chest: 'Heavy benching. Leave one rep in reserve.', back: 'Deadlift triples teach you to stay tight.', legs: 'Front squat humbles the core.', shoulders: 'Use micro-plates for OHP progression.' },
    },
    {
      title: 'Week 10 - Strength Peak',
      description: 'Top sets get heavier. Drop back sets for volume.',
      chest: ['Barbell Bench Press: 1x3 @ 90%, 3x5 @ 80% 1RM', 'Incline Dumbbell Press: 4x6', 'Chest Dip: 3x8 (weighted)', 'Skull Crushers: 3x8', 'Tricep Pushdown: 3x10', 'Close-Grip Bench: 3x6'],
      back: ['Deadlift: 1x2 @ 90%, 3x4 @ 80% 1RM', 'Pull-ups: 4x6 (weighted)', 'T-Bar Row: 4x6', 'Seated Cable Row: 3x10', 'Barbell Curl: 4x6', 'Preacher Curl: 3x8'],
      legs: ['Back Squat: 1x3 @ 90%, 3x5 @ 80% 1RM', 'Front Squat: 3x5', 'Leg Press: 4x8', 'Leg Curl: 3x10', 'Standing Calf Raise: 4x10'],
      shoulders: ['Overhead Press: 1x3 @ 90%, 3x5 @ 80% 1RM', 'Seated Dumbbell Press: 3x6', 'Lateral Raise: 4x12', 'Face Pull: 3x15', 'Rear Delt Fly: 3x12', 'Hanging Leg Raise: 3x10', 'Cable Crunch: 3x12'],
      notes: { chest: 'Bench top set — have a spotter ready.', back: 'Double on deadlift feels monstrous. That’s the point.', legs: 'Squat heavy, rest fully, squat heavy again.', shoulders: 'OHP PR week for many lifters.' },
    },
    {
      title: 'Week 11 - Peak Intensity',
      description: 'Maximum loads with drop sets. Push close to failure.',
      chest: ['Barbell Bench Press: 1x2 @ 92%, 2x3 @ 85%, drop to 70% AMRAP', 'Incline Dumbbell Press: 4x6 + 1 drop set', 'Cable Fly: 3x12', 'Skull Crushers: 3x8', 'Tricep Pushdown: 3x12 + drop', 'Close-Grip Bench: 3x6'],
      back: ['Deadlift: 1x1 @ 92%, 3x3 @ 85%', 'Pull-ups: 4x6 (weighted) + 1 AMRAP bodyweight', 'Barbell Row: 4x6', 'Seated Cable Row: 3x10 + drop', 'Barbell Curl: 4x6', 'Hammer Curl: 3x10'],
      legs: ['Back Squat: 1x2 @ 92%, 3x4 @ 85%', 'Front Squat: 3x5', 'Leg Press: 4x10 + 1 drop set', 'Leg Curl: 3x12 + drop', 'Standing Calf Raise: 4x12 + drop'],
      shoulders: ['Overhead Press: 1x2 @ 92%, 3x3 @ 85%', 'Seated Dumbbell Press: 3x6', 'Lateral Raise: 4x15 (triple drop on last set)', 'Face Pull: 3x15', 'Rear Delt Fly: 3x12', 'Hanging Leg Raise: 3x10', 'Cable Crunch: 3x12'],
      notes: { chest: 'Heaviest bench of the program. Earn it.', back: 'Singles should feel fast, not grindy.', legs: 'Drop sets burn — push through it.', shoulders: 'Lateral raise triple-drops = serious delt pump.' },
    },
    {
      title: 'Week 12 - Testing Week',
      description: 'Light Monday/Tuesday, then test your new 1RMs. Celebrate the PRs.',
      chest: ['Warmup: Barbell Bench 3x5 light', 'Test Bench 1RM (work up in singles)', 'Incline Dumbbell Press: 3x8 (moderate)', 'Tricep Pushdown: 3x12', 'Close-Grip Bench: 3x6 light'],
      back: ['Warmup: Deadlift 3x3 light', 'Test Deadlift 1RM (work up singles)', 'Pull-ups: 3x AMRAP', 'Seated Cable Row: 3x10 light', 'Barbell Curl: 3x8'],
      legs: ['Warmup: Squat 3x3 light', 'Test Squat 1RM (work up singles)', 'Leg Press: 3x8 moderate', 'Leg Curl: 3x10', 'Standing Calf Raise: 3x12'],
      shoulders: ['Warmup: OHP 3x3 light', 'Test Overhead Press 1RM', 'Lateral Raise: 3x12', 'Face Pull: 3x15', 'Hanging Leg Raise: 3x10'],
      notes: { chest: 'Have a spotter and make the jump! Film your PR.', back: 'Use a belt and straps — this is max effort.', legs: 'Squat PR day. Wear a belt. Go deep.', shoulders: 'Strict OHP test. No push press.' },
    },
  ];

  return weekTemplates.map((tpl, index) => ({
    week: index + 2,
    title: tpl.title,
    description: tpl.description,
    days: [
      { day: 1, title: 'Day 1 - Chest & Triceps', description: 'Push day focused on chest and triceps', duration: '65-75 min', activities: tpl.chest, notes: tpl.notes.chest },
      { day: 2, title: 'Day 2 - Back & Biceps', description: 'Pull day emphasising the posterior chain', duration: '70-80 min', activities: tpl.back, notes: tpl.notes.back },
      { day: 3, title: 'Rest / Mobility', description: 'Active recovery day - walk, stretch, eat', duration: '20 min', activities: ['30-45 min walk', '10 min full-body stretching', 'Hit protein target'], restDay: true },
      { day: 4, title: 'Day 4 - Legs', description: 'Full lower-body day — the hardest session of the week', duration: '75-85 min', activities: tpl.legs, notes: tpl.notes.legs },
      { day: 5, title: 'Day 5 - Shoulders & Abs', description: 'Delts, upper back, and core finisher', duration: '60-70 min', activities: tpl.shoulders, notes: tpl.notes.shoulders },
      { day: 6, title: 'Rest', description: 'Full rest day', duration: '0 min', activities: ['Rest', 'Sleep 8+ hours', 'Meal prep for next week'], restDay: true },
      { day: 0, title: 'Rest', description: 'Full rest day', duration: '0 min', activities: ['Rest', 'Light walking', 'Foam roll'], restDay: true },
    ],
  }));
};

export const COMMUNITY_HABITS: CommunityHabit[] = [
  {
    id: 'ch-1',
    name: '5x5 Strength Training',
    description: 'Build muscle with progressive overload. Start with light weights and add 5lbs each session.',
    icon: 'dumbbell',
    color: HABIT_COLORS[3],
    frequency: { type: 'times_per_week', days: [1, 3, 5], timesPerWeek: 3 },
    category: 'Fitness',
    user: {
      id: 'u1',
      name: 'Alex Chen',
      avatar: 'https://i.pravatar.cc/150?img=12',
      followersCount: 12400,
      habitsShared: 8,
    },
    likes: 2847,
    saves: 1923,
    trending: true,
    difficulty: 'Medium',
    estimatedDuration: '45-60 min',
    tags: ['strength', 'gym', 'progressive'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    goalType: 'progressive',
    targetAudience: 'Intermediate lifters with gym access',
    mainGoal: 'Bench press bodyweight',
    longDescription: 'StrongLifts 5x5 is the most popular strength training program in the world. It\'s based on proven strength training principles: progressive overload, compound exercises, and linear progression. Train 3x/week, doing 5 sets of 5 reps per exercise.',
    benefits: [
      'Build 10-15lbs of muscle in first 3 months',
      'Increase strength by 50-100% in major lifts',
      'Improve bone density and joint health',
      'Boost metabolism and testosterone naturally',
      'Simple, time-efficient workouts (45-60 min)',
      'Scientifically proven progressive overload system'
    ],
    equipment: ['Barbell', 'Squat rack', 'Bench', 'Plates (2.5-45lbs)', 'Gym membership or home setup'],
    prerequisites: ['Basic gym access', 'Learn proper form (watch tutorial videos)', 'Medical clearance if needed'],
    scientificBacking: 'Based on research by Dr. Mark Rippetoe and Bill Starr. Studies show compound movements activate 2-3x more muscle fibers than isolation exercises.',
    programLength: '12 weeks',
    resources: [
      { title: 'StrongLifts Official App', description: 'Track workouts, get automatic weight calculations' },
      { title: 'Form Check Videos', description: 'Learn proper squat, bench, deadlift technique' },
      { title: 'Starting Strength Book', description: 'Complete guide to barbell training' }
    ],
    phases: [
      {
        phase: 1,
        title: 'Foundation Phase',
        description: 'Learn perfect form with light weights',
        weeks: [1, 2, 3, 4],
        focusAreas: ['Technique', 'Mind-muscle connection', 'Recovery adaptation']
      },
      {
        phase: 2,
        title: 'Growth Phase',
        description: 'Build strength with linear progression',
        weeks: [5, 6, 7, 8],
        focusAreas: ['Progressive overload', 'Muscle hypertrophy', 'Work capacity']
      },
      {
        phase: 3,
        title: 'Peak Phase',
        description: 'Push for PRs and test maxes',
        weeks: [9, 10, 11, 12],
        focusAreas: ['Maximum strength', 'Nervous system adaptation', 'Confidence']
      }
    ],
    weeks: [
      {
        week: 1,
        title: 'Orientation Week - Learn the Lifts',
        description: 'Focus on form with empty barbell (45lbs) or lighter',
        days: [
          {
            day: 1,
            title: 'Workout A',
            description: 'First strength session - take it easy and focus on technique',
            duration: '45 min',
            activities: [
              'Squat: 5x5 @ 45lbs (empty bar)',
              'Bench Press: 5x5 @ 45lbs',
              'Barbell Row: 5x5 @ 65lbs',
              'Plank: 3x30 seconds'
            ],
            notes: 'Film yourself to check form. Rest 90 seconds between sets.'
          },
          {
            day: 3,
            title: 'Workout B',
            description: 'Introduce deadlifts and overhead press',
            duration: '45 min',
            activities: [
              'Squat: 5x5 @ 50lbs',
              'Overhead Press: 5x5 @ 45lbs',
              'Deadlift: 1x5 @ 95lbs',
              'Hanging Knee Raises: 3x8'
            ],
            notes: 'Deadlift is only 1 set of 5 reps because it\'s very taxing'
          },
          {
            day: 5,
            title: 'Workout A',
            description: 'Repeat workout A with slightly more weight',
            duration: '45 min',
            activities: [
              'Squat: 5x5 @ 55lbs',
              'Bench Press: 5x5 @ 50lbs',
              'Barbell Row: 5x5 @ 70lbs',
              'Plank: 3x35 seconds'
            ]
          }
        ]
      },
      {
        week: 2,
        title: 'Building Momentum',
        description: 'Add 5lbs per workout, maintain perfect form',
        days: [
          {
            day: 1,
            title: 'Workout B',
            description: 'Continue the alternating pattern',
            duration: '50 min',
            activities: [
              'Squat: 5x5 @ 60lbs',
              'Overhead Press: 5x5 @ 50lbs',
              'Deadlift: 1x5 @ 105lbs',
              'Chin-ups: 3x5 (assisted if needed)'
            ]
          },
          {
            day: 3,
            title: 'Workout A',
            description: 'Progressive overload continues',
            duration: '50 min',
            activities: [
              'Squat: 5x5 @ 65lbs',
              'Bench Press: 5x5 @ 55lbs',
              'Barbell Row: 5x5 @ 75lbs',
              'Dips: 3x5 (assisted if needed)'
            ]
          },
          {
            day: 5,
            title: 'Workout B',
            description: 'Feeling stronger already',
            duration: '50 min',
            activities: [
              'Squat: 5x5 @ 70lbs',
              'Overhead Press: 5x5 @ 55lbs',
              'Deadlift: 1x5 @ 115lbs',
              'Chin-ups: 3x6'
            ]
          }
        ]
      },
      {
        week: 3,
        title: 'Week 3: Strength Building',
        description: 'Continue progressive overload - weights getting heavier',
        days: [
          {
            day: 1,
            title: 'Workout A',
            description: 'Weights getting heavier - focus on completing all reps',
            duration: '50 min',
            activities: [
              'Squat: 5x5 @ 75lbs',
              'Bench Press: 5x5 @ 60lbs',
              'Barbell Row: 5x5 @ 80lbs',
              'Plank: 3x40 seconds'
            ]
          },
          {
            day: 3,
            title: 'Workout B',
            description: 'Keep form tight as weight increases',
            duration: '50 min',
            activities: [
              'Squat: 5x5 @ 80lbs',
              'Overhead Press: 5x5 @ 60lbs',
              'Deadlift: 1x5 @ 125lbs',
              'Chin-ups: 3x6'
            ]
          },
          {
            day: 5,
            title: 'Workout A',
            description: 'End week 3 strong',
            duration: '50 min',
            activities: [
              'Squat: 5x5 @ 85lbs',
              'Bench Press: 5x5 @ 65lbs',
              'Barbell Row: 5x5 @ 85lbs',
              'Dips: 3x6'
            ]
          }
        ]
      },
      {
        week: 4,
        title: 'Week 4: Adaptation',
        description: 'Your body is adapting - form should feel more natural',
        days: [
          {
            day: 1,
            title: 'Workout B',
            description: 'Body adapting - movements feel more natural',
            duration: '55 min',
            activities: [
              'Squat: 5x5 @ 90lbs',
              'Overhead Press: 5x5 @ 65lbs',
              'Deadlift: 1x5 @ 135lbs',
              'Chin-ups: 3x7'
            ]
          },
          {
            day: 3,
            title: 'Workout A',
            description: 'Approaching 100lbs on squat',
            duration: '55 min',
            activities: [
              'Squat: 5x5 @ 95lbs',
              'Bench Press: 5x5 @ 70lbs',
              'Barbell Row: 5x5 @ 90lbs',
              'Plank: 3x45 seconds'
            ]
          },
          {
            day: 5,
            title: 'Workout B',
            description: 'Hit 100lbs milestone on squat!',
            duration: '55 min',
            activities: [
              'Squat: 5x5 @ 100lbs',
              'Overhead Press: 5x5 @ 67.5lbs',
              'Deadlift: 1x5 @ 145lbs',
              'Chin-ups: 3x8'
            ]
          }
        ]
      },
      {
        week: 5,
        title: 'Week 5: Real Strength',
        description: 'Breaking into triple digits - this is where it gets real',
        days: [
          {
            day: 1,
            title: 'Workout A',
            description: 'Triple digits - real strength begins',
            duration: '55 min',
            activities: [
              'Squat: 5x5 @ 105lbs',
              'Bench Press: 5x5 @ 75lbs',
              'Barbell Row: 5x5 @ 95lbs',
              'Dips: 3x8'
            ],
            notes: 'If you fail a set, rest 5 min and try again. Same weight next session.'
          },
          {
            day: 3,
            title: 'Workout B',
            description: 'Real weight now - stay focused',
            duration: '55 min',
            activities: [
              'Squat: 5x5 @ 110lbs',
              'Overhead Press: 5x5 @ 70lbs',
              'Deadlift: 1x5 @ 155lbs',
              'Chin-ups: 3x8'
            ]
          },
          {
            day: 5,
            title: 'Workout A',
            description: 'Power through - you\'re getting strong',
            duration: '55 min',
            activities: [
              'Squat: 5x5 @ 115lbs',
              'Bench Press: 5x5 @ 80lbs',
              'Barbell Row: 5x5 @ 100lbs',
              'Plank: 3x50 seconds'
            ]
          }
        ]
      },
      {
        week: 6,
        title: 'Week 6: Pushing Limits',
        description: 'Weights are challenging now - focus on completing all reps',
        days: [
          {
            day: 1,
            title: 'Workout B',
            description: 'Challenging weights - mental toughness matters',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 120lbs',
              'Overhead Press: 5x5 @ 72.5lbs',
              'Deadlift: 1x5 @ 165lbs',
              'Chin-ups: 3x9'
            ]
          },
          {
            day: 3,
            title: 'Workout A',
            description: 'Push through the burn',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 125lbs',
              'Bench Press: 5x5 @ 85lbs',
              'Barbell Row: 5x5 @ 105lbs',
              'Dips: 3x9'
            ]
          },
          {
            day: 5,
            title: 'Workout B',
            description: 'Finishing week 6 strong',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 130lbs',
              'Overhead Press: 5x5 @ 75lbs',
              'Deadlift: 1x5 @ 175lbs',
              'Chin-ups: 3x10'
            ]
          }
        ]
      },
      {
        week: 7,
        title: 'Week 7: Deload Week',
        description: 'Reduce weight by 10% for recovery - prevent burnout',
        days: [
          {
            day: 1,
            title: 'Workout A (Light)',
            description: 'Deload week - active recovery',
            duration: '45 min',
            activities: [
              'Squat: 5x5 @ 115lbs (10% deload)',
              'Bench Press: 5x5 @ 75lbs',
              'Barbell Row: 5x5 @ 95lbs',
              'Mobility work: 10 min'
            ],
            notes: 'Deload week helps prevent overtraining and injury. Should feel easy.'
          },
          {
            day: 3,
            title: 'Workout B (Light)',
            description: 'Recovery workout - enjoy the lighter load',
            duration: '45 min',
            activities: [
              'Squat: 5x5 @ 120lbs',
              'Overhead Press: 5x5 @ 67.5lbs',
              'Deadlift: 1x5 @ 155lbs',
              'Stretching: 10 min'
            ]
          },
          {
            day: 5,
            title: 'Workout A (Light)',
            description: 'Final deload session - prep for big lifts ahead',
            duration: '45 min',
            activities: [
              'Squat: 5x5 @ 125lbs',
              'Bench Press: 5x5 @ 80lbs',
              'Barbell Row: 5x5 @ 100lbs',
              'Foam rolling: 10 min'
            ]
          }
        ]
      },
      {
        week: 8,
        title: 'Week 8: Back to Work',
        description: 'Resume progression feeling refreshed and stronger',
        days: [
          {
            day: 1,
            title: 'Workout B',
            description: 'Back from deload - feeling powerful',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 135lbs',
              'Overhead Press: 5x5 @ 77.5lbs',
              'Deadlift: 1x5 @ 185lbs',
              'Chin-ups: 3x10'
            ],
            notes: 'Should feel strong after deload week. Break plateaus if you had any.'
          },
          {
            day: 3,
            title: 'Workout A',
            description: 'Feeling refreshed and ready',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 140lbs',
              'Bench Press: 5x5 @ 90lbs',
              'Barbell Row: 5x5 @ 110lbs',
              'Dips: 3x10'
            ]
          },
          {
            day: 5,
            title: 'Workout B',
            description: 'Crushing PRs post-deload',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 145lbs',
              'Overhead Press: 5x5 @ 80lbs',
              'Deadlift: 1x5 @ 195lbs',
              'Chin-ups: 3x12'
            ]
          }
        ]
      },
      {
        week: 9,
        title: 'Week 9: Testing Phase',
        description: 'Approach your working maxes - time to push hard',
        days: [
          {
            day: 1,
            title: 'Workout A',
            description: 'Testing phase - see what you\'re capable of',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 150lbs',
              'Bench Press: 5x5 @ 95lbs',
              'Barbell Row: 5x5 @ 115lbs',
              'Core circuit: 10 min'
            ]
          },
          {
            day: 3,
            title: 'Workout B',
            description: 'Over 200lbs deadlift - major milestone approaching',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 155lbs',
              'Overhead Press: 5x5 @ 82.5lbs',
              'Deadlift: 1x5 @ 205lbs',
              'Pull-up challenge: Max reps'
            ]
          },
          {
            day: 5,
            title: 'Workout A',
            description: 'Week 9 complete - incredible progress',
            duration: '60 min',
            activities: [
              'Squat: 5x5 @ 160lbs',
              'Bench Press: 5x5 @ 100lbs',
              'Barbell Row: 5x5 @ 120lbs',
              'Celebration: Take progress photos!'
            ]
          }
        ]
      },
      {
        week: 10,
        title: 'Week 10: Peak Strength',
        description: 'You\'re now lifting serious weight - impressive progress',
        days: [
          {
            day: 1,
            title: 'Workout B',
            description: 'Peak strength - lifting serious weight',
            duration: '65 min',
            activities: [
              'Squat: 5x5 @ 165lbs',
              'Overhead Press: 5x5 @ 85lbs',
              'Deadlift: 1x5 @ 215lbs',
              'Accessory work'
            ]
          },
          {
            day: 3,
            title: 'Workout A',
            description: 'Approaching max capacity - give it everything',
            duration: '65 min',
            activities: [
              'Squat: 5x5 @ 170lbs',
              'Bench Press: 5x5 @ 105lbs',
              'Barbell Row: 5x5 @ 125lbs',
              'Core strength'
            ]
          },
          {
            day: 5,
            title: 'Workout B',
            description: '2 plate deadlift - major milestone!',
            duration: '65 min',
            activities: [
              'Squat: 5x5 @ 175lbs',
              'Overhead Press: 5x5 @ 87.5lbs',
              'Deadlift: 1x5 @ 225lbs (2 plates!)',
              'Grip work'
            ],
            notes: 'Deadlifting 225lbs (2 plates) is a major milestone! 🎉'
          }
        ]
      },
      {
        week: 11,
        title: 'Week 11: Final Push',
        description: 'Last week of progression before testing maxes',
        days: [
          {
            day: 1,
            title: 'Workout A',
            description: 'Final heavy week before testing',
            duration: '65 min',
            activities: [
              'Squat: 5x5 @ 180lbs',
              'Bench Press: 5x5 @ 110lbs',
              'Barbell Row: 5x5 @ 130lbs',
              'Strength accessories'
            ]
          },
          {
            day: 3,
            title: 'Workout B',
            description: 'Almost at the finish line',
            duration: '65 min',
            activities: [
              'Squat: 5x5 @ 185lbs',
              'Overhead Press: 5x5 @ 90lbs',
              'Deadlift: 1x5 @ 235lbs',
              'Conditioning'
            ]
          },
          {
            day: 5,
            title: 'Workout A',
            description: 'Last heavy session - prepare for max testing',
            duration: '65 min',
            activities: [
              'Squat: 5x5 @ 190lbs',
              'Bench Press: 5x5 @ 115lbs',
              'Barbell Row: 5x5 @ 135lbs',
              'Recovery prep'
            ]
          }
        ]
      },
      {
        week: 12,
        title: 'Week 12: Test Your Maxes!',
        description: 'Culmination of your hard work - test 1 rep max for each lift',
        days: [
          {
            day: 1,
            title: 'Max Testing Day 1',
            description: 'Test your maximum strength - squat and bench',
            duration: '90 min',
            activities: [
              'Warmup thoroughly: 10 min',
              'Test Squat 1RM (likely 225-250lbs)',
              'Test Bench Press 1RM (likely 135-155lbs)',
              'Light row work: 3x8',
              'Celebrate your progress!'
            ],
            notes: '1RM = 1 Rep Max. Work up gradually: empty bar → 50% → 70% → 85% → 95% → max attempts.'
          },
          {
            day: 4,
            title: 'Max Testing Day 2',
            description: 'Complete the program - deadlift and overhead press maxes',
            duration: '90 min',
            activities: [
              'Warmup: 10 min',
              'Test Deadlift 1RM (likely 275-315lbs)',
              'Test Overhead Press 1RM (likely 105-120lbs)',
              'Victory photos and measurements',
              'Plan next 12-week cycle!'
            ],
            notes: 'You\'ve likely doubled or tripled your starting weights. Time to celebrate! 🎊'
          }
        ]
      }
    ],
    dailyStructure: 'WORKOUT SCHEDULE:\n\n• Train 3 days per week (Monday/Wednesday/Friday or Tuesday/Thursday/Saturday)\n• Alternate between Workout A and Workout B\n• Every workout starts with Squats\n\nPROGRESSION:\n\n',
    exerciseGifs: {
      'Squat': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
      'Bench Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
      'Barbell Row': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif',
      'Overhead Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shoulder-Press.gif',
      'Deadlift': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
      'Plank': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Front-Plank.gif',
      'Chin-ups': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chin-up.gif',
      'Chin-up': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chin-up.gif',
      'Dips': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dip.gif',
      'Hanging Knee Raises': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hanging-Knee-Raise.gif',
      'Pull-ups': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif',
      'Pull-up': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif',
      'Pull-up challenge': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif',
      'Foam Rolling': 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Foam-Rolling-Quadriceps.gif',
      'Foam rolling': 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Foam-Rolling-Quadriceps.gif',
      'Stretching': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Hamstring-Stretch.gif',
      'Mobility': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hip-Circles.gif',
      'Mobility work': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hip-Circles.gif',
      'Core circuit': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bicycle-Crunch.gif',
      'Core strength': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bicycle-Crunch.gif',
      'Accessory work': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
      'Strength accessories': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif',
      'Conditioning': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Burpee.gif',
      'Recovery prep': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Hamstring-Stretch.gif',
      'Grip work': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Barbell-Wrist-Curl.gif',
      'Warmup': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Jumping-Jack.gif',
      'Warmup thoroughly': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Jumping-Jack.gif',
      'Test Squat 1RM': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
      'Test Bench Press 1RM': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
      'Test Deadlift 1RM': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
      'Test Overhead Press 1RM': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shoulder-Press.gif',
      'Light row work': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif'
    },
    exerciseFormGuides: {
      'Squat': {
        musclesWorked: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core', 'Lower Back'],
        setup: 'Set the bar on a squat rack at mid-chest height. Step under the bar and place it on your upper traps (high bar) or rear delts (low bar). Grip the bar slightly wider than shoulder-width. Unrack and step back with feet shoulder-width apart, toes slightly out.',
        steps: [
          'Take a deep breath and brace your core',
          'Push your hips back and bend your knees simultaneously',
          'Keep your chest up and back straight throughout',
          'Descend until your hip crease is below your knee (below parallel)',
          'Drive through your whole foot to stand back up',
          'Squeeze glutes at the top and exhale'
        ],
        commonMistakes: [
          'Knees caving inward — push knees out over toes',
          'Rising on toes — keep weight on mid-foot/heels',
          'Rounding lower back — maintain neutral spine',
          'Not hitting depth — hip crease must go below knee',
          'Looking up too much — keep neck neutral'
        ],
        tips: [
          'Warm up with bodyweight squats first',
          'Film yourself from the side to check depth',
          'Breathe in at top, hold during rep, exhale at top',
          'Rest 3-5 min between heavy sets'
        ]
      },
      'Bench Press': {
        musclesWorked: ['Chest (Pectorals)', 'Front Deltoids', 'Triceps'],
        setup: 'Lie on a flat bench with eyes under the bar. Plant feet flat on the floor. Grip the bar slightly wider than shoulder-width. Retract and depress your shoulder blades — squeeze them together and down. Arch your upper back slightly.',
        steps: [
          'Unrack the bar with locked arms directly above your shoulders',
          'Lower the bar in a controlled arc to your mid-chest/nipple line',
          'Touch your chest lightly — do not bounce',
          'Press the bar back up in a slight arc toward your face',
          'Lock out your arms at the top',
          'Keep shoulder blades retracted throughout the entire set'
        ],
        commonMistakes: [
          'Flaring elbows 90° — keep elbows at ~75° angle',
          'Bouncing bar off chest — light touch only',
          'Lifting hips off the bench — keep glutes planted',
          'Uneven pressing — bar should stay level',
          'Losing shoulder blade retraction mid-set'
        ],
        tips: [
          'Always use a spotter or safety pins for heavy sets',
          'Grip the bar hard — this activates more muscle fibers',
          'Leg drive helps — push feet into the floor',
          'Wrist wraps can help if wrists bend back'
        ]
      },
      'Barbell Row': {
        musclesWorked: ['Upper Back (Lats, Rhomboids, Traps)', 'Rear Deltoids', 'Biceps', 'Core'],
        setup: 'Stand with feet shoulder-width apart. Hinge forward at the hips until your torso is roughly 45° to the floor. Grip the bar slightly wider than shoulder-width with an overhand grip. Let the bar hang at arm\'s length.',
        steps: [
          'Brace your core and keep your back flat',
          'Pull the bar toward your lower chest/upper abdomen',
          'Drive your elbows back and squeeze your shoulder blades together',
          'Hold the contraction for a brief moment at the top',
          'Lower the bar under control back to the starting position',
          'Keep your torso angle consistent — don\'t jerk upright'
        ],
        commonMistakes: [
          'Using momentum/jerking the weight — stay controlled',
          'Rounding the lower back — maintain flat back',
          'Standing too upright — keep proper hip hinge',
          'Pulling to the wrong spot — aim for lower chest',
          'Shrugging shoulders up instead of pulling elbows back'
        ],
        tips: [
          'Think about pulling your elbows to your hips',
          'Use lifting straps if grip fails before back does',
          'Start lighter to master the hip hinge position',
          'Squeeze shoulder blades together at the top of each rep'
        ]
      },
      'Overhead Press': {
        musclesWorked: ['Shoulders (All 3 Deltoid Heads)', 'Triceps', 'Upper Chest', 'Core'],
        setup: 'Unrack the bar at collarbone height. Grip slightly wider than shoulder-width. Stand with feet shoulder-width apart. The bar should rest on your front deltoids with elbows slightly in front of the bar.',
        steps: [
          'Take a deep breath and brace your core tight',
          'Press the bar straight up, moving your head back slightly to clear your chin',
          'As the bar passes your forehead, push your head forward (through the window)',
          'Lock out your arms overhead with the bar directly over mid-foot',
          'Lower the bar back to your front deltoids under control',
          'Reset your brace before the next rep'
        ],
        commonMistakes: [
          'Excessive back lean — keep a neutral spine, squeeze glutes',
          'Pressing the bar forward instead of straight up',
          'Not locking out fully at the top',
          'Flaring ribs — brace core and squeeze glutes',
          'Using legs to push (push press) — keep legs straight'
        ],
        tips: [
          'This lift progresses slowest — be patient with small increments',
          'Squeeze your glutes to prevent excessive arching',
          'Use fractional plates (1.25lb) for progression',
          'Grip the bar as hard as you can for better stability'
        ]
      },
      'Deadlift': {
        musclesWorked: ['Entire Posterior Chain', 'Hamstrings', 'Glutes', 'Lower Back (Erectors)', 'Traps', 'Forearms'],
        setup: 'Stand with feet hip-width apart, bar over mid-foot. Bend down and grip the bar just outside your knees (overhand or mixed grip). Drop your hips until your shins touch the bar. Chest up, back flat, arms straight.',
        steps: [
          'Take a deep breath and brace your core hard',
          'Push the floor away with your legs (don\'t pull with arms)',
          'Keep the bar in contact with your body the entire lift',
          'As the bar passes your knees, drive your hips forward',
          'Stand tall and lock out hips and knees together',
          'Reverse the movement — hinge hips first, then bend knees'
        ],
        commonMistakes: [
          'Rounding the lower back — most dangerous mistake, keep it flat',
          'Bar drifting away from body — keep bar touching legs',
          'Jerking the bar off the floor — build tension first',
          'Hips shooting up first — chest and hips rise together',
          'Hyperextending at the top — just stand straight'
        ],
        tips: [
          'Only 1 set of 5 in StrongLifts — it\'s very taxing',
          'Use chalk or straps if grip limits you',
          'Mixed grip (one over, one under) helps with heavier weights',
          'Reset between every rep — no touch-and-go'
        ]
      },
      'Plank': {
        musclesWorked: ['Core (Rectus Abdominis, Transverse Abdominis)', 'Obliques', 'Lower Back', 'Shoulders'],
        setup: 'Get on the floor in a push-up position. Lower onto your forearms with elbows directly under shoulders. Your body should form a straight line from head to heels.',
        steps: [
          'Engage your core by pulling your belly button toward your spine',
          'Squeeze your glutes to keep hips level',
          'Keep your neck neutral — look at the floor',
          'Breathe steadily — don\'t hold your breath',
          'Hold the position for the prescribed time',
          'Maintain the straight line — no sagging or piking'
        ],
        commonMistakes: [
          'Hips sagging toward the floor — squeeze glutes harder',
          'Hips piking up — lower them to a straight line',
          'Holding breath — breathe normally throughout',
          'Looking up — keep neck aligned with spine',
          'Placing elbows too far forward'
        ],
        tips: [
          'Start with shorter holds and build up gradually',
          'Imagine pulling elbows toward toes (without moving) to increase activation',
          'If forearms hurt, try on your hands instead',
          'Add time progressively — 5 seconds more each session'
        ]
      },
      'Chin-ups': {
        musclesWorked: ['Lats (Back)', 'Biceps', 'Rear Deltoids', 'Core'],
        setup: 'Grip the pull-up bar with palms facing you (supinated), hands shoulder-width apart. Hang with arms fully extended and feet off the ground. Cross ankles if needed.',
        steps: [
          'Retract your shoulder blades — pull shoulders down and back',
          'Pull yourself up by driving elbows down toward your hips',
          'Continue until your chin clears the bar',
          'Hold briefly at the top with chin over the bar',
          'Lower yourself under control to full arm extension',
          'Fully extend arms at the bottom — no half reps'
        ],
        commonMistakes: [
          'Kipping or swinging — use strict form',
          'Not going to full extension at the bottom',
          'Chin not clearing the bar at the top',
          'Shrugging shoulders up to ears instead of pulling them down',
          'Using only arms — engage your back muscles'
        ],
        tips: [
          'Can\'t do one? Use a resistance band for assistance',
          'Negatives (slow lowering) build strength fast',
          'Supinated grip (palms facing you) is easier than pull-ups',
          'Add weight with a belt once you can do 3x10 bodyweight'
        ]
      },
      'Dips': {
        musclesWorked: ['Chest (Lower)', 'Triceps', 'Front Deltoids'],
        setup: 'Grip the parallel dip bars and jump up to the starting position with arms locked out. Lean your torso slightly forward for chest emphasis or stay upright for triceps emphasis.',
        steps: [
          'Keep your core braced and shoulders down',
          'Lower yourself by bending your elbows',
          'Descend until your upper arms are parallel to the floor',
          'Keep elbows close to your body (don\'t flare excessively)',
          'Press back up to full arm extension',
          'Lock out at the top before starting next rep'
        ],
        commonMistakes: [
          'Going too deep — stop at parallel to protect shoulders',
          'Flaring elbows wide — keep them relatively close',
          'Shrugging shoulders up — keep them depressed',
          'Swinging legs for momentum — stay controlled',
          'Not locking out at the top'
        ],
        tips: [
          'Use assisted dip machine or bands if you can\'t do bodyweight',
          'Lean forward more to target chest, stay upright for triceps',
          'Add weight with a dip belt once bodyweight feels easy',
          'Control the descent — 2-3 seconds down'
        ]
      },
      'Hanging Knee Raises': {
        musclesWorked: ['Lower Abs', 'Hip Flexors', 'Obliques', 'Grip'],
        setup: 'Hang from a pull-up bar with arms fully extended, using an overhand grip slightly wider than shoulder-width. Keep your body still before starting.',
        steps: [
          'Engage your core and tilt your pelvis slightly',
          'Raise your knees toward your chest in a controlled motion',
          'Curl your pelvis up at the top for maximum ab contraction',
          'Hold briefly at the top of the movement',
          'Lower your legs slowly back to the starting position',
          'Avoid swinging — reset to a dead hang between reps'
        ],
        commonMistakes: [
          'Swinging to generate momentum — stay controlled',
          'Only lifting knees partway — bring them to chest',
          'Not engaging the abs — just using hip flexors',
          'Dropping legs quickly — control the descent',
          'Gripping too wide or too narrow'
        ],
        tips: [
          'If grip is an issue, use ab straps hung from the bar',
          'Progress to straight leg raises as you get stronger',
          'Focus on curling your pelvis — that\'s what works the abs',
          'Exhale as you bring knees up'
        ]
      },
      'Pull-ups': {
        musclesWorked: ['Lats (Back)', 'Biceps', 'Rear Deltoids', 'Core', 'Forearms'],
        setup: 'Grip the pull-up bar with palms facing away (pronated), hands slightly wider than shoulder-width. Hang with arms fully extended.',
        steps: [
          'Depress and retract shoulder blades to engage lats',
          'Pull yourself up by driving elbows down and back',
          'Continue until your chin clears the bar',
          'Squeeze your lats hard at the top',
          'Lower under control to full arm extension',
          'Dead hang briefly before the next rep'
        ],
        commonMistakes: [
          'Kipping or using momentum — keep strict form',
          'Partial reps — go to full extension at the bottom',
          'Chin not clearing bar — pull higher',
          'Crossing legs and swinging — keep body tight',
          'Rounding shoulders forward at the bottom'
        ],
        tips: [
          'Harder than chin-ups — work up to them gradually',
          'Band-assisted pull-ups are a great progression',
          'Vary grip width to target different parts of the back',
          'Scapular pull-ups help build the initial pull strength'
        ]
      },
      'Foam Rolling': {
        musclesWorked: ['Full Body Recovery', 'Fascia Release'],
        setup: 'Place a foam roller on the floor. Position the target muscle group on top of the roller. Use your body weight to apply pressure.',
        steps: [
          'Roll slowly over the muscle group — about 1 inch per second',
          'When you find a tender spot, hold for 20-30 seconds',
          'Apply moderate pressure — it should feel like a deep massage',
          'Roll each major muscle group for 30-60 seconds',
          'Cover quads, hamstrings, calves, IT band, upper back, and lats',
          'Breathe deeply and try to relax into the roller'
        ],
        commonMistakes: [
          'Rolling too fast — slow, deliberate movements work best',
          'Rolling directly over joints or bones',
          'Applying too much pressure on tender areas',
          'Skipping muscle groups — be thorough',
          'Rolling the lower back directly — roll the muscles beside the spine instead'
        ],
        tips: [
          'Do this after every workout for best recovery',
          'A lacrosse ball works great for smaller areas',
          'Spend extra time on areas that feel tight',
          'Foam rolling before bed can improve sleep quality'
        ]
      },
      'Stretching': {
        musclesWorked: ['Full Body Flexibility', 'Joint Mobility'],
        setup: 'Find a clear space. Perform stretches after your workout when muscles are warm. Hold each stretch for 30-60 seconds.',
        steps: [
          'Start with hip flexor stretch — lunge position, push hips forward',
          'Hamstring stretch — sit on floor, reach for toes with straight legs',
          'Quad stretch — standing, pull heel to glute',
          'Chest/shoulder stretch — hold a doorframe and lean through',
          'Upper back stretch — clasp hands in front and round your back',
          'Hold each position — no bouncing'
        ],
        commonMistakes: [
          'Bouncing in stretches — hold steady',
          'Stretching cold muscles — warm up first',
          'Holding breath — breathe deeply throughout',
          'Pushing into pain — stretch to mild discomfort only',
          'Rushing through stretches — take your time'
        ],
        tips: [
          'Post-workout stretching is most effective',
          'Focus on muscles you just trained',
          'Deep breathing enhances the stretch',
          'Consistency matters more than intensity'
        ]
      },
      'Mobility work': {
        musclesWorked: ['Hip Flexors', 'Thoracic Spine', 'Ankles', 'Shoulders'],
        setup: 'Clear floor space. Focus on joints that feel stiff or restricted. Mobility work improves range of motion for your lifts.',
        steps: [
          'Hip circles — 10 each direction to warm up the hip joints',
          'Deep squat hold — sit in a deep squat for 30 seconds',
          'Thoracic spine rotations — on all fours, rotate chest open',
          'Ankle circles and calf raises for ankle mobility',
          'Shoulder dislocates with a band or PVC pipe',
          'Cat-cow stretches for spinal mobility'
        ],
        commonMistakes: [
          'Skipping mobility work entirely — it prevents injuries',
          'Going too aggressive — gentle, controlled movements',
          'Only doing mobility when something hurts — do it preventatively',
          'Ignoring ankles — ankle mobility affects squat depth'
        ],
        tips: [
          'Do mobility work on rest days too',
          '5-10 minutes makes a big difference',
          'Focus on areas that limit your lifts',
          'Hip and ankle mobility directly improves squat depth'
        ]
      },
      'Core circuit': {
        musclesWorked: ['Rectus Abdominis', 'Obliques', 'Transverse Abdominis', 'Hip Flexors'],
        setup: 'Find a mat or clear floor space. Perform exercises back-to-back with minimal rest. Complete 2-3 rounds.',
        steps: [
          'Bicycle crunches — 15 reps each side, twist elbow to opposite knee',
          'Plank — hold for 30-45 seconds',
          'Russian twists — 15 reps each side, twist torso side to side',
          'Dead bugs — 10 reps each side, extend opposite arm and leg',
          'Mountain climbers — 20 reps total, drive knees to chest',
          'Rest 30 seconds between rounds'
        ],
        commonMistakes: [
          'Pulling on your neck during crunches — hands light behind head',
          'Letting hips sag during planks',
          'Using momentum instead of core control',
          'Holding breath — exhale on exertion',
          'Rushing through reps — focus on contraction'
        ],
        tips: [
          'A strong core improves all your main lifts',
          'Quality over quantity — feel each rep',
          'Core work is a supplement, not a replacement for heavy compounds',
          'Do core work at the end of your session'
        ]
      },
      'Grip work': {
        musclesWorked: ['Forearms (Flexors & Extensors)', 'Finger Strength', 'Wrist Stability'],
        setup: 'You can use a barbell, dumbbells, or a dedicated grip trainer. A pull-up bar also works for dead hangs. Have a towel ready for towel hangs if desired.',
        steps: [
          'Barbell holds — hold a loaded barbell at lockout for 30-60 seconds',
          'Farmer\'s walks — grab heavy dumbbells, walk 30-40 meters with good posture',
          'Plate pinches — pinch two plates together smooth-side out, hold for 20-30 seconds',
          'Dead hangs — hang from a pull-up bar for as long as possible',
          'Wrist curls — 3x15 with a light barbell, palms up and palms down',
          'Rest 60-90 seconds between sets'
        ],
        commonMistakes: [
          'Going too heavy too soon — build grip endurance gradually',
          'Only training crush grip — include pinch and support grip too',
          'Neglecting wrist extensors — do reverse wrist curls as well',
          'Using straps for everything — train without straps when possible',
          'Skipping grip work — weak grip limits your deadlift and rows'
        ],
        tips: [
          'Train grip 2-3 times per week at the end of your session',
          'Dead hangs also decompress your spine — great for recovery',
          'Chalk helps but don\'t rely on it for every set',
          'Grip strength transfers to all pulling movements'
        ]
      },
      'Conditioning': {
        musclesWorked: ['Cardiovascular System', 'Full Body Endurance', 'Core'],
        setup: 'Choose a conditioning method: burpees, kettlebell swings, rowing machine, battle ropes, or sled pushes. Clear enough space for movement.',
        steps: [
          'Start with a 2-minute light warm-up to raise heart rate',
          'Perform 30 seconds of high intensity work (burpees, swings, sprints)',
          'Rest 30-60 seconds — walk or stand, catch your breath',
          'Repeat for 8-10 rounds total',
          'Cool down with 2 minutes of walking',
          'Total session should be 10-15 minutes'
        ],
        commonMistakes: [
          'Going too long — conditioning after lifting should be short and intense',
          'Sacrificing form for speed — maintain good technique',
          'Doing conditioning before lifting — always lift first',
          'Not scaling intensity — start with longer rest periods if needed',
          'Choosing movements that fatigue muscles you just trained heavily'
        ],
        tips: [
          'Keep it short and intense — 10-15 minutes is plenty after lifting',
          'Rowing and cycling are joint-friendly options',
          'Conditioning improves recovery between heavy sets over time',
          'Track your rest periods — try to shorten them gradually'
        ]
      },
      'Recovery prep': {
        musclesWorked: ['Full Body Recovery', 'Nervous System', 'Joint Health'],
        setup: 'Gather a foam roller, lacrosse ball, and resistance band. Find a quiet area where you can stretch and roll without interruption.',
        steps: [
          'Light walking — 3-5 minutes to bring heart rate down gradually',
          'Foam roll major muscle groups — quads, hamstrings, glutes, upper back (5 min)',
          'Static stretching — hold each stretch 30-60 seconds for muscles trained today',
          'Lacrosse ball work — target any particularly tight spots for 60 seconds each',
          'Band pull-aparts and shoulder dislocates — 15 reps each for shoulder health',
          'Deep breathing — 2 minutes of slow, controlled breaths to activate recovery'
        ],
        commonMistakes: [
          'Skipping recovery entirely — it\'s essential for long-term progress',
          'Rushing through it — take your time, this is active recovery',
          'Only stretching sore areas — address the whole body',
          'Forgetting to hydrate — drink water during recovery work',
          'Static stretching before lifting — save it for after'
        ],
        tips: [
          'Recovery prep after your last heavy session sets you up for max testing',
          'Prioritize sleep — 7-9 hours is critical for strength recovery',
          'Light nutrition post-workout — protein and carbs within 2 hours',
          'Consider an Epsom salt bath on heavy training days'
        ]
      },
      'Strength accessories': {
        musclesWorked: ['Biceps', 'Triceps', 'Lateral Deltoids', 'Rear Deltoids', 'Calves'],
        setup: 'Use dumbbells, cables, or machines for accessory movements. These exercises supplement the main compound lifts and address weak points.',
        steps: [
          'Dumbbell curls — 3x10-12 to build bicep strength for rows and chin-ups',
          'Tricep pushdowns or skull crushers — 3x10-12 for pressing lockout strength',
          'Lateral raises — 3x12-15 for shoulder width and stability',
          'Face pulls — 3x15-20 for rear delt and rotator cuff health',
          'Calf raises — 3x15-20 for lower leg development',
          'Keep rest periods short — 60-90 seconds between sets'
        ],
        commonMistakes: [
          'Going too heavy on accessories — use moderate weight with good form',
          'Spending too long on accessories — 15-20 minutes max',
          'Prioritizing accessories over compound lifts — compounds come first always',
          'Using momentum to swing weights — strict controlled reps',
          'Ignoring rear delts and rotator cuff — these prevent shoulder injuries'
        ],
        tips: [
          'Accessories fix weak points in your main lifts',
          'Face pulls are the best exercise for shoulder health — never skip them',
          'Higher reps (10-15) work best for accessories',
          'Superset opposing muscles (curls + pushdowns) to save time'
        ]
      },
      'Accessory work': {
        musclesWorked: ['Lateral Deltoids', 'Rear Deltoids', 'Biceps', 'Triceps', 'Core'],
        setup: 'Use dumbbells and cables. Accessory work targets muscles that support your main lifts. Keep the weight moderate and focus on the mind-muscle connection.',
        steps: [
          'Lateral raises — 3x12-15, lift dumbbells to shoulder height with slight bend in elbows',
          'Face pulls — 3x15-20 with a cable or resistance band, pull to forehead level',
          'Dumbbell curls — 3x10-12, alternate arms or do both together',
          'Overhead tricep extension — 3x10-12 with a dumbbell or cable',
          'Reverse flyes — 3x12-15 for rear delt and upper back development',
          'Keep rest to 60 seconds — accessories don\'t need long rest'
        ],
        commonMistakes: [
          'Ego lifting — accessories are about quality, not weight',
          'Skipping rear delts — imbalance leads to shoulder problems',
          'Doing too many sets — 3-4 exercises at 3 sets each is plenty',
          'Neglecting the mind-muscle connection — feel the target muscle working',
          'Rushing reps — use a 2-second up, 2-second down tempo'
        ],
        tips: [
          'Accessory work builds the supporting muscles that prevent injury',
          'Lateral raises and face pulls directly improve overhead press performance',
          'Curl variations help with chin-up and row strength',
          'Keep total accessory time under 20 minutes'
        ]
      },
      'Core strength': {
        musclesWorked: ['Rectus Abdominis', 'Obliques', 'Transverse Abdominis', 'Erector Spinae'],
        setup: 'Clear floor space with a mat. Core strength directly supports squat, deadlift, and overhead press performance.',
        steps: [
          'Ab wheel rollouts or plank — 3x10 rollouts or 3x45-second planks',
          'Pallof press — 3x10 each side using a cable or resistance band',
          'Side planks — 2x30 seconds each side for oblique strength',
          'Dead bugs — 3x10 each side, extend opposite arm and leg slowly',
          'Bird dogs — 2x10 each side for lower back and core coordination',
          'Rest 45-60 seconds between sets'
        ],
        commonMistakes: [
          'Only doing crunches — train all core functions (anti-extension, anti-rotation, anti-lateral flexion)',
          'Ignoring lower back — erector spinae are part of your core',
          'Holding breath during core exercises — breathe steadily',
          'Doing core work first — do it after main lifts',
          'Using excessive spinal flexion — protect your spine'
        ],
        tips: [
          'A strong core is the foundation for all heavy lifts',
          'Pallof press and dead bugs are safer than crunches for spinal health',
          'Anti-rotation exercises transfer best to barbell lifts',
          'Train core 2-3 times per week for best results'
        ]
      },
      'Warmup': {
        musclesWorked: ['Full Body Activation', 'Cardiovascular System'],
        setup: 'Start with 5 minutes of light cardio (rowing, cycling, or brisk walking). Then do dynamic stretches and warm-up sets.',
        steps: [
          '5 minutes light cardio — rowing machine, bike, or brisk walk',
          'Arm circles and leg swings — 10 each direction',
          'Bodyweight squats — 10 reps to warm up the pattern',
          'Hip hinges — 10 reps to prep for deadlifts/rows',
          'Push-ups — 10 reps to warm up the pressing muscles',
          'Then do warm-up sets: empty bar → 50% → 70% → working weight'
        ],
        commonMistakes: [
          'Skipping warm-up entirely — increases injury risk significantly',
          'Static stretching before lifting — do dynamic movements instead',
          'Too much cardio — 5 minutes is plenty, you want energy for lifts',
          'Jumping straight to working weight — ramp up gradually'
        ],
        tips: [
          'A good warm-up takes 10-15 minutes total',
          'Include warm-up sets with progressively heavier weight',
          'Focus on the muscles you\'re about to train',
          'Break a light sweat before your first working set'
        ]
      }
    }
  },
  {
    id: 'ch-2',
    name: 'Morning Meditation',
    description: 'Start your day with mental clarity and calm. Reduce stress by 40% in just 8 weeks.',
    icon: 'sparkles',
    color: HABIT_COLORS[5],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Mindfulness',
    user: {
      id: 'u2',
      name: 'Sarah Williams',
      avatar: 'https://i.pravatar.cc/150?img=45',
      followersCount: 8900,
      habitsShared: 12,
    },
    likes: 5621,
    saves: 4102,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '10 min',
    tags: ['meditation', 'mindfulness', 'morning'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    goalType: 'simple',
    targetAudience: 'Perfect for complete beginners',
    mainGoal: 'Build a daily meditation practice and experience lasting mental clarity',
    longDescription: 'Morning meditation sets the tone for your entire day. This practice combines breath awareness, body scanning, and mindfulness techniques proven to reduce stress by 40% (Harvard Medical School). Start with just 5 minutes and build to 20.',
    benefits: [
      'Reduce stress and anxiety by 40% in 8 weeks',
      'Improve focus and concentration for 4-6 hours after practice',
      'Lower blood pressure and cortisol levels naturally',
      'Enhance emotional intelligence and self-awareness',
      'Better decision-making throughout the day',
      'Increased gray matter in brain regions for memory and learning'
    ],
    equipment: ['Quiet space', 'Comfortable seat or cushion', 'Timer or meditation app (Headspace, Calm, Insight Timer)', 'Optional: headphones for guided meditations'],
    prerequisites: ['None - perfect for complete beginners', 'Ability to sit comfortably for 5-10 minutes', 'Commitment to daily practice'],
    scientificBacking: 'Harvard neuroscientist Dr. Sara Lazar found 8 weeks of meditation increases gray matter in brain regions for learning, memory, and emotional regulation.',
    programLength: '30 days',
    resources: [
      { title: 'Headspace App', description: 'Excellent guided meditations for beginners' },
      { title: 'Calm App', description: 'Sleep stories and meditation courses' },
      { title: 'Insight Timer', description: 'Free meditations from teachers worldwide' }
    ],
    phases: [
      {
        phase: 1,
        title: 'Foundation Building',
        description: 'Learn the basics and build consistency',
        weeks: [1, 2],
        focusAreas: ['Breath awareness', 'Sitting posture', 'Daily habit formation']
      },
      {
        phase: 2,
        title: 'Deepening Practice',
        description: 'Extend duration and add body scanning',
        weeks: [3, 4],
        focusAreas: ['Body scan meditation', 'Increased awareness', 'Emotional regulation']
      }
    ],
    weeks: [
      {
        week: 1,
        title: 'Week 1: Getting Started',
        description: 'Start with 5 minutes daily - focus on consistency over duration',
        days: [
          {
            day: 1,
            title: 'Day 1: First Meditation',
            description: 'Your first step into mindfulness',
            duration: '5 min',
            activities: [
              'Find a quiet space where you won\'t be disturbed',
              'Sit comfortably with spine straight (chair or cushion)',
              'Set timer for 5 minutes',
              'Close eyes and focus on natural breathing',
              'Count breaths: inhale (1), exhale (2), up to 10, then restart',
              'When mind wanders, gently return to counting'
            ],
            notes: 'Mind wandering is normal! The practice is noticing and returning to the breath.'
          },
          {
            day: 2,
            title: 'Day 2-7: Building Consistency',
            description: 'Repeat daily, same time each morning',
            duration: '5 min',
            activities: [
              'Meditate at same time daily (builds habit)',
              'Continue breath counting technique',
              'Notice thoughts without judgment',
              'End with 3 deep breaths before opening eyes'
            ],
            notes: 'Try meditating before checking your phone. This sets a calm tone for the day.'
          }
        ]
      },
      {
        week: 2,
        title: 'Week 2: Extending Practice',
        description: 'Increase to 8 minutes and deepen awareness',
        days: [
          {
            day: 1,
            title: 'Days 8-14: Longer Sessions',
            description: 'Gradually increase duration',
            duration: '8 min',
            activities: [
              'Extend timer to 8 minutes',
              'First 2 min: settle into breathing',
              'Next 4 min: observe breath without controlling it',
              'Last 2 min: body awareness - notice sensations',
              'End with gratitude for taking this time'
            ],
            notes: '8 minutes might feel long at first. Remember: consistency beats perfection.'
          }
        ]
      },
      {
        week: 3,
        title: 'Week 3: Body Scan Introduction',
        description: 'Add body awareness to your practice',
        days: [
          {
            day: 1,
            title: 'Days 15-21: Body Scan Meditation',
            description: 'Combine breath and body awareness',
            duration: '10 min',
            activities: [
              'Increase to 10 minutes',
              'Minutes 1-3: Focus on breathing',
              'Minutes 4-8: Body scan (feet → legs → torso → arms → head)',
              'Notice tension and consciously relax each area',
              'Minutes 9-10: Full body awareness',
              'End with 3 deep breaths'
            ],
            notes: 'Body scanning helps release physical tension you didn\'t know you were holding.'
          }
        ]
      },
      {
        week: 4,
        title: 'Week 4: Establishing Your Practice',
        description: 'You\'re now a daily meditator!',
        days: [
          {
            day: 1,
            title: 'Days 22-30: Independent Practice',
            description: 'Continue 10-minute daily practice',
            duration: '10 min',
            activities: [
              'Choose your preferred style: breath focus or body scan',
              'Sit for 10 minutes without guided audio (if comfortable)',
              'Observe thoughts as clouds passing by',
              'Return to anchor (breath or body) when distracted',
              'Celebrate completing 30 days!'
            ],
            notes: 'After 30 days, meditation becomes easier. You\'ve built the neural pathways for daily practice.'
          }
        ]
      }
    ],
    dailyStructure: 'OPTIMAL TIME: Immediately after waking, before phone or breakfast. This ensures you meditate before distractions arise.\n\nDURATION PROGRESSION:\n• Week 1-2: 5 minutes daily\n• Week 3-4: 10 minutes daily\n• Week 5+: 10-20 minutes (your preference)\n'
  },
  {
    id: 'ch-3',
    name: 'Read 30 Pages Daily',
    description: 'Read 12-24 books per year. Just 30 pages daily transforms you into an avid reader.',
    icon: 'book-open',
    color: HABIT_COLORS[2],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Learning',
    user: {
      id: 'u3',
      name: 'Marcus Johnson',
      avatar: 'https://i.pravatar.cc/150?img=33',
      followersCount: 15200,
      habitsShared: 6,
    },
    likes: 3942,
    saves: 3210,
    difficulty: 'Easy',
    estimatedDuration: '30 min',
    tags: ['reading', 'learning', 'books'],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    goalType: 'simple',
    targetAudience: 'Anyone who wants to read more',
    mainGoal: 'Read 12-24 books per year and expand your knowledge exponentially',
    longDescription: 'Warren Buffett reads 500 pages per day. Bill Gates reads 50 books per year. You don\'t need to match them - just 30 pages daily (20-30 minutes) will get you through 12-24 books annually.',
    benefits: [
      'Read 12-24 books per year (vs. average of 4)',
      'Reduce stress by 68% in just 6 minutes of reading',
      'Improve vocabulary by 30-50 words per book',
      'Enhance empathy and emotional intelligence',
      'Better sleep when reading before bed (vs. phone)',
      'Gain knowledge equivalent to university course per year'
    ],
    equipment: ['Book (physical, Kindle, or library book)', 'Comfortable reading spot', 'Good lighting', 'Optional: Reading tracker app or journal'],
    prerequisites: ['None - works for any reading level', 'Access to books (library is free)', 'Ability to read for 20-30 minutes'],
    scientificBacking: 'University of Sussex study: Reading reduces stress by 68%, more than music (61%) or tea (54%). Yale study: Reading 30 min daily increased lifespan by 23 months.',
    programLength: '30 days to build habit',
    dailyStructure: 'WHEN TO READ:\n• Morning: Before work (15 min) + evening (15 min)\n• Or: One 30-minute session (most choose evening)\n\nHOW TO BUILD THE HABIT:\n1. Choose your reading time (consistency is key)\n2.'
  },
  {
    id: 'ch-4',
    name: 'Intermittent Fasting 16:8',
    description: 'Fast for 16 hours, eat within an 8-hour window. Great for weight management and mental clarity.',
    icon: 'clock',
    color: HABIT_COLORS[8],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: {
      id: 'u4',
      name: 'Emma Rodriguez',
      avatar: 'https://i.pravatar.cc/150?img=27',
      followersCount: 22500,
      habitsShared: 15,
    },
    likes: 8234,
    saves: 6891,
    trending: true,
    difficulty: 'Medium',
    estimatedDuration: '16 hours',
    tags: ['fasting', 'health', 'nutrition'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Best for healthy adults (consult doctor first)',
    longDescription: 'The 16:8 method is the most popular and sustainable form of intermittent fasting. Fast for 16 hours (including sleep), eat during an 8-hour window. Most people skip breakfast, eating 12pm-8pm or 1pm-9pm.',
    benefits: [
      'Lose 3-8% body weight over 3-24 weeks',
      'Reduce body fat by 4-7% while maintaining muscle',
      'Improve insulin sensitivity by 31%',
      'Increase human growth hormone by 5x',
      'Enhance mental clarity and focus',
      'Trigger autophagy (cellular repair process)',
      'Reduce inflammation markers by 25%'
    ],
    equipment: ['Water bottle (drink plenty during fasting)', 'Black coffee or tea (optional appetite suppressant)', 'Tracking app like Zero or FastHabit'],
    prerequisites: ['Medical clearance if diabetic or on medications', 'Not recommended during pregnancy/breastfeeding', 'Gradually transition from 12:12 to 16:8'],
    scientificBacking: 'Study in Cell Metabolism (2019) showed 16:8 fasting reduced calorie intake by 300/day without intentional restriction. Research by Dr.',
    programLength: '4 weeks to adapt',
    dailyStructure: 'Example schedule: Stop eating at 8pm. Sleep. Skip breakfast. Drink water, black coffee, or green tea during fast. Break fast at 12pm with protein-rich meal. Eat normally 12pm-8pm (2-3 meals). Stop eating at 8pm.'
  },
  {
    id: 'ch-5',
    name: 'Cold Shower Challenge',
    description: 'End your shower with 30 seconds of cold water. Builds mental toughness and boosts energy.',
    icon: 'droplet',
    color: HABIT_COLORS[1],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: {
      id: 'u5',
      name: 'David Kim',
      avatar: 'https://i.pravatar.cc/150?img=51',
      followersCount: 6700,
      habitsShared: 9,
    },
    likes: 1847,
    saves: 1203,
    difficulty: 'Hard',
    estimatedDuration: '1 min',
    tags: ['cold-exposure', 'energy', 'wellness'],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'For those seeking mental toughness',
  },
  {
    id: 'ch-6',
    name: 'Daily Gratitude Journal',
    description: 'Write down 3 things you\'re grateful for each day. Improves mental health and happiness.',
    icon: 'heart',
    color: HABIT_COLORS[6],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Mindfulness',
    user: {
      id: 'u6',
      name: 'Olivia Martinez',
      avatar: 'https://i.pravatar.cc/150?img=42',
      followersCount: 18900,
      habitsShared: 20,
    },
    likes: 7123,
    saves: 5642,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '5 min',
    tags: ['gratitude', 'journaling', 'mental-health'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Great for everyone, especially beginners',
  },
  {
    id: 'ch-7',
    name: 'Learn Spanish (Duolingo)',
    description: 'Practice Spanish daily with Duolingo. Stay consistent and reach fluency in 6 months.',
    icon: 'book',
    color: HABIT_COLORS[7],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Learning',
    user: {
      id: 'u7',
      name: 'Carlos Santana',
      avatar: 'https://i.pravatar.cc/150?img=15',
      followersCount: 9800,
      habitsShared: 11,
    },
    likes: 4521,
    saves: 3876,
    difficulty: 'Easy',
    estimatedDuration: '15 min',
    tags: ['language', 'learning', 'spanish'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Language learners at any level',
  },
  {
    id: 'ch-8',
    name: '10K Steps Daily',
    description: 'Walk at least 10,000 steps every day. Use a fitness tracker to monitor your progress.',
    icon: 'footprints',
    color: HABIT_COLORS[4],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Fitness',
    user: {
      id: 'u8',
      name: 'Jessica Lee',
      avatar: 'https://i.pravatar.cc/150?img=38',
      followersCount: 14300,
      habitsShared: 7,
    },
    likes: 6892,
    saves: 5234,
    difficulty: 'Easy',
    estimatedDuration: '90 min',
    tags: ['walking', 'cardio', 'fitness'],
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Perfect for all fitness levels',
  },
  {
    id: 'ch-9',
    name: 'No Social Media Before Noon',
    description: 'Reclaim your mornings by avoiding social media until 12pm. Focus on productive tasks first.',
    icon: 'smartphone',
    color: HABIT_COLORS[9],
    frequency: { days: [1, 2, 3, 4, 5] },
    category: 'Productivity',
    user: {
      id: 'u9',
      name: 'Ryan Thompson',
      avatar: 'https://i.pravatar.cc/150?img=58',
      followersCount: 11200,
      habitsShared: 13,
    },
    likes: 5341,
    saves: 4923,
    trending: true,
    difficulty: 'Hard',
    estimatedDuration: 'All day',
    tags: ['digital-detox', 'productivity', 'focus'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Best for busy professionals and students',
  },
  {
    id: 'ch-10',
    name: 'Meal Prep Sundays',
    description: 'Prepare healthy meals for the week every Sunday. Save time and eat healthier all week.',
    icon: 'utensils',
    color: HABIT_COLORS[0],
    frequency: { days: [0] },
    category: 'Health',
    user: {
      id: 'u10',
      name: 'Nina Patel',
      avatar: 'https://i.pravatar.cc/150?img=49',
      followersCount: 17600,
      habitsShared: 18,
    },
    likes: 9127,
    saves: 7845,
    difficulty: 'Medium',
    estimatedDuration: '2-3 hours',
    tags: ['meal-prep', 'nutrition', 'cooking'],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Busy people who value healthy eating',
  },
  {
    id: 'ch-11',
    name: 'Deep Work Sessions (Pomodoro)',
    description: '4x 25-minute focused work sessions with 5-minute breaks. Maximize productivity.',
    icon: 'brain',
    color: HABIT_COLORS[3],
    frequency: { days: [1, 2, 3, 4, 5] },
    category: 'Productivity',
    user: {
      id: 'u11',
      name: 'Michael Zhang',
      avatar: 'https://i.pravatar.cc/150?img=62',
      followersCount: 20100,
      habitsShared: 16,
    },
    likes: 8765,
    saves: 7231,
    difficulty: 'Medium',
    estimatedDuration: '2 hours',
    tags: ['productivity', 'focus', 'deep-work'],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Knowledge workers and remote professionals',
  },
  {
    id: 'ch-12',
    name: 'Yoga Flow Morning',
    description: '20-minute yoga flow to stretch, strengthen, and energize your body for the day ahead.',
    icon: 'circle',
    color: HABIT_COLORS[5],
    frequency: { type: 'times_per_week', days: [1, 3, 5, 0], timesPerWeek: 4 },
    category: 'Fitness',
    user: {
      id: 'u12',
      name: 'Sophia Anderson',
      avatar: 'https://i.pravatar.cc/150?img=31',
      followersCount: 13700,
      habitsShared: 14,
    },
    likes: 6234,
    saves: 4876,
    difficulty: 'Easy',
    estimatedDuration: '20 min',
    tags: ['yoga', 'flexibility', 'wellness'],
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Great for beginners and all ages',
  },
  {
    id: 'ch-13',
    name: 'Creative Writing Daily',
    description: 'Write 500 words every day. Build your writing skills and unleash your creativity.',
    icon: 'pen-tool',
    color: HABIT_COLORS[2],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Creative',
    user: {
      id: 'u13',
      name: 'James Cooper',
      avatar: 'https://i.pravatar.cc/150?img=56',
      followersCount: 8500,
      habitsShared: 10,
    },
    likes: 3678,
    saves: 2891,
    difficulty: 'Medium',
    estimatedDuration: '30 min',
    tags: ['writing', 'creativity', 'journaling'],
    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Aspiring writers and creative minds',
  },
  {
    id: 'ch-15',
    name: 'Practice Guitar 30 Min',
    description: 'Consistent practice is key. 30 minutes daily will make you proficient in 6 months.',
    icon: 'music',
    color: HABIT_COLORS[1],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Creative',
    user: {
      id: 'u15',
      name: 'Liam Foster',
      avatar: 'https://i.pravatar.cc/150?img=67',
      followersCount: 7200,
      habitsShared: 5,
    },
    likes: 2934,
    saves: 2103,
    difficulty: 'Medium',
    estimatedDuration: '30 min',
    tags: ['music', 'guitar', 'practice'],
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Beginner to intermediate musicians',
  },
  {
    id: 'ch-16',
    name: 'Box Breathing (4-4-4-4)',
    description: 'Navy SEAL technique: Inhale 4s, hold 4s, exhale 4s, hold 4s. Reduces stress and improves focus.',
    icon: 'wind',
    color: HABIT_COLORS[5],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Mindfulness',
    user: {
      id: 'u16',
      name: 'Dr. Rachel Green',
      avatar: 'https://i.pravatar.cc/150?img=32',
      followersCount: 28400,
      habitsShared: 22,
    },
    likes: 12456,
    saves: 9821,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '5 min',
    tags: ['breathing', 'stress-relief', 'focus', 'anxiety'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone dealing with stress or anxiety',
    longDescription: 'Box breathing (also called square breathing) is used by Navy SEALs, first responders, and athletes to stay calm under extreme pressure. The technique balances the nervous system, reduces cortisol, and improves oxygen delivery.',
    benefits: [
      'Reduce acute stress and anxiety instantly',
      'Lower heart rate by 10-15 bpm in 2 minutes',
      'Improve focus and decision-making under pressure',
      'Activate parasympathetic nervous system (rest mode)',
      'Better emotional regulation',
      'Improve HRV (heart rate variability)',
      'Works anywhere - meetings, traffic, before sleep'
    ],
    equipment: ['Nothing required', 'Optional: timer or breathing app', 'Quiet space preferred but not required'],
    prerequisites: ['None - safe for everyone', 'Can be done sitting, standing, or lying down'],
    scientificBacking: 'Research at Stanford shows controlled breathing directly affects brain regions for emotion, attention, and body awareness.',
    dailyStructure: 'Do 3-5 rounds anytime you feel stressed. Ideal times: Before important meetings/presentations, during anxiety/overwhelm, before sleep, in traffic, before difficult conversations. HOW TO: Sit comfortably, spine straight. Close eyes or soft gaze.'
  },
  {
    id: 'ch-22',
    name: 'Time Blocking Method',
    description: 'Schedule every hour of your day. Cal Newport\'s productivity system used by top performers.',
    icon: 'calendar',
    color: HABIT_COLORS[9],
    frequency: { days: [1, 2, 3, 4, 5] },
    category: 'Productivity',
    user: {
      id: 'u22',
      name: 'Productivity Expert Tom',
      avatar: 'https://i.pravatar.cc/150?img=60',
      followersCount: 18900,
      habitsShared: 24,
    },
    likes: 9234,
    saves: 7654,
    difficulty: 'Medium',
    estimatedDuration: '15 min planning',
    tags: ['productivity', 'planning', 'time-management', 'focus'],
    createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Professionals managing multiple projects',
  },
  {
    id: 'ch-28',
    name: 'Gregg\'s Shorthand Practice',
    description: 'Learn efficient shorthand writing. 15 min daily practice for note-taking mastery in 3 months.',
    icon: 'pen-line',
    color: HABIT_COLORS[2],
    frequency: { days: [1, 2, 3, 4, 5] },
    category: 'Learning',
    user: {
      id: 'u28',
      name: 'Educator Prof. Williams',
      avatar: 'https://i.pravatar.cc/150?img=59',
      followersCount: 8700,
      habitsShared: 8,
    },
    likes: 3456,
    saves: 2345,
    difficulty: 'Medium',
    estimatedDuration: '15 min',
    tags: ['learning', 'writing', 'productivity', 'skill'],
    createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Students and note-taking enthusiasts',
  },
  {
    id: 'ch-42',
    name: 'Sketch Daily Challenge',
    description: 'Draw anything for 15 min. Betty Edwards research: consistent practice develops visual intelligence.',
    icon: 'palette',
    color: HABIT_COLORS[6],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Creative',
    user: {
      id: 'u42',
      name: 'Artist Elena Martinez',
      avatar: 'https://i.pravatar.cc/150?img=39',
      followersCount: 17800,
      habitsShared: 13,
    },
    likes: 7654,
    saves: 5678,
    difficulty: 'Easy',
    estimatedDuration: '15 min',
    tags: ['art', 'drawing', 'creativity', 'practice'],
    createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Creative beginners and artists',
  },
  {
    id: 'ch-46',
    name: 'Bible in 365 Days',
    description: 'Daily devotional covering entire Bible in a year. Research shows reduces depression risk by 22%.',
    icon: 'book-open',
    color: HABIT_COLORS[6],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Religion',
    user: {
      id: 'u46',
      name: 'Pastor David Morrison',
      avatar: 'https://i.pravatar.cc/150?img=65',
      followersCount: 34500,
      habitsShared: 12,
    },
    likes: 18234,
    saves: 14567,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '20 min',
    tags: ['bible', 'devotional', 'faith', 'scripture', 'mental-health'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    goalType: 'progressive',
    targetAudience: 'Anyone seeking spiritual growth and mental wellness',
    mainGoal: 'Read the entire Bible in one year while building daily spiritual discipline',
    longDescription: 'Read through the entire Bible in 365 days with a structured devotional plan. This chronological reading plan takes you from Genesis to Revelation, averaging 3-4 chapters per day (15-20 minutes).',
    benefits: [
      'Reduce depression risk by 22% (Duke University Medical Center study)',
      'Lower anxiety and stress through daily reflection and prayer',
      'Gain comprehensive understanding of Scripture - Genesis to Revelation',
      'Build consistent spiritual discipline and morning routine',
      'Improve emotional resilience and sense of purpose',
      'Strengthen faith through systematic Bible knowledge',
      'Experience peace and mental clarity to start your day',
      'Join millions in this transformative daily practice'
    ],
    equipment: [
      'Bible (physical, app like YouVersion, or online)',
      'Notebook or journal for reflection',
      'Quiet space for reading',
      'Optional: Bible reading plan app or bookmark',
      'Highlighter or pen for notes (if physical Bible)'
    ],
    prerequisites: [
      'None - perfect for beginners and seasoned readers',
      'Ability to read for 15-20 minutes daily',
      'Commitment to daily practice',
      'Open heart and willingness to learn'
    ],
    scientificBacking: 'Duke University Medical Center study (2016): Daily Bible reading and prayer associated with 22% reduction in depression symptoms among 3,000+ adults.',
    programLength: '52 weeks (365 days)',
    resources: [
      { title: 'YouVersion Bible App', description: 'Free app with reading plans, audio, and devotionals' },
      { title: 'Blue Letter Bible', description: 'Online Bible with study tools and commentary' },
      { title: 'Bible Gateway', description: 'Multiple translations and reading plans' },
      { title: 'Bible Study Journal', description: 'Structured journal for reflection and notes' }
    ],
    phases: [
      {
        phase: 1,
        title: 'Foundation Phase - The Beginning',
        description: 'Creation to Exodus - God\'s plan unfolds',
        weeks: [1, 2, 3, 4, 5, 6, 7, 8],
        focusAreas: ['Creation and Fall', 'Patriarchs: Abraham, Isaac, Jacob', 'Joseph and Egypt', 'Moses and the Exodus']
      },
      {
        phase: 2,
        title: 'Law and History Phase',
        description: 'Israel\'s journey and establishment',
        weeks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        focusAreas: ['The Law and Tabernacle', 'Wilderness wandering', 'Conquest of Canaan', 'Judges and Kings']
      },
      {
        phase: 3,
        title: 'Poetry and Wisdom Phase',
        description: 'Songs, wisdom, and prophets',
        weeks: [21, 22, 23, 24, 25, 26, 27, 28],
        focusAreas: ['Psalms and worship', 'Proverbs and wisdom', 'Job and suffering', 'Major prophets']
      },
      {
        phase: 4,
        title: 'Gospel Phase - Life of Jesus',
        description: 'The Messiah arrives',
        weeks: [29, 30, 31, 32, 33, 34, 35, 36],
        focusAreas: ['Birth and early ministry', 'Teachings and parables', 'Miracles and compassion', 'Death and resurrection']
      },
      {
        phase: 5,
        title: 'Early Church Phase',
        description: 'The Gospel spreads',
        weeks: [37, 38, 39, 40, 41, 42, 43, 44],
        focusAreas: ['Acts and church birth', 'Paul\'s missionary journeys', 'Letters to churches', 'Practical Christian living']
      },
      {
        phase: 6,
        title: 'Completion Phase',
        description: 'Final letters and prophecy',
        weeks: [45, 46, 47, 48, 49, 50, 51, 52],
        focusAreas: ['General epistles', 'John\'s letters', 'Revelation and prophecy', 'God\'s ultimate victory']
      }
    ],
    weeks: [
      {
        week: 1,
        title: 'Week 1: In The Beginning',
        description: 'Creation, Fall, and the beginning of God\'s redemption story',
        days: [
          {
            day: 1,
            title: 'Day 1: Creation',
            description: 'God creates the universe and humanity',
            duration: '15 min',
            activities: [
              'Genesis 1-3: Creation, the Garden, and the Fall',
              'Psalm 8: The majesty of God in creation',
              'Reflection: How does knowing you\'re created in God\'s image affect your self-worth?',
              'Prayer: Thank God for His creative power and purpose for your life'
            ],
            notes: 'Start strong! The first week sets the tone. Morning reading works best for most people.'
          },
          {
            day: 2,
            title: 'Day 2: Cain, Abel, and Noah',
            description: 'Sin spreads but God preserves a remnant',
            duration: '18 min',
            activities: [
              'Genesis 4-7: First murder, Noah\'s ark begins',
              'Psalm 29: God\'s power over the storm',
              'Reflection: How does God show mercy even in judgment?',
              'Prayer: Ask God for faith to obey even when you don\'t understand'
            ],
            notes: 'The flood narrative shows both God\'s justice and His mercy.'
          },
          {
            day: 3,
            title: 'Day 3: New Beginning',
            description: 'Noah\'s family repopulates the earth',
            duration: '17 min',
            activities: [
              'Genesis 8-11: Flood ends, Tower of Babel',
              'Psalm 104: God sustains His creation',
              'Reflection: What promises has God made that you can trust?',
              'Prayer: Thank God for His faithfulness to His promises'
            ],
            notes: 'The rainbow covenant shows God\'s commitment to humanity despite our failures.'
          },
          {
            day: 4,
            title: 'Day 4: Abraham\'s Call',
            description: 'God calls Abraham to leave everything',
            duration: '16 min',
            activities: [
              'Genesis 12-15: Abraham\'s calling and covenant',
              'Psalm 33: Trust in God\'s unfailing love',
              'Reflection: What is God calling you to step out in faith about?',
              'Prayer: Ask for courage to follow where God leads'
            ],
            notes: 'Abraham\'s faith journey begins here - he didn\'t have all the answers, but he trusted God.'
          },
          {
            day: 5,
            title: 'Day 5: Covenant and Promises',
            description: 'God makes specific promises to Abraham',
            duration: '19 min',
            activities: [
              'Genesis 16-18: Ishmael born, covenant sign (circumcision), Sodom',
              'Psalm 105:1-15: Remember God\'s covenant',
              'Reflection: How do you handle waiting for God\'s promises?',
              'Prayer: Ask for patience during seasons of waiting'
            ],
            notes: 'Sarah and Abraham\'s impatience led to Ishmael, but God remained faithful to His plan.'
          },
          {
            day: 6,
            title: 'Day 6: Isaac and Sacrifice',
            description: 'The ultimate test of faith',
            duration: '17 min',
            activities: [
              'Genesis 19-21: Sodom destroyed, Isaac born',
              'Psalm 46: God is our refuge',
              'Reflection: What blessings has God given that you thought impossible?',
              'Prayer: Praise God for His perfect timing'
            ],
            notes: 'Isaac\'s birth after decades of waiting shows God\'s promises are worth the wait.'
          },
          {
            day: 7,
            title: 'Day 7: Week 1 Review',
            description: 'Reflect on creation to Abraham',
            duration: '20 min',
            activities: [
              'Genesis 22-23: Abraham\'s ultimate test - offering Isaac',
              'Psalm 23: The Lord is my shepherd (rest and reflection)',
              'Journal: What stood out this week? What did God teach you?',
              'Prayer: Thank God for His Word and commit to week 2'
            ],
            notes: 'Genesis 22 foreshadows Christ\'s sacrifice. Take time today to review and journal your insights.'
          }
        ]
      },
      {
        week: 2,
        title: 'Week 2: Patriarchs',
        description: 'Isaac, Jacob, and the formation of Israel',
        days: [
          {
            day: 1,
            title: 'Day 8: Isaac and Rebekah',
            description: 'Finding a wife and family struggles',
            duration: '18 min',
            activities: [
              'Genesis 24-25: Isaac marries Rebekah, Esau and Jacob born',
              'Psalm 37:1-11: Trust in the Lord',
              'Reflection: How does God guide your important decisions?',
              'Prayer: Ask for wisdom in relationships and life choices'
            ]
          },
          {
            day: 2,
            title: 'Day 9: Jacob\'s Deception',
            description: 'Stealing the blessing',
            duration: '17 min',
            activities: [
              'Genesis 26-28: Jacob deceives Isaac, flees to Laban',
              'Psalm 51:1-12: Create in me a clean heart',
              'Reflection: How do your choices today affect your future?',
              'Prayer: Confess areas where you\'ve acted deceitfully'
            ]
          },
          {
            day: 3,
            title: 'Day 10: Jacob\'s Family',
            description: 'Years with Laban and growing family',
            duration: '19 min',
            activities: [
              'Genesis 29-31: Jacob\'s marriages and children, returns home',
              'Psalm 127: Children are a blessing',
              'Reflection: What relationships need reconciliation in your life?',
              'Prayer: Ask for courage to make peace with those you\'ve hurt'
            ]
          },
          {
            day: 4,
            title: 'Day 11: Wrestling with God',
            description: 'Jacob becomes Israel',
            duration: '16 min',
            activities: [
              'Genesis 32-34: Jacob wrestles with God, meets Esau',
              'Psalm 103: Bless the Lord, O my soul',
              'Reflection: When have you wrestled with God in prayer?',
              'Prayer: Surrender your struggles to God completely'
            ]
          },
          {
            day: 5,
            title: 'Day 12: Joseph Begins',
            description: 'The dreamer and his jealous brothers',
            duration: '18 min',
            activities: [
              'Genesis 35-37: Joseph\'s dreams, sold into slavery',
              'Psalm 105:16-22: God sent Joseph ahead',
              'Reflection: How might your current struggles be preparing you for future purpose?',
              'Prayer: Trust God with your difficult circumstances'
            ]
          },
          {
            day: 6,
            title: 'Day 13: Joseph in Egypt',
            description: 'From slave to prisoner',
            duration: '17 min',
            activities: [
              'Genesis 38-40: Judah and Tamar, Joseph in prison',
              'Psalm 25: Teach me your ways, O Lord',
              'Reflection: How can you remain faithful when falsely accused?',
              'Prayer: Ask for integrity in all circumstances'
            ]
          },
          {
            day: 7,
            title: 'Day 14: Week 2 Review',
            description: 'God\'s faithfulness through generations',
            duration: '20 min',
            activities: [
              'Genesis 41: Joseph interprets Pharaoh\'s dreams, becomes second-in-command',
              'Psalm 121: My help comes from the Lord',
              'Journal: How have you seen God\'s faithfulness this week?',
              'Prayer: Thank God that He wastes nothing in your story'
            ]
          }
        ]
      },
      {
        week: 3,
        title: 'Week 3: Joseph\'s Redemption',
        description: 'Reconciliation and God\'s sovereign plan revealed',
        days: [
          {
            day: 1,
            title: 'Day 15: Brothers Reunited',
            description: 'Joseph tests his brothers',
            duration: '18 min',
            activities: [
              'Genesis 42-43: Brothers come to Egypt for grain',
              'Psalm 66: Come and see what God has done',
              'Reflection: How has God used difficult seasons to bring blessing?',
              'Prayer: Ask God to help you forgive those who have wronged you'
            ]
          },
          {
            day: 2,
            title: 'Day 16: Revelation and Forgiveness',
            description: 'Joseph reveals himself',
            duration: '17 min',
            activities: [
              'Genesis 44-46: Joseph reveals his identity, Jacob goes to Egypt',
              'Psalm 126: Those who sow in tears will reap with songs of joy',
              'Reflection: \'What man meant for evil, God meant for good\' - where do you see this in your life?',
              'Prayer: Thank God for His redemptive purposes in suffering'
            ],
            notes: 'Genesis 45:5-8 is one of the Bible\'s greatest statements about God\'s sovereignty.'
          },
          {
            day: 3,
            title: 'Day 17: Jacob\'s Blessings',
            description: 'Prophecies over the twelve tribes',
            duration: '19 min',
            activities: [
              'Genesis 47-50: Jacob blesses sons, Joseph\'s death',
              'Psalm 90: Teach us to number our days',
              'Reflection: What legacy do you want to leave for the next generation?',
              'Prayer: Ask God for wisdom to live with an eternal perspective'
            ]
          },
          {
            day: 4,
            title: 'Day 18: Slavery in Egypt',
            description: 'Israel grows and suffers',
            duration: '16 min',
            activities: [
              'Exodus 1-3: Israelites enslaved, Moses born, burning bush',
              'Psalm 77: I cried out to God for help',
              'Reflection: How does God prepare His leaders through hardship?',
              'Prayer: Be open to God\'s calling even if it feels overwhelming'
            ],
            notes: 'Moses spent 40 years in the desert being prepared. God\'s timing is perfect.'
          },
          {
            day: 5,
            title: 'Day 19: God Sends Moses',
            description: 'Confronting Pharaoh',
            duration: '18 min',
            activities: [
              'Exodus 4-6: Moses returns to Egypt, first confrontation',
              'Psalm 27: The Lord is my light and my salvation',
              'Reflection: What excuses do you make when God calls you to step up?',
              'Prayer: Ask for boldness to speak truth even when afraid'
            ]
          },
          {
            day: 6,
            title: 'Day 20: The Plagues Begin',
            description: 'God demonstrates His power',
            duration: '19 min',
            activities: [
              'Exodus 7-9: First seven plagues on Egypt',
              'Psalm 135: The Lord is great, above all gods',
              'Reflection: Where in your life has your heart become hardened?',
              'Prayer: Ask God to soften your heart to His voice'
            ]
          },
          {
            day: 7,
            title: 'Day 21: Week 3 Review',
            description: 'From Joseph to the plagues of Egypt',
            duration: '20 min',
            activities: [
              'Exodus 10-11: Final plagues, darkness and death announced',
              'Psalm 136: His love endures forever (responsive reading)',
              'Journal: What themes do you notice in God\'s dealings with His people?',
              'Prayer: Praise God for His faithfulness across generations'
            ]
          }
        ]
      },
      {
        week: 4,
        title: 'Week 4: The Exodus',
        description: 'Freedom from slavery and journey to Sinai',
        days: [
          {
            day: 1,
            title: 'Day 22: Passover',
            description: 'The lamb\'s blood saves Israel',
            duration: '18 min',
            activities: [
              'Exodus 12-13: First Passover, death of firstborn, Israel leaves Egypt',
              'Psalm 116: The Lord has delivered my soul from death',
              'Reflection: How does the Passover lamb foreshadow Jesus Christ?',
              'Prayer: Thank God for the blood of the Lamb that covers your sins'
            ],
            notes: 'The Passover is one of the most important events in all of Scripture - it directly foreshadows Christ\'s sacrifice.'
          },
          {
            day: 2,
            title: 'Day 23: Red Sea Crossing',
            description: 'God\'s miraculous deliverance',
            duration: '17 min',
            activities: [
              'Exodus 14-15: Parting of the Red Sea, Song of Moses',
              'Psalm 77:11-20: Your path led through the sea',
              'Reflection: What \'Red Sea\' moment has God brought you through?',
              'Prayer: Praise God for victories over impossible situations'
            ]
          },
          {
            day: 3,
            title: 'Day 24: Wilderness Provision',
            description: 'Manna, quail, and water from a rock',
            duration: '18 min',
            activities: [
              'Exodus 16-18: God provides food and water, Jethro\'s wise counsel',
              'Psalm 78:1-25: He rained down manna for the people to eat',
              'Reflection: How does God provide for your daily needs?',
              'Prayer: Ask for daily dependence on God rather than hoarding'
            ]
          },
          {
            day: 4,
            title: 'Day 25: The Ten Commandments',
            description: 'God gives His law at Sinai',
            duration: '20 min',
            activities: [
              'Exodus 19-21: Mount Sinai, Ten Commandments, civil laws begin',
              'Psalm 19: The law of the Lord is perfect',
              'Reflection: Which commandment challenges you most and why?',
              'Prayer: Ask God to write His law on your heart'
            ],
            notes: 'The Ten Commandments aren\'t just rules - they reveal God\'s character and His design for human flourishing.'
          },
          {
            day: 5,
            title: 'Day 26: Laws for Living',
            description: 'Practical commands for community',
            duration: '17 min',
            activities: [
              'Exodus 22-24: Social laws, covenant confirmed with blood',
              'Psalm 119:1-16: Blessed are those whose ways are blameless',
              'Reflection: How do God\'s laws protect the vulnerable and promote justice?',
              'Prayer: Ask for a heart that loves justice and mercy'
            ]
          },
          {
            day: 6,
            title: 'Day 27: The Tabernacle Plans',
            description: 'God\'s dwelling among His people',
            duration: '18 min',
            activities: [
              'Exodus 25-27: Detailed plans for the tabernacle and its furnishings',
              'Psalm 84: How lovely is your dwelling place',
              'Reflection: What does it mean that God wants to dwell among us?',
              'Prayer: Invite God\'s presence into every area of your life'
            ]
          },
          {
            day: 7,
            title: 'Day 28: Week 4 Review',
            description: 'From slavery to Sinai',
            duration: '20 min',
            activities: [
              'Exodus 28-29: Priestly garments and consecration',
              'Psalm 100: Enter His gates with thanksgiving',
              'Journal: How has the Exodus story deepened your understanding of salvation?',
              'Prayer: Thank God that He is both Deliverer and Lawgiver'
            ],
            notes: 'You\'re one month in! Take a moment to celebrate this milestone. Consistency is building.'
          }
        ]
      },
      {
        week: 8,
        title: 'Week 8: Entering the Promised Land',
        description: 'Spies, rebellion, and consequences',
        days: [
          {
            day: 1,
            title: 'Day 50: The Twelve Spies',
            description: 'Scouting the land of promise',
            duration: '18 min',
            activities: [
              'Numbers 13-14: Spies sent to Canaan, only Caleb and Joshua believe',
              'Psalm 95: Do not harden your hearts',
              'Reflection: Are you more like the ten fearful spies or like Caleb and Joshua?',
              'Prayer: Ask God for faith to see His promises rather than obstacles'
            ],
            notes: 'This moment changed Israel\'s destiny - 40 years of wandering because of unbelief.'
          },
          {
            day: 2,
            title: 'Day 51: Rebellion and Consequences',
            description: 'Korah\'s rebellion and 40 years of wandering',
            duration: '19 min',
            activities: [
              'Numbers 15-17: Korah\'s rebellion, Aaron\'s budding rod',
              'Psalm 75: God is the judge',
              'Reflection: How do you respond to God-given authority in your life?',
              'Prayer: Submit to God\'s appointed leaders and purposes'
            ]
          },
          {
            day: 3,
            title: 'Day 52: Water from the Rock',
            description: 'Moses\' costly mistake',
            duration: '17 min',
            activities: [
              'Numbers 18-20: Priestly duties, red heifer, Moses strikes the rock',
              'Psalm 81: Open wide your mouth and I will fill it',
              'Reflection: How does frustration lead to disobedience?',
              'Prayer: Ask for patience and obedience even when you\'re tired'
            ]
          },
          {
            day: 4,
            title: 'Day 53: The Bronze Serpent',
            description: 'A strange symbol of salvation',
            duration: '18 min',
            activities: [
              'Numbers 21-23: Bronze serpent, Balaam\'s donkey',
              'Psalm 107: Give thanks to the Lord, for He is good',
              'Reflection: How does the bronze serpent point to Jesus (John 3:14-15)?',
              'Prayer: Look to Jesus for healing from the poison of sin'
            ],
            notes: 'Jesus directly references this event in John 3:14-15 as a picture of His crucifixion.'
          },
          {
            day: 5,
            title: 'Day 54: Balaam\'s Blessing',
            description: 'God turns a curse into a blessing',
            duration: '17 min',
            activities: [
              'Numbers 24-26: Balaam blesses Israel, census of new generation',
              'Psalm 67: May God be gracious to us and bless us',
              'Reflection: How has God turned intended harm into blessing in your life?',
              'Prayer: Trust that no weapon formed against you shall prosper'
            ]
          },
          {
            day: 6,
            title: 'Day 55: Preparing for the Land',
            description: 'New leadership and final instructions',
            duration: '18 min',
            activities: [
              'Numbers 27-30: Joshua appointed, offerings and vows',
              'Psalm 16: You make known to me the path of life',
              'Reflection: How do you prepare for new seasons God leads you into?',
              'Prayer: Be ready for the transitions God has planned'
            ]
          },
          {
            day: 7,
            title: 'Day 56: Week 8 Review - Phase 1 Complete!',
            description: 'From Creation through the wilderness',
            duration: '20 min',
            activities: [
              'Numbers 31-33: Summary of Israel\'s journey',
              'Psalm 78:52-72: He guided them like a flock',
              'Journal: What has the Foundation Phase taught you about God\'s character?',
              'Prayer: Celebrate completing Phase 1! Ask God for strength for Phase 2'
            ],
            notes: 'Phase 1 complete! You\'ve journeyed from Creation to the edge of the Promised Land.'
          }
        ]
      },
      {
        week: 12,
        title: 'Week 12: Moses\' Final Words',
        description: 'Deuteronomy - remembering and recommitting',
        days: [
          {
            day: 1,
            title: 'Day 78: Remember!',
            description: 'Moses recounts God\'s faithfulness',
            duration: '18 min',
            activities: [
              'Deuteronomy 1-3: Moses retells the wilderness journey',
              'Psalm 105: Remember the wonders He has done',
              'Reflection: Why is remembering God\'s past faithfulness so important?',
              'Prayer: Recall three specific times God came through for you'
            ]
          },
          {
            day: 2,
            title: 'Day 79: The Greatest Commandment',
            description: 'Love the Lord your God with all your heart',
            duration: '19 min',
            activities: [
              'Deuteronomy 4-6: The Shema - Hear, O Israel!',
              'Psalm 119:33-48: Teach me, O Lord, the way of Your decrees',
              'Reflection: What does it mean to love God with ALL your heart, soul, and strength?',
              'Prayer: Ask God to deepen your love for Him beyond religious duty'
            ],
            notes: 'Deuteronomy 6:4-9 (The Shema) is the most important prayer in Judaism and the verse Jesus quoted as the greatest commandment.'
          },
          {
            day: 3,
            title: 'Day 80: Blessings and Curses',
            description: 'The choice set before Israel',
            duration: '18 min',
            activities: [
              'Deuteronomy 7-9: Chosen people, warnings against pride',
              'Psalm 1: Blessed is the one who does not walk in the counsel of the wicked',
              'Reflection: How does God\'s choosing you affect your daily decisions?',
              'Prayer: Choose the way of blessing today'
            ]
          },
          {
            day: 4,
            title: 'Day 81: Choose Life',
            description: 'Moses\' final appeal',
            duration: '19 min',
            activities: [
              'Deuteronomy 28-30: Blessings, curses, and the ultimate choice',
              'Psalm 25: Show me your ways, Lord',
              'Reflection: \'I set before you life and death... choose life\' - what does choosing life mean today?',
              'Prayer: Recommit to choosing God\'s way in every decision'
            ],
            notes: 'Deuteronomy 30:19 is one of the Bible\'s most powerful calls to decision.'
          },
          {
            day: 5,
            title: 'Day 82: Song of Moses',
            description: 'A prophetic song for all generations',
            duration: '17 min',
            activities: [
              'Deuteronomy 31-32: Moses\' farewell song',
              'Psalm 90: Lord, You have been our dwelling place throughout all generations',
              'Reflection: How does looking back on God\'s faithfulness give you courage for the future?',
              'Prayer: Thank God for being your dwelling place in every season'
            ]
          },
          {
            day: 6,
            title: 'Day 83: Moses\' Death',
            description: 'The end of an era',
            duration: '18 min',
            activities: [
              'Deuteronomy 33-34: Blessing of tribes, Moses sees the land, dies on Nebo',
              'Psalm 121: My help comes from the Lord',
              'Reflection: Moses saw the Promised Land but couldn\'t enter. Yet God honoured him. What does this teach?',
              'Prayer: Trust God even when you don\'t see the full outcome'
            ]
          },
          {
            day: 7,
            title: 'Day 84: Week 12 Review',
            description: 'Joshua takes command',
            duration: '20 min',
            activities: [
              'Joshua 1: Be strong and courageous!',
              'Psalm 37:3-9: Delight yourself in the Lord',
              'Journal: What lessons from Moses\' life will you carry forward?',
              'Prayer: Step into this new phase with Joshua\'s courage'
            ]
          }
        ]
      },
      {
        week: 16,
        title: 'Week 16: Judges and Ruth',
        description: 'Israel\'s cycle of sin, suffering, and salvation',
        days: [
          {
            day: 1,
            title: 'Day 106: The Judges Cycle',
            description: 'Sin, oppression, crying out, deliverance, repeat',
            duration: '18 min',
            activities: [
              'Judges 1-3: Incomplete conquest, first judges (Othniel, Ehud)',
              'Psalm 106:34-48: They did not destroy the peoples as the Lord had commanded',
              'Reflection: What patterns of sin and repentance do you recognize in your own life?',
              'Prayer: Break any cycles of disobedience in your life'
            ]
          },
          {
            day: 2,
            title: 'Day 107: Deborah and Gideon',
            description: 'Unlikely heroes of faith',
            duration: '19 min',
            activities: [
              'Judges 4-7: Deborah leads Israel, Gideon\'s 300',
              'Psalm 20: Some trust in chariots, but we trust in the name of the Lord',
              'Reflection: How does God use unlikely people for His purposes?',
              'Prayer: Don\'t disqualify yourself - ask God what He wants you to do'
            ]
          },
          {
            day: 3,
            title: 'Day 108: Samson',
            description: 'Incredible strength, tragic weakness',
            duration: '18 min',
            activities: [
              'Judges 13-16: Samson\'s birth, exploits, Delilah, and death',
              'Psalm 51:10-13: Create in me a pure heart',
              'Reflection: What areas of strength also become your greatest vulnerability?',
              'Prayer: Guard your strengths and vulnerabilities equally'
            ]
          },
          {
            day: 4,
            title: 'Day 109: Ruth - A Love Story',
            description: 'Loyalty, redemption, and hope',
            duration: '17 min',
            activities: [
              'Ruth 1-4: Naomi and Ruth, gleaning, Boaz redeems, lineage of David',
              'Psalm 113: He raises the poor from the dust',
              'Reflection: How is Boaz a picture of Christ as our Kinsman-Redeemer?',
              'Prayer: Thank God for redeeming your story no matter where you\'ve been'
            ],
            notes: 'Ruth is a Moabite (a foreigner) yet becomes an ancestor of King David and Jesus Christ.'
          },
          {
            day: 5,
            title: 'Day 110: Samuel\'s Calling',
            description: 'A boy hears God\'s voice',
            duration: '18 min',
            activities: [
              '1 Samuel 1-3: Hannah\'s prayer, Samuel born, "Speak, Lord, your servant is listening"',
              'Psalm 34: The Lord is close to the brokenhearted',
              'Reflection: How well do you listen for God\'s voice in your daily life?',
              'Prayer: Lord, help me hear Your voice and respond like Samuel'
            ]
          },
          {
            day: 6,
            title: 'Day 111: Israel Wants a King',
            description: 'Saul anointed - against God\'s advice',
            duration: '17 min',
            activities: [
              '1 Samuel 8-10: Israel rejects God as king, Saul anointed',
              'Psalm 146: Do not put your trust in princes',
              'Reflection: Where do you look for security - in God or in human systems?',
              'Prayer: Let God be your true King above all earthly authorities'
            ]
          },
          {
            day: 7,
            title: 'Day 112: Week 16 Review',
            description: 'From chaos to monarchy',
            duration: '20 min',
            activities: [
              '1 Samuel 15-17: Saul rejected, David anointed, Goliath defeated',
              'Psalm 27: The Lord is my light and my salvation',
              'Journal: How does God work through dark and messy periods of history?',
              'Prayer: Thank God that His grace shines brightest in the darkest times'
            ]
          }
        ]
      },
      {
        week: 20,
        title: 'Week 20: David the King',
        description: 'Israel\'s greatest king - triumph and tragedy',
        days: [
          {
            day: 1,
            title: 'Day 134: David and Bathsheba',
            description: 'The king\'s greatest sin',
            duration: '19 min',
            activities: [
              '2 Samuel 11-12: Adultery, murder, Nathan confronts David',
              'Psalm 51: Have mercy on me, O God (David\'s confession)',
              'Reflection: How does unconfessed sin escalate? What can you learn from David\'s fall?',
              'Prayer: Confess any hidden sin and receive God\'s forgiveness'
            ],
            notes: 'Psalm 51 was written after this event - one of the most powerful prayers of repentance ever written.'
          },
          {
            day: 2,
            title: 'Day 135: The Davidic Covenant',
            description: 'God\'s eternal promise to David',
            duration: '18 min',
            activities: [
              '2 Samuel 7: God\'s covenant - an eternal throne fulfilled in Jesus',
              'Psalm 89:1-18: I will sing of the Lord\'s great love forever',
              'Reflection: How does God\'s covenant with David point to Jesus?',
              'Prayer: Thank God for His unbreakable promises'
            ],
            notes: '2 Samuel 7 is one of the most important chapters in the Bible.'
          },
          {
            day: 3,
            title: 'Day 136: Solomon\'s Wisdom',
            description: 'The wisest man who ever lived',
            duration: '18 min',
            activities: [
              '1 Kings 3-4: Solomon asks for wisdom, his famous judgment',
              'Psalm 72: May he endure as long as the sun',
              'Reflection: If God offered you one thing, what would you ask for?',
              'Prayer: Ask for wisdom above wealth, fame, or comfort'
            ]
          },
          {
            day: 4,
            title: 'Day 137: Solomon\'s Temple',
            description: 'God\'s glory fills the temple',
            duration: '19 min',
            activities: [
              '1 Kings 6-8: Temple built and dedicated, Solomon\'s prayer',
              'Psalm 84: How lovely is your dwelling place, Lord Almighty!',
              'Reflection: Solomon\'s prayer asks God to hear from heaven. Jesus says WE are God\'s temple now.',
              'Prayer: Invite God\'s glory to fill the temple of your life'
            ]
          },
          {
            day: 5,
            title: 'Day 138: Kingdom Divided',
            description: 'Solomon\'s fall and the split',
            duration: '18 min',
            activities: [
              '1 Kings 11-12: Solomon\'s idolatry, Rehoboam\'s folly, kingdom splits',
              'Psalm 106:1-12: They soon forgot what He had done',
              'Reflection: How does pride and compromise lead to downfall even for the wise?',
              'Prayer: Guard your heart against the slow drift away from God'
            ]
          },
          {
            day: 6,
            title: 'Day 139: Elijah - Fire from Heaven',
            description: 'The prophet vs 450 prophets of Baal',
            duration: '19 min',
            activities: [
              '1 Kings 18-19: Mount Carmel showdown, still small voice',
              'Psalm 18:1-19: The Lord thundered from heaven',
              'Reflection: After his greatest victory, Elijah fell into depression. How does God meet us in our lowest moments?',
              'Prayer: Listen for God\'s gentle whisper, not just the dramatic fire'
            ]
          },
          {
            day: 7,
            title: 'Day 140: Week 20 Review',
            description: 'Kings, wisdom, and prophets',
            duration: '20 min',
            activities: [
              '2 Kings 2: Elijah taken up, Elisha receives double portion',
              'Psalm 145: I will exalt You, my God the King',
              'Journal: What has David\'s life and the monarchy taught you about leadership and faithfulness?',
              'Prayer: Ask God for a double portion of His Spirit in your life'
            ],
            notes: 'Phase 2 milestone! You\'re nearly halfway through the entire Bible.'
          }
        ]
      },
      {
        week: 22,
        title: 'Week 22: Songs and Wisdom',
        description: 'The Psalms and Proverbs - poetry for the soul',
        days: [
          {
            day: 1,
            title: 'Day 148: Psalms of Praise',
            description: 'Learning the language of worship',
            duration: '18 min',
            activities: [
              'Psalms 1-8: The two paths, messianic psalms, creation praise',
              'Proverbs 1:1-7: The fear of the Lord is the beginning of knowledge',
              'Reflection: Which psalm speaks most to your current season of life?',
              'Prayer: Use Psalm 8 as your prayer today'
            ],
            notes: 'The Psalms cover every human emotion. Let them teach you to pray honestly.'
          },
          {
            day: 2,
            title: 'Day 149: Psalms of Lament',
            description: 'Bringing pain to God',
            duration: '17 min',
            activities: [
              'Psalms 22, 38, 42-43: Messianic suffering, honest grief',
              'Proverbs 3:1-12: Trust in the Lord with all your heart',
              'Reflection: Do you feel permission to bring your raw emotions to God?',
              'Prayer: Pour out your honest feelings to God - He can handle it'
            ]
          },
          {
            day: 3,
            title: 'Day 150: Psalms of Trust',
            description: 'Finding security in God alone',
            duration: '18 min',
            activities: [
              'Psalms 23, 27, 46, 91: The most beloved psalms of trust',
              'Proverbs 4: Guard your heart, for everything flows from it',
              'Reflection: Which of these psalms do you need to memorize for difficult days?',
              'Prayer: Declare Psalm 23 over your life today'
            ]
          },
          {
            day: 4,
            title: 'Day 151: Wisdom for Daily Life',
            description: 'Proverbs speaks to every situation',
            duration: '17 min',
            activities: [
              'Proverbs 10-12: Contrasts between wise and foolish living',
              'Psalm 111: The fear of the Lord is the beginning of wisdom',
              'Reflection: Which proverb convicted you or encouraged you today?',
              'Prayer: Ask God for practical wisdom for today\'s decisions'
            ]
          },
          {
            day: 5,
            title: 'Day 152: Ecclesiastes',
            description: 'The meaning of life explored',
            duration: '19 min',
            activities: [
              'Ecclesiastes 1-6: Vanity of vanities, a time for everything',
              'Psalm 39: Show me, Lord, my life\'s end',
              'Reflection: What pursuits feel meaningless without God?',
              'Prayer: Ask God to give eternal perspective to your daily routines'
            ],
            notes: 'Ecclesiastes 3:1-8 ("A time for everything") is one of the Bible\'s most famous passages.'
          },
          {
            day: 6,
            title: 'Day 153: Job - Suffering and Sovereignty',
            description: 'The hardest question answered',
            duration: '20 min',
            activities: [
              'Job 1-3, 38-42 (overview): Disaster, debate, God speaks, restoration',
              'Psalm 73: Whom have I in heaven but You?',
              'Reflection: God doesn\'t explain suffering - He reveals Himself. Is that enough?',
              'Prayer: Bow before God\'s majesty and mystery'
            ],
            notes: 'God\'s answer to Job is one of the most magnificent speeches in all literature.'
          },
          {
            day: 7,
            title: 'Day 154: Week 22 Review',
            description: 'The wealth of wisdom literature',
            duration: '20 min',
            activities: [
              'Ecclesiastes 12: Remember your Creator in the days of your youth',
              'Psalm 119:97-112: Oh, how I love your law!',
              'Journal: What wisdom from Psalms, Proverbs, or Job will you apply this week?',
              'Prayer: Thank God for wisdom that transforms daily living'
            ]
          }
        ]
      },
      {
        week: 26,
        title: 'Week 26: Isaiah - The Gospel Prophet',
        description: 'Midpoint celebration! The coming Messiah revealed',
        days: [
          {
            day: 1,
            title: 'Day 176: Isaiah\'s Throne Room Vision',
            description: 'Holy, holy, holy',
            duration: '18 min',
            activities: [
              'Isaiah 1-6: Judah\'s sin, Isaiah\'s vision, "Here am I, send me"',
              'Psalm 99: The Lord reigns, let the nations tremble',
              'Reflection: How would encountering God\'s holiness change your daily life?',
              'Prayer: Say with Isaiah, "Here am I, send me"'
            ],
            notes: 'HALFWAY POINT! You\'ve completed 26 weeks. Celebrate this incredible milestone!'
          },
          {
            day: 2,
            title: 'Day 177: Immanuel - God With Us',
            description: 'Messianic prophecies begin',
            duration: '19 min',
            activities: [
              'Isaiah 7-9: Virgin birth prophecy, "For unto us a child is born"',
              'Psalm 2: You are my Son; today I have become your Father',
              'Reflection: These prophecies written 700 years before Christ - how does this strengthen your faith?',
              'Prayer: Marvel at God\'s prophetic plan unfolding across centuries'
            ]
          },
          {
            day: 3,
            title: 'Day 178: The Suffering Servant',
            description: 'Isaiah 53 - the clearest picture of the cross',
            duration: '20 min',
            activities: [
              'Isaiah 52:13-53:12: The Suffering Servant prophecy',
              'Psalm 22: My God, my God, why have You forsaken me?',
              'Reflection: Read Isaiah 53 slowly. How accurately does it describe Jesus\' crucifixion?',
              'Prayer: Thank Jesus for bearing your sins and sorrows'
            ],
            notes: 'Isaiah 53 was written approximately 700 years before Christ. It describes His crucifixion with astonishing precision.'
          },
          {
            day: 4,
            title: 'Day 179: Comfort My People',
            description: 'Hope after judgment',
            duration: '18 min',
            activities: [
              'Isaiah 40: "Comfort, comfort my people", those who wait on the Lord',
              'Psalm 23: He restores my soul',
              'Reflection: Which promise in Isaiah 40 do you need to hold onto today?',
              'Prayer: Those who wait on the Lord will renew their strength'
            ]
          },
          {
            day: 5,
            title: 'Day 180: Jeremiah - The Weeping Prophet',
            description: 'Faithful in the face of rejection',
            duration: '18 min',
            activities: [
              'Jeremiah 1, 29, 31: Called before birth, plans to prosper, new covenant',
              'Psalm 31: Into your hands I commit my spirit',
              'Reflection: Jeremiah 29:11 - God\'s plans are for good, not harm. Do you believe this in your hardest season?',
              'Prayer: Trust God\'s good plans even when everything says otherwise'
            ]
          },
          {
            day: 6,
            title: 'Day 181: Ezekiel - Dry Bones Live',
            description: 'Can these bones live?',
            duration: '19 min',
            activities: [
              'Ezekiel 1-2, 37: God\'s glory, valley of dry bones',
              'Psalm 80: Restore us, God; make your face shine on us',
              'Reflection: What areas of your life feel like dry bones? Can God bring them to life?',
              'Prayer: Breathe on the dry bones in your life, Lord!'
            ]
          },
          {
            day: 7,
            title: 'Day 182: Week 26 Review - HALFWAY!',
            description: 'From poetry to prophecy - the midpoint',
            duration: '20 min',
            activities: [
              'Daniel 1-3, 6: Faithful in exile, fiery furnace, lions\' den',
              'Psalm 119:89-104: Your word is a lamp for my feet',
              'Journal: You\'re HALFWAY through the Bible! How has this journey changed you so far?',
              'Prayer: Celebrate and recommit for the second half of this incredible journey'
            ],
            notes: 'Phase 3 milestone! Over halfway through the entire Bible. The New Testament awaits!'
          }
        ]
      },
      {
        week: 30,
        title: 'Week 30: The Gospel of Matthew',
        description: 'Jesus the Messiah arrives - everything changes',
        days: [
          {
            day: 1,
            title: 'Day 204: The King Is Born',
            description: 'Genealogy, birth, and early life of Jesus',
            duration: '18 min',
            activities: [
              'Matthew 1-4: Jesus\' genealogy, birth, baptism, temptation, ministry begins',
              'Psalm 72: May all nations be blessed through Him',
              'Reflection: How does Matthew\'s genealogy connect Jesus to Abraham and David?',
              'Prayer: Welcome the King into every area of your life'
            ],
            notes: 'You\'re entering the Gospels! After months of anticipation through the Old Testament, the Messiah has arrived.'
          },
          {
            day: 2,
            title: 'Day 205: The Sermon on the Mount',
            description: 'The most famous sermon ever preached',
            duration: '20 min',
            activities: [
              'Matthew 5-7: Beatitudes, salt and light, Lord\'s Prayer, wise and foolish builders',
              'Psalm 24: The earth is the Lord\'s, and everything in it',
              'Reflection: Which beatitude challenges you most? Which encourages you most?',
              'Prayer: Pray the Lord\'s Prayer slowly and meaningfully'
            ],
            notes: 'The Sermon on the Mount is the charter of the Kingdom of God.'
          },
          {
            day: 3,
            title: 'Day 206: Miracles and Parables',
            description: 'Jesus teaches and heals',
            duration: '18 min',
            activities: [
              'Matthew 8-13: Healing the sick, calming storms, parables of the kingdom',
              'Psalm 107:23-32: He stilled the storm to a whisper',
              'Reflection: What type of soil is your heart right now (Matthew 13)?',
              'Prayer: Bring your impossible situations to Jesus'
            ]
          },
          {
            day: 4,
            title: 'Day 207: Peter\'s Confession',
            description: 'The turning point of the Gospel',
            duration: '18 min',
            activities: [
              'Matthew 16-18: "You are the Christ!", Transfiguration, church founded',
              'Psalm 118:22-29: The stone the builders rejected has become the cornerstone',
              'Reflection: Who do YOU say Jesus is? Not what others say - what do you believe?',
              'Prayer: Declare your faith in Jesus as Lord and Christ'
            ]
          },
          {
            day: 5,
            title: 'Day 208: The Passion Begins',
            description: 'Jesus enters Jerusalem',
            duration: '19 min',
            activities: [
              'Matthew 21-25: Triumphal entry, temple cleansed, Olivet discourse',
              'Psalm 118:1-21: Blessed is he who comes in the name of the Lord',
              'Reflection: How does Jesus\' authority challenge comfortable religion?',
              'Prayer: Let Jesus overturn the tables of anything that doesn\'t belong'
            ]
          },
          {
            day: 6,
            title: 'Day 209: Cross and Resurrection',
            description: 'The climax of all history',
            duration: '20 min',
            activities: [
              'Matthew 26-28: Last Supper, Gethsemane, trial, crucifixion, RESURRECTION',
              'Isaiah 53 (re-read alongside Matthew): He was pierced for our transgressions',
              'Reflection: Spend five minutes in silence reflecting on what Jesus endured for you.',
              'Prayer: He is risen! Live today in resurrection power'
            ],
            notes: 'This is the central event of all human history. Take your time.'
          },
          {
            day: 7,
            title: 'Day 210: Week 30 Review',
            description: 'Meeting Jesus through Matthew',
            duration: '20 min',
            activities: [
              'Re-read your favourite passage from Matthew',
              'Psalm 145: Great is the Lord and most worthy of praise',
              'Journal: How has reading the Old Testament first enriched your understanding of Jesus?',
              'Prayer: Thank God for sending His Son at just the right time'
            ]
          }
        ]
      },
      {
        week: 34,
        title: 'Week 34: Luke and John',
        description: 'Two unique perspectives on Jesus\' life',
        days: [
          {
            day: 1,
            title: 'Day 232: Luke - The Compassionate Saviour',
            description: 'Good news for the outcast',
            duration: '18 min',
            activities: [
              'Luke 1-2: Birth narratives, shepherds, Simeon\'s prayer',
              'Psalm 113: He settles the childless woman in her home',
              'Reflection: Luke emphasizes Jesus\' care for the poor and marginalized. Who needs your compassion?',
              'Prayer: Give me a heart of compassion like Jesus'
            ]
          },
          {
            day: 2,
            title: 'Day 233: The Prodigal Son',
            description: 'The greatest short story ever told',
            duration: '17 min',
            activities: [
              'Luke 15: Lost sheep, lost coin, prodigal son',
              'Psalm 103:8-14: He does not treat us as our sins deserve',
              'Reflection: Are you more like the prodigal or the elder brother?',
              'Prayer: Run to the Father - He\'s already running towards you'
            ]
          },
          {
            day: 3,
            title: 'Day 234: John - In the Beginning',
            description: 'The most theological Gospel',
            duration: '19 min',
            activities: [
              'John 1-3: The Word became flesh, Nicodemus, "For God so loved the world"',
              'Psalm 33: By the word of the Lord the heavens were made',
              'Reflection: John 3:16 - unpack every word. What does it mean personally?',
              'Prayer: Thank God for His indescribable love'
            ]
          },
          {
            day: 4,
            title: 'Day 235: I Am Statements',
            description: 'Jesus reveals who He truly is',
            duration: '18 min',
            activities: [
              'John 6, 8, 10: Bread of Life, Light of the World, Good Shepherd',
              'Psalm 23: The Lord is my shepherd (connected to John 10)',
              'Reflection: Which "I Am" statement means the most to you right now?',
              'Prayer: Jesus, You are the Bread of Life - satisfy my deepest hunger'
            ]
          },
          {
            day: 5,
            title: 'Day 236: The Upper Room',
            description: 'Jesus\' most intimate teaching',
            duration: '20 min',
            activities: [
              'John 13-17: Foot washing, farewell discourse, Jesus prays for you',
              'Psalm 110: The Lord says to my lord: Sit at my right hand',
              'Reflection: Jesus prayed for YOU in John 17. Receive that love today.',
              'Prayer: Jesus prayed that you would know the Father\'s love. Rest in it'
            ],
            notes: 'John 14-17 contains Jesus\' most intimate teaching. These chapters are gold for your prayer life.'
          },
          {
            day: 6,
            title: 'Day 237: Crucifixion Through John\'s Eyes',
            description: 'The eyewitness account',
            duration: '19 min',
            activities: [
              'John 18-21: Arrest, trial, cross, resurrection, beach breakfast with Peter',
              'Psalm 22: My God, my God, why have you forsaken me?',
              'Reflection: John 21 - Jesus restores Peter after failure. What failure do you need Jesus to restore?',
              'Prayer: Accept Jesus\' complete restoration and forgiveness'
            ]
          },
          {
            day: 7,
            title: 'Day 238: Week 34 Review - Phase 4 Complete!',
            description: 'The Gospels behind us',
            duration: '20 min',
            activities: [
              'Re-read your favourite Gospel passage',
              'Psalm 150: Let everything that has breath praise the Lord',
              'Journal: How has walking through the Gospels deepened your relationship with Jesus?',
              'Prayer: Celebrate completing Phase 4! The Gospels are now part of your story'
            ],
            notes: 'Phase 4 complete! You\'ve walked with Jesus through all four Gospels.'
          }
        ]
      },
      {
        week: 38,
        title: 'Week 38: Acts - The Church Explodes',
        description: 'The Holy Spirit launches the global church',
        days: [
          {
            day: 1,
            title: 'Day 260: Pentecost',
            description: 'The Holy Spirit arrives',
            duration: '18 min',
            activities: [
              'Acts 1-2: Ascension, Holy Spirit, Peter\'s sermon, 3,000 saved',
              'Psalm 133: How good when God\'s people live together in unity',
              'Reflection: What role does the Holy Spirit play in your daily life?',
              'Prayer: Ask to be filled with the Holy Spirit afresh today'
            ],
            notes: 'Acts is the sequel to Luke\'s Gospel. The same Jesus now works through His Spirit.'
          },
          {
            day: 2,
            title: 'Day 261: Saul Becomes Paul',
            description: 'The greatest conversion in history',
            duration: '19 min',
            activities: [
              'Acts 9-10: Damascus road, Saul\'s conversion, Peter\'s vision',
              'Psalm 40: He put a new song in my mouth',
              'Reflection: If God can transform the church\'s greatest persecutor, what can He do with you?',
              'Prayer: Thank God for your own conversion story'
            ]
          },
          {
            day: 3,
            title: 'Day 262: Paul\'s Missionary Journeys',
            description: 'The Gospel goes to the nations',
            duration: '18 min',
            activities: [
              'Acts 13-16: First and second missionary journeys, Philippian jailer saved',
              'Psalm 67: May the nations be glad and sing for joy',
              'Reflection: The Gospel is for EVERYONE. Who do you need to share with?',
              'Prayer: Ask God for a heart for the unreached'
            ]
          },
          {
            day: 4,
            title: 'Day 263: Athens - The Unknown God',
            description: 'Paul\'s masterclass in cultural engagement',
            duration: '17 min',
            activities: [
              'Acts 17: Mars Hill sermon - meeting people where they are',
              'Psalm 96: Declare His glory among the nations',
              'Reflection: How does Paul\'s approach in Athens model sharing faith in a secular culture?',
              'Prayer: Give me wisdom to share my faith in relevant, compelling ways'
            ]
          },
          {
            day: 5,
            title: 'Day 264: Paul\'s Trials',
            description: 'Persecution, shipwreck, and Rome',
            duration: '18 min',
            activities: [
              'Acts 21-28: Arrest, trials, shipwreck, arrival in Rome',
              'Psalm 46: God is our refuge and strength',
              'Reflection: Paul\'s imprisonment led to the Gospel reaching Rome. How does God use your setbacks?',
              'Prayer: Trust that God\'s purposes cannot be stopped'
            ]
          },
          {
            day: 6,
            title: 'Day 265: Romans - The Gospel Explained',
            description: 'Paul\'s theological masterpiece begins',
            duration: '19 min',
            activities: [
              'Romans 1-3: All have sinned and fall short of the glory of God',
              'Psalm 14: The Lord looks down from heaven on all mankind',
              'Reflection: Romans 3:23 levels the playing field. How does this affect how you view others?',
              'Prayer: Thank God that His grace reaches the worst of sinners'
            ],
            notes: 'Romans is the most systematic presentation of the Gospel in the Bible.'
          },
          {
            day: 7,
            title: 'Day 266: Week 38 Review',
            description: 'From Pentecost to the ends of the earth',
            duration: '20 min',
            activities: [
              'Romans 8: No condemnation! Nothing can separate us from God\'s love',
              'Psalm 139: Where can I go from Your Spirit?',
              'Journal: Read Romans 8:31-39 aloud. How does Acts inspire you to be part of God\'s mission?',
              'Prayer: Declare that NOTHING can separate you from God\'s love'
            ],
            notes: 'Many consider Romans 8 the greatest chapter in the entire Bible. Read it aloud.'
          }
        ]
      },
      {
        week: 42,
        title: 'Week 42: Paul\'s Letters',
        description: 'Galatians, Ephesians, Philippians - freedom, identity, joy',
        days: [
          {
            day: 1,
            title: 'Day 288: Galatians - Freedom in Christ',
            description: 'No longer slaves but sons',
            duration: '18 min',
            activities: [
              'Galatians 1-6: Justified by faith, fruit of the Spirit, freedom',
              'Psalm 32: Blessed is the one whose transgressions are forgiven',
              'Reflection: Galatians 5:22-23 - which fruit of the Spirit do you need to cultivate?',
              'Prayer: Walk by the Spirit today and let His fruit grow in you'
            ]
          },
          {
            day: 2,
            title: 'Day 289: Ephesians - Every Spiritual Blessing',
            description: 'Our identity in Christ',
            duration: '19 min',
            activities: [
              'Ephesians 1-3: Chosen, redeemed, sealed, saved by grace through faith',
              'Psalm 103: Praise the Lord, my soul',
              'Reflection: Ephesians 2:8-10 - saved by grace, for good works. How does this define your life?',
              'Prayer: Thank God for choosing you before the foundation of the world'
            ]
          },
          {
            day: 3,
            title: 'Day 290: Armor of God',
            description: 'Equipped for spiritual battle',
            duration: '18 min',
            activities: [
              'Ephesians 4-6: Walk worthy, new self, relationships, armor of God',
              'Psalm 144: Blessed be the Lord, my Rock, who trains my hands for battle',
              'Reflection: Put on the full armor of God (Eph 6:10-18). Which piece do you need most?',
              'Prayer: Pray through each piece of spiritual armor'
            ]
          },
          {
            day: 4,
            title: 'Day 291: Philippians - Joy in Chains',
            description: 'Rejoice in the Lord always!',
            duration: '17 min',
            activities: [
              'Philippians 1-4: Christ hymn, pressing toward the goal, rejoice always',
              'Psalm 16: You will fill me with joy in Your presence',
              'Reflection: Paul wrote about joy from prison. What steals your joy?',
              'Prayer: Ask for supernatural joy that transcends circumstances'
            ],
            notes: 'Philippians is only 4 chapters - read it all today! One of the most encouraging books.'
          },
          {
            day: 5,
            title: 'Day 292: Colossians and Thessalonians',
            description: 'Christ supreme, hope of His return',
            duration: '18 min',
            activities: [
              'Colossians 1-4, 1 Thessalonians 4-5: Christ before all, His return, live ready',
              'Psalm 97: The Lord reigns, let the earth be glad',
              'Reflection: How does the hope of Christ\'s return affect how you live today?',
              'Prayer: Maranatha! Come, Lord Jesus!'
            ]
          },
          {
            day: 6,
            title: 'Day 293: Pastoral Letters',
            description: 'Paul\'s final instructions',
            duration: '19 min',
            activities: [
              '1 Timothy 6, 2 Timothy 1-4: Fight the good fight, I have finished the race',
              'Psalm 71: Even when I am old and grey, do not forsake me',
              'Reflection: Paul\'s last words: "I have fought the good fight." What legacy are you building?',
              'Prayer: Ask God for a legacy of faithfulness'
            ],
            notes: '2 Timothy is Paul\'s last letter, written before his execution. Incredibly powerful.'
          },
          {
            day: 7,
            title: 'Day 294: Week 42 Review',
            description: 'Letters of freedom, identity, and joy',
            duration: '20 min',
            activities: [
              'Re-read Philippians 4:4-13 and Ephesians 3:14-21',
              'Psalm 103: Praise the Lord, my soul, and forget not all His benefits',
              'Journal: Which letter spoke to you most? What will you apply?',
              'Prayer: Thank God for the gift of grace that changes everything'
            ]
          }
        ]
      },
      {
        week: 46,
        title: 'Week 46: General Epistles',
        description: 'Hebrews, James, Peter, John - practical faith for real life',
        days: [
          {
            day: 1,
            title: 'Day 316: Hebrews - Jesus Is Greater',
            description: 'The superiority of Christ',
            duration: '19 min',
            activities: [
              'Hebrews 1-4: Jesus greater than angels, Moses; approach the throne boldly',
              'Psalm 110: You are a priest forever, in the order of Melchizedek',
              'Reflection: How does knowing Jesus is your perfect High Priest comfort you?',
              'Prayer: Approach the throne of grace with confidence (Hebrews 4:16)'
            ]
          },
          {
            day: 2,
            title: 'Day 317: The Hall of Faith',
            description: 'Heroes who lived by faith',
            duration: '20 min',
            activities: [
              'Hebrews 11-13: Faith hall of fame, run the race, Jesus never changes',
              'Psalm 73:25-28: Whom have I in heaven but You?',
              'Reflection: Which hero of faith in Hebrews 11 inspires you most?',
              'Prayer: Fix your eyes on Jesus, the pioneer and perfecter of faith'
            ],
            notes: 'Hebrews 11 is called "The Hall of Faith" - the all-stars of believing God against all odds.'
          },
          {
            day: 3,
            title: 'Day 318: James - Faith in Action',
            description: 'Faith without works is dead',
            duration: '18 min',
            activities: [
              'James 1-5: Trials produce perseverance, taming the tongue, faith and deeds',
              'Psalm 15: Lord, who may dwell in your sacred tent?',
              'Reflection: James 1:22 - be doers of the word, not hearers only. Where do you need to act?',
              'Prayer: Help me live out my faith in practical ways today'
            ],
            notes: 'James is the most practical book in the New Testament - Christianity with sleeves rolled up.'
          },
          {
            day: 4,
            title: 'Day 319: 1 Peter - Suffering Well',
            description: 'Hope for suffering believers',
            duration: '17 min',
            activities: [
              '1 Peter 1-5: Living hope, holy living, casting anxiety on Him',
              'Psalm 34: The Lord is close to the brokenhearted',
              'Reflection: 1 Peter 5:7 - cast all your anxiety on Him. Do it now.',
              'Prayer: Name your anxieties one by one and release them to God'
            ]
          },
          {
            day: 5,
            title: 'Day 320: 1 John - God Is Love',
            description: 'Walking in the light',
            duration: '18 min',
            activities: [
              '1 John 1-5: Fellowship with God, love one another, overcoming the world',
              'Psalm 36: Your love, Lord, reaches to the heavens',
              'Reflection: 1 John 4:8 - God IS love. How does this transform your understanding of Him?',
              'Prayer: Ask God to perfect His love in you'
            ]
          },
          {
            day: 6,
            title: 'Day 321: 2 Peter, 2-3 John, Jude',
            description: 'Guarding the truth',
            duration: '17 min',
            activities: [
              '2 Peter, 2 John, 3 John, Jude: Warning against false teaching, contend for the faith',
              'Psalm 119:97-104: How sweet are Your words to my taste',
              'Reflection: How do you discern between true and false teaching?',
              'Prayer: Ask for wisdom to hold fast to truth'
            ]
          },
          {
            day: 7,
            title: 'Day 322: Week 46 Review - Phase 5 Complete!',
            description: 'Letters of practical faith',
            duration: '20 min',
            activities: [
              'Re-read your favourite passage from the epistles',
              'Psalm 119:169-176: Let my cry come before You, Lord',
              'Journal: Only 6 weeks left! Which epistle will you return to for deeper study?',
              'Prayer: Celebrate Phase 5! The finish line is in sight!'
            ],
            notes: 'Phase 5 complete! Only Revelation remains. You\'re almost there!'
          }
        ]
      },
      {
        week: 50,
        title: 'Week 50: Revelation Begins',
        description: 'The apocalypse - unveiling of Jesus Christ',
        days: [
          {
            day: 1,
            title: 'Day 344: Vision of the Risen Christ',
            description: 'John sees Jesus in glory',
            duration: '18 min',
            activities: [
              'Revelation 1: John on Patmos, the glorified Christ among the lampstands',
              'Psalm 47: God has ascended amid shouts of joy',
              'Reflection: How does Revelation\'s picture of Jesus differ from the gentle Galilean carpenter?',
              'Prayer: Worship Jesus in His risen, glorified majesty'
            ],
            notes: 'Revelation means "unveiling" - it pulls back the curtain on reality. Read it as a book of hope.'
          },
          {
            day: 2,
            title: 'Day 345: Letters to the Churches',
            description: 'Jesus evaluates His churches',
            duration: '19 min',
            activities: [
              'Revelation 2-3: Seven letters - praise, correction, and promises',
              'Psalm 26: Test me, Lord, and try me',
              'Reflection: Which of the seven churches most resembles your spiritual life right now?',
              'Prayer: Ask Jesus to refine your faith like gold in fire'
            ]
          },
          {
            day: 3,
            title: 'Day 346: The Throne Room',
            description: 'Heaven\'s worship revealed',
            duration: '18 min',
            activities: [
              'Revelation 4-5: The throne, 24 elders, the Lamb who is worthy',
              'Psalm 148: Praise the Lord from the heavens',
              'Reflection: "Worthy is the Lamb!" - what makes Jesus worthy of worship?',
              'Prayer: Join the heavenly chorus: "Worthy is the Lamb who was slain!"'
            ]
          },
          {
            day: 4,
            title: 'Day 347: Seals and Trumpets',
            description: 'Judgment unfolds',
            duration: '19 min',
            activities: [
              'Revelation 6-11: Seals opened, trumpet judgments, two witnesses',
              'Psalm 46: God is our refuge and strength',
              'Reflection: Even in judgment, God seals and protects His people. How does this comfort you?',
              'Prayer: Trust God\'s protection even when the world shakes'
            ]
          },
          {
            day: 5,
            title: 'Day 348: Beasts and Babylon',
            description: 'Counterfeit power systems',
            duration: '18 min',
            activities: [
              'Revelation 12-18: Dragon, beasts, mark, Babylon falls',
              'Psalm 2: Why do the nations conspire?',
              'Reflection: What worldly systems compete for your allegiance to God?',
              'Prayer: Declare your ultimate allegiance to God\'s kingdom'
            ]
          },
          {
            day: 6,
            title: 'Day 349: The Rider on the White Horse',
            description: 'Christ returns victorious',
            duration: '19 min',
            activities: [
              'Revelation 19: Marriage supper of the Lamb, the conquering King returns',
              'Psalm 45: Your throne, O God, will last for ever and ever',
              'Reflection: Are you ready for Christ\'s return?',
              'Prayer: Live today in light of eternity'
            ]
          },
          {
            day: 7,
            title: 'Day 350: Week 50 Review',
            description: 'Jesus wins - that\'s the point of Revelation',
            duration: '20 min',
            activities: [
              'Re-read Revelation 5:9-14: The Lamb\'s worthiness',
              'Psalm 98: He has remembered His love and faithfulness',
              'Journal: Only 2 weeks left! How has Revelation reframed your view of current events?',
              'Prayer: Jesus wins. Rest in that truth as you approach the finish line'
            ],
            notes: 'Just two weeks to go! Incredible commitment. The finish line is near!'
          }
        ]
      },
      {
        week: 52,
        title: 'Week 52: The End and The Beginning',
        description: 'Revelation and completion of God\'s story',
        days: [
          {
            day: 1,
            title: 'Day 358: Final Warnings',
            description: 'Letters to the seven churches continue',
            duration: '18 min',
            activities: [
              'Revelation 4-7: Throne room worship, seals opened',
              'Psalm 148: Let all creation praise the Lord',
              'Reflection: What does heavenly worship teach about earthly priorities?',
              'Prayer: Worship God for His holiness and majesty'
            ]
          },
          {
            day: 2,
            title: 'Day 359: Trumpets and Witnesses',
            description: 'God\'s judgment and faithful witnesses',
            duration: '19 min',
            activities: [
              'Revelation 8-11: Seven trumpets, two witnesses',
              'Psalm 97: The Lord reigns',
              'Reflection: How can you remain a faithful witness in difficult times?',
              'Prayer: Ask for boldness to share the Gospel'
            ]
          },
          {
            day: 3,
            title: 'Day 360: The Dragon and the Beast',
            description: 'Spiritual warfare revealed',
            duration: '17 min',
            activities: [
              'Revelation 12-14: Woman, dragon, beasts, 144,000',
              'Psalm 144: My rock and my fortress',
              'Reflection: How real is spiritual warfare in your daily life?',
              'Prayer: Put on the full armor of God'
            ]
          },
          {
            day: 4,
            title: 'Day 361: Final Judgments',
            description: 'Seven bowls poured out',
            duration: '18 min',
            activities: [
              'Revelation 15-18: Seven bowls, Babylon falls',
              'Psalm 96: Declare His glory among nations',
              'Reflection: What "Babylons" (worldly systems) need to fall in your life?',
              'Prayer: Ask God to reveal any idols you\'ve placed above Him'
            ]
          },
          {
            day: 5,
            title: 'Day 362: The Wedding Feast',
            description: 'Christ returns victorious',
            duration: '19 min',
            activities: [
              'Revelation 19-20: Marriage supper, 1000 years, final judgment',
              'Psalm 45: Your throne, O God, is forever',
              'Reflection: Are you ready for Christ\'s return?',
              'Prayer: Live today in light of eternity'
            ]
          },
          {
            day: 6,
            title: 'Day 363: New Heaven and Earth',
            description: 'All things made new',
            duration: '20 min',
            activities: [
              'Revelation 21-22: New Jerusalem, tree of life, "Come, Lord Jesus"',
              'Psalm 150: Let everything that has breath praise the Lord',
              'Reflection: What excites you most about the new creation?',
              'Prayer: Thank God for the complete story - Genesis to Revelation'
            ]
          },
          {
            day: 7,
            title: 'Day 364-365: COMPLETION!',
            description: 'You\'ve read the entire Bible! Celebration and commitment',
            duration: '30 min',
            activities: [
              'Read your favourite passage from this year',
              'Review your journal entries from week 1 to now',
              'Write down how God has changed you through His Word',
              'Psalm 119:105: Your word is a lamp to my feet',
              'Prayer: Thank God for His Word and commit to Year 2 or deeper study',
              'Celebrate: You\'re in an elite group - less than 10% of Christians read the entire Bible!'
            ],
            notes: 'Congratulations! You did it! You\'ve read 1,189 chapters, 31,102 verses, and approximately 783,137 words of God\'s Word. Consider starting again with a different reading plan, or dive into deeper study of books that impacted you most.'
          }
        ]
      }
    ],
    dailyStructure: 'DAILY ROUTINE:\n\n• Best time: Morning before distractions (6-7am ideal)\n• Duration: 15-20 minutes average\n• 3-4 chapters per day (varies by book)\n• Include a Psalm or Proverb for variety\n\nREADING APPROACH:\n\n1. Pray briefly before reading (30 seconds - ask God to speak)\n2. Read the assigned chapters slowly and attentively\n3. Highlight or note one verse that stands out\n4. Reflect on the guided question for 2-3 minutes\n5. Pray the suggested prayer or your own response\n6. Write one sentence in your journal (optional but powerful)\n\nTIPS FOR SUCCESS:\n\n• Same time, same place every day builds habit strength\n• If you miss a day, don\'t read double - just pick up where you left off\n• Audio Bibles (YouVersion, Dwell) are great for commutes\n• Sunday is review/catch-up day each week\n• Tell someone you\'re doing this - accountability boosts completion by 65%\n• Pair with morning coffee or tea to anchor the habit\n\nMILESTONES TO CELEBRATE:\n\n• Week 4: One month in! The habit is forming\n• Week 8: Phase 1 complete - Creation to Promised Land\n• Week 20: Phase 2 complete - nearly halfway!\n• Week 26: HALFWAY POINT! Celebrate this milestone\n• Week 34: Phase 4 complete - the Gospels are behind you\n• Week 46: Phase 5 complete - home stretch!\n• Week 52: YOU DID IT! Less than 10% of Christians achieve this'
  },
  {
    id: 'ch-51',
    name: '52-Week Savings Challenge',
    description: 'Save incrementally each week - £1 in week 1, £2 in week 2, up to £52 in week 52. By year-end, you\'ll have saved £1,378 effortlessly.',
    icon: 'piggy-bank',
    color: HABIT_COLORS[9],
    frequency: { days: [0] },
    category: 'Finance',
    user: {
      id: 'u51',
      name: 'Money Coach Aisha Thompson',
      avatar: 'https://i.pravatar.cc/150?img=44',
      followersCount: 31200,
      habitsShared: 16,
    },
    likes: 14567,
    saves: 12890,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '5 min/week',
    tags: ['savings', 'finance', 'money', 'challenge', 'wealth-building'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to build a savings habit regardless of income',
    mainGoal: 'Save £1,378 over 52 weeks through incremental weekly deposits',
    longDescription: 'The 52-Week Savings Challenge is one of the most popular and effective ways to build a savings habit from scratch. The concept is simple: save £1 in week 1, £2 in week 2, £3 in week 3, and so on until you save £52 in week 52.',
    benefits: [
      'Save £1,378 in one year with minimal effort',
      'Build automatic savings discipline that lasts',
      'Start painlessly small - just £1 the first week',
      'Create an emergency fund from nothing',
      'Develop positive relationship with money',
      'Adaptable to any income level (adjust amounts up or down)',
      'Gamified approach makes saving feel rewarding'
    ],
    equipment: ['Savings account (separate from current account)', 'Tracking spreadsheet or app', 'Optional: Automated transfer setup with your bank'],
    prerequisites: ['A bank account or savings jar', 'Commitment to weekly deposits', 'No minimum income required - adjust amounts to your budget'],
    scientificBacking: 'Behavioural economics research by Dr. Shlomo Benartzi (UCLA): Commitment devices like the 52-week challenge increase savings rates by 87%.',
    programLength: '52 weeks (1 year)',
    phases: [
      {
        phase: 1,
        title: 'Easy Start',
        description: 'Weeks 1-13: Save £1-£13/week. Total: £91. Build the habit painlessly.',
        weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        focusAreas: ['Setting up automatic transfers', 'Choosing a tracking method', 'Building consistency']
      },
      {
        phase: 2,
        title: 'Building Momentum',
        description: 'Weeks 14-26: Save £14-£26/week. Total: £260. Habit is forming.',
        weeks: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
        focusAreas: ['Finding extra money in budget', 'Cutting unnecessary expenses', 'Celebrating milestones']
      },
      {
        phase: 3,
        title: 'Serious Saver',
        description: 'Weeks 27-39: Save £27-£39/week. Total: £429. You\'re a saver now.',
        weeks: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
        focusAreas: ['Budget optimisation', 'Finding side income', 'Resisting withdrawal temptation']
      },
      {
        phase: 4,
        title: 'Final Push',
        description: 'Weeks 40-52: Save £40-£52/week. Total: £598. Finish strong!',
        weeks: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
        focusAreas: ['Holiday season discipline', 'Planning for next year', 'Deciding how to use savings']
      }
    ],
    dailyStructure: 'WEEKLY SAVINGS SCHEDULE:\n\nWeek 1: £1 | Week 14: £14 | Week 27: £27 | Week 40: £40\nWeek 2: £2 | Week 15: £15 | Week 28: £28 | Week 41: £41\nWeek 3: £3 | Week 16: £16 | Week 29: £29 | Week 42: £42\n...and so on up to Week 52: £52\n\n'
  },
  {
    id: 'ch-52',
    name: 'No-Spend Days (3x/Week)',
    description: 'Designate 3 days per week where you spend absolutely £0. A powerful reset for impulse spending and mindless consumption.',
    icon: 'ban',
    color: HABIT_COLORS[3],
    frequency: { type: 'times_per_week', days: [1, 3, 5], timesPerWeek: 3 },
    category: 'Finance',
    user: {
      id: 'u52',
      name: 'Frugal Living Expert Tom Harris',
      avatar: 'https://i.pravatar.cc/150?img=53',
      followersCount: 18900,
      habitsShared: 11,
    },
    likes: 9876,
    saves: 8234,
    trending: false,
    difficulty: 'Medium',
    estimatedDuration: 'All day',
    tags: ['no-spend', 'frugal', 'finance', 'savings', 'minimalism'],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone struggling with impulse spending or wanting to save more',
    mainGoal: 'Complete 3 no-spend days per week for 30 days',
    longDescription: 'No-spend days are one of the most effective tools for resetting your relationship with money. On designated days, you spend absolutely nothing - no coffee runs, no Amazon orders, no food delivery. Bills on autopay don\'t count.',
    benefits: [
      'Save £200-£500 per month on average',
      'Break impulse spending habits',
      'Become more intentional with purchases',
      'Reduce decision fatigue around money',
      'Discover how little you truly need day-to-day',
      'Build discipline and delayed gratification',
      'Free up money for goals that actually matter'
    ],
    equipment: ['Meal prep containers (to avoid food spending)', 'Coffee maker or thermos', 'Entertainment at home (books, games, streaming)'],
    prerequisites: ['Stock fridge before no-spend days', 'Pay bills in advance or on non-no-spend days', 'Have a plan for the day to avoid boredom spending'],
    scientificBacking: 'Journal of Marketing Research: "Cooling off" periods reduce impulse purchases by 40%.',
    programLength: '30 days',
    dailyStructure: 'NO-SPEND DAY RULES:\n\n• £0 discretionary spending - absolutely nothing\n• Pre-paid bills and subscriptions don\'t count\n• Petrol for work commute is allowed (or plan ahead)\n• Emergency spending is okay (true emergencies only)\n\n'
  },
  {
    id: 'ch-53',
    name: 'Weekly Investment & Budget Review',
    description: 'Spend 30 minutes each week reviewing your budget, investments, and financial goals. Stay in control of your money.',
    icon: 'trending-up',
    color: HABIT_COLORS[0],
    frequency: { days: [0] },
    category: 'Finance',
    user: {
      id: 'u53',
      name: 'Wealth Advisor James Okafor',
      avatar: 'https://i.pravatar.cc/150?img=57',
      followersCount: 22100,
      habitsShared: 14,
    },
    likes: 11234,
    saves: 9567,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '30 min',
    tags: ['investing', 'budget', 'finance', 'wealth', 'review'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone with income who wants financial clarity and growth',
    mainGoal: 'Complete weekly financial reviews for 12 consecutive weeks',
    longDescription: 'Wealthy people don\'t just earn more - they review their finances regularly. A weekly 30-minute "money date" with yourself keeps you informed, proactive, and aligned with your financial goals. You\'ll review your spending vs.',
    benefits: [
      'Save 2x more than people who review finances monthly',
      'Catch billing errors and fraud early',
      'Stay on top of bills - never miss a payment',
      'Make informed investment decisions',
      'Reduce financial anxiety through awareness',
      'Align spending with values and goals',
      'Build wealth systematically over time'
    ],
    equipment: ['Budgeting app or spreadsheet', 'Investment account access', 'Bank statements', 'Calendar for bill due dates'],
    prerequisites: ['At least one bank account', 'Basic understanding of your income and expenses', 'Optional: Investment account (stocks and shares ISA, pension)'],
    scientificBacking: 'Fidelity Investments research: Investors who review portfolios weekly make more rational decisions than those who check daily (less panic-selling) or monthly (less informed).',
    programLength: '12 weeks to build lifelong habit',
    dailyStructure: 'WEEKLY REVIEW CHECKLIST (30 minutes):\n\n1. SPENDING REVIEW (10 min):\n• Check all account transactions\n• Categorize spending\n• Compare to budget - over or under?\n• Identify any subscriptions to cancel\n• Note any unexpected charges\n\n2.'
  },
  {
    id: 'ch-54',
    name: 'Daily Skincare Routine (AM/PM)',
    description: 'Establish a consistent morning and evening skincare routine. Protect, nourish, and transform your skin in just 5-10 minutes.',
    icon: 'sparkles',
    color: HABIT_COLORS[7],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Self-Care',
    user: {
      id: 'u54',
      name: 'Dermatology Nurse Priya Patel',
      avatar: 'https://i.pravatar.cc/150?img=26',
      followersCount: 42300,
      habitsShared: 20,
    },
    likes: 19876,
    saves: 16543,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '5-10 min (AM + PM)',
    tags: ['skincare', 'self-care', 'beauty', 'routine', 'health'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting healthier, clearer skin at any age',
    mainGoal: 'Complete AM and PM skincare routine daily for 30 days',
    longDescription: 'Your skin is your largest organ, and consistent care makes a dramatic difference. A basic skincare routine takes just 5 minutes morning and evening but delivers compounding results over weeks and months.',
    benefits: [
      'Clearer, more even-toned complexion within 4 weeks',
      'Prevent premature aging - SPF alone reduces wrinkles by 24%',
      'Reduce acne and breakouts through consistent cleansing',
      'Boost confidence and self-image',
      'Create a calming morning and evening ritual',
      'Protect against UV damage, pollution, and environmental stressors',
      'Save money long-term by preventing skin issues'
    ],
    equipment: ['Gentle cleanser (CeraVe, Cetaphil, or La Roche-Posay)', 'Moisturizer (with ceramides or hyaluronic acid)', 'SPF 30+ sunscreen (AM only)', 'Optional: Serum (Vitamin C for AM, Retinol for PM)', 'Clean towel and washcloth'],
    prerequisites: ['Know your skin type (dry, oily, combination, sensitive)', 'Start with basics - don\'t buy 10 products at once', 'Patch test new products on inner arm first'],
    scientificBacking: 'Journal of the American Academy of Dermatology: Daily sunscreen use reduces melanoma risk by 50% and slows skin aging by 24%.',
    programLength: '30 days',
    dailyStructure: 'MORNING ROUTINE (5 min):\n\n1. CLEANSE (1 min)\n• Splash with lukewarm water OR gentle cleanser\n• Don\'t use hot water - it strips natural oils\n• Pat dry gently - never rub\n\n2. TREAT - Optional (1 min)\n'
  },
  {
    id: 'ch-55',
    name: 'Screen-Free Hour Before Bed',
    description: 'Put away all screens 60 minutes before sleep. Dramatically improve sleep quality, reduce anxiety, and wake up refreshed.',
    icon: 'moon',
    color: HABIT_COLORS[4],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Self-Care',
    user: {
      id: 'u55',
      name: 'Sleep Scientist Dr. Elena Voss',
      avatar: 'https://i.pravatar.cc/150?img=32',
      followersCount: 35600,
      habitsShared: 12,
    },
    likes: 16789,
    saves: 14321,
    trending: true,
    difficulty: 'Hard',
    estimatedDuration: '60 min',
    tags: ['sleep', 'digital-detox', 'self-care', 'wellness', 'screen-time'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone struggling with sleep quality or phone addiction',
    mainGoal: 'No screens for 60 minutes before bed for 30 consecutive nights',
    longDescription: 'Blue light from screens suppresses melatonin production by up to 50%, making it harder to fall asleep and reducing sleep quality.',
    benefits: [
      'Fall asleep 20-30 minutes faster',
      'Increase melatonin production by up to 50%',
      'Improve sleep quality and deep sleep duration',
      'Reduce anxiety and racing thoughts at bedtime',
      'Wake up more refreshed and alert',
      'Break phone addiction gradually',
      'Create peaceful evening ritual',
      'Improve next-day focus and productivity'
    ],
    equipment: ['Physical book or e-ink reader (no backlight)', 'Journal and pen', 'Dim lighting or candles', 'Optional: Alarm clock (so phone stays outside bedroom)'],
    prerequisites: ['Set a firm "screens off" time based on your bedtime', 'Charge phone outside the bedroom', 'Have alternative activities planned', 'Warn close contacts about your new evening boundary'],
    scientificBacking: 'Harvard Medical School: Blue light suppresses melatonin 2x more than other light wavelengths and shifts circadian rhythm by 3 hours.',
    programLength: '30 days',
    dailyStructure: 'EVENING WIND-DOWN ROUTINE:\n\n60 MINUTES BEFORE BED - SCREENS OFF:\n• Set a daily alarm for your "screens off" time\n• Place phone on charger OUTSIDE bedroom\n• Turn off TV, laptop, tablet\n\nWHAT TO DO INSTEAD (pick 2-3):\n\nRELAXATION:\n'
  },
  {
    id: 'ch-56',
    name: 'Weekly Therapy & Self-Check-in',
    description: 'Dedicate 30 minutes weekly to structured self-reflection or therapy. Process emotions, track mental health, and build resilience.',
    icon: 'brain',
    color: HABIT_COLORS[5],
    frequency: { days: [0] },
    category: 'Self-Care',
    user: {
      id: 'u56',
      name: 'Therapist Dr. Maya Johnson',
      avatar: 'https://i.pravatar.cc/150?img=38',
      followersCount: 28700,
      habitsShared: 15,
    },
    likes: 13456,
    saves: 11234,
    trending: false,
    difficulty: 'Easy',
    estimatedDuration: '30 min',
    tags: ['mental-health', 'therapy', 'self-care', 'reflection', 'wellness'],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to improve mental health and self-awareness',
    mainGoal: 'Complete weekly self-check-ins for 12 weeks',
    longDescription: 'You don\'t need to be in crisis to benefit from regular mental health check-ins. Just as you maintain your car or go to the dentist preventatively, weekly self-reflection keeps your mental health in good shape.',
    benefits: [
      'Catch mental health issues before they escalate',
      'Reduce anxiety by 25% through regular emotional processing',
      'Improve self-awareness and emotional intelligence',
      'Build resilience through structured reflection',
      'Track mood patterns and identify triggers',
      'Complement professional therapy between sessions',
      'Develop healthy coping strategies'
    ],
    equipment: ['Journal or digital note-taking app', 'Quiet, comfortable space', 'Optional: Mood tracking app (Daylio, Bearable)', 'Optional: Self-help workbook (CBT-based)'],
    prerequisites: ['Open mind and willingness to be honest with yourself', 'Commitment to 30 minutes of uninterrupted reflection', 'Note: This does NOT replace professional therapy for serious mental health conditions'],
    scientificBacking: 'Journal of Clinical Psychology: Structured self-reflection reduces depressive symptoms by 25% over 8 weeks.',
    programLength: '12 weeks',
    dailyStructure: 'WEEKLY CHECK-IN TEMPLATE (30 min):\n\n1. MOOD RATING (2 min):\n• Rate your overall mood this week (1-10)\n• Rate your energy level (1-10)\n• Rate your stress level (1-10)\n• Rate your sleep quality (1-10)\n\n2. WINS & GRATITUDE (5 min):\n'
  },
  {
    id: 'ch-59',
    name: 'Call a Friend or Family Weekly',
    description: 'Make one meaningful phone call each week to someone you care about. Strengthen bonds, reduce loneliness, and deepen relationships.',
    icon: 'phone',
    color: HABIT_COLORS[7],
    frequency: { days: [6] },
    category: 'Social',
    user: {
      id: 'u59',
      name: 'Relationship Coach Nina Reyes',
      avatar: 'https://i.pravatar.cc/150?img=20',
      followersCount: 19800,
      habitsShared: 10,
    },
    likes: 8765,
    saves: 7234,
    trending: false,
    difficulty: 'Easy',
    estimatedDuration: '15-30 min',
    tags: ['social', 'relationships', 'connection', 'family', 'friendship'],
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to maintain and deepen personal relationships',
    mainGoal: 'Make one meaningful call per week for 12 weeks',
    longDescription: 'In the age of texting and social media, actual voice conversations are becoming rare - and our relationships are suffering. Loneliness has reached epidemic levels, with the U.S. Surgeon General calling it a public health crisis.',
    benefits: [
      'Reduce loneliness and isolation significantly',
      'Strengthen relationships that might otherwise fade',
      'Improve mental health - social connection reduces depression by 30%',
      'Create sense of belonging and support network',
      'Voice calls build 4x more trust than text messages',
      'Stay updated on loved ones\' lives meaningfully',
      'Model healthy relationship maintenance for others'
    ],
    equipment: ['Phone', 'Contact list of people to call', 'Optional: Rotating schedule so you reach everyone'],
    prerequisites: ['Make a list of 12+ people you want to stay connected with', 'Set a specific day/time for your weekly call', 'Be prepared to leave a voicemail and follow up'],
    scientificBacking: 'U.S. Surgeon General\'s Advisory (2023): Social isolation increases mortality risk by 29% and is as harmful as smoking 15 cigarettes/day.',
    programLength: '12 weeks (then lifelong)',
    dailyStructure: 'WEEKLY CALL ROUTINE:\n\n1. CHOOSE WHO TO CALL:\n• Rotate through your list\n• Prioritize people you haven\'t spoken to recently\n• Mix: close friends, family, old friends, mentors\n\n2. BEFORE THE CALL:\n'
  },
  {
    id: 'ch-60',
    name: 'Random Act of Kindness Daily',
    description: 'Perform one intentional act of kindness each day. Boost your happiness, create ripple effects, and make the world better.',
    icon: 'hand-heart',
    color: HABIT_COLORS[7],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Social',
    user: {
      id: 'u60',
      name: 'Kindness Ambassador David Park',
      avatar: 'https://i.pravatar.cc/150?img=60',
      followersCount: 27600,
      habitsShared: 13,
    },
    likes: 21345,
    saves: 17890,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '5-15 min',
    tags: ['kindness', 'social', 'happiness', 'community', 'gratitude'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Everyone - kindness benefits the giver as much as the receiver',
    mainGoal: 'Perform one intentional act of kindness daily for 30 days',
    longDescription: 'Science shows that performing acts of kindness is one of the most reliable ways to boost your own happiness. When you help others, your brain releases serotonin, dopamine, and oxytocin - the "helper\'s high.',
    benefits: [
      'Increase personal happiness by 42%',
      'Release serotonin, dopamine, and oxytocin naturally',
      'Reduce stress and lower blood pressure',
      'Strengthen social connections and trust',
      'Create positive ripple effects in your community',
      'Boost self-esteem and sense of purpose',
      'Improve workplace culture and relationships'
    ],
    equipment: ['Nothing required - just intention and awareness', 'Optional: Small budget for buying coffee, leaving tips, etc.', 'Optional: Kindness journal to track your acts'],
    prerequisites: ['Willingness to look for opportunities throughout the day', 'No specific skills or budget required', 'Open heart and attention to others\' needs'],
    scientificBacking: 'UC Berkeley Greater Good Science Center: Regular kindness practice increases happiness by 42%.',
    programLength: '30 days',
    dailyStructure: 'DAILY KINDNESS IDEAS:\n\nFREE ACTS:\n• Hold the door and smile genuinely\n• Give a sincere compliment to a stranger\n• Let someone go ahead of you in line\n• Send an encouraging text to someone struggling\n'
  },
  {
    id: 'ch-61',
    name: 'Active Listening Practice',
    description: 'Practice deep, focused listening in every conversation. Transform your relationships and communication skills.',
    icon: 'ear',
    color: HABIT_COLORS[6],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Social',
    user: {
      id: 'u61',
      name: 'Communication Coach Ray Torres',
      avatar: 'https://i.pravatar.cc/150?img=52',
      followersCount: 16500,
      habitsShared: 9,
    },
    likes: 7654,
    saves: 6543,
    trending: false,
    difficulty: 'Medium',
    estimatedDuration: 'Throughout the day',
    tags: ['communication', 'listening', 'relationships', 'social-skills', 'empathy'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to improve relationships and communication',
    mainGoal: 'Practice active listening in at least 3 conversations daily for 30 days',
    longDescription: 'Most people listen to respond, not to understand. Studies show we retain only 25-50% of what we hear. Active listening - fully concentrating, understanding, responding, and remembering - transforms relationships.',
    benefits: [
      'Improve relationship satisfaction by 40%',
      'Reduce workplace conflicts and misunderstandings',
      'Build deeper trust and emotional intimacy',
      'Improve information retention by 2x',
      'Become a better leader and team member',
      'Develop empathy and emotional intelligence',
      'People will seek you out as a confidant'
    ],
    equipment: ['Nothing required - just intention', 'Optional: Journal to reflect on conversations'],
    prerequisites: ['Awareness that you probably listen less well than you think', 'Willingness to be uncomfortable (pausing before responding feels weird at first)', 'Patience with yourself as you build the skill'],
    scientificBacking: 'International Journal of Listening: Active listening improves relationship quality by 40% and reduces conflict by 30%.',
    programLength: '30 days',
    dailyStructure: 'ACTIVE LISTENING TECHNIQUES TO PRACTICE:\n\n1. FULL ATTENTION:\n• Put phone away (face down or in pocket)\n• Make comfortable eye contact\n• Face the speaker with open body language\n• Stop what you\'re doing - multitasking kills listening\n\n2.'
  },
  {
    id: 'ch-63',
    name: 'Network & Reach Out Weekly',
    description: 'Reach out to one new or existing professional contact per week. Build a powerful network through consistent, genuine connection.',
    icon: 'users',
    color: HABIT_COLORS[0],
    frequency: { days: [2] },
    category: 'Career',
    user: {
      id: 'u63',
      name: 'Career Strategist Olivia Chen',
      avatar: 'https://i.pravatar.cc/150?img=25',
      followersCount: 29400,
      habitsShared: 16,
    },
    likes: 12345,
    saves: 10567,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '15-20 min',
    tags: ['networking', 'career', 'professional', 'connections', 'growth'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Professionals at any career stage wanting to grow their network',
    mainGoal: 'Reach out to one person weekly for 12 weeks (52 people per year)',
    longDescription: 'Your network is your net worth - but most people only network when they need something (a job, a client, a favor). The most successful networkers build relationships before they need them.',
    benefits: [
      'Build a network of 52+ meaningful connections per year',
      'Access 85% of job opportunities (filled through networking)',
      'Get referrals, recommendations, and introductions',
      'Stay informed about industry trends and opportunities',
      'Develop mentorship relationships',
      'Increase visibility and personal brand',
      'Create safety net for career transitions'
    ],
    equipment: ['LinkedIn account', 'Email', 'Contact management system (even a simple spreadsheet)', 'Optional: CRM tool like HubSpot or Notion'],
    prerequisites: ['List of 20+ people to reach out to initially', 'Clear understanding of what value you can offer others', 'Genuine curiosity about people\'s work and goals'],
    scientificBacking: 'LinkedIn Economic Graph: 85% of jobs are filled through networking. Harvard Business Review: "Weak ties" (acquaintances) are more valuable for career opportunities than close frien',
    programLength: '12 weeks (then lifelong)',
    dailyStructure: 'WEEKLY NETWORKING ROUTINE:\n\n1. CHOOSE YOUR CONTACT (Monday - 5 min):\n• Rotate between: former colleagues, industry peers, people you admire, new connections\n• Check: Have they posted anything recently you can reference?\n'
  },
  {
    id: 'ch-64',
    name: 'Learn 1 New Skill Per Month',
    description: 'Dedicate focused time each month to learning a new professional or personal skill. Stay relevant, curious, and growing.',
    icon: 'graduation-cap',
    color: HABIT_COLORS[2],
    frequency: { type: 'times_per_week', days: [1, 3, 5], timesPerWeek: 3 },
    category: 'Career',
    user: {
      id: 'u64',
      name: 'Learning Expert Dr. Kevin Wu',
      avatar: 'https://i.pravatar.cc/150?img=59',
      followersCount: 31800,
      habitsShared: 21,
    },
    likes: 15678,
    saves: 13456,
    trending: true,
    difficulty: 'Medium',
    estimatedDuration: '30 min/session',
    tags: ['learning', 'skills', 'career', 'growth', 'development'],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Professionals and lifelong learners wanting continuous growth',
    mainGoal: 'Learn 12 new skills in one year through dedicated practice',
    longDescription: 'The half-life of professional skills is now just 5 years - meaning half of what you know will be obsolete in 5 years. Continuous learning isn\'t optional anymore; it\'s survival.',
    benefits: [
      'Acquire 12 new skills per year',
      'Stay professionally relevant in a rapidly changing world',
      'Increase earning potential (new skills = new opportunities)',
      'Build confidence through competence',
      'Develop neuroplasticity - your brain literally grows',
      'Discover hidden talents and passions',
      'Become a more interesting and versatile person'
    ],
    equipment: ['Learning platform subscription (Coursera, Skillshare, YouTube)', 'Notebook for skill-specific notes', 'Materials specific to chosen skill'],
    prerequisites: ['Identify 3-6 skills you\'d like to learn this year', 'Block 3 sessions per week in your calendar', 'Accept that beginner discomfort is part of the process'],
    scientificBacking: 'Josh Kaufman ("The First 20 Hours"): Basic proficiency in any skill can be achieved in 20 hours of deliberate practice.',
    programLength: '12 months (1 skill per month)',
    dailyStructure: 'MONTHLY SKILL LEARNING FRAMEWORK:\n\nWEEK 1 - RESEARCH & FOUNDATIONS:\n• Day 1: Research the skill - find best free/paid resources\n• Day 2: Learn core concepts and terminology\n• Day 3: Watch/read beginner tutorials\n'
  },
  {
    id: 'ch-65',
    name: 'Daily Inbox Zero',
    description: 'Process your email inbox to zero every workday. Reduce digital clutter, never miss important messages, and reclaim mental clarity.',
    icon: 'mail',
    color: HABIT_COLORS[0],
    frequency: { days: [1, 2, 3, 4, 5] },
    category: 'Career',
    user: {
      id: 'u65',
      name: 'Productivity Expert Mark Santos',
      avatar: 'https://i.pravatar.cc/150?img=51',
      followersCount: 21600,
      habitsShared: 15,
    },
    likes: 9876,
    saves: 8234,
    trending: false,
    difficulty: 'Medium',
    estimatedDuration: '15-30 min',
    tags: ['email', 'productivity', 'organization', 'inbox-zero', 'career'],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Professionals drowning in email who want control back',
    mainGoal: 'Achieve inbox zero every workday for 30 days',
    longDescription: 'The average professional receives 121 emails per day and spends 28% of their workweek managing email. An overflowing inbox creates constant low-level anxiety and decision fatigue.',
    benefits: [
      'Eliminate email anxiety and overwhelm',
      'Never miss an important message again',
      'Save 1-2 hours per day on email management',
      'Reduce decision fatigue from unprocessed messages',
      'Improve response time to critical emails',
      'Create mental clarity and reduce cognitive load',
      'Feel in control of your digital life'
    ],
    equipment: ['Email client with folders/labels', 'Calendar for scheduling email tasks', 'Optional: Email management tool (SaneBox, Unroll.me)'],
    prerequisites: ['Commit to checking email at set times (not constantly)', 'Unsubscribe from everything you don\'t read', 'Set up basic folder structure before starting'],
    scientificBacking: 'McKinsey Global Institute: Professionals spend 28% of workweek on email. University of California Irvine: It takes 23 minutes to refocus after an email interruption.',
    programLength: '30 days',
    dailyStructure: 'INBOX ZERO SYSTEM:\n\n1. SET PROCESSING TIMES (3x/day):\n• Morning: 9:00 AM (15 min)\n• Midday: 1:00 PM (10 min)\n• End of day: 4:30 PM (15 min)\n• Close email between these times!\n\n2. THE 4-ACTION RULE (for each email):\n'
  },
  {
    id: 'ch-67',
    name: '10-Minute Daily Declutter',
    description: 'Spend just 10 minutes each day decluttering one small area. A clean space reduces stress by 40% and boosts productivity.',
    icon: 'trash-2',
    color: HABIT_COLORS[2],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Household',
    user: {
      id: 'u67',
      name: 'Organizing Expert Marie Kim',
      avatar: 'https://i.pravatar.cc/150?img=19',
      followersCount: 34500,
      habitsShared: 22,
    },
    likes: 16789,
    saves: 14567,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '10 min',
    tags: ['declutter', 'organization', 'home', 'minimalism', 'cleaning'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone overwhelmed by clutter who wants a manageable approach',
    mainGoal: 'Declutter for 10 minutes daily for 30 days',
    longDescription: 'Clutter isn\'t just messy - it\'s mental weight. UCLA\'s Center on Everyday Lives of Families found that clutter increases cortisol (stress hormone) levels, especially in women.',
    benefits: [
      'Reduce stress and cortisol levels by up to 40%',
      'Improve focus and productivity (less visual distraction)',
      'Save time - average American spends 2.5 days/year looking for lost items',
      'Create calm, peaceful living environment',
      'Make cleaning easier with less stuff',
      'Potential income from selling unused items',
      'Build decision-making skills (keep/toss is a muscle)'
    ],
    equipment: ['Timer (phone)', 'Trash bag', 'Donation box', '"Maybe" box for items you\'re unsure about'],
    prerequisites: ['Commitment to just 10 minutes (set a timer and stop)', 'Donation drop-off location identified', 'Let go of guilt - items served their purpose'],
    scientificBacking: 'UCLA Center on Everyday Lives of Families: High cortisol levels in people with cluttered homes, linked to depressed mood.',
    programLength: '30 days',
    dailyStructure: '10-MINUTE DECLUTTER DAILY PLAN:\n\n1. SET TIMER FOR 10 MINUTES\n2. PICK ONE SMALL AREA:\n\n30-DAY AREA ROTATION:\n• Day 1: Kitchen counters\n• Day 2: Junk drawer\n• Day 3: Bathroom cabinet\n• Day 4: Nightstand\n• Day 5: Desk/workspace\n'
  },
  {
    id: 'ch-68',
    name: 'Make Your Bed Every Morning',
    description: 'Start each day with a small win by making your bed. This keystone habit triggers a chain of productive behaviors.',
    icon: 'bed',
    color: HABIT_COLORS[6],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Household',
    user: {
      id: 'u68',
      name: 'Habit Coach Admiral Will McRaven',
      avatar: 'https://i.pravatar.cc/150?img=56',
      followersCount: 45600,
      habitsShared: 8,
    },
    likes: 23456,
    saves: 19876,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '2-3 min',
    tags: ['morning-routine', 'discipline', 'keystone-habit', 'productivity', 'home'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to build discipline through a simple daily habit',
    mainGoal: 'Make your bed every morning for 30 consecutive days',
    longDescription: 'Admiral William McRaven\'s famous speech went viral for a reason: "If you want to change the world, start by making your bed." This 2-minute task is a "keystone habit" - a small behavior that triggers a cascade of other positive behaviors.',
    benefits: [
      'Start each day with a sense of accomplishment',
      'Trigger chain of productive behaviors (keystone habit)',
      '19% more likely to sleep well',
      'Bedroom feels calmer and more inviting',
      'Build discipline that transfers to other areas',
      'Coming home to a made bed reduces stress',
      '206% more likely to stick to a budget (correlated habit)'
    ],
    equipment: ['Your bed - that\'s it', 'Optional: Nice bedding that motivates you'],
    prerequisites: ['Nothing - just get out of bed and make it immediately', 'Don\'t overthink it - a made bed doesn\'t need to be perfect', 'Do it before checking your phone'],
    scientificBacking: 'Charles Duhigg ("The Power of Habit"): Making your bed is a keystone habit that correlates with better productivity, greater sense of well-being, and stronger ability to stick with',
    programLength: '30 days (then forever)',
    dailyStructure: 'HOW TO MAKE YOUR BED (2-3 min):\n\n1. Get out of bed immediately (no snooze)\n2. Pull back all covers completely\n3. Straighten the fitted sheet\n4. Pull up flat sheet, tuck at bottom\n5. Pull up comforter/duvet evenly\n6. Fluff and arrange pillows\n'
  },
  {
    id: 'ch-69',
    name: 'Weekly Meal Planning',
    description: 'Plan all your meals for the week every Sunday. Save money, eat healthier, reduce waste, and eliminate daily "what\'s for dinner" stress.',
    icon: 'utensils',
    color: HABIT_COLORS[1],
    frequency: { days: [0] },
    category: 'Household',
    user: {
      id: 'u69',
      name: 'Nutrition Coach Emma Davis',
      avatar: 'https://i.pravatar.cc/150?img=30',
      followersCount: 28900,
      habitsShared: 17,
    },
    likes: 14567,
    saves: 12890,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '30-45 min',
    tags: ['meal-planning', 'cooking', 'nutrition', 'saving-money', 'organization'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to eat better, save money, and reduce daily decision fatigue',
    mainGoal: 'Complete weekly meal plans for 8 consecutive weeks',
    longDescription: 'The average family wastes £1,500/year on food that goes bad, and spends £3,000+/year on unplanned takeout. Weekly meal planning solves both problems.',
    benefits: [
      'Save £200-£400/month on food (less waste and takeout)',
      'Eat healthier - planners consume more fruits and vegetables',
      'Eliminate daily "what\'s for dinner" stress',
      'Reduce food waste by 75% (buy only what you need)',
      'Save 1-2 hours per week on grocery shopping',
      'More variety in your diet (intentional selection)',
      'Teach family healthy eating habits'
    ],
    equipment: ['Meal planning template (paper or digital)', 'Grocery list app or notepad', 'Basic cookbooks or recipe apps', 'Food storage containers for meal prep'],
    prerequisites: ['Inventory your fridge, freezer, and pantry before planning', 'Know your family\'s dietary needs and preferences', 'Start with just planning dinners, then expand to all meals'],
    scientificBacking: 'International Journal of Behavioral Nutrition: Meal planners have significantly better diet quality and lower obesity prevalence.',
    programLength: '8 weeks',
    dailyStructure: 'SUNDAY MEAL PLANNING SESSION (30-45 min):\n\n1. INVENTORY CHECK (5 min):\n• Check fridge, freezer, pantry\n• Note what needs to be used soon\n• Check staples (oil, spices, rice, pasta)\n\n2. PLAN MEALS (15 min):\n'
  },
  {
    id: 'ch-71',
    name: 'Daily Prayer & Devotional',
    description: 'Begin each day with focused prayer and spiritual reading. Build a foundation of faith, peace, and purpose.',
    icon: 'book-open',
    color: HABIT_COLORS[4],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Religion',
    user: {
      id: 'u71',
      name: 'Pastor Grace Williams',
      avatar: 'https://i.pravatar.cc/150?img=39',
      followersCount: 38200,
      habitsShared: 14,
    },
    likes: 18765,
    saves: 16234,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: '15-20 min',
    tags: ['prayer', 'devotional', 'faith', 'spiritual', 'morning'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to deepen their spiritual life through daily practice',
    mainGoal: 'Complete daily prayer and devotional for 30 consecutive days',
    longDescription: 'Across all faith traditions, daily prayer and devotional time is the cornerstone of spiritual growth. This habit creates a structured 15-20 minute morning practice that combines prayer, Scripture reading, reflection, and gratitude.',
    benefits: [
      'Reduce anxiety and stress by 30% through regular prayer',
      'Build deeper relationship with God through consistency',
      'Start each day with peace, purpose, and perspective',
      'Improve emotional resilience during difficult times',
      'Develop gratitude that transforms your outlook',
      'Increase feelings of hope, meaning, and connection',
      'Create spiritual foundation for decision-making'
    ],
    equipment: ['Bible or devotional book', 'Journal and pen', 'Quiet, comfortable space', 'Optional: Devotional app (YouVersion, Pray, Our Daily Bread)'],
    prerequisites: ['Choose a consistent time (morning recommended)', 'Select a devotional plan or reading schedule', 'Create a dedicated quiet space'],
    scientificBacking: 'Journal of Religion and Health: Regular prayer reduces anxiety symptoms by 30% and increases life satisfaction.',
    programLength: '30 days (then lifelong)',
    dailyStructure: 'DAILY DEVOTIONAL ROUTINE (15-20 min):\n\n1. PREPARE (2 min):\n• Find your quiet space\n• Minimize distractions (phone on silent)\n• Take 3 deep breaths to center yourself\n• Opening prayer: "Lord, open my heart and mind to Your word today"\n\n2.'
  },
];

COMMUNITY_HABITS.push(
  {
    id: 'ch-diet-med',
    name: 'Mediterranean Diet',
    description: 'Eat the way Italians and Greeks do: olive oil, fish, veg, legumes, whole grains. Linked to longer, healthier lives.',
    icon: 'salad',
    color: HABIT_COLORS[2],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: { id: 'u-diet-1', name: 'Dr. Lucia Bianchi', avatar: 'https://i.pravatar.cc/150?img=45', followersCount: 18200, habitsShared: 12 },
    likes: 5420,
    saves: 4180,
    trending: true,
    difficulty: 'Easy',
    estimatedDuration: 'All day',
    tags: ['mediterranean', 'diet', 'heart-health', 'longevity'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting a sustainable, flavourful way of eating',
    longDescription: 'The Mediterranean diet is consistently ranked the #1 diet by US News & World Report. Centered on plants, olive oil, fish, legumes and whole grains, with modest dairy and minimal red meat.',
    benefits: [
      'Reduces heart disease risk by up to 30%',
      'Lowers type 2 diabetes risk',
      'Supports brain health and memory',
      'Sustainable — not a restrictive diet',
      'Rich, flavourful meals you\u2019ll actually enjoy',
    ],
    scientificBacking: 'PREDIMED trial (NEJM 2013) showed 30% reduction in major cardiovascular events for those following a Mediterranean diet with olive oil.',
    dailyStructure: 'Breakfast: Greek yoghurt + berries + nuts. Lunch: grain bowl with veg + olive oil. Dinner: grilled fish + roasted vegetables + whole grains. Snacks: fruit, olives, hummus.',
    dietTags: ['mediterranean', 'healthy', 'vegetarian'],
    dietLabel: 'Mediterranean Diet',
  },
  {
    id: 'ch-diet-protein',
    name: 'High-Protein Eating',
    description: 'Hit 1g of protein per pound of bodyweight daily. Build muscle, stay full, recover faster.',
    icon: 'egg',
    color: HABIT_COLORS[1],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: { id: 'u-diet-2', name: 'Coach Mark Reyes', avatar: 'https://i.pravatar.cc/150?img=33', followersCount: 9800, habitsShared: 7 },
    likes: 3210,
    saves: 2640,
    difficulty: 'Medium',
    estimatedDuration: 'All day',
    tags: ['protein', 'muscle', 'fitness', 'diet'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Lifters and anyone wanting to build or preserve muscle',
    benefits: ['Build lean muscle', 'Better recovery', 'Improved satiety', 'Easier fat loss'],
    dietTags: ['high-protein', 'healthy'],
    dietLabel: 'High-Protein',
  },
  {
    id: 'ch-diet-plant',
    name: 'Plant-Based Week',
    description: 'Eat plants for 7 days. Boost energy, reduce inflammation, and discover incredible new flavours.',
    icon: 'leaf',
    color: HABIT_COLORS[2],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: { id: 'u-diet-3', name: 'Aya Nakamura', avatar: 'https://i.pravatar.cc/150?img=47', followersCount: 7300, habitsShared: 5 },
    likes: 2180,
    saves: 1640,
    trending: true,
    difficulty: 'Medium',
    estimatedDuration: 'All day',
    tags: ['plant-based', 'vegan', 'vegetarian', 'diet'],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Curious eaters ready to try a week without animal products',
    benefits: ['Lower cholesterol', 'More fibre', 'Better gut health', 'Reduced environmental footprint'],
    dietTags: ['vegetarian', 'plant-based', 'healthy'],
    dietLabel: 'Plant-Based',
  },
  {
    id: 'ch-diet-lowcarb',
    name: 'Low-Carb Lifestyle',
    description: 'Cut processed carbs and sugar. Focus on quality protein, healthy fats, and non-starchy veg.',
    icon: 'carrot',
    color: HABIT_COLORS[4],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: { id: 'u-diet-4', name: 'Dr. Ben Carter', avatar: 'https://i.pravatar.cc/150?img=52', followersCount: 11200, habitsShared: 9 },
    likes: 2890,
    saves: 2010,
    difficulty: 'Medium',
    estimatedDuration: 'All day',
    tags: ['low-carb', 'keto', 'diet', 'weight-loss'],
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'People looking to stabilise energy and manage weight',
    benefits: ['Stable energy', 'Reduced sugar cravings', 'Weight management', 'Better blood sugar'],
    dietTags: ['low-carb', 'high-protein', 'keto'],
    dietLabel: 'Low-Carb',
  },
  {
    id: 'ch-diet-whole',
    name: 'Whole Foods Only',
    description: 'If it grew on a plant or came from an animal, eat it. If it was made in a plant, skip it.',
    icon: 'utensils',
    color: HABIT_COLORS[5],
    frequency: { days: [0, 1, 2, 3, 4, 5, 6] },
    category: 'Health',
    user: { id: 'u-diet-5', name: 'Isla Thompson', avatar: 'https://i.pravatar.cc/150?img=49', followersCount: 6400, habitsShared: 6 },
    likes: 1890,
    saves: 1320,
    difficulty: 'Easy',
    estimatedDuration: 'All day',
    tags: ['whole-foods', 'clean-eating', 'diet'],
    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    targetAudience: 'Anyone wanting to cut ultra-processed food from their life',
    benefits: ['Better nutrition', 'More energy', 'Clearer skin', 'Improved digestion'],
    dietTags: ['healthy', 'whole-foods', 'vegetarian'],
    dietLabel: 'Whole Foods',
  },
  {
    id: 'ch-4day-split',
    name: '4-Day Muscle Building Split',
    description: 'Classic upper/lower or body-part split over 4 days. Build serious muscle with focused muscle group training days.',
    icon: 'dumbbell',
    color: HABIT_COLORS[3],
    frequency: { type: 'times_per_week', days: [1, 2, 4, 5], timesPerWeek: 4 },
    category: 'Fitness',
    user: {
      id: 'u-gym-4day',
      name: 'Coach Marcus Johnson',
      avatar: 'https://i.pravatar.cc/150?img=14',
      followersCount: 28400,
      habitsShared: 11,
    },
    likes: 8240,
    saves: 6120,
    trending: true,
    difficulty: 'Medium',
    estimatedDuration: '60-75 min',
    tags: ['hypertrophy', 'muscle-building', 'split', 'gym', 'strength'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    goalType: 'progressive',
    targetAudience: 'Lifters with 3+ months experience who want to build muscle with focused body-part days',
    mainGoal: 'Gain 8-12 lbs of lean muscle in 12 weeks',
    longDescription: 'A 4-day muscle-building split organises your training around specific muscle groups each session, giving each group enough volume to grow and enough rest to recover. The split: Day 1 Chest & Triceps, Day 2 Back & Biceps, Day 3 Rest, Day 4 Legs, Day 5 Shoulders & Abs, Days 6-7 Rest. This structure is proven for hypertrophy because it balances volume (10-20 hard sets per muscle per week), frequency (each group hit 1-2x/week), and recovery.',
    benefits: [
      'Build 8-12 lbs of lean muscle in 12 weeks',
      'Focused volume per muscle group for maximum growth',
      'Balanced recovery with 3 rest days',
      'Works around a typical work/school schedule',
      'Progressive overload built in every week',
      'Develops a proportional, aesthetic physique',
    ],
    equipment: ['Barbell & plates', 'Dumbbells (full range)', 'Bench (flat + incline)', 'Squat rack', 'Cable machine', 'Pull-up bar'],
    prerequisites: ['Know basic compound lift form', '3+ months of consistent training', 'Adequate protein intake (0.8-1g per lb bodyweight)', 'At least 7 hours sleep per night'],
    scientificBacking: 'Schoenfeld et al. (2017) meta-analysis: 10+ weekly sets per muscle group produces superior hypertrophy. Training each muscle 1-2x/week with 10-20 hard sets is the sweet spot for natural lifters.',
    programLength: '12 weeks',
    resources: [
      { title: 'Jeff Nippard YouTube', description: 'Science-based hypertrophy technique videos' },
      { title: 'Renaissance Periodization', description: 'Volume landmarks and programming principles' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Adaptation (Weeks 1-4)',
        description: 'Learn the split, dial in form, establish working weights',
        weeks: [1, 2, 3, 4],
        focusAreas: ['Form', 'Mind-muscle connection', 'Recovery baseline'],
      },
      {
        phase: 2,
        title: 'Accumulation (Weeks 5-8)',
        description: 'Add volume and weight - this is where most growth happens',
        weeks: [5, 6, 7, 8],
        focusAreas: ['Progressive overload', 'Volume increases', 'Hypertrophy'],
      },
      {
        phase: 3,
        title: 'Intensification (Weeks 9-12)',
        description: 'Push intensity with heavier weights and advanced techniques',
        weeks: [9, 10, 11, 12],
        focusAreas: ['Strength peaks', 'Drop sets / rest-pause', 'PR attempts'],
      },
    ],
    dailyStructure: 'WEEKLY STRUCTURE:\n\nDAY 1 (MON) - CHEST & TRICEPS\n• Barbell Bench Press: 4x6-8\n• Incline Dumbbell Press: 4x8-10\n• Chest Dip or Cable Fly: 3x10-12\n• Overhead Tricep Extension: 3x10-12\n• Tricep Pushdown: 3x12-15\n• Close-Grip Bench: 3x8-10\n\nDAY 2 (TUE) - BACK & BICEPS\n• Deadlift: 4x5\n• Pull-ups or Lat Pulldown: 4x8-10\n• Barbell Row: 4x8-10\n• Seated Cable Row: 3x10-12\n• Barbell Curl: 3x8-10\n• Hammer Curl: 3x10-12\n\nDAY 3 (WED) - REST / Active recovery walk\n\nDAY 4 (THU) - LEGS\n• Back Squat: 4x6-8\n• Romanian Deadlift: 4x8-10\n• Leg Press: 3x10-12\n• Walking Lunges: 3x12 each leg\n• Leg Curl: 3x12-15\n• Standing Calf Raise: 4x12-15\n\nDAY 5 (FRI) - SHOULDERS & ABS\n• Overhead Press: 4x6-8\n• Seated Dumbbell Press: 3x8-10\n• Lateral Raise: 4x12-15\n• Face Pull: 3x15\n• Rear Delt Fly: 3x12-15\n• Hanging Leg Raise: 3x12\n• Cable Crunch: 3x15\n\nDAYS 6-7 (SAT/SUN) - REST\n\nPROGRESSION: Add 2.5-5 lbs when you hit the top of the rep range for all sets. Rest 90-180 sec between working sets.',
    weeks: [
      {
        week: 1,
        title: 'Foundation Week - Dial In Form',
        description: 'Use moderate weights, focus on perfect technique and full range of motion',
        days: [
          {
            day: 1,
            title: 'Day 1 - Chest & Triceps',
            description: 'Push day focused on the chest and triceps',
            duration: '65 min',
            activities: [
              'Barbell Bench Press: 4x8 @ 65% 1RM',
              'Incline Dumbbell Press: 4x10',
              'Cable Fly: 3x12',
              'Overhead Rope Extension: 3x12',
              'Tricep Pushdown: 3x15',
              'Close-Grip Bench: 3x10',
            ],
            notes: 'Leave 2-3 reps in the tank on every set. Focus on squeezing the chest.',
          },
          {
            day: 2,
            title: 'Day 2 - Back & Biceps',
            description: 'Pull day emphasizing the entire posterior chain',
            duration: '70 min',
            activities: [
              'Deadlift: 4x5 @ 70% 1RM',
              'Lat Pulldown: 4x10',
              'Barbell Row: 4x10',
              'Seated Cable Row: 3x12',
              'Barbell Curl: 3x10',
              'Hammer Curl: 3x12',
            ],
            notes: 'Initiate pulls with your back, not your arms. Brace hard on deadlifts.',
          },
          {
            day: 3,
            title: 'Rest / Mobility',
            description: 'Active recovery day - walk, stretch, eat',
            duration: '20 min',
            activities: ['30-45 min walk', '10 min full-body stretching', 'Hit protein target'],
            restDay: true,
          },
          {
            day: 4,
            title: 'Day 4 - Legs',
            description: 'Full lower-body day - the hardest session of the week',
            duration: '75 min',
            activities: [
              'Back Squat: 4x8 @ 65% 1RM',
              'Romanian Deadlift: 4x10',
              'Leg Press: 3x12',
              'Walking Lunges: 3x12 each leg',
              'Leg Curl: 3x15',
              'Standing Calf Raise: 4x15',
            ],
            notes: 'Go deep on squats. Control the eccentric on RDLs to feel the hamstrings.',
          },
          {
            day: 5,
            title: 'Day 5 - Shoulders & Abs',
            description: 'Delts, upper back, and core finisher',
            duration: '60 min',
            activities: [
              'Overhead Press: 4x8 @ 65% 1RM',
              'Seated Dumbbell Press: 3x10',
              'Lateral Raise: 4x15',
              'Face Pull: 3x15',
              'Rear Delt Fly: 3x15',
              'Hanging Leg Raise: 3x12',
              'Cable Crunch: 3x15',
            ],
            notes: 'Lateral raises are the key lift for wider shoulders - use strict form, even if light.',
          },
          {
            day: 6,
            title: 'Rest',
            description: 'Full rest day',
            duration: '0 min',
            activities: ['Rest', 'Sleep 8+ hours', 'Meal prep for next week'],
            restDay: true,
          },
          {
            day: 0,
            title: 'Rest',
            description: 'Full rest day',
            duration: '0 min',
            activities: ['Rest', 'Light walking', 'Foam roll'],
            restDay: true,
          },
        ],
      },
      ...buildSplitWeeks(),
    ],
    exerciseGifs: {
      'Barbell Bench Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
      'Bench Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
      'Incline Dumbbell Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Incline-Dumbbell-Press.gif',
      'Cable Fly': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Chest-Fly.gif',
      'Chest Dip': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dip.gif',
      'Dip': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dip.gif',
      'Overhead Tricep Extension': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Tricep-Extension.gif',
      'Overhead Rope Extension': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Overhead-Rope-Extension.gif',
      'Tricep Pushdown': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Triceps-Pushdown.gif',
      'Close-Grip Bench': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Close-Grip-Bench-Press.gif',
      'Skull Crushers': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Skull-Crusher.gif',
      'Deadlift': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
      'Pull-ups': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif',
      'Pull-up': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif',
      'Lat Pulldown': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
      'Barbell Row': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif',
      'T-Bar Row': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/T-Bar-Row.gif',
      'Seated Cable Row': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Seated-Cable-Row.gif',
      'Barbell Curl': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Barbell-Curl.gif',
      'Hammer Curl': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Hammer-Curl.gif',
      'Incline Dumbbell Curl': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Incline-Dumbbell-Curl.gif',
      'Preacher Curl': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Preacher-Curl.gif',
      'Back Squat': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
      'Squat': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
      'Front Squat': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Front-Squat.gif',
      'Romanian Deadlift': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Romanian-Deadlift.gif',
      'Leg Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Leg-Press.gif',
      'Walking Lunges': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Walking-Lunge.gif',
      'Bulgarian Split Squat': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Bulgarian-Split-Squat.gif',
      'Leg Curl': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Lying-Leg-Curl.gif',
      'Leg Extension': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Leg-Extension.gif',
      'Standing Calf Raise': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Standing-Calf-Raise.gif',
      'Seated Calf Raise': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Seated-Calf-Raise.gif',
      'Overhead Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shoulder-Press.gif',
      'Seated Dumbbell Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Seated-Dumbbell-Press.gif',
      'Arnold Press': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Arnold-Press.gif',
      'Lateral Raise': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Lateral-Raise.gif',
      'Face Pull': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Face-Pull.gif',
      'Rear Delt Fly': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Reverse-Dumbbell-Fly.gif',
      'Hanging Leg Raise': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hanging-Leg-Raise.gif',
      'Cable Crunch': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Cable-Crunch.gif',
      'Plank': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Front-Plank.gif',
      'Ab Wheel': 'https://fitnessprogramer.com/wp-content/uploads/2021/04/Ab-Wheel-Rollout.gif',
    },
    exerciseFormGuides: splitFormGuides,
  },
);

export const HABIT_CATEGORIES = [
  { key: 'All', label: 'All', count: COMMUNITY_HABITS.length },
  { key: 'Fitness', label: 'Fitness', count: COMMUNITY_HABITS.filter(h => h.category === 'Fitness').length },
  { key: 'Health', label: 'Health', count: COMMUNITY_HABITS.filter(h => h.category === 'Health').length },
  { key: 'Mindfulness', label: 'Mindfulness', count: COMMUNITY_HABITS.filter(h => h.category === 'Mindfulness').length },
  { key: 'Productivity', label: 'Productivity', count: COMMUNITY_HABITS.filter(h => h.category === 'Productivity').length },
  { key: 'Learning', label: 'Learning', count: COMMUNITY_HABITS.filter(h => h.category === 'Learning').length },
  { key: 'Creative', label: 'Creative', count: COMMUNITY_HABITS.filter(h => h.category === 'Creative').length },
  { key: 'Religion', label: 'Religion', count: COMMUNITY_HABITS.filter(h => h.category === 'Religion').length },
  { key: 'Finance', label: 'Finance', count: COMMUNITY_HABITS.filter(h => h.category === 'Finance').length },
  { key: 'Self-Care', label: 'Self-Care', count: COMMUNITY_HABITS.filter(h => h.category === 'Self-Care').length },
  { key: 'Social', label: 'Social', count: COMMUNITY_HABITS.filter(h => h.category === 'Social').length },
  { key: 'Career', label: 'Career', count: COMMUNITY_HABITS.filter(h => h.category === 'Career').length },
  { key: 'Household', label: 'Household', count: COMMUNITY_HABITS.filter(h => h.category === 'Household').length },
] as const;
