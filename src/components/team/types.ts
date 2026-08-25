export interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  createdAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}
