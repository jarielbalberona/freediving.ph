"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCreateThread, useChikaCategories } from "../hooks";
import {
  createThreadModalSchema,
  type CreateThreadModalValues,
} from "../schemas/createThread.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function CreateThreadModal({
  isOpen,
  onClose,
}: CreateThreadModalProps) {
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
    const generalId =
      categories?.find((c) => c.slug === "general")?.id ??
      categories?.[0]?.id ??
      "";
    if (!form.getValues("categoryId") && generalId) {
      form.setValue("categoryId", generalId);
    }
  }, [isOpen, categories, form]);

  const selectedCategory = (categories ?? []).find(
    (c) => c.id === form.watch("categoryId"),
  );

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (values: CreateThreadModalValues) => {
    try {
      setSubmitError(null);
      await createThread.mutateAsync({
        title: values.title.trim(),
        content: values.content?.trim() || "",
        categoryId: values.categoryId,
      });
      form.reset({
        title: "",
        content: "",
        categoryId:
          categories?.find((c) => c.slug === "general")?.id ??
          categories?.[0]?.id ??
          "",
      });
      onClose();
    } catch (error) {
      setSubmitError(
        getRateLimitMessage(
          error,
          getApiErrorMessage(error, "Could not post in Chika"),
        ),
      );
    }
  };

  const categoryItems = [...(categories ?? [])]
    .sort((a, b) =>
      a.pseudonymous === b.pseudonymous ? 0 : a.pseudonymous ? 1 : -1,
    )
    .map((c) => ({
      value: c.id,
      label: `${c.name}${c.pseudonymous ? " (Anonymous)" : ""}`,
    }));

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl! overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post in Chika</DialogTitle>
          <DialogDescription>
            Ask a question, share a local note, or start a conversation with
            other freedivers.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="What's your Chika about?" {...field} />
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
                    <Textarea
                      rows={5}
                      placeholder="Share the context, story, or question."
                      {...field}
                    />
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
                      Your identity will be hidden. You will appear as an
                      anonymous community member.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            {submitError ? (
              <p className="text-sm text-destructive">{submitError}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || createThread.isPending}
              >
                {form.formState.isSubmitting || createThread.isPending
                  ? "Posting..."
                  : "Post in Chika"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
