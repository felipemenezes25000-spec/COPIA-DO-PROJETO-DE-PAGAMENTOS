/**
 * lib/permissions — wrapper unificado iOS/Android para as permissões obrigatórias
 * do app: câmera, microfone e notificações.
 *
 * As três são bloqueantes — o app não libera navegação até serem concedidas
 * (ver app/permissions.tsx e hooks/useRequirePermissions.ts).
 *
 * Bluetooth e galeria seguem opcionais e são pedidos sob demanda nas features.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

export type RequiredPermission = 'camera' | 'microphone' | 'notifications';

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

export const REQUIRED_PERMISSIONS: RequiredPermission[] = [
  'camera',
  'microphone',
  'notifications',
];

export type PermissionStatusMap = Record<RequiredPermission, PermissionStatus>;

function getAndroidApiLevel(): number {
  if (Platform.OS !== 'android') return 0;
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10);
}

// ─── Mapeadores ────────────────────────────────────────────────

/** Mapeia retorno do PermissionsAndroid.request → PermissionStatus */
function mapAndroidRequestResult(
  result: 'granted' | 'denied' | 'never_ask_again' | string,
): PermissionStatus {
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
  return 'denied';
}

/** Mapeia retorno do expo (status + canAskAgain) → PermissionStatus */
function mapExpoStatus(
  status: 'granted' | 'denied' | 'undetermined',
  canAskAgain: boolean | undefined,
): PermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'undetermined') return 'undetermined';
  // status === 'denied'
  return canAskAgain === false ? 'blocked' : 'denied';
}

// ─── Câmera ────────────────────────────────────────────────────

async function getCameraStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return granted ? 'granted' : 'undetermined';
  }
  const res = await ImagePicker.getCameraPermissionsAsync();
  return mapExpoStatus(res.status, res.canAskAgain);
}

async function requestCamera(): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return mapAndroidRequestResult(result);
  }
  const res = await ImagePicker.requestCameraPermissionsAsync();
  return mapExpoStatus(res.status, res.canAskAgain);
}

// ─── Microfone ─────────────────────────────────────────────────

async function getMicrophoneStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return granted ? 'granted' : 'undetermined';
  }
  const res = await Audio.getPermissionsAsync();
  return mapExpoStatus(res.status, res.canAskAgain);
}

async function requestMicrophone(): Promise<PermissionStatus> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return mapAndroidRequestResult(result);
  }
  const res = await Audio.requestPermissionsAsync();
  return mapExpoStatus(res.status, res.canAskAgain);
}

// ─── Notificações ──────────────────────────────────────────────

async function getNotificationsStatus(): Promise<PermissionStatus> {
  // Android < 33 não tem POST_NOTIFICATIONS — sempre granted por padrão.
  if (Platform.OS === 'android' && getAndroidApiLevel() < 33) {
    return 'granted';
  }
  const res = await Notifications.getPermissionsAsync();
  return mapExpoStatus(res.status, res.canAskAgain);
}

async function requestNotifications(): Promise<PermissionStatus> {
  if (Platform.OS === 'android' && getAndroidApiLevel() < 33) {
    return 'granted';
  }
  const res = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return mapExpoStatus(res.status, res.canAskAgain);
}

// ─── API pública ───────────────────────────────────────────────

export async function getPermissionStatus(
  p: RequiredPermission,
): Promise<PermissionStatus> {
  switch (p) {
    case 'camera':
      return getCameraStatus();
    case 'microphone':
      return getMicrophoneStatus();
    case 'notifications':
      return getNotificationsStatus();
  }
}

export async function requestPermission(
  p: RequiredPermission,
): Promise<PermissionStatus> {
  switch (p) {
    case 'camera':
      return requestCamera();
    case 'microphone':
      return requestMicrophone();
    case 'notifications':
      return requestNotifications();
  }
}

export async function checkAllRequired(): Promise<PermissionStatusMap> {
  const [camera, microphone, notifications] = await Promise.all([
    getCameraStatus(),
    getMicrophoneStatus(),
    getNotificationsStatus(),
  ]);
  return { camera, microphone, notifications };
}

export async function allRequiredGranted(): Promise<boolean> {
  try {
    const map = await checkAllRequired();
    return REQUIRED_PERMISSIONS.every((p) => map[p] === 'granted');
  } catch {
    // Em caso de erro inesperado, assume que falta — força o gate a aparecer.
    return false;
  }
}
