"use client";

import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";

const THEMES = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: MonitorIcon },
] as const;

export function UserMenu({ name, email }: { name: string | null; email: string | undefined }) {
  // `theme` is only resolved in the browser, which would normally risk a
  // hydration mismatch. It does not here: Base UI renders the menu content in a
  // portal only while the menu is open, so nothing below is ever part of the
  // server-rendered markup. That removes the usual `mounted` guard entirely.
  const { theme, setTheme } = useTheme();

  const initials = (name ?? email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Conta e preferências" />
        }
      >
        <span
          aria-hidden="true"
          className="bg-muted text-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium"
        >
          {initials}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/*
          Who is signed in — a heading, not a menu item, so it is a plain
          element. `DropdownMenuLabel` is Base UI's `Menu.GroupLabel` and throws
          unless it sits inside a Group or RadioGroup: it exists to name a set
          of menu items, which this is not.
        */}
        <div className="grid gap-0.5 px-1.5 py-1">
          {name ? <span className="truncate text-sm font-medium">{name}</span> : null}
          <span className="text-muted-foreground truncate text-xs">{email}</span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {/* Inside the group, where it correctly labels the options below. */}
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Tema
          </DropdownMenuLabel>

          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/*
          A real form submission rather than a click handler: it works before
          hydration, and it cannot be triggered by a cross-site GET the way a
          plain link could.
        */}
        <form action={signOutAction}>
          <DropdownMenuItem
            variant="destructive"
            // Base UI assumes it is rendering a non-button and adds `role` and
            // `aria-disabled` itself; telling it this really is a <button> lets
            // it keep the native semantics instead of duplicating them.
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            <LogOutIcon className="size-4" aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
