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
			// Human-facing business code (TO######) — null until backfilled.
			touristCode: tourist?.touristCode ?? null,
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

	/**
	 * Admin listing of every tourist account joined with its Tourist profile —
	 * returns the business code (TO######), contact details, nationality and
	 * registration status for the admin management table. Batched to avoid an
	 * N+1 lookup across the two collections.
	 */
	async getAllTouristsForAdmin() {
		const accounts = await AccountDB.find({ role: 'tourist' })
			.select('name email phone isActive status createdAt')
			.sort({ createdAt: -1 })
			.lean();
		const accountIds = accounts.map((a) => a._id);

		const profiles = await TouristDB.find({ accountId: { $in: accountIds } })
			.select('accountId touristCode nationality preferredLanguages numberOfTravelers registrationCompleted')
			.lean();
		const profileByAccountId = new Map(profiles.map((p) => [p.accountId.toString(), p]));

		return accounts.map((account) => {
			const profile = profileByAccountId.get(account._id.toString());
			return {
				accountId: account._id.toString(),
				touristCode: profile?.touristCode ?? null,
				name: account.name,
				email: account.email,
				phone: account.phone,
				isActive: account.isActive,
				status: account.status,
				nationality: profile?.nationality ?? '',
				preferredLanguages: profile?.preferredLanguages ?? [],
				numberOfTravelers: profile?.numberOfTravelers ?? 0,
				registrationCompleted: profile?.registrationCompleted ?? false,
				createdAt: account.createdAt,
			};
		});
	}
}

export default new TouristService();
