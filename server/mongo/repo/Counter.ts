import mongoose from 'mongoose';
import ICounter from '../types/counter';

const CounterSchema = new mongoose.Schema<ICounter>({
	_id: {
		type: String,
		required: true,
	},
	seq: {
		type: Number,
		default: 0,
	},
});

const CounterDB = mongoose.model<ICounter>('Counter', CounterSchema);

export default CounterDB;
