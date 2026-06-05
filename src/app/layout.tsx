import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AuthGuard } from "~/components/auth-guard";
import { ThemeToggle } from "~/components/theme-toggle";

export const metadata: Metadata = {
  title: "AI English Vocabulary",
  description: "AI-powered English vocabulary learning app",
  icons: [{ rel: "icon", url: "/favicon-transparent.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem("english-learning-theme") === "light" ? "light" : "dark";
                document.documentElement.classList.toggle("dark", theme === "dark");
                document.documentElement.style.colorScheme = theme;
              } catch {}
            `,
          }}
        />
        <TRPCReactProvider>
          <AuthGuard>
            <TooltipProvider>
              <ThemeToggle />
              {children}
            </TooltipProvider>
          </AuthGuard>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
