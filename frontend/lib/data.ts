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

export type CustomTourRequestStatus =
  | "Pending"
  | "Quoted"
  | "Booked"
  | "Rejected";

export type CustomTourRequest = {
  _id: string;
  userName: string;
  userEmail: string;
  locations: string[];
  language: string;
  startDate: string | null;
  endDate: string | null;
  numTravelers: number;
  specialRequests: string;
  submissionDate: string;
  status: CustomTourRequestStatus;
  assignedGuideId: string | null;
  quotedPrice: number | null;
  adminNotes: string;
};

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
  role: "user" | "guide" | "admin";
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
  name: string;
  email: string;
  mobile?: string;
  countryCode?: string;
  dob?: string;
  city?: string;
  state?: string;
  country?: string;
  age?: number;
  languages?: string[];
  serviceLocations?: string[];
  experience?: string;
  specialization?: string[];
  specializations?: string[];
  availability?: string[];
  availableDays?: string[];
  availableTime?: string;
  price?: number;
  description?: string;
  about?: string;
  license?: string;
  photo?: string;
  profileImage?: string;
  identityProofs?: string[];
  galleryImages?: string[];
  isApproved: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  guideProfileId: string;
  averageRating: number;
  numReviews: number;
  isCertified: boolean;
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
}

export interface TouristProfile {
  _id: string;
  user: string;
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
  pricingDetails: {
    locations: AdminLocation[];
    languages: LanguageOption[];
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
  status: string;
}

export type AssignmentStatus = "pending" | "accepted" | "declined" | "reassigned";

export interface Assignment {
  _id: string;
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
  };
  linked_to?: string;
  transaction_id: string;
  allocated_guide?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignableGuide {
  accountId: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  languages: string[];
  isVisible: boolean;
  membershipExpiryDate: string | null;
}

export type TripStatus = "not-started" | "in-progress" | "completed" | "cancelled";

export interface Trip {
  _id: string;
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

// Sample data for development
export const tours: Tour[] = [];
export const guides: Guide[] = [];
export const bookings: Booking[] = [];
