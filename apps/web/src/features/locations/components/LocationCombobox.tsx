"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  type ComboboxOption,
} from "@/components/ui/combobox";

type LocationComboboxProps = {
  options: ComboboxOption[];
  value: string;
  valueLabel?: string;
  onValueChange: (code: string | null) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  id?: string;
  showClear?: boolean;
};

export function LocationCombobox({
  options,
  value,
  valueLabel,
  onValueChange,
  inputValue,
  onInputValueChange,
  searchPlaceholder,
  emptyMessage,
  disabled,
  id,
  showClear,
}: LocationComboboxProps) {
  const selectedOption =
    value !== ""
      ? (options.find((option) => option.value === value) ?? {
          value,
          label: valueLabel?.trim() || value,
          keywords: [],
        })
      : null;
  const visibleInputValue = inputValue || selectedOption?.label || "";

  return (
    <Combobox
      value={selectedOption}
      onValueChange={(nextValue) => {
        if (nextValue == null) {
          onValueChange(null);
          return;
        }

        onValueChange((nextValue as ComboboxOption).value);
      }}
      inputValue={visibleInputValue}
      onInputValueChange={(nextInputValue) =>
        onInputValueChange(nextInputValue ?? "")
      }
      items={options}
      filteredItems={options}
      itemToStringValue={(item) => (item as ComboboxOption).value}
      itemToStringLabel={(item) => (item as ComboboxOption).label}
      isItemEqualToValue={(a, b) =>
        (a as ComboboxOption).value === (b as ComboboxOption).value
      }
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        className="min-w-0 max-w-full"
        placeholder={searchPlaceholder}
        showClear={showClear ?? !!value}
        disabled={disabled}
        autoComplete="off"
      />
      <ComboboxContent className="max-w-[calc(100vw-1rem)]">
        <ComboboxEmpty className="py-2">{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem value={item} key={item.value} className="min-w-0">
              <span className="min-w-0 break-words sm:truncate">
                {item.label}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
