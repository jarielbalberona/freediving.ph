import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  sort: "newest" | "oldest" | "name";
  onSortChange: (value: "newest" | "oldest" | "name") => void;
}

export default function Filters({
  search,
  onSearchChange,
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

      <div className="grid grid-cols-2 gap-2">
        <select
          value={difficulty}
          onChange={(event) => onDifficultyChange(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="ALL">All difficulty</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
          <option value="EXPERT">Expert</option>
        </select>

        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as "newest" | "oldest" | "name")}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  );
}
