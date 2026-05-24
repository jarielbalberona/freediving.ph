"use client";

import { BadgeCheck, Flag, Map, Shield, UsersRound } from "lucide-react";
import Link from "next/link";

import {
  AdminAccess,
  AdminPageShell,
} from "@/app/admin/_components/admin-page";
import { Card, CardContent } from "@/components/ui/card";

const ADMIN_SECTIONS = [
  {
    href: "/moderation",
    title: "Moderation triage",
    description: "Reports, dive site review queues, and Chika/user actions.",
    icon: Flag,
  },
  {
    href: "/admin/buddies",
    title: "Buddies",
    description: "Member inventory, status, and report signals.",
    icon: UsersRound,
  },
  {
    href: "/admin/dive-sites",
    title: "Dive sites",
    description: "All dive site records, including pending and hidden entries.",
    icon: Map,
  },
  {
    href: "/admin/groups",
    title: "Groups",
    description: "Public, private, active, archived, and deleted groups.",
    icon: Shield,
  },
  {
    href: "/admin/instructors",
    title: "Instructors",
    description: "Instructor applications, certifications, and review actions.",
    icon: BadgeCheck,
  },
];

export default function AdminOverviewPage() {
  return (
    <AdminAccess>
      <AdminPageShell
        title="Admin Overview"
        description="One operator entry point for the platform surfaces that are real today."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {ADMIN_SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full rounded-lg shadow-none transition-colors hover:border-primary/40">
                <CardContent className="flex gap-3 p-4">
                  <section.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold">{section.title}</h2>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </AdminPageShell>
    </AdminAccess>
  );
}
