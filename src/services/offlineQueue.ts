/**
 * Offline Attendance Queue Service
 * Persists queued submissions to AsyncStorage when offline and auto-syncs when online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';

/**
 * Lightweight connectivity check — avoids dependency on @react-native-community/netinfo.
 * Tries a HEAD request against the API base. Returns true if reachable.
 */
const isOnline = async (): Promise<boolean> => {
  try {
    // Use the existing axios base URL via a simple request with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const baseUrl = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
    await fetch(`${baseUrl}/`, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch (_) {
    return false;
  }
};

export type QueueRecordStatus = 'PENDING_SYNC' | 'SYNCED';

export interface QueuedAttendanceRecord {
  id: string;
  sessionId: string;
  qrToken: string;
  bleRSSI: number;
  scannedBLEUUID: string;
  deviceId?: string;
  timestamp: number;
  retryCount: number;
  status: QueueRecordStatus;
}

const QUEUE_KEY = '@beaconattend_offline_queue';

export const offlineQueue = {
  /**
   * Save an attendance submission to local offline queue
   */
  enqueue: async (record: Omit<QueuedAttendanceRecord, 'id' | 'retryCount' | 'status'>): Promise<QueuedAttendanceRecord> => {
    const queue = await offlineQueue.getQueue();
    const newRecord: QueuedAttendanceRecord = {
      ...record,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      retryCount: 0,
      status: 'PENDING_SYNC',
    };

    queue.push(newRecord);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`📥 Queued offline attendance record: ${newRecord.id}`);
    return newRecord;
  },

  /**
   * Get all queued offline records
   */
  getQueue: async (): Promise<QueuedAttendanceRecord[]> => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Get only PENDING_SYNC records
   */
  getPendingQueue: async (): Promise<QueuedAttendanceRecord[]> => {
    const queue = await offlineQueue.getQueue();
    return queue.filter((r) => r.status === 'PENDING_SYNC');
  },

  /**
   * Remove a successfully synced record from queue
   */
  dequeue: async (recordId: string): Promise<void> => {
    const queue = await offlineQueue.getQueue();
    const updated = queue.filter((item) => item.id !== recordId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  /**
   * Mark a record as SYNCED (soft-remove: keeps it for audit trail, cleared on next clean)
   */
  markSynced: async (recordId: string): Promise<void> => {
    const queue = await offlineQueue.getQueue();
    const updated = queue.map((item) =>
      item.id === recordId ? { ...item, status: 'SYNCED' as QueueRecordStatus } : item
    );
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  },

  /**
   * Sync queued offline attendance records with backend server.
   * Idempotent: if server returns alreadyMarked:true, considers it a success.
   */
  syncPendingRecords: async (): Promise<{ synced: number; failed: number }> => {
    const queue = await offlineQueue.getPendingQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const record of queue) {
      try {
        const response = await api.post('/attendance/mark', {
          sessionId: record.sessionId,
          qrToken: record.qrToken,
          bleRSSI: record.bleRSSI,
          scannedBLEUUID: record.scannedBLEUUID,
          deviceId: record.deviceId,
        });

        // Treat alreadyMarked as a success (idempotency)
        if (response.data.success || response.data.alreadyMarked) {
          await offlineQueue.dequeue(record.id);
          synced++;
          console.log(`✅ Synced offline record: ${record.id}`);
        } else {
          failed++;
        }
      } catch (err: any) {
        // If 409 Conflict or duplicate key — treat as already synced, remove from queue
        const status = err?.response?.status;
        if (status === 409 || status === 422) {
          await offlineQueue.dequeue(record.id);
          synced++;
          console.log(`✅ Deduplicated offline record: ${record.id} (status ${status})`);
        } else {
          failed++;
          console.warn(`Failed to sync offline record ${record.id}:`, err);
        }
      }
    }

    return { synced, failed };
  },

  /**
   * Auto-sync pending records if network is currently available.
   * Safe to call on app foreground, network reconnect, etc.
   */
  autoSyncIfOnline: async (): Promise<void> => {
    try {
      const online = await isOnline();
      if (online) {
        const pending = await offlineQueue.getPendingQueue();
        if (pending.length > 0) {
          console.log(`🔄 Auto-syncing ${pending.length} offline attendance records...`);
          const result = await offlineQueue.syncPendingRecords();
          console.log(`✅ Auto-sync complete: ${result.synced} synced, ${result.failed} failed`);
        }
      }
    } catch (e) {
      console.warn('autoSyncIfOnline error:', e);
    }
  },
};
