import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WnJ Comfy Homes",
  description: "WnJ Comfy Homes & Tour Services",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
