// app/dashboard/admin/guides/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import type { AppDispatch, RootState } from "@/lib/store";
import type { GuideProfile } from "@/lib/data"; // Use the correct, shared type

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { EditGuideSheet } from "@/components/admin/EditGuideSheet";

// Import Redux Thunks and Actions
import {
  adminGetAllGuides as getAllGuides,
  toggleGuideApproval,
  deleteGuide,
} from "@/lib/redux/thunks/guide/guideThunk";

// --- A custom hook to debounce input ---
const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// --- HELPER FUNCTION (UPDATED) ---
const calculateProfileCompletion = (guide: GuideProfile): number => {
  let score = 0;
  const totalPoints = 11; // Total criteria for a 100% complete profile

  if (guide.name) score++;
  if (guide.email) score++;
  if (guide.mobile) score++;
  if (guide.state && guide.country) score++;
  if (guide.experience) score++;
  if (guide.description) score++;
  if (guide.photo) score++; // Profile picture
  if (guide.license) score++; // License document
  if (guide.languages?.length > 0) score++;
  if (guide.specializations?.length > 0) score++;
  if (guide.isCertified) score++; // ✅ Subscription/Certification status

  return Math.round((score / totalPoints) * 100);
};

export default function GuidesAdminPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { guides, pagination, loading, error } = useSelector(
    (state: RootState) => state.guide
  );

  // State for UI controls
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay

  const [showSheet, setShowSheet] = useState(false);
  const [editingGuide, setEditingGuide] = useState<GuideProfile | null>(null);

  // Fetch guides when page or search term changes
  useEffect(() => {
    dispatch(getAllGuides({ page, limit: 10, search: debouncedSearchTerm }));
  }, [dispatch, page, debouncedSearchTerm]);

  // Display error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleEditClick = (guide: GuideProfile) => {
    setEditingGuide(guide);
    setShowSheet(true);
  };

  // This function is passed to the sheet
  const handleSave = (guideId: string, data: any) => {
    console.log("Saving guide:", guideId, data);
    // Here you would dispatch an admin-specific update thunk
    toast.success("Guide profile saved successfully!");
    setShowSheet(false);
    // Refetch data to show updates
    dispatch(getAllGuides({ page, limit: 10, search: debouncedSearchTerm }));
  };

  // This function is passed to the sheet
  const handleDelete = (guideId: string) => {
    if (window.confirm("Are you sure you want to delete this guide?")) {
      dispatch(deleteGuide(guideId)).then((result) => {
        if (deleteGuide.fulfilled.match(result)) {
          toast.success("Guide deleted successfully!");
          setShowSheet(false);
        } else {
          toast.error("Failed to delete guide.");
        }
      });
    }
  };

  // This function is passed to the sheet
  const handleToggleApproval = (guideId: string, currentStatus: boolean) => {
    dispatch(toggleGuideApproval({ id: guideId, isApproved: !currentStatus }))
      .then((result) => {
        if (toggleGuideApproval.fulfilled.match(result)) {
          toast.success("Approval status updated!");
          // Update the guide state in the sheet for immediate UI feedback
          setEditingGuide(result.payload);
        } else {
          toast.error("Failed to update status.");
        }
      });
  };

  const renderTableContent = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={4} className="text-center py-10">
            <div className="flex justify-center items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading guides...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (!guides || guides.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="text-center py-10 text-muted-foreground">
            No guides found.
          </td>
        </tr>
      );
    }

    return guides.map((guide) => {
      const completion = calculateProfileCompletion(guide);
      return (
        <tr key={guide._id}>
          <td className="px-6 py-4">
            <div className="flex items-center gap-4">
              <img
                src={guide.photo || "/placeholder.png"}
                alt={guide.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold">{guide.name}</div>
                <div className="text-sm text-muted-foreground">
                  {guide.email}
                </div>
              </div>
            </div>
          </td>
          <td className="px-6 py-4 text-center">
            <CircularProgress
              progress={completion}
              size={50}
              strokeWidth={5}
            />
          </td>
          <td className="px-6 py-4 text-center">
            <Badge
              variant={guide.isApproved ? "default" : "destructive"}
              className="cursor-pointer"
              onClick={() =>
                handleToggleApproval(guide._id, guide.isApproved)
              }
            >
              {guide.isApproved ? "Approved" : "Pending"}
            </Badge>
          </td>
          <td className="px-6 py-4 text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditClick(guide)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Manage
            </Button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Guides Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage, approve, and view all registered tour guides.
            </p>
          </div>
          <Button className="red-gradient">
            <Plus className="w-4 h-4 mr-2" /> Add New Guide
          </Button>
        </div>

        <Card className="mb-8 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left uppercase tracking-wider text-sm">
                  Guide
                </th>
                <th className="px-6 py-3 text-center uppercase tracking-wider text-sm">
                  Profile %
                </th>
                <th className="px-6 py-3 text-center uppercase tracking-wider text-sm">
                  Status
                </th>
                <th className="px-6 py-3 text-right uppercase tracking-wider text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {renderTableContent()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-end items-center mt-6">
            <span className="text-sm text-muted-foreground mr-4">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {editingGuide && (
        <EditGuideSheet
          isOpen={showSheet}
          onOpenChange={setShowSheet}
          guide={editingGuide}
          onDelete={handleDelete}
          onToggleApproval={() =>
            handleToggleApproval(editingGuide._id, editingGuide.isApproved)
          }
        />
      )}
    </div>
  );
}