import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

import { WHAT_PARTNERS_SEE_SECTION } from '@/utils/partnerPrivacy';

interface PolicySection {
  title: string;
  content: string;
}

const LAST_UPDATED = 'April 4, 2026';

const POLICY_SECTIONS: PolicySection[] = [
  {
    title: WHAT_PARTNERS_SEE_SECTION.title,
    content: WHAT_PARTNERS_SEE_SECTION.content,
  },
  {
    title: 'Introduction',
    content:
      'Welcome to our app. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application. Please read this policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the application.',
  },
  {
    title: 'Information We Collect',
    content:
      'We may collect the following types of information:\n\n• Account Information: When you register, we collect your name, email address, and profile photo.\n\n• Usage Data: We collect information about how you interact with the app, including features used, pages viewed, and time spent.\n\n• Device Information: We may collect device type, operating system, unique device identifiers, and mobile network information.\n\n• Location Data: With your permission, we may collect approximate location data to provide location-based features such as weather and nearby events.\n\n• User Content: Information you provide through the app, such as habits, tasks, preferences, and interests.',
  },
  {
    title: 'How We Use Your Information',
    content:
      'We use the information we collect to:\n\n• Provide, maintain, and improve the app and its features.\n\n• Personalise your experience based on your interests and preferences.\n\n• Send you notifications related to your habits, tasks, and activities (with your consent).\n\n• Monitor and analyse usage patterns and trends.\n\n• Detect, prevent, and address technical issues.\n\n• Comply with legal obligations.',
  },
  {
    title: 'Data Storage & Security',
    content:
      'Your data is stored securely using industry-standard encryption and security measures. We use cloud-based services to sync your data across devices. While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the internet or electronic storage is 100% secure.',
  },
  {
    title: 'Third-Party Services',
    content:
      'Our app may use third-party services that collect information. These include:\n\n• Authentication providers for secure sign-in.\n\n• Cloud storage services for data synchronisation.\n\n• Analytics services to help us understand app usage.\n\n• Sports and weather data APIs to deliver relevant content.\n\nEach third-party service has its own Privacy Policy governing the use of your information.',
  },
  {
    title: 'Your Rights',
    content:
      'You have the right to:\n\n• Access the personal data we hold about you.\n\n• Request correction of inaccurate data.\n\n• Request deletion of your data (available in Profile > Delete Account).\n\n• Withdraw consent for data processing at any time.\n\n• Export your social data in a portable JSON format (Profile > Your data > Export social data).\n\n• Delete your published activity history without deleting your account (Profile > Your data > Delete activity history).\n\n• Block or report accountability partners — blocking removes their read access immediately.\n\n• Object to processing of your personal data.',
  },
  {
    title: 'Data Retention',
    content:
      'We retain your personal data only for as long as necessary to fulfil the purposes outlined in this Privacy Policy. When you delete your account, we will delete or anonymise your personal data within 30 days, unless we are required to retain it for legal obligations.',
  },
  {
    title: "Children's Privacy",
    content:
      `Our app is not intended for children under age ${13}. We do not knowingly collect personal information from children under ${13}. Accountability partners and social features require age ${16}+, or ages ${13}–${15} with verified parental consent configured in Profile. If we learn we collected data from a child under ${13}, we will delete it.`,
  },
  {
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy within the app and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.',
  },
  {
    title: 'Contact Us',
    content:
      'If you have any questions or concerns about this Privacy Policy or our data practices, please contact us through the app or reach out to our support team. We will respond to your inquiry as soon as possible.',
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          testID="privacy-policy-back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.updatedBadge, { backgroundColor: colors.primary + '12' }]}>
          <Text style={[styles.updatedText, { color: colors.primary }]}>
            Last updated: {LAST_UPDATED}
          </Text>
        </View>

        {POLICY_SECTIONS.map((section, index) => (
          <View
            key={index}
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNumber, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.sectionNumberText, { color: colors.primary }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  updatedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  updatedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
});
