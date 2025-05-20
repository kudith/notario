import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { getDefaultAvatarUrl } from "@/lib/cloudinary";
import { generateUniqueKeyPair } from "@/utils/crypto-utils";

export function CustomPrismaAdapter() {
  // Start with standard PrismaAdapter
  const standardAdapter = PrismaAdapter(prisma);
  
  // Modify createUser function to include missing required fields
  return {
    ...standardAdapter,
    createUser: async (user) => {
      try {
        // Generate unique keypair for OAuth user
        const { publicKey } = await generateUniqueKeyPair();
        
        // For Google login, use avatar from Google
        // If none, use default avatar
        const avatarUrl = user.image || getDefaultAvatarUrl(user.name);
        
        // Create user with all required fields
        return prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            // Convert emailVerified from OAuth to verified in our model
            verified: user.emailVerified ? true : false,
            publicKey: publicKey,
            algorithm: "RSA",
            avatarUrl: avatarUrl, // Use avatar URL from Google
            cloudinaryId: null,
            role: "user", // Add default role
          },
        });
      } catch (error) {
        console.error("Error creating OAuth user:", error);
        throw error;
      }
    },
    // Override linkAccount to ensure proper user-account linking
    linkAccount: async (account) => {
      try {
        // Create account linked to user
        const createdAccount = await prisma.account.create({
          data: {
            userId: account.userId,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state
          }
        });
        return createdAccount;
      } catch (error) {
        console.error("Error linking account:", error);
        throw error;
      }
    }
  };
}