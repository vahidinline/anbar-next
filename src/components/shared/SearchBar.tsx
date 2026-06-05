import { Search } from "lucide-react";
import { Input } from "@/components/ui-kit";

/** نوار جستجوی استاندارد فارسی با آیکون. */
export function SearchBar({
  value,
  onChange,
  placeholder = "جستجو...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9"
      />
    </div>
  );
}
