export const paymentMethodTypes = ["manual_qr", "bank_transfer"] as const;

export type PaymentMethodType = (typeof paymentMethodTypes)[number];

export interface PaymentMethodDetails {
  type: PaymentMethodType;
  name?: string;
  instructions?: string;
  qrMediaId?: string;
  qrImageUrl?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  isActive?: boolean;
}

export interface PaymentMethodValidationIssue {
  path: keyof PaymentMethodDetails;
  message: string;
}

export const defaultPaymentInstructions =
  "Please attach your payment receipt for verification.";

export function normalizePaymentMethodType(
  value: string,
): PaymentMethodType | "" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "manual_qr" || normalized === "manual qr") {
    return "manual_qr";
  }
  if (
    normalized === "bank_transfer" ||
    normalized === "bank transfer" ||
    normalized === "manual_bank_transfer"
  ) {
    return "bank_transfer";
  }
  return "";
}

export function paymentMethodTypeLabel(type: PaymentMethodType): string {
  return type === "manual_qr" ? "Manual QR" : "Bank transfer";
}

export function defaultPaymentMethodName(type: PaymentMethodType): string {
  return paymentMethodTypeLabel(type);
}

export function validatePaymentMethodDetails(
  method: PaymentMethodDetails,
): PaymentMethodValidationIssue[] {
  const issues: PaymentMethodValidationIssue[] = [];
  const type = normalizePaymentMethodType(method.type);
  const isActive = method.isActive ?? true;

  if (!type) {
    issues.push({ path: "type", message: "Choose a payment method type." });
    return issues;
  }

  if (!isActive) {
    return issues;
  }

  if (type === "manual_qr") {
    if (!method.qrMediaId?.trim()) {
      issues.push({
        path: "qrMediaId",
        message: "Upload a QR image before activating this payment method.",
      });
    }
    return issues;
  }

  if (!method.bankName?.trim()) {
    issues.push({ path: "bankName", message: "Bank name is required." });
  }
  if (!method.accountName?.trim()) {
    issues.push({
      path: "accountName",
      message: "Bank account name is required.",
    });
  }
  if (!method.accountNumber?.trim()) {
    issues.push({
      path: "accountNumber",
      message: "Bank account number is required.",
    });
  }

  return issues;
}
