"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useChikaCategories, useCreateThread } from "@/features/chika";
import { createThreadPageSchema, type CreateThreadPageValues } from "@/features/chika/schemas/createThread.schema";
import { AuthGuard } from "@/components/auth/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage, getRateLimitMessage } from "@/lib/http/api-error";

export default function CreateThread() {
  const router = useRouter();
  const { user } = useUser();
  const createThread = useCreateThread();
  const { data: categories } = useChikaCategories();

  const form = useForm<CreateThreadPageValues>({
    resolver: zodResolver(createThreadPageSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: "",
    },
  });

  useEffect(() => {
    const firstId = categories?.[0]?.id ?? "";
    if (!form.getValues("categoryId") && firstId) {
      form.setValue("categoryId", firstId);
    }
  }, [categories, form]);

  const selectedCategory = (categories ?? []).find((c) => c.id === form.watch("categoryId"));

  const onSubmit = async (values: CreateThreadPageValues) => {
    if (!user) {
      toast.error("Please sign in to create a thread");
      return;
    }

    try {
      await createThread.mutateAsync({
        title: values.title.trim(),
        content: values.content.trim(),
        categoryId: values.categoryId,
      });
      toast.success("Thread created successfully!");
      router.push("/chika");
    } catch (error) {
      toast.error(getRateLimitMessage(error, getApiErrorMessage(error, "Failed to create thread")));
    }
  };

  const categoryItems = (categories ?? []).map((c) => ({
    value: c.id,
    label: `${c.name}${c.pseudonymous ? " (Anonymous)" : ""}`,
  }));

  return (
    <AuthGuard title="Sign in to post in Chika" description="Posting in Chika requires an authenticated member account.">
      <div className="container max-w-screen-lg px-4 mx-auto sm:px-6 lg:px-8">
        <Card asContainer>
          <CardHeader>
            <CardTitle>Create New Chika</CardTitle>
            <CardDescription>
              Share your thoughts, questions, or stories with the community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What's your chika about?"
                          maxLength={200}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/200 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={categoryItems.length === 0}
                        items={categoryItems}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            {categoryItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {selectedCategory?.pseudonymous ? (
                        <FormDescription>
                          Your identity will be hidden. You will appear as an anonymous pseudonym.
                        </FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your thoughts, ask questions, or tell a story..."
                          className="min-h-[200px]"
                          maxLength={2000}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/2000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    disabled={form.formState.isSubmitting || createThread.isPending}
                  >
                    {form.formState.isSubmitting || createThread.isPending ? "Creating..." : "Create Thread"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
