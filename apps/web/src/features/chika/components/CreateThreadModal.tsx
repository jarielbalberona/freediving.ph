"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCreateThread, useChikaCategories } from "../hooks";
import { createThreadModalSchema, type CreateThreadModalValues } from "../schemas/createThread.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateThreadModal({ isOpen, onClose }: CreateThreadModalProps) {
  const createThread = useCreateThread();
  const { data: categories } = useChikaCategories();

  const form = useForm<CreateThreadModalValues>({
    resolver: zodResolver(createThreadModalSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: "",
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const firstId = categories?.[0]?.id ?? "";
    if (!form.getValues("categoryId") && firstId) {
      form.setValue("categoryId", firstId);
    }
  }, [isOpen, categories, form]);

  const selectedCategory = (categories ?? []).find((c) => c.id === form.watch("categoryId"));

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (values: CreateThreadModalValues) => {
    try {
      setSubmitError(null);
      await createThread.mutateAsync({
        title: values.title.trim(),
        content: values.content?.trim() || "",
        categoryId: values.categoryId,
      });
      form.reset({ title: "", content: "", categoryId: categories?.[0]?.id ?? "" });
      onClose();
    } catch (error) {
      setSubmitError(getRateLimitMessage(error, getApiErrorMessage(error, "Failed to create thread")));
    }
  };

  if (!isOpen) return null;

  const categoryItems = (categories ?? []).map((c) => ({
    value: c.id,
    label: `${c.name}${c.pseudonymous ? " (Anonymous)" : ""}`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card text-card-foreground shadow-xl">
        <div className="p-6">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Create New Thread</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thread title</FormLabel>
                    <FormControl>
                      <Input placeholder="Thread title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="Optional body" {...field} />
                    </FormControl>
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
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || createThread.isPending}
                >
                  {form.formState.isSubmitting || createThread.isPending ? "Creating..." : "Create Thread"}
                </Button>
              </div>
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
