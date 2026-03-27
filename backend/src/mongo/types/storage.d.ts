import { Document } from 'mongoose';

export interface IStorageModel extends IStorage, Document {
	getString(key: string): Promise<string | null>;
	getObject(key: string): Promise<object | null>;
	setString(key: string, value: string): Promise<void>;
	setObject(key: string, value: object): Promise<void>;
}

export default interface IStorage extends Document {
	key: string;
	value: string | undefined;
	object: object | undefined;
	expireAt: Date;
}
