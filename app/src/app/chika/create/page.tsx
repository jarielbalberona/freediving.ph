"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useCreateThread } from "@/hooks/react-queries/threads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateThread() {
  const router = useRouter();
  const { user } = useUser();
  const createThread = useCreateThread();
  const [formData, setFormData] = useState({
    title: "",
    content: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to create a thread");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createThread.mutateAsync(formData);
      toast.success("Thread created successfully!");
      router.push("/chika");
    } catch (error) {
      toast.error("Failed to create thread");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!user) {
    return (
      <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to create a thread.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
                disabled={createThread.isPending || !formData.title.trim() || !formData.content.trim()}
              >
                {createThread.isPending ? "Creating..." : "Create Thread"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
