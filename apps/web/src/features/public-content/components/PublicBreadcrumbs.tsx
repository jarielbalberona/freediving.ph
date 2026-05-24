import Link from "next/link";

import type { BreadcrumbItem } from "@/features/public-content/seo/jsonLd";

export function PublicBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {isLast ? (
                <span className="text-foreground">{item.name}</span>
              ) : (
                <Link
                  href={item.path}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
