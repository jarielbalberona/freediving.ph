"use client";

import { useEffect, useState } from "react";
import { useCreateThread, useChikaCategories } from "../hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage, getRateLimitMessage } from "@/lib/http/api-error";

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateThreadModal({ isOpen, onClose }: CreateThreadModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createThread = useCreateThread();
  const { data: categories } = useChikaCategories();
  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);

  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;

    try {
      setSubmitError(null);
      await createThread.mutateAsync({ title, content, categoryId });
      setTitle("");
      setContent("");
      onClose();
    } catch (error) {
      setSubmitError(getRateLimitMessage(error, getApiErrorMessage(error, "Failed to create thread")));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card text-card-foreground shadow-xl">
        <div className="p-6">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Create New Thread</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" required />
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Optional body" />
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {(categories ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.pseudonymous ? " (Anonymous)" : ""}
                </option>
              ))}
            </select>
            {selectedCategory?.pseudonymous ? (
              <p className="text-xs text-muted-foreground">
                Your identity will be hidden. You will appear as an anonymous pseudonym.
              </p>
            ) : null}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createThread.isPending || !title.trim() || !categoryId}>
                {createThread.isPending ? "Creating..." : "Create Thread"}
              </Button>
            </div>
            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

