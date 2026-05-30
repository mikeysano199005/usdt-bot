export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface AdminAction {
  id: number;
  admin_id: number;
  order_id: number;
  action: string;
  notes: string | null;
  performed_at: Date;
}

export interface JwtPayload {
  adminId: number;
  username: string;
}
