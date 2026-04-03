import type { AppProps } from "next/app";
import { Playfair_Display, DM_Mono } from "next/font/google";
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
    // style="display:contents" removes wrapper from layout while still injecting the CSS font variables
    <div className={`${playfair.variable} ${dmMono.variable}`} style={{ display: "contents" }}>
      <Component {...pageProps} />
    </div>
  );
}
