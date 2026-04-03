import type { Metadata } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import "@excalidraw/excalidraw/index.css";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Maximus Classroom",
  description: "Voice-first math tutoring with Maximus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${jetBrainsMono.variable}`}>{children}</body>
    </html>
  );
}
