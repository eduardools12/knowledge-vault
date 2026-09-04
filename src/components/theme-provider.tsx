"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light/dark theming.
 *
 * The vault is meant for long reading sessions, so following the operating
 * system preference by default matters more here than in a page someone visits
 * once. `disableTransitionOnChange` stops every element on the page animating
 * its colour at once when the theme flips, which reads as a glitch.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
