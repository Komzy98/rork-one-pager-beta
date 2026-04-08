import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Upload, Link, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useCalendar } from '@/hooks/useCalendar';

interface CalendarImporterProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalendarImporter({ visible, onClose }: CalendarImporterProps) {
  const [importMethod, setImportMethod] = useState<'file' | 'url' | null>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  
  const { importCalendarFromFile, importCalendarFromURL, error, clearError } = useCalendar();

  const handleFileImport = async () => {
    if (isImporting) {
      console.log('Import already in progress, ignoring click');
      return;
    }
    
    setIsImporting(true);
    clearError(); // Clear any previous errors
    
    try {
      console.log('Starting file import from CalendarImporter...');
      const success = await importCalendarFromFile();
      console.log('Import result:', success);
      
      if (success) {
        Alert.alert('Success', 'Calendar imported successfully!', [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
            }
          }
        ]);
      } else {
        const errorMessage = error || 'Failed to import calendar file. Please make sure you selected a valid .ics file.';
        Alert.alert('Import Failed', errorMessage);
      }
    } catch (err) {
      console.error('Error in handleFileImport:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import calendar file';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim() || !nameInput.trim()) {
      Alert.alert('Error', 'Please enter both URL and calendar name');
      return;
    }

    if (isImporting) {
      console.log('Import already in progress, ignoring click');
      return;
    }

    setIsImporting(true);
    clearError(); // Clear any previous errors
    
    try {
      const success = await importCalendarFromURL(urlInput.trim(), nameInput.trim());
      if (success) {
        Alert.alert('Success', 'Calendar imported successfully!', [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
            }
          }
        ]);
      } else if (error) {
        Alert.alert('Import Failed', error);
      }
    } catch (err) {
      console.error('Error in handleUrlImport:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import calendar from URL';
      Alert.alert('Import Failed', errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setImportMethod(null);
    setUrlInput('');
    setNameInput('');
    setIsImporting(false);
    clearError();
  };

  const handleClose = () => {
    if (isImporting) {
      Alert.alert(
        'Import in Progress',
        'Please wait for the current import to complete before closing.',
        [{ text: 'OK' }]
      );
      return;
    }
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Import Calendar</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {!importMethod ? (
          <View style={styles.methodSelection}>
            <Text style={styles.subtitle}>Choose import method:</Text>
            
            <TouchableOpacity
              style={styles.methodButton}
              onPress={() => setImportMethod('file')}
            >
              <Upload size={24} color={COLORS.primary} />
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Import from File</Text>
                <Text style={styles.methodDescription}>
                  Select an .ics file from your device
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodButton}
              onPress={() => setImportMethod('url')}
            >
              <Link size={24} color={COLORS.primary} />
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Import from URL</Text>
                <Text style={styles.methodDescription}>
                  Enter a calendar URL (Google Calendar, Outlook, etc.)
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : importMethod === 'file' ? (
          <View style={styles.importSection}>
            <Text style={styles.subtitle}>Import from File</Text>
            <Text style={styles.description}>
              Select an .ics calendar file from your device. This will import all events from the calendar.
            </Text>
            
            <TouchableOpacity
              style={[styles.importButton, isImporting && styles.importButtonDisabled]}
              onPress={handleFileImport}
              disabled={isImporting}
            >
              <Upload size={20} color="white" />
              <Text style={styles.importButtonText}>
                {isImporting ? 'Importing...' : 'Select .ics File'}
              </Text>
            </TouchableOpacity>
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setImportMethod(null)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.importSection}>
            <Text style={styles.subtitle}>Import from URL</Text>
            <Text style={styles.description}>
              Enter the URL of your calendar (e.g., Google Calendar public URL, Outlook calendar URL).
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Calendar Name</Text>
              <TextInput
                style={styles.textInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="My Calendar"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Calendar URL</Text>
              <TextInput
                style={styles.textInput}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://calendar.google.com/calendar/ical/..."
                placeholderTextColor={COLORS.textLight}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helpText}>
                Supported URLs:
                {"\n"}• Google Calendar: Public calendar .ics links
                {"\n"}• Outlook/Office 365: Shared calendar URLs
                {"\n"}• Apple iCloud: Public calendar links
                {"\n"}• Any direct .ics file URL
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.importButton, isImporting && styles.importButtonDisabled]}
              onPress={handleUrlImport}
              disabled={isImporting || !urlInput.trim() || !nameInput.trim()}
            >
              <Link size={20} color="white" />
              <Text style={styles.importButtonText}>
                {isImporting ? 'Importing...' : 'Import Calendar'}
              </Text>
            </TouchableOpacity>
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setImportMethod(null)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  methodSelection: {
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  methodContent: {
    marginLeft: 12,
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  importSection: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
    marginTop: 6,
    fontStyle: 'italic',
  },
});