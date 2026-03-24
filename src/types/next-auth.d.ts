import { UserRole } from "./index";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      trainerName?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: UserRole;
    trainerName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    trainerName?: string | null;
  }
}
