import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname === "/";
      const isOnLoginOrSignup = nextUrl.pathname === "/login" || nextUrl.pathname === "/signup";

      if (isOnChat) {
        if (isLoggedIn) return true;
        return false; // 未ログインならログイン画面へ
      } else if (isLoggedIn && isOnLoginOrSignup) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
  providers: [], // 認証プロバイダーは auth.ts で設定
} satisfies NextAuthConfig;
