import { AdvertisementDB } from '@mongo';
import IAdvertisement from '@mongo/types/advertisement';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';

interface AdvertisementData {
  videoFilename: string;
}

interface TransformedAdvertisement {
  id: string;
  videoFilename: string;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

function transformAdvertisement(ad: IAdvertisement): TransformedAdvertisement {
  return {
    id: ad._id.toString(),
    videoFilename: ad.videoFilename,
    isActive: ad.isActive,
    views: ad.views,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

class AdvertisementService {
  async createAdvertisement(data: AdvertisementData): Promise<TransformedAdvertisement> {
    const advertisement = await AdvertisementDB.create(data);
    return transformAdvertisement(advertisement);
  }

  async getAdvertisements(): Promise<TransformedAdvertisement[]> {
    const advertisements = await AdvertisementDB.find({ isActive: true }).sort({ createdAt: -1 });
    return advertisements.map(transformAdvertisement);
  }

  async getAllAdvertisements(): Promise<TransformedAdvertisement[]> {
    const advertisements = await AdvertisementDB.find().sort({ createdAt: -1 });
    return advertisements.map(transformAdvertisement);
  }

  async getAdvertisementById(id: string): Promise<TransformedAdvertisement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid advertisement ID');
    }
    const advertisement = await AdvertisementDB.findById(id);
    if (!advertisement) {
      throw new NotFoundError('Advertisement not found');
    }
    return transformAdvertisement(advertisement);
  }

  async incrementViews(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid advertisement ID');
    }
    await AdvertisementDB.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  async updateAdvertisement(
    id: string,
    data: Partial<AdvertisementData>
  ): Promise<TransformedAdvertisement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid advertisement ID');
    }
    const advertisement = await AdvertisementDB.findByIdAndUpdate(id, data, { new: true });
    if (!advertisement) {
      throw new NotFoundError('Advertisement not found');
    }
    return transformAdvertisement(advertisement);
  }

  async toggleActive(id: string): Promise<TransformedAdvertisement> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid advertisement ID');
    }
    const advertisement = await AdvertisementDB.findById(id);
    if (!advertisement) {
      throw new NotFoundError('Advertisement not found');
    }
    advertisement.isActive = !advertisement.isActive;
    await advertisement.save();
    return transformAdvertisement(advertisement);
  }

  async deleteAdvertisement(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid advertisement ID');
    }
    const advertisement = await AdvertisementDB.findByIdAndDelete(id);
    if (!advertisement) {
      throw new NotFoundError('Advertisement not found');
    }
  }
}

export default new AdvertisementService();
export { default as AdvertisementService } from './advertisement';