import mongoose from 'mongoose';
export {
	AccountDB,
	ActivityLogDB,
	AdvertisementDB,
	AssignmentDB,
	BlogDB,
	BookingDB,
	CashPaymentDB,
	ContactInquiryDB,
	CounterDB,
	EarningDB,
	GuideDB,
	GuideLeaveDB,
	InvoiceDB,
	LocationDB,
	MessageDB,
	NotificationDB,
	PackageDB,
	PayoutDB,
	PendingRegistrationDB,
	RefundRequestDB,
	ReviewDB,
	StorageDB,
	TouristDB,
	TransactionDB,
	TripDB,
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
