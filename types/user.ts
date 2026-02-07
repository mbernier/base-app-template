export interface User {
  id: string;
  address: string;
  chainId: number;
  username?: string;
  avatarUrl?: string;
  tosAcceptedVersion?: string;
  tosAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface UserProfile {
  address: string;
  username?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UpdateUserRequest {
  username?: string;
  avatarUrl?: string;
}

export interface AcceptTosRequest {
  version: string;
}

export interface AcceptTosResponse {
  success: boolean;
  version: string;
  acceptedAt: string;
}
