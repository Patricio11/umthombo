import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";

/** Display  a characterful modern grotesque with real personality (anti-template). */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
  variable: "--font-bricolage",
});

/** Body / UI  warm humanist grotesk (not sterile like Inter). */
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-hanken",
});
