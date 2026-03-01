import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { PRODUCT_NAME } from "@/lib/brand";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: PRODUCT_NAME,
  description: "SK/CZ platforma na zdieľanie AI výstupov, diskusiu a hľadanie šikovných ľudí.",
  openGraph: {
    title: PRODUCT_NAME,
    description:
      "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
    images: [
      {
        url: "/og/welcome.jpg",
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
    images: ["/og/welcome.jpg"],
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
