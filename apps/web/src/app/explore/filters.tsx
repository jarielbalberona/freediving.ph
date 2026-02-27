import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  location?: string;
  onLocationChange?: (value: string) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  sort: "newest" | "oldest" | "name";
  onSortChange: (value: "newest" | "oldest" | "name") => void;
}

export default function Filters({
  search,
  onSearchChange,
  location = "",
  onLocationChange,
  difficulty,
  onDifficultyChange,
  sort,
  onSortChange,
}: FiltersProps) {
  return (
    <div className="sticky top-0 z-20 pb-2 mt-2 bg-background">
      <div className="flex items-center gap-2 pb-2">
        <div className="relative flex-1">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            placeholder="Search site, municipality, province, or region"
            className="pr-4 pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder="Filter by location"
          className="h-10"
          value={location}
          onChange={(event) => onLocationChange?.(event.target.value)}
        />
        <Select
          value={difficulty}
          onValueChange={(v) => onDifficultyChange(v ?? "ALL")}
          items={[
            { value: "ALL", label: "All difficulty" },
            { value: "BEGINNER", label: "Beginner" },
            { value: "INTERMEDIATE", label: "Intermediate" },
            { value: "ADVANCED", label: "Advanced" },
            { value: "EXPERT", label: "Expert" },
          ]}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="All difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All difficulty</SelectItem>
              <SelectItem value="BEGINNER">Beginner</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
              <SelectItem value="ADVANCED">Advanced</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => onSortChange((v ?? "newest") as "newest" | "oldest" | "name")}
          items={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "name", label: "Name" },
          ]}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
