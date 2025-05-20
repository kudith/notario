// Script to fix document relations for existing users
// Run this script with: node scripts/fix-user-document-relations.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDocumentRelations() {
  console.log('Starting document relations fix...');
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    console.log(`Found ${users.length} users to process`);
    
    // Process each user
    for (const user of users) {
      console.log(`Processing user: ${user.name} (${user.email})`);
      
      // Find documents belonging to this user
      const documents = await prisma.document.findMany({
        where: {
          userId: user.id
        },
        select: {
          id: true,
          certificateId: true
        }
      });
      
      console.log(`Found ${documents.length} documents for user ${user.id}`);
      
      if (documents.length > 0) {
        // Update the user to connect with these documents
        await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            documents: {
              connect: documents.map(doc => ({ id: doc.id }))
            }
          }
        });
        
        console.log(`Updated document relations for user ${user.id}`);
        console.log(`Document IDs: ${documents.map(d => d.id).join(', ')}`);
      }
    }
    
    console.log('Document relations fix completed successfully!');
  } catch (error) {
    console.error('Error fixing document relations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixDocumentRelations()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error)); 