import { IBM_Plex_Sans } from "next/font/google";

const font = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans", subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
export const appFontClassName = font.variable;
