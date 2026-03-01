import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { PRODUCT_NAME } from "@/lib/brand";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

const ogImageUrl = new URL("/og/welcome.jpg", siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: PRODUCT_NAME,
  description: "SK/CZ platforma na zdieľanie AI výstupov, diskusiu a hľadanie šikovných ľudí.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: PRODUCT_NAME,
    description:
      "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
    url: siteUrl,
    siteName: PRODUCT_NAME,
    images: [
      {
        url: ogImageUrl, // ABSOLÚTNA URL kvôli FB
        width: 1200,
        height: 630,
        alt: PRODUCT_NAME,
      },
    ],
    type: "website",
    locale: "sk_SK",
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_NAME,
    description:
      "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
    images: [ogImageUrl], // ABSOLÚTNA URL
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased viora-bg min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}