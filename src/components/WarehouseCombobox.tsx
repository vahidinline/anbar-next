import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";

export interface WarehouseOpt {
  id: string;
  name: string;
}

export function WarehouseCombobox({
  warehouses,
  value,
  onChange,
  placeholder = "— انتخاب انبار —",
  disabled = false,
}: {
  warehouses: WarehouseOpt[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = warehouses.find((w) => w.id === value);
  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-right transition",
            disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-accent/30",
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ms-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[260px]"
        align="start"
        dir="rtl"
      >
        <Command shouldFilter={true} filter={(val, search) => (matchesSearch(val, search) ? 1 : 0)}>
          <CommandInput placeholder="جستجوی انبار..." className="text-right" />
          <CommandList className="max-h-72">
            <CommandEmpty>انباری یافت نشد</CommandEmpty>
            <CommandGroup>
              {warehouses.map((w) => (
                <CommandItem
                  key={w.id}
                  value={w.name}
                  onSelect={() => {
                    onChange(w.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("me-2 h-4 w-4", value === w.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{w.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
