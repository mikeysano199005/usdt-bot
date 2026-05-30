export interface User {
  id: number;
  discord_id: string;
  username: string | null;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}
