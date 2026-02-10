export interface SessionData {
  address?: string;
  chainId?: number;
  isLoggedIn: boolean;
  nonce?: string;
  tosAcceptedVersion?: string;
  tosAcceptedAt?: string;
  fid?: number;
  authMethod?: 'wallet' | 'farcaster';
}

export interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  address?: string;
  user?: UserInfo;
}

export interface UserInfo {
  address: string;
  username?: string;
  avatarUrl?: string;
  createdAt: string;
  fid?: number;
  farcasterUsername?: string;
}

export interface SiweMessageResponse {
  message: string;
  nonce: string;
}

export interface SiweVerifyRequest {
  message: string;
  signature: string;
}

export interface SiweVerifyResponse {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

export interface SessionResponse {
  isLoggedIn: boolean;
  address?: string;
  chainId?: number;
  tosAcceptedVersion?: string;
  user?: UserInfo;
}

export interface FarcasterNonceResponse {
  nonce: string;
}

export interface FarcasterVerifyRequest {
  message: string;
  signature: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface FarcasterVerifyResponse {
  success: boolean;
  user?: UserInfo;
  error?: string;
}
