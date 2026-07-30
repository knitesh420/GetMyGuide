"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchBlogById } from "@/lib/redux/thunks/blog/blogThunks";
import { clearCurrentBlog } from "@/lib/redux/blogSlice";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  // Fetch just this post by id (via GET /blog/:id) rather than pulling the whole
  // list and finding it client-side — the old approach capped at 100 blogs and
  // showed "not found" for anything past that.
  const { currentBlog: blog, loading, error } = useSelector(
    (state: RootState) => state.blogs,
  );

  useEffect(() => {
    if (params.id) {
      dispatch(fetchBlogById(String(params.id)));
    }
    return () => {
      dispatch(clearCurrentBlog());
    };
  }, [dispatch, params.id]);

  // Show the skeleton while the request is in flight, and also in the brief
  // window before it is dispatched (no blog, no error yet) so the "not found"
  // card never flashes on a valid post.
  if (loading || (!blog && !error)) {
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
                The blog post you&apos;re looking for doesn&apos;t exist or has been
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

        {/* YouTube Video Player */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="relative aspect-video bg-gray-900">
            {blog.videoId ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${blog.videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-8">
                <Play className="w-16 h-16 text-gray-500 mb-4" />
                <p className="text-lg font-semibold">No Video Available</p>
                <p className="text-sm text-gray-400 mt-2">
                  This blog post doesn&apos;t have a video attached.
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
