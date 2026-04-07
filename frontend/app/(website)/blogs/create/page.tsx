"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { createBlog } from "@/lib/redux/thunks/blog/blogThunks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  X,
  Youtube,
  Image as ImageIcon,
  ArrowLeft,
  Upload,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

/** Extract YouTube video ID from a URL for preview purposes */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function CreateBlogPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const videoId = extractVideoId(youtubeUrl);

  // Check authentication and admin role
  React.useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to create a blog post",
        variant: "destructive",
      });
      router.push("/login");
    } else if (user?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only admins can create blog posts",
        variant: "destructive",
      });
      router.push("/blogs");
    }
  }, [isAuthenticated, user, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const allowedTypes = ["image/png", "image/webp", "image/jpg", "image/jpeg"];

    if (file && allowedTypes.includes(file.type)) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a valid image file (PNG, JPG, or WEBP)",
        variant: "destructive",
      });
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({
        title: "Validation error",
        description: "Description is required.",
        variant: "destructive",
      });
      return;
    }

    if (!youtubeUrl.trim()) {
      toast({
        title: "Validation error",
        description: "YouTube URL is required",
        variant: "destructive",
      });
      return;
    }

    if (!videoId) {
      toast({
        title: "Validation error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (hasImage && !imageFile) {
      toast({
        title: "Validation error",
        description:
          'Please upload a country flag image or uncheck "Include Country Flag"',
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("description", description.trim());
    formData.append("youtubeUrl", youtubeUrl.trim());
    formData.append("hasImage", String(hasImage));

    if (hasImage && imageFile) {
      formData.append("image", imageFile);
    }

    setIsLoading(true);

    try {
      await dispatch(createBlog(formData)).unwrap();

      toast({
        title: "Success!",
        description: "Blog post created successfully",
      });

      router.push("/blogs");
    } catch (error: any) {
      console.error("Failed to create blog:", error);

      let errorMessage = "Failed to create blog post. Please try again.";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/blogs">
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Blogs
            </Button>
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Create New Blog Post
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Share an amazing tour experience with YouTube videos and country flags.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this amazing tour experience..."
                className="min-h-[150px] resize-y"
                required
              />
              <p className="text-sm text-gray-500">
                Share details about the location, experience, and what makes it
                special.
              </p>
            </div>

            {/* YouTube URL */}
            <div className="space-y-2">
              <Label htmlFor="youtube-url" className="text-base font-semibold">
                YouTube Video URL <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                <Input
                  id="youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                Paste a YouTube video link. Both youtube.com and youtu.be formats are supported.
              </p>

              {/* YouTube Preview */}
              {videoId && (
                <div className="mt-3 border-2 border-gray-200 rounded-xl overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-3 bg-gray-50 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Video detected — ID: {videoId}
                    </span>
                  </div>
                </div>
              )}

              {youtubeUrl.trim() && !videoId && (
                <p className="text-sm text-red-500 mt-1">
                  Could not detect a valid YouTube video ID from this URL.
                </p>
              )}
            </div>

            {/* Include Country Flag Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="hasImage"
                checked={hasImage}
                onChange={(e) => setHasImage(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="hasImage"
                  className="cursor-pointer font-semibold text-gray-900"
                >
                  Include a country flag
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Add a country flag image that will be displayed beside the
                  description
                </p>
              </div>
            </div>

            {/* Country Flag Image Upload (Conditional) */}
            {hasImage && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label
                  htmlFor="image-upload"
                  className="text-base font-semibold"
                >
                  Country Flag <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-3">
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {!imagePreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("image-upload")?.click()
                      }
                      className="w-full h-48 border-2 border-dashed hover:border-primary hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-4">
                          <ImageIcon className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="text-center">
                          <span className="font-semibold text-gray-900 block">
                            Click to upload country flag
                          </span>
                          <span className="text-sm text-gray-500 mt-1 block">
                            PNG, JPG, or WEBP (flag image recommended)
                          </span>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 z-10 shadow-lg"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="p-4">
                        <img
                          src={imagePreview}
                          alt="Country flag preview"
                          className="w-full rounded-lg max-h-96 object-contain bg-white"
                        />
                        {imageFile && (
                          <div className="mt-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {imageFile.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  This flag will appear beside the description in the blog
                  detail page.
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/blogs")}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Create Blog Post
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
