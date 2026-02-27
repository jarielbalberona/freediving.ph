"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useChikaCategories, useCreateThread } from "@/features/chika";
import { AuthGuard } from "@/components/auth/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage, getRateLimitMessage } from "@/lib/http/api-error";

export default function CreateThread() {
  const router = useRouter();
  const { user } = useUser();
  const createThread = useCreateThread();
  const { data: categories } = useChikaCategories();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    categoryId: "",
  });

  useEffect(() => {
    if (!formData.categoryId && categories && categories.length > 0) {
      setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, formData.categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to create a thread");
      return;
    }

    if (!formData.title.trim() || !formData.categoryId) {
      toast.error("Please provide title and category");
      return;
    }

    try {
      await createThread.mutateAsync(formData);
      toast.success("Thread created successfully!");
      router.push("/chika");
    } catch (error) {
      toast.error(getRateLimitMessage(error, getApiErrorMessage(error, "Failed to create thread")));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <AuthGuard title="Sign in to post in Chika" description="Posting in Chika requires an authenticated member account.">
      <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Chika</CardTitle>
          <CardDescription>
            Share your thoughts, questions, or stories with the community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="What's your chika about?"
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="categoryId" className="text-sm font-medium">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {(categories ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.pseudonymous ? " (Anonymous)" : ""}
                  </option>
                ))}
              </select>
              {(categories ?? []).find((c) => c.id === formData.categoryId)?.pseudonymous ? (
                <p className="text-xs text-muted-foreground">
                  Your identity will be hidden. You will appear as an anonymous pseudonym.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Share your thoughts, ask questions, or tell a story..."
                className="min-h-[200px]"
                maxLength={2000}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length}/2000 characters
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createThread.isPending || !formData.title.trim() || !formData.categoryId}
              >
                {createThread.isPending ? "Creating..." : "Create Thread"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </AuthGuard>
  );
}
