import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Providers from "@/components/providers/SessionProvider";
import { FilterProvider } from "@/contexts/FilterContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BingeWatch - Movie Streaming Platform",
  description: "Your premium movie streaming platform with the latest releases and timeless classics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <FilterProvider>
            <Header className="fixed top-0 left-0 right-0 z-50" />
            <main className="flex-grow pt-20">
              {children}
            </main>
            <Footer />
          </FilterProvider>
        </Providers>
      </body>
    </html>
  );
}
