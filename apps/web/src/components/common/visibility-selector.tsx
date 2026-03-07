import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Select
        value={value}
        onValueChange={(v) => v && onChange(v as VisibilityValue)}
        disabled={disabled}
        items={[
          { value: "public", label: "Public" },
          { value: "members_only", label: "Members Only" },
          { value: "private", label: "Private" },
        ]}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="members_only">Members Only</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
