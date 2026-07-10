import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/lib/redux/authSlice";
import userReducer from "@/lib/redux/userSlice";
import guideReducer from "@/lib/redux/guideSlice";
import touristReducer from "@/lib/redux/touristSlice";
import testimonialsReducer from "@/lib/redux/testimonialSlice";
import packageReducer from "@/lib/redux/packageSlice";
import adminReducer from "@/lib/redux/adminSlice";
import languageReducer from "@/lib/redux/languageSlice";
import contactReducer from "@/lib/redux/contactSlice";
import bookingReducer from "@/lib/redux/bookingSlice";
import tourGuideBookingReducer from "@/lib/redux/tourGuideBookingSlice";
import userTourGuideBookingReducer from "@/lib/redux/userTourGuideBookingSlice";
import dashboardReducer from "@/lib/redux/dashboardSlice";
import blogReducer from "@/lib/redux/blogSlice";
import advertisementReducer from "@/lib/redux/advertisementSlice";
import assignmentReducer from "@/lib/redux/assignmentSlice";
import tripReducer from "@/lib/redux/tripSlice";
import notificationReducer from "@/lib/redux/notificationSlice";
import reviewReducer from "@/lib/redux/reviewSlice";
import reportReducer from "@/lib/redux/reportSlice";
export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    guide: guideReducer,
    tourist: touristReducer,
    testimonials: testimonialsReducer,
    packages: packageReducer,
    admin: adminReducer,
    languages: languageReducer,
    contacts: contactReducer,
    bookings: bookingReducer,
    tourGuideBooking: tourGuideBookingReducer,
    userTourGuideBookings: userTourGuideBookingReducer,
    dashboard: dashboardReducer,
    blogs: blogReducer,
    advertisement: advertisementReducer,
    assignments: assignmentReducer,
    trips: tripReducer,
    notifications: notificationReducer,
    reviews: reviewReducer,
    reports: reportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
