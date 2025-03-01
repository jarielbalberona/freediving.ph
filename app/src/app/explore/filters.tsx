import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function Filters() {
  return (
    <div className="sticky top-0 z-20 pb-2 mt-2 bg-background">
      <div className="flex items-center gap-2 pb-2">
        <div className="relative flex-1">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input placeholder="Where to next?" className="pr-4 pl-9" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="py-2 overflow-y-auto">
        <Tabs defaultValue="relevance" className="">
          <TabsList className="justify-start w-full overflow-x-auto">
            <TabsTrigger value="relevance">Relevance</TabsTrigger>
            <TabsTrigger value="distance">Distance</TabsTrigger>
            <TabsTrigger value="rating">Rating</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
