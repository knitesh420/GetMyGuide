// Example: How to add the Advertisement Manager to your admin dashboard
// Place this in your admin page or create a new route for advertisement management

"use client";
import AdminAdvertisementManager from "@/components/admin/AdminAdvertisementManager";

/**
 * Admin Advertisement Management Page
 *
 * Route: /admin/advertisements (or wherever your admin section is)
 * Requirements: User must be logged in with admin role
 */
export default function AdminAdvertisementsPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Advertisement Management
          </h1>
          <p className="text-gray-600 mt-2">
            Create, update, and manage your website advertisements
          </p>
        </header>

        {/* Advertisement Manager Component */}
        <AdminAdvertisementManager />
      </div>
    </div>
  );
}

/**
 * Features:
 * - Create new advertisements by uploading video files
 * - Edit existing advertisements and replace videos
 * - Toggle advertisements between active/inactive
 * - Delete advertisements
 * - View all advertisements with details
 * - Track view counts
 *
 * Usage:
 * 1. Upload a video file in the "New Advertisement" section
 * 2. Click "Create" to add it to the website
 * 3. Use the table below to manage existing advertisements
 * 4. Toggle active/inactive as needed
 * 5. Edit to replace the video file
 * 6. Delete when no longer needed
 */
