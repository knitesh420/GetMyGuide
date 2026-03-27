import { Types } from 'mongoose';
import { JWTPayload } from '../services/jwt';

declare global {
	var __basedir: string;
	var __augmont_auth_token: string;

	namespace Express {
		interface Request {
			locals: LocalVariables;
		}
		interface Response {
			locals: LocalVariables;
		}
	}
}

export type IDType = Types.ObjectId;

export interface LocalVariables {
	query?: any;
	data?: any;
	id?: IDType;
	user?: JWTPayload;
}

export type { JWTPayload } from '../services/jwt';
export { default as ServerError } from './serverError';
