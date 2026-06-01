import { useAuth } from "@clerk/expo";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { ReportReasonCode, ReportTargetType } from "@freediving.ph/types";

import { MobileActionSheet } from "@/components/shell/mobile-action-sheet";
import { MobileButton } from "@/components/ui/mobile-button";
import { useCreateReportMutation } from "@/features/safety/hooks/use-safety-mutations";

type ReportActionProps = {
  buttonLabel?: string;
  contextLabel: string;
  targetId: string;
  targetType: ReportTargetType;
};

const reasons: Array<{ code: ReportReasonCode; label: string }> = [
  { code: "spam", label: "Spam" },
  { code: "harassment", label: "Harassment" },
  { code: "impersonation", label: "Impersonation" },
  { code: "unsafe", label: "Unsafe" },
  { code: "other", label: "Other" },
];

export function ReportAction({
  buttonLabel = "Report",
  contextLabel,
  targetId,
  targetType,
}: ReportActionProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const createReport = useCreateReportMutation();
  const [visible, setVisible] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReportReasonCode>("spam");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = () => {
    setMessage(null);
    if (!isLoaded) {
      setMessage("Checking your session. Try again in a moment.");
      return;
    }
    if (!isSignedIn) {
      setMessage("Sign in to send a report.");
      return;
    }
    createReport.mutate(
      {
        details: details.trim() || undefined,
        reasonCode,
        targetId,
        targetType,
      },
      {
        onError: () =>
          setMessage("Could not send this report. Check the details and try again."),
        onSuccess: () => {
          setDetails("");
          setMessage("Report sent. The moderation team can review it.");
          setVisible(false);
        },
      },
    );
  };

  return (
    <>
      <MobileButton
        variant="secondary"
        onPress={() => {
          setMessage(null);
          setVisible(true);
        }}
      >
        {buttonLabel}
      </MobileButton>
      {message ? <Text className="text-xs text-muted-foreground">{message}</Text> : null}
      <MobileActionSheet
        onClose={() => setVisible(false)}
        title={`Report ${contextLabel}`}
        visible={visible}
      >
        <View className="gap-4 px-1">
          <Text className="text-sm leading-6 text-muted-foreground">
            Reports go to moderation. Blocking or visibility changes are handled by
            backend policy.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {reasons.map((reason) => (
              <MobileButton
                key={reason.code}
                variant={reasonCode === reason.code ? "primary" : "secondary"}
                onPress={() => setReasonCode(reason.code)}
              >
                {reason.label}
              </MobileButton>
            ))}
          </View>
          <TextInput
            className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
            multiline
            onChangeText={setDetails}
            placeholder="Optional details"
            placeholderTextColor="#64748b"
            value={details}
          />
          {createReport.error || message ? (
            <Text className="text-xs text-muted-foreground">
              {message || "Could not send this report."}
            </Text>
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <MobileButton
                disabled={createReport.isPending}
                onPress={submit}
                variant="danger"
              >
                Send report
              </MobileButton>
            </View>
            <View className="flex-1">
              <MobileButton variant="ghost" onPress={() => setVisible(false)}>
                Cancel
              </MobileButton>
            </View>
          </View>
        </View>
      </MobileActionSheet>
    </>
  );
}
