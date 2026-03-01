import { WelcomeScreen } from "@/components/welcome-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Viora Forum – SK/CZ komunita",
  description: "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
  alternates: { canonical: "/welcome" },
  openGraph: {
    title: "Viora Forum – SK/CZ komunita",
    description: "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
    url: "/welcome",
    type: "website",
    images: [
      {
        url: "/og/welcome.jpg",
        width: 1200,
        height: 630,
        alt: "Viora Forum",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Viora Forum – SK/CZ komunita",
    description: "Zdieľaj AI výstupy, pýtaj sa, rozbiehaj projekty a nájdi šikovných ľudí podľa skills a regiónu.",
    images: ["/og/welcome.jpg"],
  },
};

export default function WelcomePage() {
  return <WelcomeScreen showSkip={false} />;
}