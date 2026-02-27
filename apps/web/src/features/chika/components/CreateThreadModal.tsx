"use client";

import { useState } from "react";
import { CreateThreadData } from '@freediving.ph/types';
import { useCreateThread } from "../hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage, getRateLimitMessage } from "@/lib/http/api-error";

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateThreadModal({ isOpen, onClose }: CreateThreadModalProps) {
  const [formData, setFormData] = useState<CreateThreadData>({
    title: "",
    content: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createThread = useCreateThread();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }

    try {
      setSubmitError(null);
      await createThread.mutateAsync(formData);
      setFormData({ title: "", content: "", tags: [] });
      setTagInput("");
      setSubmitError(null);
      onClose();
    } catch (error) {
      setSubmitError(getRateLimitMessage(error, getApiErrorMessage(error, "Failed to create thread")));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card text-card-foreground shadow-xl">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Create New Thread</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium text-foreground">
                Title *
              </label>
              <Input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter thread title..."
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="mb-2 block text-sm font-medium text-foreground">
                Content *
              </label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                placeholder="Share your thoughts..."
                required
              />
            </div>

            <div>
              <label htmlFor="tags" className="mb-2 block text-sm font-medium text-foreground">
                Tags
              </label>
              <div className="mb-2 flex gap-2">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      className="inline-flex items-center gap-1 bg-primary/15 text-primary hover:bg-primary/20"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-primary hover:text-primary-foreground"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createThread.isPending || !formData.title.trim() || !formData.content.trim()}
              >
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
