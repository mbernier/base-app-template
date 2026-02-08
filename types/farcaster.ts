export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface FarcasterNotificationDetails {
  url: string;
  token: string;
}

export type FarcasterWebhookEventType =
  | 'miniapp_added'
  | 'miniapp_removed'
  | 'notifications_enabled'
  | 'notifications_disabled';

export interface FarcasterWebhookEvent {
  event: FarcasterWebhookEventType;
  fid: number;
  notificationDetails?: FarcasterNotificationDetails;
}
