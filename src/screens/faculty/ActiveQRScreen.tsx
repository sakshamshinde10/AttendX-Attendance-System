import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { attendanceApi } from '../../api/attendance.api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AppButton } from '../../components/ui/AppButton';
import { bleAdvertiser } from '../../services/bleAdvertiser';

// 45 minute default session countdown
const DEFAULT_SESSION_DURATION_SECONDS = 45 * 60;
const QR_ROTATION_INTERVAL_SECONDS = 25;

export const ActiveQRScreen = ({ route, navigation }: any) => {
  const initialSession = route.params?.session || {};

  const [session, setSession] = useState<any>(initialSession);
  const [qrToken, setQrToken] = useState(initialSession.qrToken || 'active_token');
  const [presentCount, setPresentCount] = useState(initialSession.presentCount || 0);
  const [totalStudents, setTotalStudents] = useState(initialSession.totalStudents || 42);

  // Session duration timer (counts down from 45:00)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(DEFAULT_SESSION_DURATION_SECONDS);

  // QR token rotation timer (counts down from 25s)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(QR_ROTATION_INTERVAL_SECONDS);
  const [isEnding, setIsEnding] = useState(false);

  // BLE Broadcast state
  const [bleStatus, setBleStatus] = useState<string>('Initializing BLE...');
  const [isBleActive, setIsBleActive] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);

  // BLE Advertising lifecycle effect
  useEffect(() => {
    const bleUUID = session.bleUUID || session.ble_uuid;
    if (bleUUID) {
      bleAdvertiser.startAdvertising(bleUUID).then((res) => {
        setBleStatus(res.message);
        setIsBleActive(res.success);
      });
    }

    return () => {
      bleAdvertiser.stopAdvertising();
    };
  }, [session.id, session.bleUUID, session.ble_uuid]);

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      handleLeaveScreen();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [session.id]);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionExpired();
          return 0;
        }
        return prev - 1;
      });

      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshQRCode();
          return QR_ROTATION_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.id]);

  // Periodic polling for active attendance count and live updates
  useEffect(() => {
    const pollActiveStatus = async () => {
      try {
        const res = await attendanceApi.getActiveSession();
        if (res.session) {
          setSession((prev: any) => ({ ...prev, ...res.session }));
          setPresentCount(res.session.presentCount ?? 0);
          if (res.session.totalStudents) {
            setTotalStudents(res.session.totalStudents);
          }
        }
      } catch (e) {
        // Silently handle background polling error
      }
    };

    // Poll immediately on mount and then every 5 seconds
    pollActiveStatus();
    pollIntervalRef.current = setInterval(pollActiveStatus, 5000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const refreshQRCode = async () => {
    try {
      const sessId = session.id || session._id;
      if (sessId) {
        const res = await attendanceApi.refreshQR(sessId);
        if (res.qrToken) {
          setQrToken(res.qrToken);
        }
      }
    } catch (e) {
      console.warn('QR Refresh failed:', e);
    }
  };

  const navigateBackToDashboard = () => {
    bleAdvertiser.stopAdvertising().catch(() => {});
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'FacultyTabs' }],
      });
    }
  };

  const handleLeaveScreen = () => {
    Alert.alert(
      'Leave Attendance Screen?',
      'Attendance is still ACTIVE. Students can continue scanning and your Bluetooth beacon remains broadcasting in the background.\n\nYou can return to this screen anytime from the Home tab.',
      [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'Go to Dashboard',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'FacultyTabs' }],
              });
            }
          },
        },
        {
          text: 'End Session Now',
          style: 'destructive',
          onPress: handleEndSession,
        },
      ]
    );
  };

  const handleSessionExpired = async () => {
    try {
      await bleAdvertiser.stopAdvertising();
      const sessId = session.id || session._id || 'active';
      await attendanceApi.endSession(sessId);
    } catch (e) {
      console.warn('End session on expiry failed (may already be ended):', e);
    }
    Alert.alert(
      'Session Ended',
      'The attendance session timer has expired and the session has been closed.',
      [{ text: 'Back to Dashboard', onPress: navigateBackToDashboard }]
    );
  };

  const handleEndSession = () => {
    Alert.alert('End Attendance Session', 'Are you sure you want to end this attendance session? Students will no longer be able to mark attendance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsEnding(true);
            await bleAdvertiser.stopAdvertising();
            const sessId = session.id || session._id || 'active';
            await attendanceApi.endSession(sessId);
          } catch (e) {
            console.warn('End session API error (continuing navigation):', e);
          } finally {
            setIsEnding(false);
            navigateBackToDashboard();
          }
        },
      },
    ]);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const subjectName = session.subject?.name || session.subject || 'Subject';
  const yearText = session.yearLabel || (session.year ? `${session.year} Year` : '');
  const divisionText = session.division ? `Division ${session.division}` : '';
  const lectureNum = session.lectureNumber || '01';
  const topicText = session.topic || '';

  // Payload encoded into QR — includes session BLE UUID so student scans for teacher's unique signal
  const qrPayload = JSON.stringify({
    sessionId: session.id || session._id || 'session_id',
    token: qrToken,
    subject: subjectName,
    bleUUID: session.bleUUID || session.ble_uuid || null,
    exp: Date.now() + qrSecondsLeft * 1000,
  });


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Navigation Header: Allows Teacher to Return to Dashboard or End Session */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleLeaveScreen}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerEndButton}
          onPress={handleEndSession}
          activeOpacity={0.7}
        >
          <Text style={styles.headerEndButtonText}>End Session ✕</Text>
        </TouchableOpacity>
      </View>

      {/* Top Status Header */}
      <View style={styles.topStatusRow}>
        <View style={styles.badgeGroup}>
          <StatusBadge status="active" />
          <Text style={styles.sessionStatusText}>Attendance Active</Text>
        </View>
        <Text style={styles.sessionTimerText}>
          Session ends in <Text style={styles.timerBold}>{formatTime(sessionSecondsLeft)}</Text>
        </Text>
      </View>

      {/* Class & Subject Details Card */}
      <View style={styles.infoCard}>
        <Text style={styles.subjectTitle}>{subjectName}</Text>
        <Text style={styles.classMeta}>
          {yearText} • {divisionText}
        </Text>

        <View style={styles.lectureMetaRow}>
          <View style={styles.lecturePill}>
            <Text style={styles.lecturePillText}>Lecture {lectureNum}</Text>
          </View>
          {topicText ? <Text style={styles.topicText}>• {topicText}</Text> : null}
        </View>
      </View>

      {/* Bluetooth BLE Broadcast Status Banner */}
      <View style={[styles.bleCard, isBleActive ? styles.bleCardActive : styles.bleCardInactive]}>
        <Text style={styles.bleIcon}>📡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bleTitle}>
            {isBleActive ? 'BLE Proximity Beacon: Broadcasting' : 'BLE Beacon Initializing'}
          </Text>
          <Text style={styles.bleSubtitle} numberOfLines={1}>
            {bleStatus}
          </Text>
        </View>
        <View style={[styles.bleIndicatorDot, { backgroundColor: isBleActive ? '#10B981' : '#F59E0B' }]} />
      </View>

      {/* QR Code Presentation Box */}
      <View style={styles.qrContainer}>
        <View style={styles.qrFrame}>
          <QRCode
            value={qrPayload}
            size={220}
            color="#0F172A"
            backgroundColor="#FFFFFF"
          />
        </View>

        <View style={styles.refreshIndicator}>
          <View style={styles.refreshDot} />
          <Text style={styles.refreshText}>
            QR refreshes automatically in {qrSecondsLeft}s
          </Text>
        </View>
      </View>

      {/* Real-time Students Attendance Count */}
      <TouchableOpacity
        style={styles.attendanceCounterCard}
        onPress={() => navigation.navigate('LiveAttendance', { session })}
        activeOpacity={0.8}
      >
        <Text style={styles.counterLabel}>Students Present</Text>
        <Text style={styles.counterNumbers}>
          <Text style={styles.presentBold}>{presentCount}</Text>
          <Text style={styles.totalMuted}> / {totalStudents}</Text>
        </Text>
        <Text style={styles.tapToView}>Tap to view live student roster →</Text>
      </TouchableOpacity>

      {/* End Session Button */}
      <View style={styles.actionContainer}>
        <AppButton
          title="End Session"
          variant="danger"
          size="lg"
          onPress={handleEndSession}
          loading={isEnding}
          style={styles.endBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  navHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  headerEndButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  headerEndButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  topStatusRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sessionStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  sessionTimerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timerBold: {
    fontWeight: '700',
    color: Colors.text,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  subjectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  classMeta: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  lectureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lecturePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lecturePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  topicText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    width: '100%',
    ...Shadows.card,
  },
  qrFrame: {
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.md,
  },
  refreshDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  refreshText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  attendanceCounterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  counterLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  counterNumbers: {
    fontSize: 32,
    fontWeight: '700',
  },
  presentBold: {
    color: Colors.primary,
    fontWeight: '800',
  },
  totalMuted: {
    color: Colors.textSecondary,
    fontWeight: '500',
    fontSize: 24,
  },
  tapToView: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  actionContainer: {
    width: '100%',
  },
  endBtn: {
    width: '100%',
  },
  bleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bleCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bleCardInactive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bleIcon: {
    fontSize: 20,
  },
  bleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  bleSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bleIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
