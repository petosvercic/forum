import { WelcomeScreen } from "@/components/welcome-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Viora Forum – SK/CZ komunita",
  description:
    "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
  alternates: {
    canonical: "/welcome",
  },
  openGraph: {
    title: "Viora Forum",
    description: "AI výstupy • Dopyty • Projekty • Ľudia podľa skills (SK/CZ)",
    url: "/welcome",
    siteName: "Viora Forum",
    images: [
      {
        url: "/og/welcome.jpg",
        width: 1200,
        height: 630,
        alt: "Viora Forum",
      },
    ],
    locale: "sk_SK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viora Forum",
    description: "Zdieľaj AI výstupy a nájdi šikovných ľudí podľa skills.",
    images: ["/og/welcome.jpg"],
  },
};

export default function WelcomePage() {
  return <WelcomeScreen showSkip={false} />;
}