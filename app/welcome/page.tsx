import type { Metadata } from "next";
import { WelcomeScreen } from "@/components/welcome-screen";

const SITE_URL = "https://forum-hazel-tau.vercel.app";

export const metadata: Metadata = {
  title: "Viora Forum – SK/CZ komunita",
  description:
    "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
  alternates: {
    canonical: `${SITE_URL}/welcome`,
  },
  openGraph: {
    title: "Viora Forum",
    description: "AI výstupy • Dopyty • Projekty • Ľudia podľa skills (SK/CZ)",
    url: `${SITE_URL}/welcome`,
    siteName: "Viora Forum",
    images: [
      {
        url: `${SITE_URL}/og/welcome.jpg`,
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
    images: [`${SITE_URL}/og/welcome.jpg`],
  },
};

export default function WelcomePage() {
  return <WelcomeScreen showSkip={false} />;
}
