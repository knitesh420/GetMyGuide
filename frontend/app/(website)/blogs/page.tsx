"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBlogs } from "@/lib/redux/thunks/blog/blogThunks";
import { Blog } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Plus, Play, Pause } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Skeleton Component for Loading State ---
const CardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col animate-pulse">
    <div className="relative w-full h-48 bg-gray-200"></div>
    <div className="p-6 flex flex-col flex-grow">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  </div>
);

// --- Video Card Component with Play/Pause ---
function BlogVideoCard({ blog }: { blog: Blog }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const router = useRouter();

  const videoSrc = blog.videoFilename
    ? `${API_URL}/media/blogs/${blog.videoFilename}`
    : "";

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const video = videoRef.current;
      if (!video || videoError) return;

      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Video play failed:", err);
            setIsPlaying(false);
          });
      }
    },
    [isPlaying, videoError],
  );

  const handleCardClick = useCallback(() => {
    router.push(`/blogs/${blog.id}`);
  }, [router, blog.id]);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) video.currentTime = 0;
  }, []);

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ease-in-out h-full flex flex-col cursor-pointer"
    >
      {/* Video with Play/Pause */}
      <div className="relative w-full h-48 bg-gray-900 overflow-hidden">
        {blog.videoFilename && !videoError ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            preload="auto"
            muted
            playsInline
            onEnded={handleVideoEnd}
            onError={() => setVideoError(true)}
            src={`${videoSrc}#t=0.1`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Play className="w-16 h-16 text-white opacity-50" />
          </div>
        )}
        {/* Play/Pause Button Overlay */}
        {blog.videoFilename && !videoError && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all duration-300"
          >
            <div
              className={`bg-white/90 rounded-full p-3 shadow-lg transition-opacity duration-300 ${
                isPlaying
                  ? "opacity-0 group-hover:opacity-100"
                  : "opacity-100"
              }`}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-gray-900" />
              ) : (
                <Play className="w-8 h-8 text-gray-900" />
              )}
            </div>
          </button>
        )}
      </div>

      <div className="p-6 flex flex-row gap-4 items-start flex-grow">
        <p className="text-gray-700 line-clamp-3 leading-relaxed flex-1">
          {blog.description}
        </p>
        {blog.imageFilename && (
          <div className="relative w-15 h-8 flex-shrink-0 rounded-lg overflow-hidden">
            <Image
              src={`${API_URL}/media/blogs/${blog.imageFilename}`}
              alt={blog.description.slice(0, 50)}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function BlogListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { blogs, loading, error } = useSelector(
    (state: RootState) => state.blogs,
  );
  const { user } = useSelector((state: RootState) => state.auth);

  // Check if user is admin
  const admin = user?.role === "admin";

  // Fetch blogs when the component mounts
  useEffect(() => {
    dispatch(fetchBlogs({ limit: 100 }));
  }, [dispatch]);

  return (
    <div className="bg-gray-50 min-h-screen py-5">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-12 gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              Travel Experiences
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-500">
              Watch amazing tour experiences and travel stories from our
              community.
            </p>
          </div>
          {admin && (
            <Link href="/blogs/create">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create New Blog
              </Button>
            </Link>
          )}
        </div>

        {/* Content Area */}
        <div>
          {loading ? (
            // --- Loading State ---
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            // --- Error State ---
            <div className="text-center py-20">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
                <h2 className="text-2xl font-semibold text-red-900 mb-2">
                  An Error Occurred
                </h2>
                <p className="text-red-700">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => dispatch(fetchBlogs({ limit: 100 }))}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : blogs.length > 0 ? (
            // --- Success State ---
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogs
                .filter((blog) => blog && blog.id)
                .map((blog: Blog) => (
                  <BlogVideoCard key={blog.id} blog={blog} />
                ))}
            </div>
          ) : (
            // --- Empty State ---
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <svg
                  className="mx-auto h-24 w-24 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <h2 className="mt-6 text-2xl font-semibold text-gray-900">
                  No Experiences Yet
                </h2>
                <p className="mt-2 text-gray-600">
                  Be the first to share an amazing travel experience!
                </p>
                {admin && (
                  <Link href="/blogs/create">
                    <Button className="mt-6 gap-2">
                      <Plus className="w-4 h-4" />
                      Create First Blog
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
