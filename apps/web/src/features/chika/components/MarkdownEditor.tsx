"use client";

import { useRef } from "react";
import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  SquareCode,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChikaMarkdown } from "./ChikaMarkdown";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  className?: string;
};

type ToolbarAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  before: string;
  after?: string;
  placeholder?: string;
};

const toolbarActions: ToolbarAction[] = [
  { label: "Bold", icon: Bold, before: "**", after: "**", placeholder: "bold text" },
  { label: "Italic", icon: Italic, before: "*", after: "*", placeholder: "italic text" },
  { label: "Link", icon: Link, before: "[", after: "](https://)", placeholder: "link text" },
  { label: "Inline code", icon: Code, before: "`", after: "`", placeholder: "code" },
  { label: "Code block", icon: SquareCode, before: "```\n", after: "\n```", placeholder: "code" },
  { label: "Quote", icon: Quote, before: "> ", placeholder: "quoted text" },
  { label: "Bulleted list", icon: List, before: "- ", placeholder: "list item" },
  { label: "Numbered list", icon: ListOrdered, before: "1. ", placeholder: "list item" },
];

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  maxLength,
  minRows = 8,
  className,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertMarkdown = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const body = selected || action.placeholder || "";
    const next = `${value.slice(0, start)}${action.before}${body}${action.after ?? ""}${value.slice(end)}`;
    const cursor = start + action.before.length + body.length + (action.after?.length ?? 0);

    onChange(next);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <Tabs defaultValue="write" className={cn("gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-center gap-1">
          {toolbarActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="icon-sm"
                tooltip={action.label}
                aria-label={action.label}
                onClick={() => insertMarkdown(action)}
              >
                <Icon />
              </Button>
            );
          })}
        </div>
      </div>
      <TabsContent value="write">
        <Textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={minRows}
          className="min-h-48 resize-y"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-48 rounded-md border border-border bg-background px-3 py-2">
          {value.trim() ? (
            <ChikaMarkdown content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
