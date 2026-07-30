// lib/redux/slices/blogSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Blog } from "@/lib/data";
import {
  fetchBlogs,
  fetchBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} from "./thunks/blog/blogThunks";

// Define the shape of the blog state
interface BlogState {
  blogs: Blog[];
  currentBlog: Blog | null; // For viewing a single blog post
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
}

// Define the initial state
const initialState: BlogState = {
  blogs: [],
  currentBlog: null,
  loading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
};

const blogSlice = createSlice({
  name: "blogs",
  initialState,
  reducers: {
    // A regular reducer to clear the currently viewed blog, e.g., when a user navigates away
    clearCurrentBlog: (state) => {
      state.currentBlog = null;
    },
  },
  // Handle actions defined by createAsyncThunk
  extraReducers: (builder) => {
    builder
      // --- Fetch All Blogs ---
      .addCase(fetchBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.blogs = action.payload.data;
        state.totalPages = action.payload.totalPages ?? 1;
        state.currentPage = action.payload.currentPage ?? 1;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // --- Fetch Single Blog By ID ---
      .addCase(fetchBlogById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentBlog = null; // Clear previous blog while loading a new one
      })
      .addCase(
        fetchBlogById.fulfilled,
        (state, action: PayloadAction<Blog>) => {
          state.loading = false;
          state.currentBlog = action.payload;
        }
      )
      .addCase(fetchBlogById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // --- Create Blog ---
      .addCase(createBlog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBlog.fulfilled, (state, action: PayloadAction<Blog>) => {
        state.loading = false;
        state.blogs.unshift(action.payload);
        // ✅ CHANGED: Set the newly created blog as the current one
        state.currentBlog = action.payload;
      })
      .addCase(createBlog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // --- Update Blog ---
      .addCase(updateBlog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBlog.fulfilled, (state, action: PayloadAction<Blog>) => {
        state.loading = false;
        const index = state.blogs.findIndex(
          (blog) => blog.id === action.payload.id
        );
        if (index !== -1) {
          state.blogs[index] = action.payload;
        }
        if (state.currentBlog?.id === action.payload.id) {
          state.currentBlog = action.payload;
        }
      })
      .addCase(updateBlog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // --- Delete Blog ---
      .addCase(deleteBlog.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBlog.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.blogs = state.blogs.filter((blog) => blog.id !== action.payload);
        // ✅ CHANGED: If the deleted blog was being viewed, clear it
        if (state.currentBlog?.id === action.payload) {
          state.currentBlog = null;
        }
      })
      .addCase(deleteBlog.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentBlog } = blogSlice.actions;

export default blogSlice.reducer;
