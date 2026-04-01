import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
