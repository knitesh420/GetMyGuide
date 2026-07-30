import mongoose from 'mongoose';
import IAdvertisement from '../types/advertisement';

const AdvertisementSchema = new mongoose.Schema<IAdvertisement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Advertisement',
    },
    videoFilename: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    views: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AdvertisementDB = mongoose.model<IAdvertisement>('Advertisement', AdvertisementSchema);

export default AdvertisementDB;