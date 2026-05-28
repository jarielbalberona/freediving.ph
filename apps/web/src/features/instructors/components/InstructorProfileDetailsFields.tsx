"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  LocationPicker,
  type LocationSearchValue,
  buildDisplayLocation,
} from "@/features/locations";
import {
  dateStringToDate,
  dateToDateString,
} from "@/lib/date-picker-values";
import type {
  InstructorApplicationPayload,
  InstructorProfile,
} from "@freediving.ph/types";

type InstructorProfileDetailsInput = InstructorApplicationPayload;

function Field({
  label,
  value,
  onChange,
  required = false,
  className,
  readOnly,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label>{required ? `${label} *` : label}</Label>
      <Input
        type={type}
        className="min-w-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  required = false,
  className,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label>{required ? `${label} *` : label}</Label>
      <DatePicker
        className="min-w-0"
        required={required}
        disabled={readOnly}
        value={dateStringToDate(value)}
        onSelect={(date) => onChange(dateToDateString(date))}
      />
    </div>
  );
}

export function InstructorProfileDetailsFields({
  value,
  onChange,
  location,
  onLocationChange,
  readOnly,
}: {
  value: InstructorProfileDetailsInput;
  onChange: (patch: InstructorProfileDetailsInput) => void;
  location: LocationSearchValue;
  onLocationChange: (value: LocationSearchValue) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Field
          label="Display name"
          value={value.displayName}
          readOnly={readOnly}
          onChange={(displayName) => onChange({ ...value, displayName })}
        />
        <DateField
          label="Teaching since"
          value={value.teachingSince}
          readOnly={readOnly}
          onChange={(teachingSince) => onChange({ ...value, teachingSince })}
        />
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label>Base/home location {value.homeLocationLabel ? "" : ""}</Label>
        <p className="text-sm text-muted-foreground">
          Where are you mainly based for teaching or freediving?
        </p>
        <LocationPicker
          value={location}
          onChange={onLocationChange}
          disabled={readOnly}
          mode="administrative"
        />
        {value.homeLocationLabel ? (
          <p className="text-xs text-muted-foreground">
            Current saved location: {value.homeLocationLabel}.
          </p>
        ) : null}
        {readOnly && !value.homeLocationLabel ? (
          <p className="text-xs text-muted-foreground">
            Missing base/home location details.
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label>Bio</Label>
        <Textarea
          value={value.bio}
          onChange={(event) => onChange({ ...value, bio: event.target.value })}
          rows={5}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Field
          label="Specialties"
          value={value.specialties}
          onChange={(specialties) => onChange({ ...value, specialties })}
          readOnly={readOnly}
        />
        <Field
          label="School affiliation"
          value={value.schoolAffiliation}
          onChange={(schoolAffiliation) =>
            onChange({ ...value, schoolAffiliation })
          }
          readOnly={readOnly}
        />
        <Field
          label="Website"
          value={value.websiteUrl}
          onChange={(websiteUrl) => onChange({ ...value, websiteUrl })}
          readOnly={readOnly}
        />
        <Field
          label="Social links"
          value={value.socialLinks}
          onChange={(socialLinks) => onChange({ ...value, socialLinks })}
          readOnly={readOnly}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>First aid, CPR, emergency, or safety credentials</Label>
        <Textarea
          value={value.safetyCredentials}
          onChange={(event) =>
            onChange({ ...value, safetyCredentials: event.target.value })
          }
          rows={3}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>

      {readOnly && value.displayName ? (
        <div className="text-sm text-muted-foreground">
          <p>Display name: {value.displayName}</p>
          <p>
            Profile location: {buildDisplayLocation(location) || value.homeLocationLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function InstructorProfileDisplayOnlyFields({
  profile,
}: {
  profile: InstructorProfile;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid min-w-0 gap-1">
        <p className="text-sm text-muted-foreground">Display name</p>
        <p className="font-medium">{profile.displayName || "Not provided"}</p>
      </div>
      <div className="grid min-w-0 gap-1 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Teaching since</p>
          <p className="font-medium">{profile.teachingSince || "Not provided"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Base/home location</p>
          <p className="font-medium">{profile.homeLocationLabel || "Not provided"}</p>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Bio</p>
        <p className="text-sm">{profile.bio || "Not provided"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Specialties</p>
        <p className="text-sm">{profile.specialties || "Not provided"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">School affiliation</p>
        <p className="text-sm">{profile.schoolAffiliation || "Not provided"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Website</p>
        <p className="text-sm">{profile.websiteUrl || "Not provided"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Social links</p>
        <p className="text-sm">{profile.socialLinks || "Not provided"}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Safety credentials</p>
        <p className="text-sm">{profile.safetyCredentials || "Not provided"}</p>
      </div>
    </div>
  );
}
