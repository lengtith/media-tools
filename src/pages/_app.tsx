import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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
      {/* <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <path
          fill="#4338ca"
          fillOpacity="0.18"
          d="M0,400L60,386C120,373,240,347,360,360C480,373,600,427,720,440C840,453,960,427,1080,400C1200,373,1320,347,1380,333L1440,320L1440,900L0,900Z"
        />
        <path
          fill="#6366f1"
          fillOpacity="0.13"
          d="M0,560L60,546C120,533,240,507,360,507C480,507,600,533,720,546C840,560,960,560,1080,546C1200,533,1320,507,1380,493L1440,480L1440,900L0,900Z"
        />
        <path
          fill="#3730a3"
          fillOpacity="0.10"
          d="M0,700L60,693C120,687,240,673,360,667C480,660,600,660,720,673C840,687,960,707,1080,707C1200,707,1320,687,1380,680L1440,673L1440,900L0,900Z"
        />
      </svg> */}
      <Navbar />
      <Component {...pageProps} />
      <Footer />
    </div>
  );
}
