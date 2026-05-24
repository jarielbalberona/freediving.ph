# Form Validation Pattern

Use React Hook Form with Zod and `zodResolver` for app forms that accept user input.

Client-side Zod schemas are for immediate UX only: required fields, obvious formats, stable enums, and simple numeric or length rules. The Go API remains canonical for security, permissions, uniqueness, ownership, moderation, and any business rule that can drift.

When the API returns validation issues, map them back into React Hook Form with `applyApiErrorsToForm`. Use a field map when the API path does not match the frontend field name, for example `contact_email` to `contactEmail`. Only show form-level errors for unmapped issues or true global failures. Toast-only validation errors are not acceptable for field-specific problems.
