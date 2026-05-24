import {
  type JsonLdObject,
  jsonLdScript,
} from "@/features/public-content/seo/jsonLd";

export function StructuredData({
  data,
}: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLdScript(data)}
    />
  );
}
