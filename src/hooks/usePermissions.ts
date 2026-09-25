import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

export const usePermissions = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState<boolean | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ...(Platform.Version >= 31
            ? [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
              ]
            : []),
        ]);

        const cameraOk = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        setHasCameraPermission(cameraOk);

        const locationOk = grants[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        setHasBluetoothPermission(locationOk);

        return cameraOk && locationOk;
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    setHasCameraPermission(true);
    setHasBluetoothPermission(true);
    return true;
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  return {
    hasCameraPermission,
    hasBluetoothPermission,
    requestPermissions,
  };
};
