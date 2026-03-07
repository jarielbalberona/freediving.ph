"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportAction } from "@/components/report/report-action";
import { useMarketplaceListings } from "@/features/marketplace";

export default function MarketplacePage() {
  const { data: listings = [] } = useMarketplaceListings();

  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Gear Marketplace</h1>
        <p className="text-muted-foreground">Listing-only marketplace with report-first moderation.</p>
      </section>

      <Badge variant="outline">No in-app payments</Badge>

      <Card>
        <CardHeader>
          <CardTitle>Listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listings.map((listing) => (
            <article key={listing.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{listing.item}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing.condition} • {listing.region} • {listing.price}
                  </p>
                </div>
                <ReportAction targetType="OTHER" targetId={`marketplace:${listing.id}`} />
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
