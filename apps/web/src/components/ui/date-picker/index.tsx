import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from '../calendar';
import { Input } from '../input';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { clampDate, formatDate, parseDateInput } from './date-utils';

function DatePicker({
  placeholder,
  value,
  min,
  max,
  disablePastDates = false,
  disabled = false,
  onSelect,
  defaultMonth,
  size,
  className,
}: {
  placeholder?: string;
  value?: Date;
  min?: Date;
  max?: Date;
  disablePastDates?: boolean;
  disabled?: boolean;
  defaultMonth?: Date;
  onSelect: (date?: Date) => void;
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg';
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(value ? formatDate(value) : '');
  const [hasError, setHasError] = React.useState(false);

  // Anchor wrapper ref so clicks on the input don't count as "outside"
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const closeTargetRef = React.useRef<EventTarget | null>(null);

  // Normalize to start-of-day for day-granular comparisons
  const startOfDay = (d: Date | undefined | null) => {
    if (!d) return undefined;
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const todayStart = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Effective bounds: explicit min/max win; else fallback to disablePastDates
  const effectiveMin = React.useMemo(
    () => startOfDay(min ?? (disablePastDates ? todayStart : undefined)),
    [min, disablePastDates, todayStart]
  );
  const effectiveMax = React.useMemo(() => startOfDay(max), [max]);

  // Sync draft when external value changes
  React.useEffect(() => {
    setDraft(value ? formatDate(value) : '');
  }, [value]);

  // Capture click target (capture phase) so we can avoid closing when user clicks the anchor input
  React.useEffect(() => {
    if (!open) return;
    const capture = (e: MouseEvent) => {
      closeTargetRef.current = e.target;
    };
    document.addEventListener('pointerdown', capture, true);
    return () => {
      document.removeEventListener('pointerdown', capture, true);
      closeTargetRef.current = null;
    };
  }, [open]);

  const bumpError = () => {
    setHasError(true);
    // cosmetic pulse; you can remove if you dislike flashes
    setTimeout(() => setHasError(false), 250);
  };

  const inRange = (d: Date) => {
    const dd = startOfDay(d)!;
    if (effectiveMin && dd < effectiveMin) return false;
    if (effectiveMax && dd > effectiveMax) return false;
    return true;
  };

  const commitFromDraft = () => {
    const txt = draft.trim();
    if (!txt) {
      onSelect?.(undefined);
      setDraft('');
      return;
    }
    const parsed = parseDateInput(txt);
    if (!parsed) {
      bumpError();
      setDraft(value ? formatDate(value) : '');
      return;
    }
    // Clamp to bounds using your existing util
    const clamped = clampDate(parsed, effectiveMin, effectiveMax);
    onSelect?.(clamped);
    setDraft(formatDate(clamped));
  };

  const handleDateSelect = (date?: Date) => {
    if (!date) return;
    // Guard against clicks on disabled days (shouldn't happen, but be defensive)
    if (!inRange(date)) {
      bumpError();
      return;
    }

    onSelect?.(date);
    setDraft(formatDate(date));
    // Use setTimeout to ensure the state update happens after the click event
    // This is especially important when the DatePicker is inside a Dialog
    setTimeout(() => {
      setOpen(false);
    }, 0);
  };

  const currentYear = new Date().getFullYear();
  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        // When closing, don't close if the interaction was on the anchor (input)
        if (next === false && closeTargetRef.current && anchorRef.current?.contains(closeTargetRef.current as Node)) {
          closeTargetRef.current = null;
          return;
        }
        closeTargetRef.current = null;
        setOpen(next);
      }}
    >
      <div ref={anchorRef} className="relative w-full">
        <PopoverTrigger  className="opacity-0">
          <button
            type="button"
            aria-label={open ? 'Close calendar' : 'Open calendar'}
            className="absolute left-1.5 top-1/2"
            disabled={disabled}
          ></button>
        </PopoverTrigger>
        <Input
          disabled={disabled}
          value={draft}
          placeholder={placeholder ?? 'Choose a date'}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => !open && setOpen(true)}
          onClick={() => !open && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitFromDraft();
              setOpen(false);
            } else if (e.key === 'Tab') {
              commitFromDraft();
              setOpen(false);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              setHasError(false);
              setDraft(value ? formatDate(value) : '');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          data-invalid={hasError || undefined}
          className={cn(hasError && 'border-destructive', className)}
        />
      </div>

      <PopoverContent
        id="date-picker-popover"
        className="p-0 my-4 w-auto pointer-events-auto border-none"
        align="start"
        side="bottom"
      >
        <Calendar
          data-role="date-calendar"
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          // Disable days outside [min, max]
          disabled={[...(effectiveMin ? [{ before: effectiveMin }] : []), ...(effectiveMax ? [{ after: effectiveMax }] : [])]}
          captionLayout="dropdown"
          startMonth={new Date(2010, 0)}
          endMonth={new Date(currentYear + 15, 0)}

          defaultMonth={defaultMonth}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
