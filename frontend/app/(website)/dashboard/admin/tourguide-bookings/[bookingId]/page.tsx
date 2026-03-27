"use client";

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { useParams, useRouter } from 'next/navigation';

import { apiService } from '@/lib/service/api'; 
import { Guide } from '@/lib/data';

import { 
  reassignGuideThunk,
  updateBookingStatusThunk,
  cancelBookingByAdmin
} from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';

// =====================================================================
// 1. Reassign Guide Modal Component (Unchanged)
// =====================================================================
const ReassignGuideModal = ({ booking, onClose, onReassign }) => {
  const [availableGuides, setAvailableGuides] = useState<Guide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAvailableGuides = async () => {
      if (!booking) return;
      try {
        setLoading(true);
        setError('');
        const response = await apiService.get(`/api/guides/all?location=${booking.location}&language=${booking.language}`);
        if (response && response.data) {
          const filteredGuides = response.data.filter(guide => guide._id !== booking.guide._id);
          setAvailableGuides(filteredGuides);
        } else {
          setAvailableGuides([]);
        }
      } catch (err) {
        setError('Failed to fetch available guides.');
        console.error("Error fetching guides:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableGuides();
  }, [booking]);

  const handleSubmit = () => {
    if (!selectedGuide) {
      alert('Please select a new guide.');
      return;
    }
    onReassign(selectedGuide);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4">Reassign Guide</h2>
        <p className="mb-4 text-sm text-gray-600">Select a new guide for the booking at <strong>{booking.location}</strong> who speaks <strong>{booking.language}</strong>.</p>
        {loading && <p className="text-center p-4">Loading...</p>}
        {error && <p className="text-center p-4 text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="space-y-4">
            <select value={selectedGuide} onChange={(e) => setSelectedGuide(e.target.value)} className="w-full p-3 border rounded-md" disabled={availableGuides.length === 0}>
              <option value="">{availableGuides.length > 0 ? 'Select a new guide' : 'No alternative guides found'}</option>
              {availableGuides.map(guide => <option key={guide._id} value={guide._id}>{guide.name}</option>)}
            </select>
            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-md">Cancel</button>
              <button onClick={handleSubmit} disabled={!selectedGuide} className="px-5 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-300">Confirm</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// =====================================================================
// 2. Main Admin Booking Detail Page Component (REDESIGNED)
// =====================================================================
const AdminBookingDetailPage = () => {
    const { bookingId } = useParams();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { bookings, loading: bookingLoading, error: bookingError } = useSelector((state: RootState) => state.userTourGuideBookings);
    const booking = bookings.find(b => b._id === bookingId);

    const handleReassignConfirm = (newGuideId: string) => {
        if (!bookingId) return;
        dispatch(reassignGuideThunk({ bookingId: String(bookingId), newGuideId }))
          .unwrap()
          .then(() => {
              alert('Guide successfully reassigned!');
              setIsModalOpen(false);
          })
          .catch(err => alert(`Error: ${err}`));
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        const originalStatus = booking?.status;

        if (!booking || newStatus === originalStatus) return;

        if (newStatus === "Cancelled") {
            if (window.confirm("Are you sure you want to cancel this booking? This will process a refund.")) {
                const reason = prompt("Reason for cancellation (Required):");
                if (reason && reason.trim()) {
                    dispatch(cancelBookingByAdmin({ bookingId: String(bookingId), reason }));
                } else {
                    alert("A reason is required.");
                    e.target.value = originalStatus;
                }
            } else {
                e.target.value = originalStatus;
            }
        } else {
            if (window.confirm(`Change status to "${newStatus}"?`)) {
                dispatch(updateBookingStatusThunk({ bookingId: String(bookingId), status: newStatus as 'Upcoming' | 'Completed' }))
                    .unwrap()
                    .catch(err => {
                        alert(`Failed to update status: ${err}`);
                        e.target.value = originalStatus;
                    });
            } else {
                e.target.value = originalStatus;
            }
        }
    };

    // --- Render Logic ---
    if (bookingLoading && !booking) return <p className="text-center p-8 text-lg">Loading booking details...</p>;
    if (bookingError) return <p className="text-center p-8 text-lg text-red-600">Error: {bookingError}</p>;
    if (!booking) return <div className="text-center p-8"><p className="text-xl text-red-600">Booking Not Found</p><button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">&larr; Back to Bookings</button></div>;

    const guideName = typeof booking.guide === 'object' ? booking.guide.name : 'N/A';
    const originalGuideName = typeof booking.originalGuide === 'object' ? booking.originalGuide.name : null;
    const userName = typeof booking.user === 'object' ? booking.user.name : 'N/A';

    const StatusBadge = ({ status }) => {
        const styles = {
            Upcoming: 'bg-blue-100 text-blue-800',
            Completed: 'bg-green-100 text-green-800',
            Cancelled: 'bg-red-100 text-red-800',
        };
        return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };

    return (
        <>
            {isModalOpen && <ReassignGuideModal booking={booking} onClose={() => setIsModalOpen(false)} onReassign={handleReassignConfirm} />}

            <div className="container mx-auto p-4 sm:p-6 max-w-5xl bg-gray-50 min-h-screen">
                
                {/* --- HEADER / COMMAND CENTER --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <button onClick={() => router.back()} className="text-blue-600 hover:underline mb-2">&larr; Back to All Bookings</button>
                        <h1 className="text-3xl font-bold text-gray-800">Booking Details</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <select
                            id="status-select"
                            value={booking.status}
                            onChange={handleStatusChange}
                            disabled={booking.status === 'Completed' || booking.status === 'Cancelled'}
                            className="p-2 border border-gray-300 rounded-md font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        {booking.status === 'Upcoming' && (
                            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow hover:bg-yellow-600">
                              Reassign Guide
                            </button>
                        )}
                    </div>
                </div>

                {/* --- HIGHLIGHTED KPI CARD --- */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-white p-4 rounded-lg shadow-md border">
                    <div className="p-2">
                        <p className="text-sm text-gray-500">Status</p>
                        <div className="mt-1"><StatusBadge status={booking.status} /></div>
                    </div>
                    <div className="p-2">
                        <p className="text-sm text-gray-500">Booked By</p>
                        <p className="text-lg font-semibold text-gray-800">{userName}</p>
                    </div>
                    <div className="p-2">
                        <p className="text-sm text-gray-500">Current Guide</p>
                        <p className="text-lg font-semibold text-gray-800">{guideName}</p>
                    </div>
                    <div className="p-2">
                        <p className="text-sm text-gray-500">Dates</p>
                        <p className="text-lg font-semibold text-gray-800">{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</p>
                    </div>
                    <div className="p-2">
                        <p className="text-sm text-gray-500">Total Price</p>
                        <p className="text-lg font-semibold text-gray-800">₹{booking.totalPrice.toLocaleString()}</p>
                    </div>
                </div>
                
                {/* --- DETAILS CARDS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Contact & Booking Details Card */}
                        <div className="bg-white p-6 rounded-lg shadow-md border">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Booking & Contact Info</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                                <div><strong>Contact Name:</strong> {booking.contactInfo.fullName}</div>
                                <div><strong>Contact Phone:</strong> {booking.contactInfo.phone}</div>
                                <div><strong>Contact Email:</strong> {booking.contactInfo.email}</div>
                                <div><strong>Travelers:</strong> {booking.numberOfTravelers}</div>
                                <div><strong>Location:</strong> {booking.location}</div>
                                <div><strong>Language:</strong> {booking.language}</div>
                                {originalGuideName && <div className="sm:col-span-2 text-sm"><strong>Originally Booked Guide:</strong> {originalGuideName}</div>}
                            </div>
                        </div>

                        {/* Payment Details Card */}
                        <div className="bg-white p-6 rounded-lg shadow-md border">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Payment Details</h2>
                            <div className="space-y-2 text-gray-600">
                                <div className="flex justify-between"><span>Payment Status:</span> <strong className="text-gray-800">{booking.paymentStatus}</strong></div>
                                <div className="flex justify-between"><span>Advance Paid:</span> <strong className="text-gray-800">₹{booking.advanceAmount.toLocaleString()}</strong></div>
                                <div className="flex justify-between"><span>Remaining Amount:</span> <strong className="text-gray-800">₹{booking.remainingAmount.toLocaleString()}</strong></div>
                                <hr className="my-2"/>
                                <div className="flex justify-between text-lg"><strong>Total Price:</strong> <strong className="text-gray-900">₹{booking.totalPrice.toLocaleString()}</strong></div>
                                <div className="text-xs text-gray-400 pt-2">Payment ID: {booking.razorpayPaymentId}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Cancellation Info Card (Conditional) */}
                        {booking.status === 'Cancelled' && (
                            <div className="bg-red-50 border border-red-200 p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold text-red-800 mb-4 border-b border-red-200 pb-2">Cancellation Details</h2>
                                <div className="space-y-2 text-red-700">
                                    <div><strong>Cancelled By:</strong> {booking.cancelledBy}</div>
                                    <div><strong>Reason:</strong> {booking.cancellationReason || 'No reason provided.'}</div>
                                    <div><strong>Refund ID:</strong> {booking.razorpayRefundId}</div>
                                </div>
                            </div>
                        )}
                        
                        {/* System Info Card */}
                        <div className="bg-white p-6 rounded-lg shadow-md border text-sm text-gray-500">
                             <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">System Info</h2>
                             <p><strong>Booking ID:</strong> {booking._id}</p>
                             <p><strong>Created On:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
                             <p><strong>Last Updated:</strong> {new Date(booking.updatedAt).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminBookingDetailPage;