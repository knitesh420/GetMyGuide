import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";

const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message =
    error.response?.data?.message || error.message || "An unknown error occurred";
  return rejectWithValue(message);
};

export interface ChatMessage {
  _id: string;
  booking: string;
  sender: { _id: string; name: string; role: string };
  senderRole: "tourist" | "guide" | "admin";
  body: string;
  readBy: string[];
  createdAt: string;
}

export interface ChatThread {
  bookingId: string;
  bookingCode: string | null;
  city: string;
  date: string;
  status: string;
  touristName: string;
  unreadCount: number;
  messageCount: number;
  lastMessage: {
    body: string;
    senderRole: "tourist" | "guide" | "admin";
    createdAt: string;
  };
}

/**
 * Fetch a booking's thread. Pass `after` (the newest message id already held) to
 * get only what has arrived since — that is what keeps the poll cheap instead of
 * re-downloading the whole conversation every few seconds.
 */
export const fetchThread = createAsyncThunk<
  { bookingId: string; messages: ChatMessage[]; append: boolean },
  { bookingId: string; after?: string },
  { rejectValue: string }
>("message/fetchThread", async ({ bookingId, after }, { rejectWithValue }) => {
  try {
    const query = after ? `?after=${after}` : "";
    const response = await apiService.get<ChatMessage[]>(
      `/message/booking/${bookingId}${query}`,
    );
    return {
      bookingId,
      messages: (response.data ?? []) as ChatMessage[],
      append: !!after,
    };
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const sendMessage = createAsyncThunk<
  ChatMessage,
  { bookingId: string; body: string },
  { rejectValue: string }
>("message/send", async ({ bookingId, body }, { rejectWithValue }) => {
  try {
    const response = await apiService.post<ChatMessage>(`/message/booking/${bookingId}`, {
      body,
    });
    return response.data as ChatMessage;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const fetchThreads = createAsyncThunk<ChatThread[], void, { rejectValue: string }>(
  "message/fetchThreads",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ data: ChatThread[] }>("/message/threads");
      return (response.data?.data ?? []) as ChatThread[];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const fetchUnreadMessageCount = createAsyncThunk<number, void, { rejectValue: string }>(
  "message/unreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ count: number }>("/message/unread-count");
      return response.data?.count ?? 0;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
