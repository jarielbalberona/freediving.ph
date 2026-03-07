"use client";

import type { MediaContextType } from "@freediving.ph/types";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
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
import { useUploadMultipleMedia } from "../hooks";
import { mediaUploadSchema, type MediaUploadValues } from "../schemas/upload.schema";

interface MediaUploadPanelProps {
  defaultContextType?: MediaContextType;
  defaultContextId?: string;
}

const CONTEXT_OPTIONS: { value: MediaContextType; label: string }[] = [
  { value: "profile_avatar", label: "profile_avatar" },
  { value: "profile_feed", label: "profile_feed" },
  { value: "chika_attachment", label: "chika_attachment" },
  { value: "event_attachment", label: "event_attachment" },
  { value: "dive_spot_attachment", label: "dive_spot_attachment" },
  { value: "group_cover", label: "group_cover" },
];

export function MediaUploadPanel({
  defaultContextType = "profile_feed",
  defaultContextId,
}: MediaUploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const mutation = useUploadMultipleMedia();

  const form = useForm<MediaUploadValues>({
    resolver: zodResolver(mediaUploadSchema),
    defaultValues: {
      contextType: defaultContextType,
      contextId: defaultContextId ?? "",
    },
  });

  const onSubmit = (values: MediaUploadValues) => {
    mutation.mutate({
      files,
      contextType: values.contextType,
      contextId: values.contextId?.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contextType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={CONTEXT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {CONTEXT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contextId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context ID (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="UUID for context-bound uploads"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </div>

          <Button
            type="submit"
            disabled={files.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? "Uploading..." : `Upload ${files.length || ""} file(s)`}
          </Button>
        </form>
      </Form>

      {mutation.data?.errors?.length ? (
        <div className="space-y-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {mutation.data.errors.map((error) => (
            <p key={`${error.index}-${error.code}`}>
              File #{error.index + 1}: {error.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
