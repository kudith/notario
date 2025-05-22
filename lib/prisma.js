import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Add proper typing for the global object
const globalForPrisma = global;

// Create Prisma instance
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Add middleware to preserve algorithm during updates
prisma.$use(async (params, next) => {
  // Only intercept User model operations
  if (params.model === 'User') {
    // For update operations that don't explicitly set algorithm
    if ((params.action === 'update' || params.action === 'updateMany') && 
        params.args.data && 
        typeof params.args.data.algorithm === 'undefined') {
      
      console.log(`[Prisma Middleware] Detected User update without algorithm field`);
      
      try {
        // For single user updates with ID
        if (params.action === 'update' && params.args.where?.id) {
          const userId = params.args.where.id;
          const existingUser = await prisma.user.findUnique({ 
            where: { id: userId },
            select: { algorithm: true } 
          });
          
          if (existingUser?.algorithm) {
            console.log(`[Prisma Middleware] Preserving algorithm "${existingUser.algorithm}" for user ${userId}`);
            params.args.data.algorithm = existingUser.algorithm;
          }
        }
        // For updateMany operations, we can't easily preserve algorithms for multiple users,
        // but we can log this potential issue
        else if (params.action === 'updateMany') {
          console.warn(`[Prisma Middleware] Warning: updateMany on User model without algorithm field`);
        }
      } catch (error) {
        console.error(`[Prisma Middleware] Error preserving algorithm:`, error);
      }
    }
  }
  
  // Continue with the operation
  return next(params);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;