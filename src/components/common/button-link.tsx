import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * A link that looks like a button.
 *
 * Exists so `nativeButton={false}` is written once. Base UI's `Button` assumes
 * it is rendering a real `<button>`; handed an `<a>` it warns, because it would
 * otherwise strip native button semantics from an element that never had them.
 * Every call site would need the flag, and the one that forgets it produces a
 * control that is subtly wrong for keyboard and screen reader users.
 *
 * Use this whenever the action is navigation. When the action *does* something —
 * submits, mutates, opens — it belongs in a real `<Button>` instead.
 */
export function ButtonLink({
  href,
  children,
  ...buttonProps
}: { href: string } & Omit<React.ComponentProps<typeof Button>, "render" | "nativeButton">) {
  return (
    <Button nativeButton={false} render={<Link href={href} />} {...buttonProps}>
      {children}
    </Button>
  );
}
