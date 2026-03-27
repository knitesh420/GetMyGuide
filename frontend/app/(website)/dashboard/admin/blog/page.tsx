"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import Image from "next/image";
import { AppDispatch, RootState } from "@/lib/store";
// ✅ Import all necessary thunks for full functionality
import {
  fetchBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
} from "@/lib/redux/thunks/blog/blogThunks";
import { Blog } from "@/lib/data"; // Make sure this type matches the one in your modal
import { toast } from "react-toastify";

// ✅ Import your updated modal
import { BlogFormModal } from "@/components/admin/CreateBlogModal";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FilePenLine, Trash2, ExternalLink } from "lucide-react";

// Skeleton Loader Component (no changes needed)
const TableSkeleton = () => (
  <div className="space-y-3 mt-4">
    {[...Array(5)].map((_, i) => (
      <div className="flex items-center space-x-4" key={i}>
        <Skeleton className="h-12 w-12 rounded-md" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);

export default function ManageBlogsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { blogs, loading, error, currentPage, totalPages } = useSelector(
    (state: RootState) => state.blogs
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ✅ State to hold the blog being edited, determining the modal's mode
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  useEffect(() => {
    // Fetch initial blogs when component mounts
    dispatch(fetchBlogs({ page: 1, limit: 10 }));
  }, [dispatch]);

  // --- MODAL AND STATE HANDLERS ---
  const handleOpenCreateModal = () => {
    setEditingBlog(null); // Clear any editing data
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (blog: Blog) => {
    setEditingBlog(blog); // Set the blog to be edited
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBlog(null); // Always clear editing state on close
  };

  // --- MAIN CRUD LOGIC ---

  /**
   * This single function handles both creating and updating a blog post.
   * It checks if `editingBlog` has data to decide which thunk to dispatch.
   */
  const handleFormSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      if (editingBlog) {
        // --- UPDATE LOGIC ---
        await dispatch(
          updateBlog({ id: editingBlog.id, data: formData })
        ).unwrap();
        toast.success("Blog post updated successfully!");
      } else {
        // --- CREATE LOGIC ---
        await dispatch(createBlog(formData)).unwrap();
        toast.success("Blog post created successfully!");
      }
      handleCloseModal(); // Close modal on success
    } catch (err: any) {
      toast.error(err || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * This function handles deleting a blog post.
   */
  const handleDeleteBlog = async (blogId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this blog post? This action cannot be undone."
      )
    ) {
      try {
        await dispatch(deleteBlog(blogId)).unwrap();
        toast.success("Blog deleted successfully!");
      } catch (err: any) {
        toast.error(err || "Failed to delete blog post.");
      }
    }
  };

  // --- PAGINATION & UTILITIES ---
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      dispatch(fetchBlogs({ page: newPage, limit: 10 }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Manage Blogs</CardTitle>
              <CardDescription>
                View, create, edit, or delete blog posts.
              </CardDescription>
            </div>
            <Button className="red-gradient" onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" /> Add New Blog
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-center py-10 text-red-600">
              <p>An error occurred: {error}</p>
            </div>
          ) : (
            <>
              {blogs.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold">No Blogs Found</h3>
                  <p className="text-muted-foreground mt-2">
                    Get started by creating your first blog post.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px] hidden sm:table-cell">
                          Image
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Published On
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blogs.map((blog: Blog) => (
                        <TableRow key={blog.id}>
                          <TableCell className="hidden sm:table-cell">
                            <Image
                              src={blog.thumbnail || "/placeholder-image.png"}
                              alt={blog.title}
                              width={64}
                              height={64}
                              className="rounded-md object-cover aspect-square"
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-[250px] truncate">
                            {blog.title}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={blog.published ? "default" : "outline"}
                            >
                              {blog.published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(blog.publishedAt)}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Link href={`/blog/${blog.slug}`} target="_blank">
                              <Button
                                variant="outline"
                                size="icon"
                                title="View Post"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            {/* ✅ WORKING EDIT BUTTON */}
                            <Button
                              variant="outline"
                              size="icon"
                              title="Edit"
                              onClick={() => handleOpenEditModal(blog)}
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                            {/* ✅ WORKING DELETE BUTTON */}
                            <Button
                              variant="destructive"
                              size="icon"
                              title="Delete"
                              onClick={() => handleDeleteBlog(blog.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Conditionally render the modal and pass all required props */}
      {isModalOpen && (
        <BlogFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
          isLoading={isSubmitting}
          initialData={editingBlog}
        />
      )}
    </div>
  );
}
