// pages/admin/testimonials/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { AppDispatch } from "@/lib/store"; // Adjust this import to your store's AppDispatch type

import {
  fetchTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialVisibility,
  clearError,
  setCurrentPage,
  selectAllTestimonials,
} from "@/lib/redux/testimonialSlice"; // Adjust path as needed

import {
  Search, Plus, Edit, Trash2, Eye, EyeOff, Star, MessageSquare, User, Filter,
  ChevronLeft, ChevronRight, RefreshCw, Download, AlertCircle, Video, UploadCloud, X,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/motion-variants"; // Adjust path


const COUNTRY_LIST = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  // Add more as needed...
];

// Form data now uses 'video'
interface TestimonialFormData {
  name: string;
  message: string;
  country: string;
  rating: number;
  video: string; // This holds the existing video URL for display
  position: string;
  isVisible: boolean;
}

export default function TestimonialsAdminPage() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    testimonials,
    loading: isLoading,
    error,
    total,
    page,
    totalPages,
    creating,
    updating,
    deleting,
  } = useSelector(selectAllTestimonials);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<boolean | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);

  // State to manage the actual video file for upload
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<TestimonialFormData>({
    name: "", message: "", country: "IN", rating: 5, video: "", position: "", isVisible: true,
  });

  // Fetch testimonials when parameters change
  useEffect(() => {
    dispatch(
      fetchTestimonials({ page, search: debouncedSearch, visible: visibilityFilter })
    );
  }, [dispatch, page, debouncedSearch, visibilityFilter]);

  const handlePageChange = (newPage: number) => {
    dispatch(setCurrentPage(newPage));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = new FormData();
    submissionData.append("name", formData.name);
    submissionData.append("message", formData.message);
    submissionData.append("country", formData.country);
    submissionData.append("position", formData.position);
    submissionData.append("rating", String(formData.rating));
    submissionData.append("isVisible", String(formData.isVisible));

    if (videoFile) {
      submissionData.append("video", videoFile);
    }

    try {
      if (editingTestimonial) {
        await dispatch(
          updateTestimonial({
            id: editingTestimonial._id,
            testimonialData: submissionData
          })
        ).unwrap();
      } else {
        await dispatch(createTestimonial(submissionData)).unwrap();
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save testimonial:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this testimonial?")) {
      dispatch(deleteTestimonial(id));
    }
  };

  const handleToggleVisibility = (id: string, currentVisibility: boolean) => {
    dispatch(toggleTestimonialVisibility({ id, isVisible: !currentVisibility }));
  };

  const handleEdit = (testimonial: any) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      message: testimonial.message,
      country: testimonial.country || "IN",
      rating: testimonial.rating || 5,
      video: testimonial.video || "",
      position: testimonial.position || "",
      isVisible: testimonial.isVisible,
    });
    setVideoFile(null); // Clear previous file selection on edit
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", message: "", country: "IN", rating: 5, video: "", position: "", isVisible: true });
    setEditingTestimonial(null);
    setVideoFile(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          {/* Header */}
          <motion.div variants={fadeInUp} className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Testimonials</h1>
              <p className="text-gray-500 mt-1">Manage customer feedback and videos.</p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:bg-blue-700">
              <Plus size={20} /> Add New
            </motion.button>
          </motion.div>

          {/* Testimonials Table */}
          <motion.div variants={fadeInUp} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {isLoading ? <div className="p-8 text-center">Loading...</div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Message</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Rating</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testimonials.map((testimonial) => (
                      <motion.tr key={testimonial._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              {testimonial.video ? <Video className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{testimonial.name}</div>
                              {testimonial.position && <div className="text-sm text-gray-500">{testimonial.position}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm max-w-sm truncate">{testimonial.message}</td>
                        <td className="px-6 py-4 text-center">{testimonial.rating || 'N/A'}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handleToggleVisibility(testimonial._id, testimonial.isVisible)} className={`px-3 py-1 text-xs font-medium rounded-full ${testimonial.isVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {testimonial.isVisible ? 'Visible' : 'Hidden'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(testimonial)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(testimonial._id)} disabled={deleting} className="p-2 text-red-600 hover:bg-red-100 rounded-md disabled:opacity-50"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form fields: Name, Position, Message, Rating */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {COUNTRY_LIST.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-2 border rounded-lg resize-vertical" />
              </div>

              {/* Video File Input Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video File</label>

                {/* --- START: NEW CODE TO SHOW EXISTING VIDEO --- */}
                {editingTestimonial && formData.video && (
                  <div className="mb-4">
                    <p className="block text-xs font-medium text-gray-500 mb-2">Current Video:</p>
                    <video
                      key={formData.video} // Use key to force re-render if URL changes
                      width="100%"
                      controls
                      src={formData.video}
                      className="rounded-lg border bg-gray-100"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
                {/* --- END: NEW CODE --- */}

                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10">
                  <div className="text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500">
                        <span>{editingTestimonial && formData.video ? 'Upload a new video to replace' : 'Upload a file'}</span>
                        <input id="file-upload" name="video" type="file" className="sr-only" accept="video/*" onChange={handleFileChange} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">MP4, MOV, WEBM up to 50MB</p>
                  </div>
                </div>
                {(videoFile || (editingTestimonial && formData.video)) && (
                  <div className="mt-3 text-sm font-medium text-gray-700 flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <p className="truncate">
                      {videoFile ? `New file: ${videoFile.name}` : `Existing file: ${formData.video.split('/').pop()}`}
                    </p>
                    <button type="button" onClick={() => { setVideoFile(null); setFormData(f => ({ ...f, video: '' })); }} className="text-red-500 hover:text-red-700 ml-3"><X size={18} /></button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button type="submit" disabled={creating || updating} className="bg-blue-600 text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                  {creating || updating ? "Saving..." : editingTestimonial ? "Update" : "Create"}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-lg border hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}