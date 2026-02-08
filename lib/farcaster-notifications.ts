import { getFarcasterUserByFid, getNotificationEnabledUsers } from './farcaster';

interface NotificationPayload {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
}

/**
 * Send a push notification to a single Farcaster user.
 * Returns true if sent successfully.
 */
export async function sendNotification(
  fid: number,
  payload: NotificationPayload
): Promise<boolean> {
  const user = await getFarcasterUserByFid(fid);

  if (!user || !user.notifications_enabled || !user.notification_url || !user.notification_token) {
    return false;
  }

  try {
    const response = await fetch(user.notification_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: payload.notificationId,
        title: payload.title,
        body: payload.body,
        targetUrl: payload.targetUrl,
        tokens: [user.notification_token],
      }),
    });

    if (!response.ok) {
      console.error(`[Notification] Failed to send to FID ${fid}: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Notification] Error sending to FID ${fid}:`, error);
    return false;
  }
}

/**
 * Broadcast a notification to all opted-in Farcaster users.
 * Returns the count of successfully sent notifications.
 */
export async function broadcastNotification(
  payload: NotificationPayload
): Promise<number> {
  const users = await getNotificationEnabledUsers();
  let sentCount = 0;

  // Group users by notification URL for batch sending
  const urlGroups = new Map<string, string[]>();

  for (const user of users) {
    if (!user.notification_url || !user.notification_token) continue;
    const tokens = urlGroups.get(user.notification_url) || [];
    tokens.push(user.notification_token);
    urlGroups.set(user.notification_url, tokens);
  }

  for (const [url, tokens] of Array.from(urlGroups.entries())) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: payload.notificationId,
          title: payload.title,
          body: payload.body,
          targetUrl: payload.targetUrl,
          tokens,
        }),
      });

      if (response.ok) {
        sentCount += tokens.length;
      } else {
        console.error(`[Notification] Broadcast failed for URL ${url}: ${response.status}`);
      }
    } catch (error) {
      console.error(`[Notification] Broadcast error for URL ${url}:`, error);
    }
  }

  return sentCount;
}
