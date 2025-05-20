import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { CustomPrismaAdapter } from "@/lib/auth-adapter";

export const authOptions = {
  adapter: CustomPrismaAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Set Google users to verified automatically
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          verified: true,
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }
        
        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        
        if (!passwordMatch) {
          throw new Error("Invalid email or password");
        }

        // Check if user is verified
        if (!user.verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          verified: user.verified,
        }
      }
    })
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session?.user) {
        if (token?.sub) {
          session.user.id = token.sub;
        }
        
        // Include verification status in the session
        session.user.verified = token.verified || false;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        
        // Add verified status to the token
        if (account?.provider === "google") {
          // Google users are automatically verified
          token.verified = true;
          
          // Update user in database to be verified
          await prisma.user.update({
            where: { email: user.email },
            data: { verified: true }
          }).catch(error => {
            console.log("Error updating Google user verification status:", error);
          });
        } else {
          // For credentials, get verified status from the user object
          token.verified = user.verified || false;
        }
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };