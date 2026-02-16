import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const listings = [
  { item: "Carbon Fins (used)", region: "Batangas", price: "PHP 11,500" },
  { item: "3mm Wetsuit", region: "Cebu", price: "PHP 4,800" },
];

export default function MarketplacePage() {
  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Gear Marketplace</h1>
        <p className="text-muted-foreground">
          Listing-only marketplace. In-app payments are intentionally disabled to reduce fraud risk.
        </p>
      </section>

      <Badge variant="outline">Policy-gated rollout: trust and legal review required for expansion</Badge>

      <Card>
        <CardHeader>
          <CardTitle>Sample Listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listings.map((listing) => (
            <article key={listing.item} className="rounded-md border p-3">
              <p className="font-semibold">{listing.item}</p>
              <p className="text-sm text-muted-foreground">
                {listing.region} • {listing.price}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
