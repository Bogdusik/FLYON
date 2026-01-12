/**
 * Notification system for FLYON
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show browser notification
 */
export function showNotification(options: NotificationOptions): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/favicon.ico',
    tag: options.tag,
    requireInteraction: options.requireInteraction || false,
  });

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);
}

/**
 * Show danger zone warning notification
 */
export function showDangerZoneWarning(message: string): void {
  showNotification({
    title: '⚠️ Danger Zone Warning',
    body: message,
    tag: 'danger-zone',
    requireInteraction: true,
  });
}

/**
 * Show flight update notification
 */
export function showFlightUpdate(message: string): void {
  showNotification({
    title: 'Flight Update',
    body: message,
    tag: 'flight-update',
  });
}
