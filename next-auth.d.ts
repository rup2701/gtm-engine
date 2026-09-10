import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
  }

  interface Session {
    user: {
      id: string;
    } & Session['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
