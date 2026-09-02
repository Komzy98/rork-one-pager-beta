import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, Trash2, X } from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { OP_DOMAIN, OP_RADIUS, OP_SPACING, OP_TYPE } from '@/constants/onePagerDesign';
import { ActionButton, StatusPill } from '@/components/ui/OnePagerUI';
import type { Book } from '@/types/habit';

type DraftStatus = Book['status'];

export type LearningBookDraft = {
  title: string;
  author: string;
  totalPages?: number;
  currentPage: number;
  status: DraftStatus;
};

export default function LearningBookModal({
  visible,
  book,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
  onSave: (draft: LearningBookDraft) => void;
  onDelete?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('0');
  const [status, setStatus] = useState<DraftStatus>('Want to Read');

  useEffect(() => {
    if (!visible) return;
    setTitle(book?.title ?? '');
    setAuthor(book?.author ?? '');
    setTotalPages(book?.totalPages ? String(book.totalPages) : '');
    setCurrentPage(String(book?.currentPage ?? 0));
    setStatus(book?.status ?? 'Want to Read');
  }, [visible, book]);

  const canSave = title.trim().length > 0 && author.trim().length > 0;
  const soft = isDark ? colors.surfaceSecondary : '#F3F5F8';

  const save = () => {
    if (!canSave) return;
    const total = Number.parseInt(totalPages, 10);
    const current = Math.max(0, Number.parseInt(currentPage, 10) || 0);
    onSave({
      title: title.trim(),
      author: author.trim(),
      totalPages: Number.isFinite(total) && total > 0 ? total : undefined,
      currentPage: Number.isFinite(total) && total > 0 ? Math.min(current, total) : current,
      status,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCopy}>
            <Text style={[OP_TYPE.eyebrow, { color: OP_DOMAIN.learning }]}>{book ? 'EDIT BOOK' : 'ADD BOOK'}</Text>
            <Text style={[OP_TYPE.heroTitle, styles.title, { color: colors.text }]}>{book ? book.title : 'Add something real to read.'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: soft }]} accessibilityLabel="Close book editor">
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.icon, { backgroundColor: isDark ? `${OP_DOMAIN.learning}24` : `${OP_DOMAIN.learning}11` }]}>
            <BookOpen size={23} color={OP_DOMAIN.learning} />
          </View>

          <View style={styles.field}>
            <Text style={[OP_TYPE.meta, styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Book title"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[OP_TYPE.meta, styles.label, { color: colors.textSecondary }]}>Author</Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="Author"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[OP_TYPE.meta, styles.label, { color: colors.textSecondary }]}>Status</Text>
            <View style={styles.statuses}>
              {(['Reading', 'Want to Read', 'Paused', 'Completed'] as DraftStatus[]).map((option) => {
                const selected = status === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setStatus(option)}
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor: selected ? (isDark ? `${OP_DOMAIN.learning}28` : `${OP_DOMAIN.learning}12`) : colors.card,
                        borderColor: selected ? OP_DOMAIN.learning : colors.border,
                      },
                    ]}
                  >
                    <Text style={[OP_TYPE.meta, styles.statusButtonText, { color: selected ? OP_DOMAIN.learning : colors.textSecondary }]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.pageRow}>
            <View style={[styles.field, styles.pageField]}>
              <Text style={[OP_TYPE.meta, styles.label, { color: colors.textSecondary }]}>Current page</Text>
              <TextInput
                value={currentPage}
                onChangeText={setCurrentPage}
                keyboardType="number-pad"
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </View>
            <View style={[styles.field, styles.pageField]}>
              <Text style={[OP_TYPE.meta, styles.label, { color: colors.textSecondary }]}>Total pages</Text>
              <TextInput
                value={totalPages}
                onChangeText={setTotalPages}
                keyboardType="number-pad"
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </View>
          </View>

          {book ? (
            <View style={styles.preview}>
              <StatusPill label={status} tone={status === 'Completed' ? 'positive' : status === 'Paused' ? 'warning' : 'info'} accent={OP_DOMAIN.learning} />
              <Text style={[OP_TYPE.meta, { color: colors.textSecondary }]}>Progress and status are part of your real Learning state in My Life.</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {book && onDelete ? (
            <TouchableOpacity onPress={onDelete} style={[styles.deleteButton, { backgroundColor: isDark ? `${colors.error}20` : `${colors.error}10` }]}>
              <Trash2 size={16} color={colors.error} />
              <Text style={[OP_TYPE.meta, styles.deleteText, { color: colors.error }]}>Remove</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.saveButton}>
            <ActionButton label={book ? 'Save changes' : 'Add book'} onPress={save} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'flex-start', gap: OP_SPACING.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { marginTop: 4 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: OP_SPACING.md },
  icon: { width: 48, height: 48, borderRadius: OP_RADIUS.card, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6 },
  label: { fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: OP_RADIUS.medium, paddingHorizontal: 14, fontSize: 15 },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: OP_RADIUS.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusButtonText: { fontWeight: '700' },
  pageRow: { flexDirection: 'row', gap: OP_SPACING.sm },
  pageField: { flex: 1 },
  preview: { gap: 8, paddingTop: OP_SPACING.xs },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: OP_SPACING.xs },
  deleteButton: { minHeight: 46, paddingHorizontal: 14, borderRadius: OP_RADIUS.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteText: { fontWeight: '700' },
  saveButton: { flex: 1 },
});
