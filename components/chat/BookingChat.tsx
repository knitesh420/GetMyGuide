"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchThread, sendMessage } from "@/lib/redux/thunks/message/messageThunks";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** How often to ask for new messages while the thread is on screen. */
const POLL_INTERVAL_MS = 8000;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const ROLE_LABEL: Record<string, string> = {
  tourist: "Traveller",
  guide: "Guide",
  admin: "GetMyGuide",
};

/**
 * The tourist <-> guide conversation for one booking. Admins can read and write
 * into any thread, which is how disputes get resolved without a side channel.
 *
 * Polling, not websockets: the thread is only live while someone is looking at
 * it, and an 8-second lag on a message about tomorrow's tour is not worth a
 * websocket server and sticky sessions on nginx.
 */
export function BookingChat({
  bookingId,
  disabled = false,
  disabledReason,
}: {
  bookingId: string;
  /** True once the booking is cancelled — the backend refuses writes either way. */
  disabled?: boolean;
  disabledReason?: string;
}) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { threadsByBooking, loading, sending } = useAppSelector((state) => state.messages);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => threadsByBooking[bookingId] ?? [],
    [threadsByBooking, bookingId],
  );

  // Keep the cursor in a ref rather than a dep of the poll effect: making the
  // interval depend on the newest id would tear down and recreate the timer on
  // every single message.
  const lastIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    lastIdRef.current = messages.length ? messages[messages.length - 1]._id : undefined;
  }, [messages]);

  useEffect(() => {
    if (!bookingId) return;

    dispatch(fetchThread({ bookingId }));

    const timer = setInterval(() => {
      // Don't poll a backgrounded tab — it burns requests for a thread nobody
      // is reading, and the full thread is refetched on remount anyway.
      if (document.visibilityState !== "visible") return;
      dispatch(fetchThread({ bookingId, after: lastIdRef.current }));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [dispatch, bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    const result = await dispatch(sendMessage({ bookingId, body }));
    if (sendMessage.fulfilled.match(result)) {
      setDraft("");
    }
  };

  return (
    <section
      aria-label="Conversation about this booking"
      className="flex h-[28rem] flex-col rounded-xl border bg-white"
    >
      <header className="border-b px-4 py-3">
        <h3 className="font-semibold text-slate-900">Messages</h3>
        <p className="text-xs text-slate-500">
          Anything you send here is visible to the other party and to GetMyGuide support.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && messages.length === 0 ? (
          <>
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-12 w-3/5" />
          </>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No messages yet. Say hello — ask about the meeting point, timings, or anything else.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender?._id === user?.id;
            return (
              <div
                key={message._id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "rounded-br-sm bg-teal-600 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800"
                  }`}
                >
                  {!isMine && (
                    <span className="mb-0.5 block text-xs font-semibold text-slate-500">
                      {message.sender?.name ?? ROLE_LABEL[message.senderRole]}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{message.body}</span>
                </div>
                <span className="mt-0.5 text-[11px] text-slate-400">
                  {timeOf(message.createdAt)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t p-3">
        {disabled ? (
          <p className="py-2 text-center text-sm text-slate-500">
            {disabledReason ?? "This conversation is closed."}
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter is a newline.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Write a message…"
              aria-label="Message"
              className="max-h-32 flex-1 resize-y rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <Button
              onClick={handleSend}
              disabled={sending || draft.trim().length === 0}
              size="icon"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </footer>
    </section>
  );
}
