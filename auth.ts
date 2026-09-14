import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertGoogleUser } from "./lib/accounts-db";

/** CR-5.1: accounts switch on only when every secret and the accounts database are configured
 *  (Coolify env). Without them the site behaves exactly as before: presets stay in the browser. */
export function authConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.ACCOUNTS_DATABASE_URL);
}

// Sessions are an encrypted, httpOnly JWT cookie (Auth.js); state-changing Auth.js routes carry its
// double-submit CSRF token. The app's own /api/account writes check the Origin (lib/account-sync.mjs).
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({ authorization: { params: { prompt: "select_account" } } })],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  // Both hosts (benchmarkheaven.com and the legacy mintapis host) sit behind the Coolify proxy, which
  // routes only the configured domains; the callback URL follows the host the visitor used.
  trustHost: true,
  pages: { signIn: "/account", error: "/account" },
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === "google" && !!profile?.sub && !!profile.email && profile.email_verified === true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub && profile.email) {
        token.uid = await upsertGoogleUser({
          sub: profile.sub,
          email: profile.email,
          name: typeof profile.name === "string" ? profile.name : null,
          image: typeof profile.picture === "string" ? profile.picture : null,
        });
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") (session.user as { id?: string }).id = token.uid;
      return session;
    },
  },
  logger: { error(error) { console.error("[auth] request failed:", error.name); } },
});
