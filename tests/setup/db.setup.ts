import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export async function connectTestDB(): Promise<string> {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();
	await mongoose.connect(mongoUri);
	return mongoUri;
}

export async function disconnectTestDB(): Promise<void> {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.disconnect();
	}
	if (mongoServer) {
		await mongoServer.stop();
	}
}

export async function clearDatabase(): Promise<void> {
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
}
