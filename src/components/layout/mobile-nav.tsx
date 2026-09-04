"use client";

import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Brand } from "@/components/layout/brand";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Navigation for screens too narrow for the sidebar.
 *
 * The sheet closes on navigation. Without that it stays open over the page the
 * user just asked for, which reads as a broken tap — the most common bug in
 * hand-rolled mobile menus.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Closing on pathname change as well as on tap covers the back button and any
  // navigation started from inside the sheet by something other than a link.
  //
  // Adjusted during render rather than in an effect: React re-runs this
  // component immediately and commits once, whereas an effect would paint the
  // new page with the menu still open and then close it a frame later.
  const [renderedPathname, setRenderedPathname] = useState(pathname);

  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Abrir navegação" />}
      >
        <MenuIcon className="size-4" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-4">
        {/* Required for accessibility: a dialog without a name is announced as
            just "dialog". Visually the brand already serves as the heading. */}
        <SheetTitle className="sr-only">Navegação</SheetTitle>

        <Brand className="mb-6 px-2" />
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
