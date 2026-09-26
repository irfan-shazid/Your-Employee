import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { corsOrigins, env, isProd } from "../config/env.js";
import { prisma } from "../db/prisma.js";

const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "Your Employee",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    // No verification code / email step for now (as requested).
    requireEmailVerification: false,
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          prompt: "select_account",
        },
      }
    : undefined,

  account: {
    accountLinking: {
      enabled: true,
      // A Google account with the same (Google-verified) email links to an existing email/password user.
      trustedProviders: ["google", "email-password"],
    },
  },

  user: {
    additionalFields: {
      // Role is assigned by the onboarding endpoints, never from sign-up input.
      role: { type: "string", required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh expiry at most once per day
  },

  trustedOrigins: [
    `${env.APP_SCHEME}://`,
    ...corsOrigins,
    ...(isProd ? [] : ["exp://", "exp://**", "exp://192.168.*.*:*/**", "exp://10.*.*.*:*/**"]),
  ],

  // Built-in auth rate limiting (in addition to the global API limiter).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
    },
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: env.TRUST_PROXY ? ["x-forwarded-for", "cf-connecting-ip", "x-real-ip"] : ["x-yem-client-ip"],
    },
  },

  logger: { disabled: env.NODE_ENV === "test" },

  plugins: [expo()],
});

export type AuthSession = typeof auth.$Infer.Session;
export const isGoogleEnabled = googleEnabled;
