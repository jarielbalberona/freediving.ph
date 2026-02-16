"use client";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSafetyContacts, useSafetyPages } from "@/features/safetyResources";

export default function SafetyPage() {
  const { data: pages = [] } = useSafetyPages();
  const { data: contacts = [] } = useSafetyContacts();

  return (
    <main className="container mx-auto space-y-6 p-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Safety and Rescue Resources</h1>
        <p className="text-muted-foreground">Curated fundamentals and emergency contacts by region.</p>
      </section>

      <Alert>
        This section is informational only and not real-time emergency dispatch. Always contact local emergency services directly.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Safety Pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pages.map((page) => (
            <article key={page.id} className="rounded-md border p-3">
              <p className="font-semibold">{page.title}</p>
              <p className="text-sm text-muted-foreground">/{page.slug}</p>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((contact) => (
            <article key={contact.id} className="rounded-md border p-3">
              <p className="font-semibold">{contact.region} - {contact.label}</p>
              <p className="text-sm text-muted-foreground">
                {contact.phone} • Source: {contact.source}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
