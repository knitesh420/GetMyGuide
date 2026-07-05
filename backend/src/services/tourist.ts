import { AccountDB, TouristDB } from '@mongo';
import { NotFoundError } from 'node-be-utilities';

interface TouristProfileData {
	nationality: string;
	preferredLanguages: string[];
	travelInterests: string[];
	budget: string;
	travelDates?: { startDate?: string; endDate?: string };
	numberOfTravelers: number;
	about: string;
}

class TouristService {
	/**
	 * Get the current tourist's profile, merged with basic Account fields.
	 * `registrationCompleted` tells the frontend whether to redirect into the
	 * onboarding form or straight to the dashboard.
	 */
	async getTouristProfile(accountId: string) {
		const account = await AccountDB.findOne({ _id: accountId, role: 'tourist' });
		if (!account) {
			throw new NotFoundError('Tourist profile not found');
		}

		const tourist = await TouristDB.findOne({ accountId: account._id });

		return {
			_id: account._id.toString(),
			user: account._id.toString(),
			name: account.name,
			email: account.email,
			mobile: account.phone,
			countryCode: account.countryCode,
			nationality: tourist?.nationality || '',
			preferredLanguages: tourist?.preferredLanguages || [],
			travelInterests: tourist?.travelInterests || [],
			budget: tourist?.budget || '',
			travelDates: tourist?.travelDates || { startDate: null, endDate: null },
			numberOfTravelers: tourist?.numberOfTravelers || 1,
			about: tourist?.about || '',
			paymentStatus: tourist?.paymentStatus || 'na',
			registrationCompleted: tourist?.registrationCompleted || false,
		};
	}

	/**
	 * Create or update the tourist's profile. No payment step — registration
	 * is free; `registrationCompleted` alone gates the onboarding redirect.
	 */
	async upsertTouristProfile(accountId: string, data: TouristProfileData) {
		const account = await AccountDB.findOne({ _id: accountId, role: 'tourist' });
		if (!account) {
			throw new NotFoundError('Tourist account not found');
		}

		const update = {
			nationality: data.nationality,
			preferredLanguages: data.preferredLanguages,
			travelInterests: data.travelInterests,
			budget: data.budget,
			travelDates: {
				startDate: data.travelDates?.startDate ? new Date(data.travelDates.startDate) : null,
				endDate: data.travelDates?.endDate ? new Date(data.travelDates.endDate) : null,
			},
			numberOfTravelers: data.numberOfTravelers,
			about: data.about,
			registrationCompleted: true,
		};

		await TouristDB.findOneAndUpdate({ accountId: account._id }, { $set: update }, {
			upsert: true,
			setDefaultsOnInsert: true,
		});

		return this.getTouristProfile(accountId);
	}
}

export default new TouristService();
