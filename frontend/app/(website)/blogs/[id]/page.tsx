"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBlogs } from "@/lib/redux/thunks/blog/blogThunks";
import { Blog } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { blogs, loading } = useSelector((state: RootState) => state.blogs);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // If blogs not loaded, fetch them
    if (blogs.length === 0) {
      dispatch(fetchBlogs({ limit: 100 }));
    }
  }, [dispatch, blogs.length]);

  useEffect(() => {
    // Find the blog by id once blogs are loaded
    if (blogs.length > 0 && params.id) {
      const foundBlog = blogs.find((b) => b.id === params.id);
      setBlog(foundBlog || null);
    }
  }, [blogs, params.id]);

  const handleVideoError = () => {
    console.error("Video failed to load");
    setVideoError(true);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="aspect-video bg-gray-200 rounded-xl mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="bg-white rounded-xl shadow-md p-12 max-w-md mx-auto">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Blog Not Found
              </h1>
              <p className="text-gray-600 mb-6">
                The blog post you're looking for doesn't exist or has been
                removed.
              </p>
              <Button onClick={() => router.push("/blogs")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Blogs
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/blogs")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Experiences
        </Button>

        {/* Video Player */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="relative aspect-video bg-gray-900">
            {blog.videoFilename ? (
              videoError ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-8">
                  <svg
                    className="w-16 h-16 text-red-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className="text-lg font-semibold mb-2">Video Loading Error</p>
                  <p className="text-sm text-gray-400 text-center">
                    Unable to load the video. The file may be missing or in an unsupported format.
                  </p>
                </div>
              ) : (
                <video
                  controls
                  className="w-full h-full"
                  controlsList="nodownload"
                  preload="metadata"
                  onError={handleVideoError}
                  key={blog.videoFilename}
                >
                  <source
                    src={`${API_URL}/media/blogs/${blog.videoFilename}`}
                    type="video/mp4"
                  />
                  <source
                    src={`${API_URL}/media/blogs/${blog.videoFilename}`}
                    type="video/webm"
                  />
                  <source
                    src={`${API_URL}/media/blogs/${blog.videoFilename}`}
                    type="video/ogg"
                  />
                  Your browser does not support the video tag.
                </video>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-8">
                <Play className="w-16 h-16 text-gray-500 mb-4" />
                <p className="text-lg font-semibold">No Video Available</p>
                <p className="text-sm text-gray-400 mt-2">
                  This blog post doesn't have a video attached.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Blog Content */}
        <div className="bg-white rounded-xl shadow-md p-8">
          {/* Description with Country Flag beside it */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              About This Experience
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Country Flag Image on the left/top */}
              {blog.hasImage && blog.imageFilename && (
                <div className="relative w-full md:w-48 h-32 md:h-32 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                  <Image
                    src={`${API_URL}/media/blogs/${blog.imageFilename}`}
                    alt="Country flag"
                    fill
                    className="object-contain bg-white"
                    priority
                  />
                </div>
              )}
              {/* Description on the right/bottom */}
              <div className="flex-1 prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {blog.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => router.push("/blogs")}
            className="gap-2"
          >
            View More Experiences
          </Button>
        </div>
      </div>
    </div>
  );
}