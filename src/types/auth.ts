export enum Role {
  ADMIN = "ADMIN",
  OFFICE = "OFFICE",
  READONLY = "READONLY"
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: Role;
}
