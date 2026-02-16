import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const contacts = [
  { region: "NCR", number: "+63 2 8722 0650", source: "PCG" },
  { region: "Cebu", number: "+63 32 232 6651", source: "PCG" },
  { region: "Davao", number: "+63 82 285 2387", source: "PCG" },
];

export default function SafetyPage() {
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
          <CardTitle>Emergency Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((contact) => (
            <article key={contact.region} className="rounded-md border p-3">
              <p className="font-semibold">{contact.region}</p>
              <p className="text-sm text-muted-foreground">
                {contact.number} • Source: {contact.source}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
