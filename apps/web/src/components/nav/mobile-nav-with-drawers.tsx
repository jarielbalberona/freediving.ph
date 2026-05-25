"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { BottomNav } from "./bottom-nav";
import { CreateDrawer } from "./create-drawer";

export function MobileNavWithDrawers() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {mounted
        ? createPortal(
            <BottomNav onOpenCreate={() => setCreateOpen(true)} />,
            document.body,
          )
        : null}
      <CreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
