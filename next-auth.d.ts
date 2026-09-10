import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    organizationId: string | null;
  }

  interface Session {
    user: {
      id: string;
      organizationId: string | null;
    } & Session['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    organizationId?: string | null;
  }
}
