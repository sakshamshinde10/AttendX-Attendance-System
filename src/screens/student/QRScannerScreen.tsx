import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, Shadows } from '../../constants/colors';
import { useBLE, BLEState } from '../../hooks/useBLE';
import { attendanceApi } from '../../api/attendance.api';
import { AppButton } from '../../components/ui/AppButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { offlineQueue } from '../../services/offlineQueue';
import { BLE_SERVICE_UUID } from '../../constants/config';

// ─── Attendance Flow Steps ─────────────────────────────────────────────────────

type AttendanceStep = 'BLE_VERIFY' | 'QR_SCAN' | 'SUBMITTING' | 'DONE';

// ─── Step Indicator ────────────────────────────────────────────────────────────

const StepIndicator = ({
  step,
  bleVerified,
  qrVerified,
}: {
  step: AttendanceStep;
  bleVerified: boolean;
  qrVerified: boolean;
}) => {
  const steps = [
    { id: 1, label: 'Bluetooth\nVerification', done: bleVerified },
    { id: 2, label: 'QR\nVerification', done: qrVerified },
    { id: 3, label: 'Attendance\nMarked', done: step === 'DONE' },
  ];

  return (
    <View style={stepStyles.container}>
      {steps.map((s, i) => (
        <View key={s.id} style={stepStyles.stepWrapper}>
          <View
            style={[
              stepStyles.circle,
              s.done && stepStyles.circleDone,
              !s.done &&
                ((s.id === 1 && step === 'BLE_VERIFY') ||
                  (s.id === 2 && step === 'QR_SCAN') ||
                  (s.id === 3 && step === 'SUBMITTING')) &&
                stepStyles.circleActive,
            ]}
          >
            <Text
              style={[
                stepStyles.circleText,
                s.done && stepStyles.circleTextDone,
                !s.done &&
                  ((s.id === 1 && step === 'BLE_VERIFY') ||
                    (s.id === 2 && step === 'QR_SCAN')) &&
                  stepStyles.circleTextActive,
              ]}
            >
              {s.done ? '✓' : s.id}
            </Text>
          </View>
          <Text
            style={[
              stepStyles.label,
              s.done && stepStyles.labelDone,
            ]}
            numberOfLines={2}
          >
            {s.label}
          </Text>
          {i < steps.length - 1 && (
            <View style={[stepStyles.connector, s.done && stepStyles.connectorDone]} />
          )}
        </View>
      ))}
    </View>
  );
};

// ─── Main QR Scanner Screen ────────────────────────────────────────────────────

export const QRScannerScreen = ({ navigation }: any) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [attendanceStep, setAttendanceStep] = useState<AttendanceStep>('BLE_VERIFY');
  const [bleVerified, setBleVerified] = useState(false);
  const [bleRSSI, setBleRSSI] = useState<number | null>(null);
  const [bleUUIDFound, setBleUUIDFound] = useState<string | null>(null);
  const [qrScanned, setQrScanned] = useState(false);
  const [webQRInput, setWebQRInput] = useState('');

  const {
    bleState,
    error: bleError,
    isExpoGo,
    requestPermissionsAndScan,
    resetBLEState,
  } = useBLE();

  // ── Auto-Connect Bluetooth & Camera on Mount ───────────────────────────────
  useEffect(() => {
    // Request camera permission proactively
    if (cameraPermission && !cameraPermission.granted) {
      requestCameraPermission();
    }
    // Auto-connect to teacher Bluetooth in seconds without waiting for user click
    handleStartBLEScan();
  }, []);

  // ── Step 1: BLE Verification ────────────────────────────────────────────────

  const handleStartBLEScan = async (targetSessionUUID?: string) => {
    if (isExpoGo) {
      setBleVerified(false);
      setAttendanceStep('QR_SCAN');
      return;
    }

    const uuidToScan = targetSessionUUID || BLE_SERVICE_UUID;
    const result = await requestPermissionsAndScan(uuidToScan);

    if (result.verified) {
      setBleVerified(true);
      setBleRSSI(result.rssi);
      setBleUUIDFound(result.uuid);
      // Auto-advance straight to QR camera scanner without requiring user clicks
      setAttendanceStep('QR_SCAN');
    }
  };

  // ── Step 2: QR Scan ─────────────────────────────────────────────────────────

  const processScannedData = async (rawData: string) => {
    if (qrScanned) return;

    setQrScanned(true);
    setAttendanceStep('SUBMITTING');

    // Hoist variables so catch block can access them for offline enqueue
    let sessionId = '';
    let token = rawData;
    let subjectName = 'Classroom Lecture';
    let bleSessionUUID = bleUUIDFound || BLE_SERVICE_UUID;
    let currentRSSI: number | null = bleRSSI;
    let currentScannedUUID: string | null = bleSessionUUID;

    try {
      try {
        const parsed = JSON.parse(rawData);
        sessionId = parsed.sessionId || '';
        token = parsed.token || rawData;
        if (parsed.subject) subjectName = parsed.subject;
        if (parsed.bleUUID) bleSessionUUID = parsed.bleUUID;
      } catch (_) {
        token = rawData;
      }

      if (!sessionId) {
        Alert.alert('Invalid QR', 'This QR code is not a valid attendance session.');
        resetScan();
        return;
      }

      // If Bluetooth was not verified before scanning, verify now with the exact session UUID from QR
      let currentBleVerified = bleVerified;
      currentRSSI = bleRSSI;
      currentScannedUUID = bleSessionUUID;

      if (!currentBleVerified && !isExpoGo && bleSessionUUID) {
        console.log(`[QRScanner] Quick-verifying Bluetooth for session: ${bleSessionUUID}`);
        const quickResult = await requestPermissionsAndScan(bleSessionUUID);
        if (quickResult.verified) {
          currentBleVerified = true;
          currentRSSI = quickResult.rssi;
          currentScannedUUID = quickResult.uuid;
          setBleVerified(true);
          setBleRSSI(quickResult.rssi);
          setBleUUIDFound(quickResult.uuid);
        }
      }

      if (!currentBleVerified && !isExpoGo) {
        Alert.alert(
          'Bluetooth Verification Failed',
          'Could not detect the teacher\'s Bluetooth device nearby. Make sure Bluetooth is enabled and you are inside the classroom.'
        );
        resetScan();
        return;
      }

      const res = await attendanceApi.markAttendance({
        sessionId,
        qrToken: token,
        bleRSSI: currentRSSI,
        scannedBLEUUID: currentScannedUUID,
        deviceInfo: {
          isExpoGo,
          hasNativeBLE: currentBleVerified,
        },
      });

      if (res.success) {
        navigation.replace('AttendanceSuccess', {
          record: {
            ...res.record,
            subject: res.record?.subject || subjectName,
            lectureNumber: res.record?.lectureNumber || '01',
          },
        });
      } else {
        Alert.alert(
          'Verification Issue',
          res.message || 'Could not verify attendance. Please try again.'
        );
        resetScan();
      }
    } catch (err: any) {
      console.error('[QR] Mark attendance error:', err?.response?.data || err.message);

      // Check if error is a network/offline error
      const isNetworkError =
        err?.code === 'ECONNABORTED' ||
        err?.message === 'Network Error' ||
        err?.message?.includes('network') ||
        !err?.response; // No response = offline or unreachable server

      if (isNetworkError) {
        // Enqueue for offline sync
        try {
          await offlineQueue.enqueue({
            sessionId,
            qrToken: token,
            bleRSSI: currentRSSI ?? 0,
            scannedBLEUUID: currentScannedUUID ?? bleSessionUUID,
            deviceId: undefined,
            timestamp: Date.now(),
          });
          // Navigate to success screen with offline flag
          navigation.replace('AttendanceSuccess', {
            record: {
              subject: subjectName,
              lectureNumber: '01',
            },
            isOfflineQueued: true,
          });
        } catch (queueErr) {
          Alert.alert(
            'Offline — Could Not Save',
            'You appear to be offline and attendance could not be saved locally. Please try again when connected.'
          );
          resetScan();
        }
        return;
      }

      const errorMsg =
        err?.response?.data?.message || 'Attendance verification failed. Please try again.';
      Alert.alert('Attendance Error', errorMsg);
      resetScan();
    }
  };

  const resetScan = () => {
    setQrScanned(false);
    setAttendanceStep(bleVerified ? 'QR_SCAN' : 'BLE_VERIFY');
  };

  // ── Camera Permission Gate ──────────────────────────────────────────────────

  if (!cameraPermission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Web Fallback ────────────────────────────────────────────────────────────

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.webContent}>
        <ScreenHeader title="Scan Attendance" showBack onBack={() => navigation.goBack()} />
        <View style={styles.webCard}>
          <Text style={styles.webTitle}>Enter Attendance Token</Text>
          <Text style={styles.webSub}>
            Camera scanning runs on mobile via a Development Build. On web, paste the attendance QR token below.
          </Text>
          <TextInput
            style={styles.webInput}
            value={webQRInput}
            onChangeText={setWebQRInput}
            placeholder='Paste token JSON e.g. {"sessionId":"...","token":"..."}'
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
          />
          <AppButton
            title="Submit Attendance"
            onPress={() => processScannedData(webQRInput.trim())}
            loading={attendanceStep === 'SUBMITTING'}
            disabled={!webQRInput.trim() || attendanceStep === 'SUBMITTING'}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </ScrollView>
    );
  }

  // ── Step 1: BLE Verification UI ─────────────────────────────────────────────

  if (attendanceStep === 'BLE_VERIFY') {
    const isScanning = bleState === BLEState.SCANNING || bleState === BLEState.REQUESTING_PERMISSION;

    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Scan Attendance"
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.stepContent}>
          <StepIndicator step="BLE_VERIFY" bleVerified={false} qrVerified={false} />

          <View style={styles.bleCard}>
            <Text style={styles.bleIcon}>📡</Text>
            <Text style={styles.bleTitle}>Connecting Bluetooth</Text>
            <Text style={styles.bleSubtitle}>
              Automatically verifying your proximity to the teacher's classroom device...
            </Text>

            {bleError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{bleError}</Text>
              </View>
            ) : null}

            {/* Bluetooth Disabled / Required Banner */}
            {(bleState as string) === 'DISABLED' && !isExpoGo && (
              <View style={styles.bleRequiredBanner}>
                <Text style={styles.bleRequiredIcon}>📵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bleRequiredTitle}>Bluetooth Required</Text>
                  <Text style={styles.bleRequiredDesc}>
                    Please enable Bluetooth on your device to verify your classroom proximity. Scanning will resume automatically.
                  </Text>
                </View>
              </View>
            )}

            {bleState === BLEState.SCANNING && (
              <View style={styles.scanningBox}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.scanningText}>Connecting to teacher device in seconds...</Text>
              </View>
            )}

            {bleState === BLEState.REQUESTING_PERMISSION && (
              <View style={styles.scanningBox}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.scanningText}>Granting Bluetooth permissions & turning on adapter...</Text>
              </View>
            )}

            {isExpoGo && (
              <View style={styles.expoGoBanner}>
                <Text style={styles.expoGoText}>
                  ℹ️ Running in Expo Go — Bluetooth hardware unavailable.{'\n'}
                  A Development Build is required for real BLE verification.{'\n'}
                  BLE step is bypassed for Expo Go testing.
                </Text>
                <AppButton
                  title="Continue to QR Scan →"
                  onPress={() => {
                    setBleVerified(false);
                    setAttendanceStep('QR_SCAN');
                  }}
                  style={{ marginTop: Spacing.md }}
                />
              </View>
            )}

            {!isExpoGo && (
              <View style={{ width: '100%', gap: Spacing.sm }}>
                {bleError ? (
                  <AppButton
                    title="Retry Bluetooth Connection"
                    onPress={() => handleStartBLEScan()}
                    loading={isScanning}
                    size="lg"
                    style={styles.bleScanBtn}
                    icon={<Text style={styles.btnIcon}>🔄</Text>}
                  />
                ) : (
                  <AppButton
                    title={isScanning ? 'Connecting Automatically...' : 'Connect to Teacher Device'}
                    onPress={() => handleStartBLEScan()}
                    loading={isScanning}
                    size="lg"
                    style={styles.bleScanBtn}
                    icon={<Text style={styles.btnIcon}>📶</Text>}
                  />
                )}

                <AppButton
                  title="📷 Open Camera Scanner Now →"
                  variant="outline"
                  onPress={() => setAttendanceStep('QR_SCAN')}
                  style={{ width: '100%' }}
                />
              </View>
            )}
          </View>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Before scanning:</Text>
            <Text style={styles.instructionItem}>✓ Enable Bluetooth on your phone</Text>
            <Text style={styles.instructionItem}>✓ Be physically present in the classroom</Text>
            <Text style={styles.instructionItem}>✓ Confirm your teacher has started attendance</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 2: QR Scanner ───────────────────────────────────────────────────────

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Scan Attendance" showBack onBack={() => navigation.goBack()} />
        <View style={styles.permissionCard}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permDesc}>
            Camera permission is required to scan the QR code displayed by your teacher.
          </Text>
          <AppButton
            title="Grant Camera Access"
            onPress={requestCameraPermission}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Scan Attendance"
        showBack
        onBack={() => navigation.goBack()}
        style={{ zIndex: 10 }}
      />

      {/* Step indicator bar */}
      <View style={styles.stepBarContainer}>
        <StepIndicator
          step={attendanceStep}
          bleVerified={bleVerified}
          qrVerified={false}
        />
        {bleVerified && (
          <View style={styles.bleSuccessTag}>
            <Text style={styles.bleSuccessTagText}>
              ✓ Teacher device detected {bleRSSI !== null ? `(${bleRSSI} dBm)` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.scannerWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={qrScanned ? undefined : ({ data }) => processScannedData(data)}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Viewfinder Overlay */}
        <View style={styles.overlay}>
          <View style={styles.viewfinderFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {attendanceStep === 'SUBMITTING' ? (
              <View style={styles.verifyingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.verifyingText}>Verifying Attendance...</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.instructionBanner}>
            <Text style={styles.instructionText}>
              {attendanceStep === 'QR_SCAN'
                ? 'Step 2: Scan the QR displayed by your teacher.'
                : 'Processing...'}
            </Text>
          </View>

          {isExpoGo && (
            <View style={styles.expoGoOverlay}>
              <Text style={styles.expoGoOverlayText}>
                ℹ️ Expo Go • QR attestation only (BLE bypassed)
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Step Indicator Styles ─────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  circleActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  circleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  circleTextDone: {
    color: '#FFFFFF',
  },
  circleTextActive: {
    color: Colors.primary,
  },
  label: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
  },
  labelDone: {
    color: Colors.success,
    fontWeight: '600',
  },
  connector: {
    position: 'absolute',
    top: 15,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
});

// ─── Screen Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  stepBarContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  bleSuccessTag: {
    alignSelf: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: Spacing.xs,
  },
  bleSuccessTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  bleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  bleIcon: {
    fontSize: 44,
    marginBottom: Spacing.sm,
  },
  bleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  bleSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  bleScanBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  btnIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    lineHeight: 19,
    textAlign: 'center',
  },
  scanningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scanningText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  expoGoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
  },
  expoGoText: {
    fontSize: 12,
    color: '#1D4ED8',
    lineHeight: 18,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  instructionItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 19,
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  viewfinderFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  verifyingOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  verifyingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  instructionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: Spacing.xxl,
    ...Shadows.card,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  expoGoOverlay: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  expoGoOverlayText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
  },
  permissionCard: {
    margin: Spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.card,
  },
  permIcon: { fontSize: 40, marginBottom: Spacing.md },
  permTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  permDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  webContent: { padding: Spacing.lg },
  webCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  webSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  webInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bleRequiredBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    width: '100%',
  },
  bleRequiredIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  bleRequiredTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 3,
  },
  bleRequiredDesc: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
  },
});
