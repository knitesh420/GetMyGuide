// lib/redux/thunks/blogThunks.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { Blog, BlogListResponse } from "@/lib/data";

// The resource path for the blog API. The base URL is handled by apiService.
const RESOURCE_PATH = "/blog";

/**
 * Fetches a paginated list of all blogs.
 * The thunk is typed to return a `BlogListResponse`, which our slice expects.
 */
export const fetchBlogs = createAsyncThunk<
  BlogListResponse,
  { page?: number; limit?: number; search?: string } | void
>("blogs/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const response = await apiService.get<{ blogs: Blog[] }>(
      RESOURCE_PATH,
      { params: params || undefined }
    );

    // Backend returns { success, data: { blogs: [...] } }
    // apiService unwraps axios response, so response = { success, data: { blogs } }
    return {
      success: response.success,
      message: "Blogs fetched successfully",
      data: response.data?.blogs || [],
    };
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch blogs");
  }
});

/**
 * Fetches a single blog post by its ID.
 * The thunk is typed to return a `Blog` object.
 */
export const fetchBlogById = createAsyncThunk<Blog, string>(
  "blogs/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Blog>(`${RESOURCE_PATH}/${id}`);
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch blog");
    }
  }
);

/**
 * Creates a new blog post. Expects `FormData` for file uploads.
 * The thunk is typed to return the newly created `Blog` object.
 */
export const createBlog = createAsyncThunk<Blog, FormData>(
  "blogs/create",
  async (blogFormData, { rejectWithValue }) => {
    try {
      // Make sure the FormData has a field named "thumbnail"
      // Example of how it should be created:
      // const formData = new FormData();
      // formData.append('title', title);
      // formData.append('content', content);
      // formData.append('slug', slug);
      // formData.append('tags', JSON.stringify(tags));
      // formData.append('published', published);
      // formData.append('thumbnail', imageFile); // ✅ Must be "thumbnail"

      const response = await apiService.post<Blog>(
        RESOURCE_PATH,
        blogFormData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create blog post");
    }
  }
);

export const updateBlog = createAsyncThunk<
  Blog,
  { id: string; data: FormData }
>("blogs/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await apiService.put<Blog>(
      `${RESOURCE_PATH}/${id}`,
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data!;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to update blog post");
  }
});

/**
 * Deletes a blog post by its ID.
 */
export const deleteBlog = createAsyncThunk<string, string>(
  "blogs/delete",
  async (blogId, { rejectWithValue }) => {
    try {
      await apiService.delete(`${RESOURCE_PATH}/${blogId}`);
      return blogId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete blog post");
    }
  }
);
