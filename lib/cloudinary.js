import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generate default avatar URL based on user's name
export function getDefaultAvatarUrl(name) {
  // Create a URL for a text-based avatar with the initials
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Use UI Avatars service to generate a default avatar with initials
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=256`;
}

// Upload image to Cloudinary
export async function uploadAvatar(file, existingCloudinaryId = null) {
  try {
    // If there's an existing image, delete it first
    if (existingCloudinaryId) {
      await cloudinary.uploader.destroy(existingCloudinaryId);
    }

    // Upload the new image
    const result = await cloudinary.uploader.upload(file, {
      folder: 'notario/avatars',
      transformation: [
        { width: 256, height: 256, crop: 'fill' },
        { quality: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      cloudinaryId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

// Delete avatar from Cloudinary
export async function deleteAvatar(cloudinaryId) {
  if (!cloudinaryId) return false;
  
  try {
    await cloudinary.uploader.destroy(cloudinaryId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

export default cloudinary; 