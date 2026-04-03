import type { AppProps } from "next/app";
import { Playfair_Display, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "../styles/globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className={`${playfair.variable} ${dmMono.variable}`} style={{ display: "contents" }}>
        <Component {...pageProps} />
      </div>

      <Analytics />
    </>
  );
}
