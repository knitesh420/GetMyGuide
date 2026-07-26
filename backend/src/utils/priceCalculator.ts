// Fee constants — single source of truth for pricing
const GUIDE_FEES: Record<string, Record<string, number>> = {
	'1-5': { half: 2500, full: 3250 },
	'6-14': { half: 3250, full: 4000 },
	'15-40': { half: 4000, full: 5200 },
};

const LANGUAGE_ALLOWANCE: Record<string, Record<string, number>> = {
	'1-14': { half: 800, full: 1000 },
	'15+': { half: 1000, full: 1300 },
};

const OUTSTATION_EXCURSION = {
	standard: 2200,
	delhiAgraJaipur: 900,
};

const OUTSTATION_ACCOMMODATION = {
	noAccommodation: 5500,
	withAccommodation: 2250,
};

const CONVEYANCE = {
	metro: 850,
	other: 350,
};

const EXTRA_ALLOWANCE = 500;

const SPECIAL_ALLOWANCES: Record<string, number> = {
	kolkataGangaAarti: 400,
	kolkataVictoriaMemorial: 400,
	mumbaiElephanta: 500,
	varanasiMorningRiver: 400,
	varanasiEveningAarti: 500,
};

const CITIES_WITH_EXTRA = ['Delhi', 'Bangalore', 'Jaipur', 'Kochi', 'Mumbai', 'Kolkata', 'Chennai'];

const METRO_CITIES = ['Delhi', 'Mumbai', 'Kolkata', 'Chennai'];

const EXTRA_ALLOWANCE_EXCURSIONS = [
	'Hyderabad-Warrangal-Palampet and back',
	'Chennai-Kanchipuram-Mahabalipuram and back',
	'Chennai-Tirupathy/Thirumala and back',
	'Chennai-Pondicherry and back',
	'Chennai-Gingy fort and back',
	'Madurai-Tanjore-Trichy and back',
	'Trivandrum-Kanyakumari and back',
	'Kochi-Alleppey-kottayam and back',
	'Bangalore-Mysore-Brindavan Gradens and back',
	'Bangalore-Belur-Halebid and back',
	'Mumbai-Karla/Bhaja, Bedsa and back',
	'Aurangabad-Ajanta caves and Ellora',
	'kolkata to Shantiniketan and back',
	'Kolkata to Bishnupur and back',
	'Ranakpur and Kumbhalgarh -Ex Udaipur',
	'Chennai City Sightseeing + Kanchipuram',
	'Chennai City Sightseeing + Mahabalipuram',
	'Jaipur-Ajmer-Pushkar',
	'Varanasi-Kushinagar-Varansi',
	'Varanasi-Bodh Gaya-Varanasi',
	'Agra-Gwalior-Agra',
	'Lucknow-Ayodhya-Lucknow',
];

export interface PriceBreakdown {
	baseFee: number;
	languageAllowance: number;
	outstationExcursionAllowance: number;
	outstationAccommodationAllowance: number;
	conveyanceAllowance: number;
	extraAllowance: number;
	specialAllowance: number;
	total: number;
}

interface BookingConfig {
	duration: 'half-day' | 'full-day';
	foreign_language_required: boolean;
	outstation?: {
		distance: number;
		over_night_stay: number;
		accomodation_meals: boolean;
		special_excursion: string[];
	};
	early_late_hours: boolean;
	extra_city_allowances: boolean;
	special_event_allowances: string[];
}

export function calculateBookingPrice(
	persons: number,
	city: string,
	config: BookingConfig
): PriceBreakdown {
	const duration = config.duration === 'half-day' ? 'half' : 'full';

	// Base guide fee
	let baseFee = 0;
	if (persons <= 5) {
		baseFee = GUIDE_FEES['1-5'][duration];
	} else if (persons <= 14) {
		baseFee = GUIDE_FEES['6-14'][duration];
	} else {
		baseFee = GUIDE_FEES['15-40'][duration];
	}

	// Language allowance
	let languageAllowance = 0;
	if (config.foreign_language_required) {
		if (persons <= 14) {
			languageAllowance = LANGUAGE_ALLOWANCE['1-14'][duration];
		} else {
			languageAllowance = LANGUAGE_ALLOWANCE['15+'][duration];
		}
	}

	// Outstation excursion allowance
	let outstationExcursionAllowance = 0;
	if (config.outstation && config.outstation.distance > 100) {
		outstationExcursionAllowance = OUTSTATION_EXCURSION.standard;
		if (Array.isArray(config.outstation.special_excursion)) {
			config.outstation.special_excursion.forEach((type) => {
				if (type === 'Delhi-Agra-Delhi' || type === 'Delhi-Jaipur-Delhi') {
					outstationExcursionAllowance += OUTSTATION_EXCURSION.delhiAgraJaipur;
				}
				if (EXTRA_ALLOWANCE_EXCURSIONS.includes(type)) {
					outstationExcursionAllowance += 1100;
				}
			});
		}
	}

	// Outstation accommodation allowance
	let outstationAccommodationAllowance = 0;
	if (config.outstation && config.outstation.over_night_stay > 0) {
		const perNightRate = config.outstation.accomodation_meals
			? OUTSTATION_ACCOMMODATION.withAccommodation
			: OUTSTATION_ACCOMMODATION.noAccommodation;
		outstationAccommodationAllowance = perNightRate * config.outstation.over_night_stay;
	}

	// Conveyance allowance
	let conveyanceAllowance = 0;
	if (config.early_late_hours) {
		conveyanceAllowance = METRO_CITIES.includes(city) ? CONVEYANCE.metro : CONVEYANCE.other;
	}

	// Extra city allowance
	let extraAllowance = 0;
	if (config.extra_city_allowances && CITIES_WITH_EXTRA.includes(city)) {
		extraAllowance = EXTRA_ALLOWANCE;
	}

	// Special allowances
	let specialAllowance = 0;
	if (Array.isArray(config.special_event_allowances) && config.special_event_allowances.length > 0) {
		specialAllowance = config.special_event_allowances.reduce(
			(sum, type) => sum + (SPECIAL_ALLOWANCES[type] || 0),
			0
		);
	}

	// NOTE: a second ₹1100-per-excursion loop used to live here, labelled "tours
	// exceeding 8 hours" but actually re-testing the same EXTRA_ALLOWANCE_EXCURSIONS
	// list already handled in the outstation-excursion block above. It double-
	// charged every qualifying excursion. Removed so each excursion is counted
	// once (in outstationExcursionAllowance, gated on distance > 100 alongside the
	// other excursion allowances). If a genuinely separate >8h allowance is
	// intended, reintroduce it keyed on trip duration/hours — not on the excursion
	// list — so the two are not conflated again.

	const total =
		baseFee +
		languageAllowance +
		outstationExcursionAllowance +
		outstationAccommodationAllowance +
		conveyanceAllowance +
		extraAllowance +
		specialAllowance;

	return {
		baseFee,
		languageAllowance,
		outstationExcursionAllowance,
		outstationAccommodationAllowance,
		conveyanceAllowance,
		extraAllowance,
		specialAllowance,
		total,
	};
}
