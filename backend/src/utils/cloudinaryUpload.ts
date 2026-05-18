import cloudinary from '../config/cloudinary';

const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'getmyguide'
) => {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',
    folder,
  });

  return result;
};

export default uploadToCloudinary;