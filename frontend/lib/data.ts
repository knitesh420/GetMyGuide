// lib/data.ts

// --- Populated Object Interfaces ---
// Yeh batata hai ki jab data populate hoke aayega to kaisa dikhega
export interface tourGuideBooking {
  _id: string;
  // Guide aur User ya to simple ID (string) ho sakte hain, ya poora object.
  guide: string | PopulatedGuide;
  user: string | PopulatedUser;

  // Tour Details
  location: string; // ✅ FIXED: 'location' property added
  language: string;
  startDate: string; // Dates from APIs are typically strings
  endDate: string;
  numberOfTravelers: number;

  // Financials
  totalPrice: number;
  advanceAmount: number;
  remainingAmount: number;
  paymentStatus: "Advance Paid" | "Fully Paid" | "Refunded";

  // Payment IDs
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  finalPaymentRazorpayOrderId?: string;
  finalPaymentRazorpayPaymentId?: string;

  // Contact Info
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
  };

  // Status and Cancellation
  status: "Upcoming" | "Completed" | "Cancelled";
  cancelledBy?: "User" | "Admin";
  cancellationReason?: string;
  razorpayRefundId?: string;
  originalGuide?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
}

interface PopulatedGuide {
  _id: string;
  name: string;
  photo?: string;
  email?: string;
  mobile?: string;
}

interface PopulatedTour {
  _id: string;
  title: string;
  images?: string[];
  locations?: string[]; // <-- SABSE ZAROORI: locations ko yahaan add kiya gaya hai
}

// --- Main Booking Interface ---
// Yeh aapke poore project ke liye 'Booking' ki EKLOTI (single) definition hai.

export interface CancellationDetails {
  cancellerId: string; // Corresponds to mongoose.Schema.Types.ObjectId
  cancellerRole: string;
  cancellerName: string;
}

export interface Booking {
  _id: string;
  tour: string | PopulatedTour;
  guide: string | PopulatedGuide;
  user: string | PopulatedUser;
  originalGuide?: string | PopulatedGuide;
  startDate: string;
  endDate: string;
  numberOfTourists: number;
  totalPrice: number;
  advanceAmount: number;
  remainingAmount: number;
  isFeatured: boolean;
  paymentId: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  cancelledBy?: CancellationDetails | null;
  paymentStatus: "Advance Paid" | "Fully Paid" | "Refunded";
  createdAt: string;
  updatedAt: string;
}

// --- API Data Types ---

export interface CreateRazorpayOrderData {
  amount: number;
  receipt: string;
}

export interface VerifyAndCreateBookingData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tourId: string;
  guideId: string;
  startDate: string;
  endDate: string;
  numberOfTourists: number;
}

export interface UpdateBookingStatusData {
  bookingId: string;
  status: "Upcoming" | "Completed" | "Cancelled";
}

// --- Other Type Definitions from your original file ---

export type Review = {
  user: string;
  fullName: string;
  avatar: string;
  rating: number;
  comment: string;
  images: string[];
};

export type Tour = {
  _id: string;
  title: string;
  description: string;
  images: string[];
  basePricePerPerson: number;
  pricePerPerson: number;
  duration: string;
  locations: string[];
};

export type AvailabilityPeriod = {
  startDate: string;
  endDate: string;
  available: boolean;
};

export type Guide = {
  _id: string;
  user: string;
  name: string;
  email: string;
  mobile?: string;
  dob?: string;
  state?: string;
  serviceLocations?: string[];
  country?: string;
  age?: number;
  languages?: string[];
  experience?: string;
  specializations?: string[];
  availability?: string[];
  description?: string;
  license?: string;
  photo?: string;
  isApproved: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  guideProfileId: string;
  averageRating?: number;
  numReviews?: number;
  isCertified: boolean;
  subscriptionId: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: Date;
  availabilityPeriods: AvailabilityPeriod[];
  unavailableDates: Date[];
};

export type BookingStatus =
  | "Upcoming"
  | "Completed"
  | "Cancelled"
  | "Awaiting Substitute";
export type PaymentStatus = "Advance Paid" | "Fully Paid" | "Refunded";

// NOTE: The second conflicting 'Booking' interface has been REMOVED.

export type AddOnPerk = {
  _id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category:
    | "Eco Tour"
    | "Heritage Tour"
    | "One-day Tour"
    | "Handicraft Tour"
    | "Spice Market Tour"
    | "Culinary"
    | "Accommodation";
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "tourist" | "guide" | "admin";
};

export type AdminAddOn = {
  title: string;
  price: number;
};

export type AdminLocation = {
  _id: string;
  placeName: string;
  // 🔥 REMOVED: pricePerPerson is no longer used.
  // pricePerPerson: number;
  pricing: {
    smallGroup: { price: number }; // For 1-5 Persons
    mediumGroup: { price: number }; // For 6-14 Persons
    largeGroup: { price: number }; // For 15-40 Persons
  };
  description: string;
  image: string;
};

export type LanguageOption = {
  _id: string;
  languageName: string;
  pricing: {
    standardGroup: { price: number }; // For 1-14 Persons
    largeGroup: { price: number }; // For 15+ Persons
  };
};

export type SubscriptionPlan = {
  _id: string;
  title: string;
  duration: string;
  totalPrice: number;
  monthlyPrice: number;
  benefits: string[];
  popular: boolean;
};

export interface GuideProfile {
  _id: string;
  user: string;
  // Human-facing business code (GU######) — null until backfilled.
  guideCode?: string | null;
  name: string;
  email: string;
  mobile?: string;
  countryCode?: string;
  dob?: string;
  city?: string;
  age?: number;
  languages?: string[];
  serviceLocations?: string[];
  /** Escort guides only. */
  pan?: string;
  license?: string;
  photo?: string;
  profileImage?: string;
  identityProofs?: string[];
  isApproved: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  guideProfileId: string;
  averageRating: number;
  numReviews: number;
  isCertified: boolean;
  type?: "normal" | "escort";
  subscriptionId: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: Date;
  availabilityPeriods: AvailabilityPeriod[];
  unavailableDates: Date[];
  // Membership (30-day recurring, replaces the old one-time enrollment fee)
  registrationCompleted?: boolean;
  paymentStatus?: "pending" | "success" | "failed";
  isVisible?: boolean;
  membershipStartDate?: string | null;
  membershipExpiryDate?: string | null;
  membershipExpired?: boolean;
  /**
   * Paid, but the 30-day clock has not started: the guide is still awaiting KYC
   * approval, and their subscription runs from the moment an admin approves
   * them. Without this the dashboard cannot tell "hasn't paid" apart from "paid
   * and waiting", and would ask a guide who has already paid to pay again.
   */
  membershipPendingActivation?: boolean;
  membershipPaidAt?: string | null;
  /** Set when a rejection auto-refunded the membership fee. */
  membershipRefund?: {
    status: "processed" | "failed";
    amount: number;
    refundedAt: string;
  } | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  pricing?: GuidePricing | null;
}

export interface GuidePricing {
  halfDay: number;
  fullDay: number;
}

export interface TouristProfile {
  _id: string;
  user: string;
  // Human-facing business code (TO######) — null until backfilled.
  touristCode?: string | null;
  name: string;
  email: string;
  mobile?: string;
  countryCode?: string;
  nationality: string;
  preferredLanguages: string[];
  travelInterests: string[];
  budget: string;
  travelDates: {
    startDate: string | null;
    endDate: string | null;
  };
  numberOfTravelers: number;
  about: string;
  paymentStatus: "pending" | "success" | "failed" | "na";
  registrationCompleted: boolean;
}

export interface TouristState {
  myProfile: TouristProfile | null;
  loading: boolean;
  error: string | null;
}

export interface GuideState {
  guides: GuideProfile[];
  currentGuide: GuideProfile | null;
  myProfile: GuideProfile | null;
  tourGuideBooking: tourGuideBooking[];
  /**
   * What a guide charges, from GET /guides/:id/pricing-details. Direct bookings
   * are priced off `pricing.fullDay` server-side; `bookable` is false when the
   * guide is unverified or has never published rates.
   */
  pricingDetails: {
    guideId: string;
    name: string;
    currency: string;
    pricing: { halfDay: number; fullDay: number } | null;
    isCertified: boolean;
    bookable: boolean;
    unavailableReason: string | null;
  } | null;
  pricingLoading: boolean;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
  myLeaves: GuideLeave[];
  myCalendar: GuideCalendar | null;
}

export interface tourGuideBooking {
  _id: string;
  // Guide aur User ya to simple ID (string) ho sakte hain, ya poora object.
  guide: string | PopulatedGuide;
  user: string | PopulatedUser;

  // Tour Details
  location: string; // ✅ FIXED: 'location' property added
  language: string;
  startDate: string; // Dates from APIs are typically strings
  endDate: string;
  numberOfTravelers: number;

  // Financials
  totalPrice: number;
  advanceAmount: number;
  remainingAmount: number;
  paymentStatus: "Advance Paid" | "Fully Paid" | "Refunded";

  // Payment IDs
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  finalPaymentRazorpayOrderId?: string;
  finalPaymentRazorpayPaymentId?: string;

  originalGuide?: string;

  // Contact Info
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
  };

  // Status and Cancellation
  status: "Upcoming" | "Completed" | "Cancelled";
  cancelledBy?: "User" | "Admin";
  cancellationReason?: string;
  razorpayRefundId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Blog {
  id: string;
  videoId: string;
  thumbnailUrl: string;
  description: string;
  hasImage: boolean;
  imageFilename?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The structure of the API response for a list of blogs.
 * This matches the `ApiResponse` type from your service, with `data` being an array of blogs.
 */
export interface BlogListResponse {
  success: boolean;
  message: string;
  data: Blog[];
  totalPages?: number;
  currentPage?: number;
}

// --- Phase 2: Travel Operations (Assignment / Trip / Notification / Review / Reports) ---

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PopulatedAccountSummary {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  // Guide business code (GU######) — enriched only when this account is a guide
  // populated onto an assignment. Absent for assignedBy (admin) accounts.
  guideCode?: string | null;
}

export interface PopulatedBookingSummary {
  _id: string;
  tourist_info: {
    name: string;
    phone: string;
    email: string;
    country: string;
    gender: string;
  };
  travel_details: {
    city: string;
    places: string[];
    date: string;
    no_of_person: number;
  };
  linked_to?: string;
  // Human-facing business codes. bookingCode (BK######) comes from the booking
  // itself; touristCode (TO######) is enriched from the linked tourist profile
  // and is null for guest bookings with no linked account.
  bookingCode?: string;
  touristCode?: string | null;
  status: string;
}

export type AssignmentStatus = "pending" | "accepted" | "declined" | "reassigned";

export interface Assignment {
  _id: string;
  // Human-facing business code (AS######). Absent on assignments that predate
  // the code field and have not been backfilled.
  assignmentCode?: string;
  booking: string | PopulatedBookingSummary;
  guide: string | PopulatedAccountSummary;
  assignedBy: string | PopulatedAccountSummary;
  status: AssignmentStatus;
  adminNotes?: string;
  declineReason?: string;
  respondedAt?: string;
  previousAssignment?: string;
  createdAt: string;
  updatedAt: string;
}

// Shape actually returned by GET /booking (BookingService.transformBooking) —
// distinct from the legacy, mismatched `Booking` type above (which targets a
// different, unused API shape). Used only by the new Assignment admin page.
export interface AdminBookingSummary {
  _id: string;
  id: string;
  tourist_info: {
    name: string;
    gender: string;
    phone: string;
    email: string;
    country: string;
  };
  travel_details: {
    places: string[];
    city: string;
    date: string;
    no_of_person: number;
    preferences: {
      hotel: boolean;
      taxi: boolean;
    };
  };
  guide_preferences: {
    guide_language: string[];
    gender: string;
  };
  booking_configuration: {
    duration: string;
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
    price: number;
  };
  linked_to?: string;
  // Human-facing business codes (see PopulatedBookingSummary).
  bookingCode?: string;
  touristCode?: string | null;
  transaction_id: string;
  allocated_guide?: string;
  // Present on package-tour bookings.
  booking_type?: string;
  package?: string;
  end_date?: string;
  advance_paid?: number;
  balance_due?: number;
  package_info?: { title: string };
  guide_info?: { name: string; photo?: string };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignableGuide {
  accountId: string;
  guideCode?: string | null;
  name: string;
  email: string;
  phone?: string;
  city: string;
  languages: string[];
  isVisible: boolean;
  membershipExpiryDate: string | null;
}

// Admin management listing of a guide — every guide account (active + inactive)
// joined with its Guide profile. Returned by GET /guide/admin/all.
export interface AdminGuide {
  accountId: string;
  guideCode: string | null;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  status: string;
  city: string;
  languages: string[];
  type: string;
  /** Escort guides only. */
  pan?: string;
  isVisible: boolean;
  registrationCompleted: boolean;
  paymentStatus: string;
  membershipActive: boolean;
  membershipStartDate: string | null;
  membershipExpiryDate: string | null;
  profileImage: string;
  /**
   * Raw stored values — Cloudinary URLs for recent uploads, bare filenames for
   * older ones. NOT linkable: use `documents` instead. Linking straight to these
   * is what made every KYC document 404, because a filename resolves against the
   * frontend origin.
   */
  identityProofs?: string[];
  /** The same documents, as admin-only routes that actually serve the file. */
  documents?: GuideDocument[];
  membershipPendingActivation?: boolean;
  membershipPaidAt?: string | null;
  refundStatus?: "processed" | "failed" | null;
  hasAdminNotes?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  pricing?: GuidePricing | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * A KYC document as the backend describes it. `url` / `downloadUrl` are paths
 * relative to the API origin (prefix them with NEXT_PUBLIC_API_URL) and require
 * an admin session — see GET /guide/:id/documents/:index.
 */
export interface GuideDocument {
  index: number;
  label: string;
  value: string;
  storage: "remote" | "local";
  url: string;
  downloadUrl: string;
  /** False when the row points at a local file that is no longer on the server. */
  available: boolean;
}

/** One Razorpay membership payment. ADMIN ONLY — never rendered to a tourist. */
export interface GuideMembershipTransaction {
  _id: string;
  paymentCode: string | null;
  transaction_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface GuideMembershipRefund {
  status: "processed" | "failed";
  refundId?: string;
  amount: number;
  refundedAt: string;
  failureReason?: string;
  razorpay_payment_id?: string;
}

/**
 * Everything an admin sees on one guide: GET /guide/admin/:id.
 *
 * Payment identifiers, bank details and internal notes appear ONLY here and are
 * returned only to admins — they are absent from every public guide endpoint.
 */
export interface AdminGuideDetail {
  accountId: string;
  guideId: string | null;
  guideCode: string | null;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  isActive: boolean;
  status: string;
  city: string;
  languages: string[];
  type: string;
  pan?: string;
  profileImage: string;
  createdAt: string;

  registrationCompleted: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  approvedAt: string | null;

  isVisible: boolean;
  membershipActive: boolean;
  paymentStatus: "pending" | "success" | "failed";
  membershipStartDate: string | null;
  membershipExpiryDate: string | null;
  membershipPaidAt: string | null;
  membershipPendingActivation: boolean;
  membershipHistory: { startDate?: string; expiryDate?: string }[];

  documents: GuideDocument[];

  adminNotes: string;
  adminNotesUpdatedAt: string | null;
  adminNotesUpdatedBy: string | null;

  pricing: GuidePricing | null;
  bankDetails: {
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  } | null;
  membershipRefund: GuideMembershipRefund | null;
  transactions: GuideMembershipTransaction[];
  cashPayments: CashPayment[];
  cashSummary: { totalAmount: number; count: number };
}

/**
 * A cash payment an admin recorded by hand. Entirely independent of the online
 * Razorpay transactions above — both coexist in a guide's payment history.
 */
export interface CashPayment {
  _id: string;
  cashPaymentCode: string | null;
  guide?: string | PopulatedAccountSummary;
  amount: number;
  paymentDate: string;
  method: "cash";
  paidBy: "tourist" | "admin";
  touristName?: string;
  bookingReference?: string;
  remarks?: string;
  status: "received" | "voided";
  /** Audit fields — admin responses only; the guide's own history omits them. */
  recordedBy?: PopulatedAccountSummary;
  createdBy?: PopulatedAccountSummary;
  updatedBy?: PopulatedAccountSummary | null;
  deletedBy?: PopulatedAccountSummary | null;
  deletedAt?: string | null;
  voidReason?: string;
  createdAt: string;
  updatedAt?: string;
}

// Admin management listing of a tourist — every tourist account joined with its
// Tourist profile. Returned by GET /tourist/admin/all.
export interface AdminTourist {
  accountId: string;
  touristCode: string | null;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  status: string;
  nationality: string;
  preferredLanguages: string[];
  numberOfTravelers: number;
  registrationCompleted: boolean;
  createdAt: string;
}

// 'planned' is a synthetic, client-facing status for a booking that has no Trip
// yet (awaiting a guide). It is never persisted — the backend derives it for the
// tourist's My Trips view; a real Trip always starts at 'not-started'.
export type TripStatus =
  | "planned"
  | "not-started"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface Trip {
  _id: string;
  // Human-facing business code (TR######). Absent on synthetic 'planned' trips
  // (a booking with no real Trip yet) and on records that predate the field.
  tripCode?: string;
  booking: string | PopulatedBookingSummary;
  assignment: string;
  guide: string | PopulatedAccountSummary;
  status: TripStatus;
  startedAt?: string;
  completedAt?: string;
  startNotes?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Guide Availability & Booking Conflict System ---

export type GuideLeaveType = "vacation" | "emergency";
export type GuideLeaveStatus = "active" | "cancelled";

export interface GuideLeave {
  _id: string;
  guide: string;
  type: GuideLeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: GuideLeaveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GuideBookedRange {
  start: string;
  end: string;
  bookingId: string;
  city: string;
  status: string;
}

export interface GuideCalendar {
  unavailableDates: string[];
  leaves: GuideLeave[];
  bookedRanges: GuideBookedRange[];
}

export interface GuideAvailabilityConflict {
  type: "assignment" | "leave" | "unavailable_date";
  start: string;
  end: string;
  reason?: string;
  bookingId?: string;
  city?: string;
}

export interface GuideAvailabilityInfo {
  accountId: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  languages: string[];
  isVisible: boolean;
  membershipExpiryDate: string | null;
  isAvailable: boolean;
  conflicts: GuideAvailabilityConflict[];
}

export type NotificationType =
  | "guide_assigned"
  | "guide_accepted"
  | "guide_declined"
  | "trip_started"
  | "trip_completed"
  | "membership_expiring"
  | "payment_successful"
  | "booking_updated"
  | "review_received";

export interface NotificationItem {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: { kind: string; id: string };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuideReview {
  _id: string;
  booking: string;
  guide: string | PopulatedAccountSummary;
  tourist: string | PopulatedAccountSummary;
  rating: number;
  comment?: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuideRatingSummary {
  average: number;
  total: number;
}

export interface ReportOverview {
  totalBookings: number;
  totalRevenue: number;
  activeGuides: number;
  activeTourists: number;
  pendingAssignments: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  membershipRenewals: number;
  avgRating: number;
  totalReviews: number;
}

export interface BookingsTrendPoint {
  date: string;
  bookings: number;
  revenue: number;
}

export interface GuidePerformanceRow {
  guideId: string;
  name: string;
  email: string;
  assignmentsCount: number;
  tripsCompleted: number;
  avgRating: number;
  totalReviews: number;
}

export interface ActivityLogEntry {
  _id: string;
  actor?: string | PopulatedAccountSummary;
  actorType: "user" | "system";
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// --- Invoice & Billing ---

export type InvoiceType = "booking" | "guide_membership" | "trip_completion";
export type InvoiceStatus = "paid" | "refunded" | "cancelled";
export type InvoiceEmailStatus = "pending" | "sent" | "failed";

export interface InvoiceCustomerSnapshot {
  name: string;
  email: string;
  phone: string;
  country: string;
  billingAddress?: string;
}

export interface InvoiceGuideSnapshot {
  name: string;
  email: string;
  phone: string;
  membershipPlan?: string;
  membershipDurationDays?: number;
}

export interface InvoiceBookingSnapshot {
  destination: string;
  travelDate?: string;
  touristsCount?: number;
  assignedGuideName?: string;
}

export interface InvoicePaymentInfo {
  method?: string;
  amount: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: InvoiceStatus;
  currency: string;
}

export interface InvoiceCompanyInfo {
  name: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  address: string;
  logoUrl: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  paymentDate: string;
  transaction: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  booking?: string;
  trip?: string;
  guideAccount?: string;
  touristAccount?: string;
  customerSnapshot: InvoiceCustomerSnapshot;
  guideSnapshot?: InvoiceGuideSnapshot;
  bookingSnapshot?: InvoiceBookingSnapshot;
  paymentInfo: InvoicePaymentInfo;
  companyInfo: InvoiceCompanyInfo;
  pdfUrl?: string;
  emailStatus: InvoiceEmailStatus;
  status: InvoiceStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Tourist Dashboard Home overview (GET /tourist/dashboard) ---
//
// One read-only aggregate of data the detail pages already expose, so Dashboard
// Home loads with a single request instead of fanning out to five endpoints.
// The detail pages keep using their own endpoints — this only backs the summary.

export interface TouristDashboardProfile extends TouristProfile {
  /** Percentage (0-100) of the onboarding profile the tourist has filled in. */
  profileCompletion: number;
  /** Account creation date; null if it could not be resolved. */
  memberSince: string | null;
}

export interface TouristDashboardStats {
  upcomingTrips: number;
  completedTrips: number;
  activeBookings: number;
  pendingPayments: number;
  unreadNotifications: number;
  pendingReviews: number;
  /** Total of every paid invoice, in INR. */
  totalSpent: number;
}

export interface TouristDashboardGuide {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  /** Mean rating across the guide's visible reviews; 0 when never reviewed. */
  rating: number;
  ratingCount: number;
}

/** The soonest trip that hasn't finished — drives the hero card. */
export interface TouristUpcomingTrip {
  _id: string;
  tripCode: string | null;
  status: TripStatus;
  bookingId: string;
  bookingCode: string | null;
  bookingStatus: string;
  destination: string;
  places: string[];
  travelDate: string;
  travelers: number;
  /** null until a guide accepts the assignment. */
  guide: TouristDashboardGuide | null;
}

export interface TouristPendingReview {
  tripId: string;
  bookingId: string;
  tripCode: string | null;
  destination: string;
  completedAt: string;
  guide: { _id: string; name: string } | null;
}

export interface TouristLatestInvoice {
  _id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paidAt: string;
  destination: string | null;
}

export interface TouristPaymentSummary {
  /** Sum of paid invoices. */
  totalPaid: number;
  /** Still owed: full price of unpaid bookings + any outstanding package balance. */
  pendingAmount: number;
  invoiceCount: number;
  latestInvoice: TouristLatestInvoice | null;
}

export type TouristActivityType =
  | "booking-created"
  | "payment-successful"
  | "guide-assigned"
  | "trip-updated"
  | "review-submitted";

export interface TouristActivityEntry {
  id: string;
  type: TouristActivityType;
  title: string;
  description: string;
  at: string;
  href?: string;
}

export interface TouristDashboardOverview {
  profile: TouristDashboardProfile;
  stats: TouristDashboardStats;
  upcomingTrip: TouristUpcomingTrip | null;
  recentBookings: AdminBookingSummary[];
  recentTrips: Trip[];
  notifications: NotificationItem[];
  payments: TouristPaymentSummary;
  pendingReviews: TouristPendingReview[];
  /** Newest first, already truncated by the backend. */
  activity: TouristActivityEntry[];
}

export interface TouristDashboardState {
  overview: TouristDashboardOverview | null;
  loading: boolean;
  error: string | null;
}

// Sample data for development
export const tours: Tour[] = [];
export const guides: Guide[] = [];
export const bookings: Booking[] = [];
