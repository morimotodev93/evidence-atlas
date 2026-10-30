import localFont from "next/font/local";

// IBM/plex 71f558992315a12ca1f06a2215d57962a1992162; OFL beside the fonts.
const font = localFont({
  variable: "--font-ibm-plex-sans",
  display: "swap",
  src: [
    { path: "../assets/fonts/ibm-plex-sans/IBMPlexSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/ibm-plex-sans/IBMPlexSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/ibm-plex-sans/IBMPlexSans-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/ibm-plex-sans/IBMPlexSans-Bold.woff2", weight: "700", style: "normal" },
  ],
});
export const appFontClassName = font.variable;
