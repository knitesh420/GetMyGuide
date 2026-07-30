import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import configServer from './server-config';

import { assertProductionEnv, DATABASE_URL, IS_PRODUCTION, PORT } from '@config/const';
import connectDB from '@mongo';
import { startNotificationWatcher } from '@services/notificationWatcher';
import { error, info } from 'node-be-utilities';

// Fail fast before doing anything if production is misconfigured.
assertProductionEnv();

/**
 * Say out loud which database this process is about to write to.
 *
 * There is no staging cluster, and the checked-out .env points at the live one —
 * so `pnpm dev` on a laptop connects to production data by default and nothing
 * on screen says so. This banner is the difference between noticing that in the
 * first second and noticing it after a test click has mutated a real booking.
 */
function announceTarget(): void {
	const isRemote = /mongodb\+srv|mongodb\.net/.test(DATABASE_URL ?? '');
	const host = (DATABASE_URL ?? '').replace(/\/\/[^@]*@/, '//<credentials>@');

	info(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
	info(`Database: ${host}`);

	if (isRemote && !IS_PRODUCTION) {
		// eslint-disable-next-line no-console
		console.warn(
			'\n' +
				'  ############################################################\n' +
				'  #  WARNING: a NON-PRODUCTION process is connected to a     #\n' +
				'  #  REMOTE database. Writes here affect real user data.     #\n' +
				'  #  Point DATABASE_URL at a local MongoDB for development.  #\n' +
				'  ############################################################\n'
		);
	}
}

announceTarget();

//  ------------------------- Setup Variables
const app = express();

configServer(app);

let server: ReturnType<typeof app.listen>;

connectDB(DATABASE_URL)
	.then(async () => {
		info('Database connected');
		startNotificationWatcher();
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
