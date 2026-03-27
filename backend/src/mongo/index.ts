import mongoose from 'mongoose';
export {
	AccountDB,
	AdvertisementDB,
	BlogDB,
	BookingDB,
	ContactInquiryDB,
	GuideEnrollmentDB,
	PackageDB,
	StorageDB,
	TransactionDB,
} from './repo';

export default function connectDB(database_url: string) {
	return new Promise((resolve, reject) => {
		mongoose.set('strictQuery', false);
		mongoose.set('strictPopulate', false);
		mongoose
			.connect(database_url)
			.then(() => {
				resolve('Successfully connected to database');
			})
			.catch((error) => {
				reject(error);
			});
	});
}
