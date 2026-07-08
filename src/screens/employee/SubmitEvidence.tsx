import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import Header from '../../components/Header';
import { PermissionDeniedBanner } from '../../components/PermissionDeniedBanner';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { ToastType, useToast } from '../../context/ToastContext';
import { useImagePicker } from '../../hooks/useImagePicker';
import { supabase } from '../../lib/supabase';
import { Radius, Shadow, Spacing } from '../../theme';
import type { ColorPalette } from '../../theme';
import { Attachment, ScreenProps } from '../../types';
import { CATEGORY_CONFIG, formatDate, PRIORITY_CONFIG } from '../../utils';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/xml', 'text/xml',
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const SIGNED_URL_EXPIRY_SECONDS = 365 * 24 * 60 * 60; // 1 year

async function uploadToStorage(attachment: Attachment, goalId: string): Promise<Attachment> {
  if (attachment.uri.startsWith('http') && attachment.storagePath === undefined) return attachment;
  if (attachment.storagePath) {
    // Already uploaded — just refresh the signed URL from the stored path.
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data) throw new Error(error?.message ?? 'Could not sign URL');
    return { ...attachment, uri: data.signedUrl };
  }
  const response = await fetch(attachment.uri);
  const blob = await response.blob();
  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `evidence/${goalId}/${Date.now()}_${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, blob, { contentType: attachment.mimeType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { data, error: signError } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (signError || !data) throw new Error(signError?.message ?? 'Could not sign URL after upload');
  return { ...attachment, uri: data.signedUrl, storagePath: path };
}

async function pickAttachment(showToast: (msg: string, type?: ToastType, title?: string) => void): Promise<Attachment | null> {
  if (Platform.OS !== 'web') {
    showToast('File attachments are available in the web app.', 'info', 'Web Only');
    return null;
  }
  return new Promise(resolve => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = (document as any).createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.xml,.doc,.docx,.xlsx,.csv,.txt';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input.onchange = (e: any) => {
      const f = e.target?.files?.[0];
      if (!f) { resolve(null); return; }
      const mimeType = f.type || 'application/octet-stream';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        showToast('File type not allowed. Use PDF, image, document, or CSV.', 'error', 'Invalid File Type');
        resolve(null);
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        showToast('File must be under 5 MB.', 'error', 'File Too Large');
        resolve(null);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).FileReader();
      reader.onload = () => {
        resolve({ name: f.name, uri: reader.result as string, mimeType, size: f.size });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    };
    input.click();
  });
}

export default function SubmitEvidence({ navigation, params, currentUserId }: ScreenProps) {
  const { goals, employees, submitEvidence, updateGoal, addNotification } = useApp();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cameraStatus, pickFromCamera, openSettings } = useImagePicker();

  const goal = goals.find(g => g.id === params.goalId);
  const employee = employees.find(e => e.id === currentUserId);
  const managerOfEmployee = employees.find(e => e.id === employee?.managerId);

  const [description, setDescription] = useState(goal?.evidence?.description ?? '');
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState<string[]>(goal?.evidence?.links ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(goal?.evidence?.attachments ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(false);

  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    };
  }, []);

  async function handlePickFile() {
    if (Platform.OS === 'web') {
      const file = await pickAttachment(showToast);
      if (file) setAttachments(prev => [...prev, file]);
      return;
    }
    // Native: use document picker so PDFs and other files are supported
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        showToast('File type not allowed. Use PDF, image, document, or CSV.', 'error', 'Invalid File Type');
        return;
      }
      if (asset.size && asset.size > MAX_FILE_BYTES) {
        showToast('File must be under 5 MB.', 'error', 'File Too Large');
        return;
      }
      setAttachments(prev => [...prev, {
        name: asset.name,
        uri: asset.uri,
        mimeType,
        size: asset.size,
      }]);
    } catch {
      showToast('Could not open file picker. Please try again.', 'error', 'Picker Error');
    }
  }

  async function handleTakePhoto() {
    const image = await pickFromCamera();
    if (image) setAttachments(prev => [...prev, image]);
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  if (!goal) {
    return (
      <View style={styles.root}>
        <Header
          title="Submit Evidence"
          color={colors.bgElevated}
          accentColor={colors.employeePrimary}
          onBack={navigation.goBack}
        />
        <View style={styles.center}>
          <Text style={styles.centerText}>Goal not found.</Text>
        </View>
      </View>
    );
  }

  const cc = CATEGORY_CONFIG[goal.category];
  const pc = PRIORITY_CONFIG[goal.priority];

  function addLink() {
    const l = linkInput.trim();
    if (!l) return;
    setLinks(prev => [...prev, l]);
    setLinkInput('');
  }

  function removeLink(i: number) {
    setLinks(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!goal || submitting) return;
    if (!description.trim()) {
      showToast('Please describe what you did to complete this goal.', 'error', 'Description required');
      return;
    }
    setSubmitting(true);
    try {
      let finalAttachments: Attachment[] | undefined;
      if (attachments.length > 0) {
        setUploadPhase(true);
        finalAttachments = await Promise.all(
          attachments.map(a => uploadToStorage(a, goal.id)),
        );
        setUploadPhase(false);
      }

      await submitEvidence(goal.id, {
        description: description.trim(),
        links,
        submittedAt: new Date().toISOString(),
        attachments: finalAttachments,
      });

      if (managerOfEmployee) {
        addNotification({
          recipientId: managerOfEmployee.id,
          type: 'evidence_submitted',
          title: 'Evidence Awaiting Review',
          message: `${employee?.name ?? 'An employee'} submitted evidence for "${goal.title}". Please review.`,
          read: false,
          createdAt: new Date().toISOString(),
          relatedGoalId: goal.id,
          relatedEmployeeId: currentUserId ?? undefined,
        });
      }

      showToast(`Evidence for "${goal.title}" submitted. Your manager will review it shortly.`, 'success', 'Evidence Submitted');
      if (navTimer.current) clearTimeout(navTimer.current);
      navTimer.current = setTimeout(() => navigation.goBack(), 1400);
    } catch {
      showToast('Failed to submit evidence. Check your connection and try again.', 'error', 'Submission Failed');
    } finally {
      setSubmitting(false);
      setUploadPhase(false);
    }
  }

  function handleMarkInProgress() {
    if (!goal) return;
    updateGoal(goal.id, { status: 'in_progress' });
    showToast('Goal status updated to In Progress.', 'info', 'Status Updated');
    if (navTimer.current) clearTimeout(navTimer.current);
    navTimer.current = setTimeout(() => navigation.goBack(), 1400);
  }

  const isResubmission = goal.status === 'rejected';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
    >
      <Header
        title={isResubmission ? 'Resubmit Evidence' : 'Submit Evidence'}
        color={colors.bgElevated}
        accentColor={colors.employeePrimary}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Goal summary */}
        <View style={styles.goalCard}>
          <View style={styles.goalMeta}>
            <View style={[styles.chip, { backgroundColor: cc.color + '40' }]}>
              <Text style={[styles.chipText, { color: cc.color }]}>{cc.label}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: pc.bg }]}>
              <Text style={[styles.chipText, { color: pc.color }]}>{pc.label}</Text>
            </View>
            <Text style={styles.qBadge}>{goal.quarter}</Text>
          </View>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalDesc}>{goal.description}</Text>
          <Text style={styles.dueText}>Due {formatDate(goal.targetDate)}</Text>

          {isResubmission && goal.evidence?.managerFeedback && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Previous rejection feedback:</Text>
              <Text style={styles.rejectionText}>{goal.evidence.managerFeedback}</Text>
            </View>
          )}

          {isResubmission && goal.evidence?.description && (
            <View style={styles.prevSubmissionBox}>
              <Text style={styles.prevSubmissionLabel}>📋 Your previous submission</Text>
              <Text style={styles.prevSubmissionText}>{goal.evidence.description}</Text>
              {goal.evidence.links && goal.evidence.links.length > 0 && goal.evidence.links.map((l, i) => (
                <Text key={i} style={styles.prevLink}>🔗 {l}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Mark In Progress (if not_started) */}
        {goal.status === 'not_started' && (
          <TouchableOpacity style={styles.inProgressBtn} onPress={handleMarkInProgress}>
            <Text style={styles.inProgressBtnText}>Mark as In Progress</Text>
          </TouchableOpacity>
        )}

        {/* Evidence form */}
        <Text style={styles.sectionTitle}>Your Evidence</Text>

        <Text style={styles.fieldLabel}>What did you accomplish? *</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you did, the outcomes achieved, and how it meets the goal criteria. Be specific — include numbers, metrics, or results where possible."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.fieldLabel}>Supporting Links</Text>
        <Text style={styles.fieldHint}>
          Add links to PRs, design docs, slides, recordings, or any artefacts.
        </Text>
        <View style={styles.linkInputRow}>
          <TextInput
            style={[styles.input, styles.linkInput]}
            value={linkInput}
            onChangeText={setLinkInput}
            placeholder="e.g. github.com/repo/pull/123"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            onSubmitEditing={addLink}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addLinkBtn} onPress={addLink}>
            <Text style={styles.addLinkBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {links.map((l, i) => (
          <View key={i} style={styles.linkItem}>
            <Text style={styles.linkText} numberOfLines={1}>
              🔗 {l}
            </Text>
            <TouchableOpacity onPress={() => removeLink(i)} hitSlop={8}>
              <Text style={styles.removeLink}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* File Attachments */}
        <Text style={styles.fieldLabel}>File Attachments</Text>
        <Text style={styles.fieldHint}>
          Attach supporting files — PDF reports, screenshots, design files, data exports, etc.
        </Text>
        {cameraStatus === 'denied' && (
          <PermissionDeniedBanner
            message="Camera access denied. Enable it in Settings to take photos."
            onOpenSettings={openSettings}
          />
        )}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            testID="take-photo-btn"
            style={styles.attachBtn}
            onPress={handleTakePhoto}
            activeOpacity={0.75}
          >
            <Text style={styles.attachBtnIcon}>📷</Text>
            <Text style={styles.attachBtnText}>Take Photo</Text>
            <Text style={styles.attachBtnSub}>Camera</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="attach-file-btn"
          style={styles.attachBtn}
          onPress={handlePickFile}
          activeOpacity={0.75}
        >
          <Text style={styles.attachBtnIcon}>📎</Text>
          <Text style={styles.attachBtnText}>Attach File</Text>
          <Text style={styles.attachBtnSub}>PDF · Image · Document · CSV</Text>
        </TouchableOpacity>
        {attachments.map((a, i) => (
          <View key={i} style={styles.attachItem}>
            <Text style={styles.attachIcon}>
              {a.mimeType.includes('pdf') ? '📄' : a.mimeType.includes('image') ? '🖼' : a.mimeType.includes('xml') ? '📋' : '📁'}
            </Text>
            <Text style={styles.attachName} numberOfLines={1}>{a.name}</Text>
            {a.size ? <Text style={styles.attachSize}>{(a.size / 1024).toFixed(0)} KB</Text> : null}
            <TouchableOpacity onPress={() => removeAttachment(i)} hitSlop={8}>
              <Text style={styles.attachRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <AnimatedButton style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>
            {submitting
            ? (uploadPhase ? 'Uploading files...' : 'Submitting...')
            : isResubmission ? 'Resubmit Evidence' : 'Submit for Review'}
          </Text>
        </AnimatedButton>

        <Text style={styles.footerNote}>
          Once submitted, your manager will review and provide feedback. You'll receive a
          notification when the review is complete.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(C: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    centerText: { color: C.textMuted },
    content: { padding: Spacing.lg },

    goalCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      ...Shadow.sm,
      borderLeftWidth: 4,
      borderLeftColor: C.employeePrimary,
    },
    goalMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    chip: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: '600' },
    qBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: C.employeePrimary,
      backgroundColor: C.employeeLight,
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    goalTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
    goalDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 6 },
    dueText: { fontSize: 11, color: C.textMuted },
    rejectionBox: {
      backgroundColor: C.rejectedBg,
      borderRadius: Radius.md,
      padding: 10,
      marginTop: 10,
    },
    rejectionLabel: { fontSize: 11, fontWeight: '700', color: C.rejected, marginBottom: 3 },
    rejectionText: { fontSize: 12, color: C.textSecondary },
    prevSubmissionBox: {
      backgroundColor: C.bgElevated,
      borderRadius: Radius.md,
      padding: 10,
      marginTop: 10,
      borderLeftWidth: 3,
      borderLeftColor: C.border,
    },
    prevSubmissionLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 4 },
    prevSubmissionText: { fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 4 },
    prevLink: { fontSize: 11, color: C.inProgress, marginTop: 2 },

    inProgressBtn: {
      borderWidth: 1.5,
      borderColor: C.inProgress,
      borderRadius: Radius.lg,
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    inProgressBtnText: { color: C.inProgress, fontSize: 13, fontWeight: '600' },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: C.textPrimary,
      marginBottom: Spacing.md,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 4,
      marginTop: 12,
    },
    fieldHint: { fontSize: 12, color: C.textMuted, marginBottom: 8, lineHeight: 16 },
    input: {
      backgroundColor: C.bg,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 14,
      color: C.textPrimary,
    },
    inputMulti: { height: 120, textAlignVertical: 'top', marginBottom: 4 },

    linkInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    linkInput: { flex: 1 },
    addLinkBtn: {
      backgroundColor: C.employeePrimary,
      borderRadius: Radius.md,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    addLinkBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: Radius.md,
      padding: 10,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    linkText: { flex: 1, fontSize: 12, color: C.inProgress },
    removeLink: { fontSize: 14, color: C.rejected, marginLeft: 8 },

    submitBtn: {
      backgroundColor: C.employeePrimary,
      borderRadius: Radius.lg,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
      ...Shadow.md,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footerNote: {
      fontSize: 12,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 8,
    },

    attachBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: C.employeePrimary,
      borderStyle: 'dashed',
      borderRadius: Radius.md,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 6,
    },
    attachBtnIcon: { fontSize: 16 },
    attachBtnText: { fontSize: 13, fontWeight: '600', color: C.employeePrimary },
    attachBtnSub: { fontSize: 10, color: C.textMuted, marginLeft: 'auto' },
    attachItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.card,
      borderRadius: Radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    attachIcon: { fontSize: 15 },
    attachName: { flex: 1, fontSize: 12, color: C.textPrimary },
    attachSize: { fontSize: 10, color: C.textMuted, flexShrink: 0 },
    attachRemove: { fontSize: 13, color: C.rejected, marginLeft: 4 },
  });
}
