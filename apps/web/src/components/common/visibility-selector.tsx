import { Label } from "@/components/ui/label";

export type VisibilityValue = "public" | "members_only" | "private";

interface VisibilitySelectorProps {
  id?: string;
  label?: string;
  value: VisibilityValue;
  onChange: (value: VisibilityValue) => void;
  disabled?: boolean;
}

export function VisibilitySelector({
  id = "visibility",
  label = "Visibility",
  value,
  onChange,
  disabled,
}: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value as VisibilityValue)}
        disabled={disabled}
      >
        <option value="public">Public</option>
        <option value="members_only">Members Only</option>
        <option value="private">Private</option>
      </select>
    </div>
  );
}
