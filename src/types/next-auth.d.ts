import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      orgId: string;
      orgSlug: string | null;
      orgName: string | null;
      emailVerified: boolean;
    };
  }

  interface User {
    role: string;
    orgId: string;
    orgSlug: string | null;
    orgName: string | null;
    emailVerified: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    orgId: string;
    orgSlug: string | null;
    orgName: string | null;
    emailVerified: boolean;
  }
}
