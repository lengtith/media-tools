import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} relative h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans`}
    >
      <Navbar />
      <Component {...pageProps} />
    </div>
  );
}
