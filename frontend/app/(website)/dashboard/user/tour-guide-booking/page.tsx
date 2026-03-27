// /app/dashboard/user/tour-guide-booking/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchUserBookings, cancelBooking } from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';
import { useRouter } from 'next/navigation';
import { tourGuideBooking } from '@/lib/data';
import { AlertCircle } from 'lucide-react';

const UserTourGuideBookingsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { bookings, loading, error, pagination } = useSelector((state: RootState) => state.userTourGuideBookings);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchUserBookings({ page: currentPage, limit: 10 }));
  }, [dispatch, currentPage]);

  const handleCancel = (bookingId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking? The advance amount will be refunded.")) {
      const reason = prompt("Please provide a reason for cancellation (optional):");
      dispatch(cancelBooking({ bookingId, reason: reason || "User cancelled" }));
    }
  };

  if (loading) return <p className="text-center p-4">Loading your bookings...</p>;
  if (error) return <p className="text-center p-4 text-red-500">Error: {error}</p>;
  if (!bookings || bookings.length === 0) {
    return (
      <div className="container mx-auto p-4 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Bookings Yet</h2>
        <p className="text-gray-600">You have no tour guide bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Tour Guide Bookings</h1>
      
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left">Guide</th>
              <th className="py-3 px-4 text-left">Location</th>
              <th className="py-3 px-4 text-left">Dates</th>
              <th className="py-3 px-4 text-center">Payment Status</th>
              <th className="py-3 px-4 text-right">Amount Due</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking: tourGuideBooking) => (
              <tr key={booking._id} className="border-t hover:bg-gray-50">
                <td className="py-3 px-4 text-left">
                  {typeof booking.guide === 'object' ? booking.guide.name : 'N/A'}
                </td>
                <td className="py-3 px-4 text-left">{booking.location}</td>
                <td className="py-3 px-4 text-left">
                  {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      booking.paymentStatus === 'Fully Paid' ? 'bg-green-200 text-green-800' :
                      booking.paymentStatus === 'Advance Paid' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                  }`}>
                      {booking.paymentStatus}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {booking.remainingAmount > 0 ? (
                    <span className="font-bold text-orange-600">
                      ₹{booking.remainingAmount.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold">Paid</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'Upcoming' ? 'bg-blue-200 text-blue-800' :
                        booking.status === 'Completed' ? 'bg-green-200 text-green-800' :
                        'bg-red-200 text-red-800'
                    }`}>
                        {booking.status}
                    </span>
                </td>
                <td className="py-3 px-4 text-center space-x-3">
                  <button 
                    onClick={() => router.push(`/dashboard/user/tour-guide-booking/${booking._id}`)}
                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    View
                  </button>
                  {booking.status === 'Upcoming' && booking.remainingAmount > 0 && (
                    <button 
                      onClick={() => router.push(`/dashboard/user/tour-guide-booking/${booking._id}`)}
                      className="text-green-600 hover:text-green-900 font-medium"
                    >
                      Pay Now
                    </button>
                  )}
                  {booking.status === 'Upcoming' && (
                    <button 
                      onClick={() => handleCancel(booking._id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-6">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || loading}
          className="px-4 py-2 mx-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="px-4 py-2 mx-1">
            Page {pagination.page} of {pagination.totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
          disabled={currentPage === pagination.totalPages || loading}
          className="px-4 py-2 mx-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UserTourGuideBookingsPage;