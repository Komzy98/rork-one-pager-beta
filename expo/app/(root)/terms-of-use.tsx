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

interface TermsSection {
  title: string;
  content: string;
}

const LAST_UPDATED = 'April 4, 2026';

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: 'Acceptance of Terms',
    content:
      'By downloading, installing, or using this application, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the application. We reserve the right to modify these terms at any time, and your continued use of the app constitutes acceptance of any changes.',
  },
  {
    title: 'Eligibility',
    content:
      'You must be at least 13 years of age to use this application. By using the app, you represent and warrant that you meet this age requirement. If you are under 18, you confirm that you have obtained parental or guardian consent to use this app.',
  },
  {
    title: 'Account Responsibilities',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:\n\n• Provide accurate and complete information during registration.\n\n• Keep your login credentials secure and not share them with others.\n\n• Notify us immediately of any unauthorised use of your account.\n\n• Accept responsibility for all actions taken through your account.',
  },
  {
    title: 'Permitted Use',
    content:
      'You are granted a limited, non-exclusive, non-transferable, revocable licence to use the app for personal, non-commercial purposes. You agree not to:\n\n• Copy, modify, or distribute the app or its content.\n\n• Reverse engineer, decompile, or disassemble the app.\n\n• Use the app for any unlawful or prohibited purpose.\n\n• Attempt to gain unauthorised access to any part of the app or its systems.\n\n• Use automated scripts or bots to interact with the app.',
  },
  {
    title: 'User Content',
    content:
      'You retain ownership of any content you create within the app, including habits, tasks, and preferences. By submitting content, you grant us a non-exclusive, worldwide, royalty-free licence to use, store, and process your content solely for the purpose of providing and improving the app services.',
  },
  {
    title: 'Intellectual Property',
    content:
      'All intellectual property rights in the app, including but not limited to the design, graphics, text, software, and underlying code, are owned by us or our licensors. Nothing in these terms grants you any right to use our trademarks, logos, or branding without prior written consent.',
  },
  {
    title: 'Third-Party Services',
    content:
      'The app integrates with third-party services including weather data providers, sports data APIs, and entertainment databases. We are not responsible for the accuracy, availability, or reliability of third-party content. Your use of third-party services is subject to their respective terms and conditions.',
  },
  {
    title: 'Disclaimers',
    content:
      'The app is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not guarantee that:\n\n• The app will be uninterrupted, error-free, or secure.\n\n• The information provided (including weather, sports, or entertainment data) will be accurate or up-to-date.\n\n• The app will meet your specific requirements or expectations.\n\n• Any defects in the app will be corrected.',
  },
  {
    title: 'Limitation of Liability',
    content:
      'To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app. Our total liability for any claim related to the app shall not exceed the amount you paid for the app in the 12 months preceding the claim.',
  },
  {
    title: 'Termination',
    content:
      'We may suspend or terminate your access to the app at any time, with or without cause, and with or without notice. Upon termination, your right to use the app ceases immediately. You may also delete your account at any time through the app settings. Provisions that by their nature should survive termination will remain in effect.',
  },
  {
    title: 'Governing Law',
    content:
      'These Terms of Use shall be governed by and construed in accordance with the laws of the United Kingdom, without regard to conflict of law principles. Any disputes arising from these terms shall be resolved through the courts of England and Wales.',
  },
  {
    title: 'Contact Us',
    content:
      'If you have any questions about these Terms of Use, please contact us through the app or reach out to our support team. We will do our best to respond to your inquiry promptly.',
  },
];

export default function TermsOfUseScreen() {
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
          testID="terms-of-use-back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Use</Text>
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

        {TERMS_SECTIONS.map((section, index) => (
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
