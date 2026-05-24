"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mediaApi } from "@/features/media/api/media";
import type { MediaContextType, PaymentMethodDetails } from "@freediving.ph/types";
import {
  defaultPaymentInstructions,
  defaultPaymentMethodName,
  paymentMethodTypeLabel,
  validatePaymentMethodDetails,
  type PaymentMethodType,
} from "@freediving.ph/types";
import { ImageIcon, Plus, Save, Trash2, Upload } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

export type PaymentMethodSetupValue = PaymentMethodDetails & {
  id?: string;
  eventId?: string;
  schoolId?: string;
  courseId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PaymentMethodFormState = Required<
  Pick<
    PaymentMethodDetails,
    | "type"
    | "name"
    | "instructions"
    | "qrMediaId"
    | "qrImageUrl"
    | "bankName"
    | "accountName"
    | "accountNumber"
  >
> & { isActive: boolean };

type PaymentMethodSaveValue = PaymentMethodDetails & { isActive: boolean };

type PaymentMethodsSetupProps = {
  methods: PaymentMethodSetupValue[];
  disabled?: boolean;
  mediaContextType: MediaContextType;
  mediaContextId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onCreate: (value: PaymentMethodSaveValue) => Promise<void> | void;
  onUpdate: (
    methodId: string,
    value: PaymentMethodSaveValue,
  ) => Promise<void> | void;
};

const methodTypeItems: Array<{ value: PaymentMethodType; label: string }> = [
  { value: "manual_qr", label: "Manual QR" },
  { value: "bank_transfer", label: "Bank transfer" },
];

export function PaymentMethodsSetup({
  methods,
  disabled,
  mediaContextType,
  mediaContextId,
  emptyTitle = "No payment methods",
  emptyDescription = "Add Manual QR or bank transfer details before collecting payments.",
  onCreate,
  onUpdate,
}: PaymentMethodsSetupProps) {
  const [newMethod, setNewMethod] = useState<PaymentMethodFormState>(
    emptyPaymentMethodForm(),
  );
  const [createError, setCreateError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const saveNew = async () => {
    const payload = buildPaymentMethodPayload(newMethod);
    if (!payload.ok) {
      setCreateError(payload.message);
      return;
    }
    setCreateError("");
    setBusyId("new");
    try {
      await onCreate(payload.value);
      setNewMethod(emptyPaymentMethodForm());
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-foreground">Add method</h2>
        <PaymentMethodFields
          value={newMethod}
          onChange={setNewMethod}
          disabled={disabled || busyId === "new"}
          mediaContextType={mediaContextType}
          mediaContextId={mediaContextId}
        />
        {createError ? (
          <p className="text-xs text-destructive">{createError}</p>
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={disabled || busyId === "new"}
            onClick={saveNew}
          >
            <Plus className="mr-1 h-4 w-4" />
            {busyId === "new" ? "Adding..." : "Add method"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Payment methods
        </h2>
        {methods.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {emptyDescription}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/70 border-y border-border/70">
            {methods.map((method) => (
              <PaymentMethodEditorRow
                key={method.id}
                method={method}
                disabled={disabled || busyId === method.id}
                mediaContextType={mediaContextType}
                mediaContextId={mediaContextId}
                onSave={async (value) => {
                  if (!method.id) return;
                  setBusyId(method.id);
                  try {
                    await onUpdate(method.id, value);
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function PaymentMethodCustomerDisplay({
  method,
}: {
  method?: PaymentMethodSetupValue;
}) {
  if (!method) return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">
        {method.name?.trim() || defaultPaymentMethodName(method.type)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {paymentMethodTypeLabel(method.type)}
      </p>
      {method.type === "manual_qr" && method.qrImageUrl ? (
        <img
          src={method.qrImageUrl}
          alt="Payment QR"
          className="mt-3 h-44 w-44 rounded-md border border-border object-contain"
        />
      ) : null}
      {method.type === "bank_transfer" ? (
        <dl className="mt-2 grid gap-1">
          <div>
            <dt className="text-xs text-muted-foreground">Bank</dt>
            <dd className="text-foreground">{method.bankName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account name</dt>
            <dd className="text-foreground">{method.accountName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account number</dt>
            <dd className="text-foreground">{method.accountNumber}</dd>
          </div>
        </dl>
      ) : null}
      {method.instructions ? (
        <p className="mt-3 leading-6">{method.instructions}</p>
      ) : null}
    </div>
  );
}

function PaymentMethodEditorRow({
  method,
  disabled,
  mediaContextType,
  mediaContextId,
  onSave,
}: {
  method: PaymentMethodSetupValue;
  disabled?: boolean;
  mediaContextType: MediaContextType;
  mediaContextId?: string;
  onSave: (value: PaymentMethodSaveValue) => Promise<void> | void;
}) {
  const [form, setForm] = useState(formStateFromPaymentMethod(method));
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(formStateFromPaymentMethod(method));
  }, [method]);

  const save = async (next = form) => {
    const payload = buildPaymentMethodPayload(next);
    if (!payload.ok) {
      setError(payload.message);
      return;
    }
    setError("");
    await onSave(payload.value);
  };

  return (
    <article className="grid gap-3 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">
              {form.name || defaultPaymentMethodName(form.type)}
            </h3>
            <Badge variant={form.isActive ? "secondary" : "outline"}>
              {form.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {paymentMethodTypeLabel(form.type)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => save()}
          >
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              const next = { ...form, isActive: !form.isActive };
              setForm(next);
              void save(next);
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {form.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>
      <PaymentMethodFields
        value={form}
        onChange={setForm}
        disabled={disabled}
        mediaContextType={mediaContextType}
        mediaContextId={mediaContextId}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </article>
  );
}

function PaymentMethodFields({
  value,
  onChange,
  disabled,
  mediaContextType,
  mediaContextId,
}: {
  value: PaymentMethodFormState;
  onChange: (value: PaymentMethodFormState) => void;
  disabled?: boolean;
  mediaContextType: MediaContextType;
  mediaContextId?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl || value.qrImageUrl;
  const update = <K extends keyof PaymentMethodFormState>(
    key: K,
    next: PaymentMethodFormState[K],
  ) => onChange({ ...value, [key]: next });

  const uploadQr = async (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return;
    }
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    try {
      const uploaded = await mediaApi.upload(file, mediaContextType, mediaContextId);
      onChange({
        ...value,
        qrMediaId: uploaded.id,
        qrImageUrl: uploaded.objectKey,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-4">
      <Field label="Type">
        <Select
          value={value.type}
          items={methodTypeItems}
          onValueChange={(next) => {
            const type = (next ?? "manual_qr") as PaymentMethodType;
            onChange({
              ...value,
              type,
              name: value.name || defaultPaymentMethodName(type),
            });
          }}
        >
          <SelectTrigger className="w-full" disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {methodTypeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Name">
        <Input
          value={value.name}
          disabled={disabled}
          placeholder={defaultPaymentMethodName(value.type)}
          onChange={(event) => update("name", event.target.value)}
        />
      </Field>

      {value.type === "manual_qr" ? (
        <Field label="QR media upload">
          <div className="grid gap-2">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Payment QR"
                className="h-40 w-40 rounded-md border border-border object-contain"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={disabled || uploading}
                onChange={(event) => void uploadQr(event.target.files?.[0] ?? null)}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Field>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Bank name">
            <Input
              value={value.bankName}
              disabled={disabled}
              onChange={(event) => update("bankName", event.target.value)}
            />
          </Field>
          <Field label="Account name">
            <Input
              value={value.accountName}
              disabled={disabled}
              onChange={(event) => update("accountName", event.target.value)}
            />
          </Field>
          <Field label="Account number">
            <Input
              value={value.accountNumber}
              disabled={disabled}
              onChange={(event) => update("accountNumber", event.target.value)}
            />
          </Field>
        </div>
      )}

      <Field label="Payment instructions">
        <Textarea
          className="min-h-20"
          value={value.instructions}
          disabled={disabled}
          placeholder={defaultPaymentInstructions}
          onChange={(event) => update("instructions", event.target.value)}
        />
      </Field>
    </div>
  );
}

function emptyPaymentMethodForm(): PaymentMethodFormState {
  return {
    type: "manual_qr",
    name: "",
    instructions: defaultPaymentInstructions,
    qrMediaId: "",
    qrImageUrl: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    isActive: true,
  };
}

function formStateFromPaymentMethod(
  method: PaymentMethodSetupValue,
): PaymentMethodFormState {
  return {
    type: method.type,
    name: method.name ?? "",
    instructions: method.instructions ?? "",
    qrMediaId: method.qrMediaId ?? "",
    qrImageUrl: method.qrImageUrl ?? "",
    bankName: method.bankName ?? "",
    accountName: method.accountName ?? "",
    accountNumber: method.accountNumber ?? "",
    isActive: method.isActive ?? true,
  };
}

function buildPaymentMethodPayload(
  form: PaymentMethodFormState,
):
  | { ok: true; value: PaymentMethodSaveValue }
  | { ok: false; message: string } {
  const value: PaymentMethodSaveValue = {
    type: form.type,
    name: form.name.trim() || defaultPaymentMethodName(form.type),
    instructions: form.instructions.trim() || undefined,
    qrMediaId: form.type === "manual_qr" ? form.qrMediaId.trim() || undefined : undefined,
    qrImageUrl: form.type === "manual_qr" ? form.qrImageUrl.trim() || undefined : undefined,
    bankName: form.type === "bank_transfer" ? form.bankName.trim() || undefined : undefined,
    accountName:
      form.type === "bank_transfer" ? form.accountName.trim() || undefined : undefined,
    accountNumber:
      form.type === "bank_transfer"
        ? form.accountNumber.trim() || undefined
        : undefined,
    isActive: form.isActive,
  };
  const issues = validatePaymentMethodDetails(value);
  if (issues.length > 0) {
    return { ok: false, message: issues[0].message };
  }
  return { ok: true, value };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useMemo(
    () => `payment-method-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    [label],
  );
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
