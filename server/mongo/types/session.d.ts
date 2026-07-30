import { Document, Types } from 'mongoose';

export default interface ISession extends Document {
	account: Types.ObjectId;
	loginAt: Date;
	expireAt: Date;
	refreshToken: string;
	ipAddress: string;
	platform: string;
	browser: string;
	latitude: number;
	longitude: number;

	getAuthToken(): string;
	getRefreshToken(): string;
}
