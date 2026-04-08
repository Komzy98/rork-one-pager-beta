import { ChronotypeInfo } from '@/types/habit';

export const CHRONOTYPES: ChronotypeInfo[] = [
  {
    id: 'lion',
    name: 'Lion',
    emoji: '🦁',
    title: 'Early Riser',
    description: 'You thrive in the early morning. Your energy peaks before noon and you wind down early.',
    peakHours: { start: 6, end: 12 },
    windDownHour: 20,
    wakeHour: 5,
    sleepHour: 22,
    color: '#F59E0B',
    traits: ['Morning powerhouse', 'Peak focus before noon', 'Early to bed, early to rise'],
  },
  {
    id: 'bear',
    name: 'Bear',
    emoji: '🐻',
    title: 'Steady Performer',
    description: 'You follow the solar cycle. Most productive mid-morning to early afternoon.',
    peakHours: { start: 10, end: 14 },
    windDownHour: 22,
    wakeHour: 7,
    sleepHour: 23,
    color: '#10B981',
    traits: ['Solar-cycle aligned', 'Consistent energy', 'Balanced schedule'],
  },
  {
    id: 'wolf',
    name: 'Wolf',
    emoji: '🐺',
    title: 'Night Owl',
    description: 'You come alive in the evening. Creative bursts hit after sunset.',
    peakHours: { start: 17, end: 24 },
    windDownHour: 0,
    wakeHour: 9,
    sleepHour: 1,
    color: '#6366F1',
    traits: ['Evening creative bursts', 'Late-night focus', 'Slow morning starter'],
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    emoji: '🐬',
    title: 'Light Sleeper',
    description: 'You have split productivity windows. Best in mid-morning and late afternoon.',
    peakHours: { start: 10, end: 12 },
    windDownHour: 22,
    wakeHour: 6,
    sleepHour: 23,
    color: '#06B6D4',
    traits: ['Dual peak windows', 'Sensitive & detail-oriented', 'Strategic energy use'],
  },
];

export const getChronotypeInfo = (id: string): ChronotypeInfo | undefined => {
  return CHRONOTYPES.find(c => c.id === id);
};

export const getChronotypePeakLabel = (chronotype: ChronotypeInfo): string => {
  const formatHour = (h: number) => {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };
  return `${formatHour(chronotype.peakHours.start)} – ${formatHour(chronotype.peakHours.end)}`;
};

export const isInPeakHours = (chronotype: ChronotypeInfo): boolean => {
  const hour = new Date().getHours();
  if (chronotype.peakHours.start <= chronotype.peakHours.end) {
    return hour >= chronotype.peakHours.start && hour < chronotype.peakHours.end;
  }
  return hour >= chronotype.peakHours.start || hour < chronotype.peakHours.end;
};

export const getSecondaryPeakHours = (chronotype: ChronotypeInfo): { start: number; end: number } | null => {
  if (chronotype.id === 'dolphin') {
    return { start: 16, end: 18 };
  }
  return null;
};

export const getChronotypeGreetingTip = (chronotype: ChronotypeInfo): string => {
  const hour = new Date().getHours();
  const inPeak = isInPeakHours(chronotype);
  const secondary = getSecondaryPeakHours(chronotype);
  const inSecondary = secondary ? hour >= secondary.start && hour < secondary.end : false;

  if (inPeak || inSecondary) {
    return "You're in your peak zone — tackle your hardest tasks now!";
  }

  switch (chronotype.id) {
    case 'lion':
      if (hour < chronotype.wakeHour) return 'Rest up — your power hours start at dawn.';
      if (hour >= 12 && hour < 17) return 'Energy dipping — great time for lighter tasks.';
      return 'Wind down and recharge for tomorrow morning.';
    case 'bear':
      if (hour < 10) return 'Ease in — your peak is coming mid-morning.';
      if (hour >= 14 && hour < 17) return 'Afternoon lull — try a walk or lighter work.';
      return 'Evening mode — wrap up and relax.';
    case 'wolf':
      if (hour < 12) return 'Slow start — save deep work for later.';
      if (hour >= 12 && hour < 17) return 'Building momentum — your peak is approaching.';
      return 'This is your time — dive into creative work!';
    case 'dolphin':
      if (hour < 10) return 'Ease in — your first peak starts at 10 AM.';
      if (hour >= 12 && hour < 16) return 'Recharge gap — save energy for your 4 PM window.';
      if (hour >= 18) return 'Evening wind-down — try something calming.';
      return 'Stay flexible and use your energy wisely.';
    default:
      return '';
  }
};
