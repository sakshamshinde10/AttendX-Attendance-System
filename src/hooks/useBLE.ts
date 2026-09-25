/**
 * useBLE — Bluetooth Low Energy hook for student attendance scanning
 *
 * Uses react-native-ble-plx for real BLE scanning.
 * Requires a Development Build (EAS / expo run:android) — does NOT work in Expo Go.
 *
 * Provides:
 * - BLE state machine enum
 * - Permission handling (Android BLUETOOTH_SCAN + BLUETOOTH_CONNECT + location)
 * - Scan for teacher's session-specific BLE UUID
 * - RSSI proximity check
 */

import { useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { BLE_RSSI_THRESHOLD } from '../constants/config';

// ─── BLE State Machine ────────────────────────────────────────────────────────

export enum BLEState {
  IDLE = 'IDLE',
  REQUESTING_PERMISSION = 'REQUESTING_PERMISSION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  BLUETOOTH_DISABLED = 'BLUETOOTH_DISABLED',
  SCANNING = 'SCANNING',
  BLE_NOT_FOUND = 'BLE_NOT_FOUND',
  BLE_FOUND = 'BLE_FOUND',
  BLE_VERIFIED = 'BLE_VERIFIED',
  BLE_CONNECTION_FAILED = 'BLE_CONNECTION_FAILED',
}

export interface BLEScanResult {
  rssi: number | null;
  uuid: string;
  verified: boolean;  // true only on real hardware with matching UUID + RSSI
}

export interface UseBLEReturn {
  bleState: BLEState;
  rssi: number | null;
  isNearby: boolean;
  isExpoGo: boolean;
  error: string | null;
  requestPermissionsAndScan: (targetUUID: string) => Promise<BLEScanResult>;
  resetBLEState: () => void;
}

// ─── Singleton BLE Manager (react-native-ble-plx) ────────────────────────────

let bleManagerInstance: any = null;

const getBleManager = () => {
  if (bleManagerInstance) return bleManagerInstance;
  try {
    const { BleManager } = require('react-native-ble-plx');
    bleManagerInstance = new BleManager();
  } catch (e) {
    // Not available in Expo Go — expected
    console.log('[BLE] react-native-ble-plx not available (Expo Go or build issue)');
  }
  return bleManagerInstance;
};

// ─── Fast Base64 to Hex Decoder (No external dependencies) ───────────────────
const base64ToHex = (base64: string): string => {
  if (!base64) return '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let hex = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < base64.length; i++) {
    const char = base64[i];
    if (char === '=') break;
    const index = chars.indexOf(char);
    if (index === -1) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    while (bits >= 8) {
      bits -= 8;
      const byte = (buffer >> bits) & 0xff;
      hex += byte.toString(16).padStart(2, '0');
    }
  }
  return hex;
};

// ─── Android BLE Permissions ─────────────────────────────────────────────────

const requestAndroidBLEPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = parseInt(String(Platform.Version), 10);

    if (apiLevel >= 31) {
      // Android 12+ requires BLUETOOTH_SCAN + BLUETOOTH_CONNECT
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      const allGranted =
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      console.log(`[BLE] Android 12+ permissions result: ${JSON.stringify(results)}`);
      return allGranted;
    } else {
      // Android < 12 requires ACCESS_FINE_LOCATION for BLE scanning
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth Proximity Permission',
          message:
            'AttendX needs location permission to detect the teacher\'s Bluetooth device and verify your physical presence in class.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      console.log(`[BLE] Android <12 permission result: ${result}`);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (e) {
    console.warn('[BLE] Permission request error:', e);
    return false;
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useBLE = (): UseBLEReturn => {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  const [bleState, setBLEState] = useState<BLEState>(BLEState.IDLE);
  const [rssi, setRssi] = useState<number | null>(null);
  const [isNearby, setIsNearby] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      // Stop any active scan on unmount
      const manager = getBleManager();
      if (manager && typeof manager.stopDeviceScan === 'function') {
        try { manager.stopDeviceScan(); } catch (_) {}
      }
    };
  }, []);

  const resetBLEState = () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    setBLEState(BLEState.IDLE);
    setRssi(null);
    setIsNearby(false);
    setError(null);
  };

  /**
   * Full BLE flow: request permissions → auto-enable Bluetooth → scan at low-latency → return result in seconds
   */
  const requestPermissionsAndScan = async (
    targetUUID: string
  ): Promise<BLEScanResult> => {
    setError(null);
    setRssi(null);
    setIsNearby(false);

    // ── Expo Go guard ──────────────────────────────────────────────────────
    if (isExpoGo) {
      const msg =
        'Real Bluetooth scanning requires a Development Build. ' +
        'BLE hardware verification is not available in Expo Go.';
      console.log(`[BLE] ${msg}`);
      setBLEState(BLEState.BLUETOOTH_DISABLED);
      setError(msg);
      return { rssi: null, uuid: targetUUID, verified: false };
    }

    const manager = getBleManager();
    if (!manager) {
      const msg = 'Bluetooth module unavailable. Please use a Development Build.';
      setBLEState(BLEState.BLUETOOTH_DISABLED);
      setError(msg);
      return { rssi: null, uuid: targetUUID, verified: false };
    }

    // ── 1. Request Permissions ─────────────────────────────────────────────
    setBLEState(BLEState.REQUESTING_PERMISSION);
    console.log('[BLE] Requesting Android BLE permissions...');
    const granted = await requestAndroidBLEPermissions();

    if (!granted) {
      console.log('[BLE] Permissions denied by user.');
      setBLEState(BLEState.PERMISSION_DENIED);
      setError('Bluetooth permissions are required to verify your presence in class.\n\nPlease grant permissions in Settings and try again.');
      return { rssi: null, uuid: targetUUID, verified: false };
    }

    // ── 2. Check & Auto-Enable Bluetooth ───────────────────────────────────
    try {
      let btState = await manager.state();
      console.log(`[BLE] Bluetooth adapter state: ${btState}`);

      if (btState !== 'PoweredOn' && Platform.OS === 'android') {
        try {
          console.log('[BLE] Attempting to automatically turn on Bluetooth...');
          await manager.enable();
          // Give Android a moment to initialize the adapter
          for (let i = 0; i < 8; i++) {
            await new Promise((r) => setTimeout(r, 200));
            btState = await manager.state();
            if (btState === 'PoweredOn') {
              console.log('[BLE] Bluetooth is now PoweredOn!');
              break;
            }
          }
        } catch (enableErr) {
          console.warn('[BLE] Auto-enable prompt dismissed or failed:', enableErr);
        }
      }

      if (btState !== 'PoweredOn') {
        setBLEState(BLEState.BLUETOOTH_DISABLED);
        setError('Please turn on Bluetooth on your device to verify classroom proximity.');
        return { rssi: null, uuid: targetUUID, verified: false };
      }
    } catch (stateErr) {
      console.warn('[BLE] Could not check Bluetooth state:', stateErr);
    }

    // ── 3. High-Speed Low-Latency Scan ─────────────────────────────────────
    setBLEState(BLEState.SCANNING);
    console.log(`[BLE] Fast scan started for target: ${targetUUID}`);

    return new Promise<BLEScanResult>((resolve) => {
      let found = false;

      // 5-second scan timeout (plenty of time for low-latency BLE scan)
      scanTimeoutRef.current = setTimeout(() => {
        if (!found) {
          try { manager.stopDeviceScan(); } catch (_) {}
          console.log('[BLE] Scan timeout — teacher device not found.');
          if (isMountedRef.current) {
            setBLEState(BLEState.BLE_NOT_FOUND);
            setError(
              'Teacher attendance device not detected nearby.\n\n' +
              '• Make sure Bluetooth is enabled\n' +
              '• Move closer to the teacher\n' +
              '• Make sure the teacher has started attendance'
            );
          }
          resolve({ rssi: null, uuid: targetUUID, verified: false });
        }
      }, 5000);

      try {
        // scanMode: 2 is ScanSettings.SCAN_MODE_LOW_LATENCY (scans continuously, delivers within milliseconds)
        manager.startDeviceScan(
          null,
          { allowDuplicates: true, scanMode: 2 } as any,
          (err: any, device: any) => {
            if (err) {
              clearTimeout(scanTimeoutRef.current);
              try { manager.stopDeviceScan(); } catch (_) {}
              console.error('[BLE] Scan error:', err.message);
              if (isMountedRef.current) {
                setBLEState(BLEState.BLE_CONNECTION_FAILED);
                setError(`Bluetooth scan failed: ${err.message}`);
              }
              resolve({ rssi: null, uuid: targetUUID, verified: false });
              return;
            }

            if (device && !found) {
              const measuredRSSI: number | null = device.rssi ?? null;
              const deviceUUIDs: string[] = (device.serviceUUIDs || []).map((u: string) => u.toLowerCase());
              const localName: string = (device.localName || device.name || '').toLowerCase();
              const mfgData: string = device.manufacturerData || '';
              const hex = base64ToHex(mfgData).toLowerCase();
              const cleanTargetHex = targetUUID && targetUUID !== 'ANY' ? targetUUID.replace(/-/g, '').toLowerCase() : '';

              // Check for iBeacon payload (starts with 0215)
              let extractedBeaconUUID = '';
              if (hex.length >= 36 && hex.includes('0215')) {
                const idx = hex.indexOf('0215');
                const uuidHex = hex.slice(idx + 4, idx + 36);
                if (uuidHex.length === 32) {
                  extractedBeaconUUID = `${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-${uuidHex.slice(12, 16)}-${uuidHex.slice(16, 20)}-${uuidHex.slice(20, 32)}`;
                }
              }

              let matches = false;
              let detectedUUID = targetUUID;

              const isSpecificTarget = Boolean(cleanTargetHex);

              if (isSpecificTarget) {
                if (
                  (cleanTargetHex && hex.includes(cleanTargetHex)) ||
                  deviceUUIDs.includes(targetUUID.toLowerCase()) ||
                  (extractedBeaconUUID && extractedBeaconUUID.toLowerCase() === targetUUID.toLowerCase()) ||
                  device.id?.toLowerCase() === targetUUID.toLowerCase()
                ) {
                  matches = true;
                  detectedUUID = targetUUID;
                }
              } else {
                // Looking for ANY BeaconAttend teacher device in classroom
                if (extractedBeaconUUID) {
                  matches = true;
                  detectedUUID = extractedBeaconUUID;
                } else if (
                  hex.includes('00e0') ||
                  hex.includes('e000') ||
                  localName.includes('beacon') ||
                  localName.includes('attend')
                ) {
                  matches = true;
                  detectedUUID = targetUUID || 'BLE_BEACON_DETECTED';
                }
              }

              if (matches) {
                const nearby = measuredRSSI !== null && measuredRSSI >= BLE_RSSI_THRESHOLD;
                console.log(`[BLE] Beacon matched! RSSI=${measuredRSSI} dBm, nearby=${nearby}, UUID=${detectedUUID}`);

                if (nearby) {
                  found = true;
                  clearTimeout(scanTimeoutRef.current);
                  try { manager.stopDeviceScan(); } catch (_) {}

                  if (isMountedRef.current) {
                    setRssi(measuredRSSI);
                    setIsNearby(true);
                    setBLEState(BLEState.BLE_VERIFIED);
                  }

                  resolve({ rssi: measuredRSSI, uuid: detectedUUID, verified: true });
                  return;
                } else if (measuredRSSI !== null) {
                  // Device seen, but too far
                  if (isMountedRef.current) {
                    setRssi(measuredRSSI);
                    setIsNearby(false);
                    setBLEState(BLEState.BLE_FOUND);
                    setError(`Teacher device detected, but signal is weak (${measuredRSSI} dBm). Please move closer.`);
                  }
                }
              }
            }
          }
        );
      } catch (scanErr: any) {
        clearTimeout(scanTimeoutRef.current);
        console.error('[BLE] startDeviceScan threw:', scanErr.message);
        if (isMountedRef.current) {
          setBLEState(BLEState.BLE_CONNECTION_FAILED);
          setError(`Unable to start Bluetooth scan: ${scanErr.message}`);
        }
        resolve({ rssi: null, uuid: targetUUID, verified: false });
      }
    });
  };

  return {
    bleState,
    rssi,
    isNearby,
    isExpoGo,
    error,
    requestPermissionsAndScan,
    resetBLEState,
  };
};
