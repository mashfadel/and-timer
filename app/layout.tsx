import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "& timer",
  description:
    "A full-screen timer for & community activities. Rounds, a countdown you can hear, and a line of leadership every so often.",
  applicationName: "& timer",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "& timer" },
  openGraph: {
    title: "& timer",
    description: "A full-screen timer for & community activities.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
