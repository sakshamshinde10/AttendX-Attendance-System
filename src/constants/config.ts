/**
 * App-wide configuration constants
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Cloud Backend URL ─────────────────────────────────────────────────────────
// Set this to your Railway URL once deployed (e.g. 'https://xyz.up.railway.app')
// Leave empty ('') to fall back to local dev IP below.
const CLOUD_BACKEND_URL = 'https://beaconattend-backend-production.up.railway.app';

// ─── Local Dev Fallback ────────────────────────────────────────────────────────
// Dynamically obtain host machine IP from Expo Metro bundler, fallback to local IP
const getDevMachineIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return '192.168.1.6';
};

const DEV_MACHINE_IP = getDevMachineIp();

const getBaseUrl = () => {
  // Cloud backend takes priority (production / sharing mode)
  if (CLOUD_BACKEND_URL) {
    return `${CLOUD_BACKEND_URL}/api`;
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  return `http://${DEV_MACHINE_IP}:5000/api`;
};

export const API_BASE_URL = getBaseUrl();

// BLE Configuration
export const BLE_SCAN_DURATION_SECONDS = 10; // How long to scan for faculty BLE device
export const BLE_RSSI_THRESHOLD = -70;       // Minimum RSSI (dBm) to accept attendance
export const BLE_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'; // Default fallback

// QR Configuration
export const QR_EXPIRY_SECONDS = 30;

// Attendance thresholds (percentage)
export const ATTENDANCE_LOW_THRESHOLD = 75;    // Below 75% = danger
export const ATTENDANCE_MED_THRESHOLD = 85;    // 75–85% = warning

// App Info
export const APP_NAME = 'AttendX';
export const APP_VERSION = '1.0.0';

// Async Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@beacon_token',
  USER_DATA: '@beacon_user',
  THEME: '@beacon_theme',
};
