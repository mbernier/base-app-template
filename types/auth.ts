export interface SessionData {
  address?: string;
  chainId?: number;
  isLoggedIn: boolean;
  nonce?: string;
  tosAcceptedVersion?: string;
  tosAcceptedAt?: string;
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
