import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const authRouter = router({
  // Get nonce for signing
  getNonce: publicProcedure
    .input(z.object({
      address: z.string(),
    }))
    .query(({ input }) => {
      // Generate a random nonce for the user to sign
      const nonce = Math.floor(Math.random() * 1000000).toString();

      // In production, you'd store this nonce in the database
      // associated with the address and expire it after 5 minutes

      return {
        nonce,
        message: `Sign this message to authenticate with Live Game Predictions.\n\nNonce: ${nonce}`,
      };
    }),

  // Verify signature
  verify: publicProcedure
    .input(z.object({
      address: z.string(),
      signature: z.string(),
      nonce: z.string(),
    }))
    .mutation(async ({ input }) => {
      // In production, you would:
      // 1. Verify the signature using ethers
      // 2. Check that the nonce matches what's in the database
      // 3. Check that the nonce hasn't expired
      // 4. Mark the nonce as used
      // 5. Generate a JWT token

      // For now, just return a mock token
      const token = `mock_token_${input.address}`;

      return {
        token,
        address: input.address,
      };
    }),

  // Get current user info
  me: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(({ input }) => {
      // In production, verify the JWT token and return user info
      // For now, just parse the mock token
      const address = input.token.replace('mock_token_', '');

      return {
        address,
        isConnected: true,
      };
    }),
});
