import { createSlice } from "@reduxjs/toolkit";
import {
  ChatMessage,
  ChatThread,
  fetchThread,
  fetchThreads,
  fetchUnreadMessageCount,
  sendMessage,
} from "./thunks/message/messageThunks";

interface MessageState {
  /** Messages keyed by booking id — a user may have several threads open. */
  threadsByBooking: Record<string, ChatMessage[]>;
  threads: ChatThread[];
  unreadCount: number;
  loading: boolean;
  sending: boolean;
  error: string | null;
}

const initialState: MessageState = {
  threadsByBooking: {},
  threads: [],
  unreadCount: 0,
  loading: false,
  sending: false,
  error: null,
};

/**
 * Append without duplicating. The poll and the optimistic echo of a just-sent
 * message can both deliver the same document, so dedupe on id rather than
 * trusting either path to be the only one.
 */
function merge(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return existing;

  const seen = new Set(existing.map((m) => m._id));
  const fresh = incoming.filter((m) => !seen.has(m._id));
  if (fresh.length === 0) return existing;

  return [...existing, ...fresh];
}

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    clearMessageError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThread.pending, (state, action) => {
        // Only the first load of a thread shows a spinner; a poll (which carries
        // `after`) must not blank out the conversation the user is reading.
        if (!action.meta.arg.after) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchThread.fulfilled, (state, action) => {
        state.loading = false;
        const { bookingId, messages, append } = action.payload;
        state.threadsByBooking[bookingId] = append
          ? merge(state.threadsByBooking[bookingId] ?? [], messages)
          : messages;
      })
      .addCase(fetchThread.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load the conversation";
      })

      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        const bookingId = action.meta.arg.bookingId;
        state.threadsByBooking[bookingId] = merge(state.threadsByBooking[bookingId] ?? [], [
          action.payload,
        ]);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload ?? "Your message could not be sent";
      })

      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.threads = action.payload;
      })
      .addCase(fetchUnreadMessageCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const { clearMessageError } = messageSlice.actions;
export default messageSlice.reducer;
