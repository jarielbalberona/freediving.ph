import { Card, CardContent } from "@/components/ui/card";
import { ParkedFeatureLinks } from "./parked-feature-links";

export function ParkedFeaturePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Card className="shadow-none">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Parked for launch
            </p>
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            This area is intentionally closed while Freediving Philippines
            focuses on the community features that are open and useful today.
          </p>
          <ParkedFeatureLinks />
        </CardContent>
      </Card>
    </main>
  );
}
