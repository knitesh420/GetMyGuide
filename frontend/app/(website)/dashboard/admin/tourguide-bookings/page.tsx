"use client";

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { useRouter } from 'next/navigation';

// Import the admin-specific thunks from the consolidated thunk file
import { 
  fetchAllBookingsAdmin, 
  cancelBookingByAdmin 
} from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';

// Import the booking type definition
import { tourGuideBooking } from '@/lib/data';

const AdminTourGuideBookingsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  // Select state from the consolidated 'userTourGuideBookings' slice
  const { bookings, loading, error, pagination } = useSelector((state: RootState) => state.userTourGuideBookings);
  
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data when the component mounts or the page number changes
  useEffect(() => {
    // Dispatch the thunk specifically designed for fetching all admin bookings
    dispatch(fetchAllBookingsAdmin({ page: currentPage, limit: 10 }));
  }, [dispatch, currentPage]);

  const handleCancel = (bookingId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking? This will refund the user's advance payment.")) {
      const reason = prompt("Please provide a reason for cancellation (Required for admin actions):");
      
      // Enforce that admins provide a reason for cancellation
      if (reason && reason.trim() !== "") {
        dispatch(cancelBookingByAdmin({ bookingId, reason }));
      } else {
        alert("A reason is required to cancel a booking from the admin panel.");
      }
    }
  };

  if (loading) {
    return <p className="text-center p-6 text-lg">Loading all bookings...</p>;
  }

  if (error) {
    return <p className="text-center p-6 text-lg text-red-600">Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage All Tour Guide Bookings</h1>
      
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-gray-600">Booked By</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600">Guide</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600">Location</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600">Dates</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-600">Status</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {bookings && bookings.length > 0 ? (
              bookings.map((booking: tourGuideBooking) => (
                <tr key={booking._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {typeof booking.user === 'object' ? booking.user.name : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    {typeof booking.guide === 'object' ? booking.guide.name : 'N/A'}
                  </td>
                  <td className="py-3 px-4">{booking.location}</td>
                  <td className="py-3 px-4">
                    {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center space-x-4">
                    <button 
                      onClick={() => router.push(`/dashboard/admin/tourguide-bookings/${booking._id}`)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                      aria-label={`View details for booking ${booking._id}`}
                    >
                      View
                    </button>
                    {booking.status === 'Upcoming' && (
                      <button 
                        onClick={() => handleCancel(booking._id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                        aria-label={`Cancel booking ${booking._id}`}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">No bookings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

       {/* Pagination Controls */}
       {pagination && pagination.totalPages > 1 && (
         <div className="flex justify-center items-center mt-6 space-x-2">
           <button 
             onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
             disabled={currentPage === 1 || loading}
             className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
           >
             Previous
           </button>
           <span className="px-4 py-2 text-sm text-gray-600">
               Page {pagination.page} of {pagination.totalPages}
           </span>
           <button 
             onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
             disabled={currentPage === pagination.totalPages || loading}
             className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
           >
             Next
           </button>
         </div>
       )}
    </div>
  );
};

export default AdminTourGuideBookingsPage;