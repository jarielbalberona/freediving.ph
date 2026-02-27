"use client";

import * as React from "react";
import { BottomNav } from "./bottom-nav";
import { CreateDrawer } from "./create-drawer";

export function MobileNavWithDrawers() {
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <>
      <BottomNav onOpenCreate={() => setCreateOpen(true)} />
      <CreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
