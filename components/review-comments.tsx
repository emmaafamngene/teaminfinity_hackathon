"use client";
import { useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { useMarket } from "@/components/market-provider";
import { Button } from "@/components/ui/button";
import { isStudent } from "@/lib/permissions";
import { api } from "@/lib/api-client";
type Comment = {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};
export function ReviewComments({ reviewId }: { reviewId: string }) {
  const { user } = useMarket();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await api<{ comments: Comment[] }>(
      `/api/review-comments/${reviewId}`,
    );
    setRows(r.comments);
  }
  async function toggle() {
    setOpen(!open);
    if (!open) {
      setBusy(true);
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load comments");
      } finally {
        setBusy(false);
      }
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/review-comments/${reviewId}`, "POST", { body: text });
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="review-comments">
      <Button type="button" size="sm" variant="ghost" onClick={toggle}>
        <MessageCircle size={15} /> {open ? "Hide comments" : "Buyer comments"}
      </Button>
      {open && (
        <div className="comment-thread">
          {busy && <p role="status">Loading…</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!busy && !rows.length && (
            <p className="demo-note">Start a conversation about this review.</p>
          )}
          {rows.map((c) => (
            <article key={c.id} className="buyer-comment">
              <strong>{c.author_name}</strong>
              <small>
                {new Date(c.created_at).toLocaleDateString("en-GB")}
              </small>
              <p>{c.body}</p>
              {(c.user_id === user?.id || user?.role === "admin") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    setError("");
                    try {
                      await api(`/api/review-comments/${c.id}`, "DELETE");
                      await load();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Delete failed",
                      );
                    }
                  }}
                >
                  Delete
                </Button>
              )}
            </article>
          ))}
          {isStudent(user) && (
            <form onSubmit={submit} className="listing-form">
              <label>
                Add a follow-up comment
                <textarea
                  required
                  minLength={2}
                  maxLength={1000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask a question or share an update…"
                />
              </label>
              <Button disabled={busy || text.trim().length < 2}>
                Post comment
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
