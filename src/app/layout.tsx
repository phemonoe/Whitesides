import type { Metadata } from "next";
import { FontModeToggle } from "@/components/font-mode-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Translation Library",
  description:
    "Browse and open saved sentence-by-sentence plain-language paper translations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <FontModeToggle />
      </body>
    </html>
  );
}
