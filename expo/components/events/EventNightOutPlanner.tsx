import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Clock3,
  Flag,
  Home,
  MapPin,
  Sparkles,
  TrainFront,
  Users,
  UtensilsCrossed,
} from 'lucide-react-native';
import type { NightOutStep, NightOutStepKind } from '@/utils/eventNightOutPlanner';
import type { EventsPalette } from '@/utils/eventsPalette';

const STEP_ICON: Record<NightOutStepKind, React.ComponentType<{ size?: number; color?: string }>> = {
  pre: UtensilsCrossed,
  leave: Home,
  arrive: MapPin,
  meet: Users,
  doors: Sparkles,
  interval: Clock3,
  wrap: Flag,
  transit: TrainFront,
  home: Home,
};

interface EventNightOutPlannerProps {
  steps: NightOutStep[];
  palette: EventsPalette;
}

export const EventNightOutPlanner = React.memo(function EventNightOutPlanner({
  steps,
  palette,
}: EventNightOutPlannerProps) {
  if (steps.length === 0) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: palette.surfaceLight, borderColor: palette.border }]}>
      <Text style={[styles.heading, { color: palette.textSecondary }]}>Night out plan</Text>
      {steps.map((step, index) => {
        const Icon = STEP_ICON[step.kind];
        const isLast = index === steps.length - 1;
        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.timeCol}>
              <Text style={[styles.time, { color: palette.text }]}>{step.timeLabel}</Text>
            </View>
            <View style={styles.trackCol}>
              <View style={[styles.dot, { backgroundColor: palette.primary, borderColor: palette.primaryLight }]}>
                <Icon size={10} color="#FFF" />
              </View>
              {!isLast ? <View style={[styles.line, { backgroundColor: palette.border }]} /> : null}
            </View>
            <View style={styles.copyCol}>
              <Text style={[styles.title, { color: palette.text }]}>{step.title}</Text>
              {step.subtitle ? (
                <Text style={[styles.subtitle, { color: palette.textSecondary }]} numberOfLines={2}>
                  {step.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  heading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
  },
  timeCol: {
    width: 44,
    paddingTop: 2,
  },
  time: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  trackCol: {
    width: 18,
    alignItems: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    borderRadius: 1,
  },
  copyCol: {
    flex: 1,
    gap: 2,
    paddingBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
});
