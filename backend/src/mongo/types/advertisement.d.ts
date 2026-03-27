import { Document, Types } from 'mongoose';

export default interface IAdvertisement extends Document {
  _id: Types.ObjectId;
  videoFilename: string;
  isActive: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}