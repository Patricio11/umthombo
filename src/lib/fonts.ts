import { Fraunces, Hanken_Grotesk } from "next/font/google";

/** Display — high-contrast, soft, characterful editorial serif. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
});

/** Body / UI — warm humanist grotesk (not sterile like Inter). */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hanken",
});
