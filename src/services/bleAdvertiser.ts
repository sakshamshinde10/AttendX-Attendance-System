/**
 * BLE Advertiser Service — Teacher Device Peripheral Broadcasting
 *
 * Uses `react-native-ble-advertise` to broadcast a temporary, session-specific
 * 128-bit BLE UUID over Bluetooth Low Energy.
 *
 * Note: Real BLE advertising requires an Expo Development Build (EAS / npx expo run:android).
 * In standard Expo Go, native BLE hardware modules are not bundled.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

class BLEAdvertiserService {
  private isAdvertising: boolean = false;
  private activeUUID: string | null = null;
  private bleAdvertiserModule: any = null;

  constructor() {
    this.initModule();
  }

  private initModule() {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (!isExpoGo && Platform.OS !== 'web') {
      try {
        const mod = require('react-native-ble-advertise');
        this.bleAdvertiserModule = mod.default || mod;
        if (this.bleAdvertiserModule && typeof this.bleAdvertiserModule.setCompanyId === 'function') {
          // 0x00E0 is Google / registered Bluetooth SIG company ID, suitable for custom advertising
          this.bleAdvertiserModule.setCompanyId(0x00e0);
        }
      } catch (err) {
        console.warn('[BLE Advertiser] Native module not loaded:', err);
      }
    }
  }

  /**
   * Request Android 12+ (API 31+) and legacy Bluetooth permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('[BLE Advertiser] Permission request error:', err);
      return false;
    }
  }

  /**
   * Start advertising the temporary lecture session BLE UUID
   */
  async startAdvertising(sessionUUID: string): Promise<{ success: boolean; message: string }> {
    if (!sessionUUID) {
      return { success: false, message: 'Session UUID is required to start BLE advertising.' };
    }

    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      const msg = 'Real BLE advertising requires a Development Build. Expo Go does not support native BLE advertising.';
      console.log(`[BLE Advertiser] ${msg}`);
      this.activeUUID = sessionUUID;
      this.isAdvertising = true;
      return { success: false, message: msg };
    }

    if (!this.bleAdvertiserModule) {
      this.initModule();
    }

    if (!this.bleAdvertiserModule) {
      return {
        success: false,
        message: 'Bluetooth advertiser module unavailable. Please build with a development client (EAS Build).',
      };
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Bluetooth advertise permissions were denied by the device.',
        };
      }

      // Auto-enable Bluetooth on Android if turned off
      if (Platform.OS === 'android') {
        try {
          const { BleManager } = require('react-native-ble-plx');
          const bleMgr = new BleManager();
          const state = await bleMgr.state();
          if (state !== 'PoweredOn') {
            console.log('[BLE Advertiser] Auto-enabling Bluetooth on Android...');
            await bleMgr.enable();
            await new Promise((r) => setTimeout(r, 600));
          }
        } catch (autoEnableErr) {
          console.warn('[BLE Advertiser] Auto-enable error (ignored):', autoEnableErr);
        }
      }

      console.log(`[BLE Advertiser] Broadcasting temporary lecture UUID: ${sessionUUID}`);
      await this.bleAdvertiserModule.broadcast(sessionUUID, 0, 0);

      this.isAdvertising = true;
      this.activeUUID = sessionUUID;
      return { success: true, message: 'BLE advertising active.' };
    } catch (error: any) {
      console.error('[BLE Advertiser] Failed to start advertising:', error);
      this.isAdvertising = false;
      return {
        success: false,
        message: `Failed to broadcast BLE: ${error?.message || error}`,
      };
    }
  }

  /**
   * Stop BLE advertising and release radio resources
   */
  async stopAdvertising(): Promise<void> {
    if (!this.isAdvertising && !this.activeUUID) return;

    console.log('[BLE Advertiser] Stopping BLE broadcast...');
    if (this.bleAdvertiserModule && typeof this.bleAdvertiserModule.stopBroadcast === 'function') {
      try {
        await this.bleAdvertiserModule.stopBroadcast();
      } catch (err) {
        console.warn('[BLE Advertiser] Error stopping broadcast:', err);
      }
    }

    this.isAdvertising = false;
    this.activeUUID = null;
  }

  getIsAdvertising(): boolean {
    return this.isAdvertising;
  }

  getActiveUUID(): string | null {
    return this.activeUUID;
  }
}

export const bleAdvertiser = new BLEAdvertiserService();
