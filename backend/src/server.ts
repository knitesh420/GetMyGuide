import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import configServer from './server-config';

import { DATABASE_URL, PORT } from '@config/const';
import connectDB from '@mongo';
import { error, info } from 'node-be-utilities';

//  ------------------------- Setup Variables
const app = express();

configServer(app);

let server: ReturnType<typeof app.listen>;

connectDB(DATABASE_URL)
	.then(async () => {
		info('Database connected');
		server = app.listen(PORT, async () => {
			info(`Server started on port ${PORT}`);
		});
	})
	.catch((err) => {
		error('Database Connection Failed', err);
		process.exit(1);
	});

process.setMaxListeners(0);
process.on('unhandledRejection', (err: Error) => {
	error('Unhandled rejection', err);
	if (server) {
		server.close(() => process.exit(1));
	} else {
		process.exit(1);
	}
});
