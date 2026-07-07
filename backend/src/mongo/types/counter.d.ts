import { Document } from 'mongoose';

export default interface ICounter extends Document {
	_id: string;
	seq: number;
}
