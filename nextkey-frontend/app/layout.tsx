import type { Metadata, Viewport } from "next";
import { Inter }                   from "next/font/google";
import { Providers }               from "./providers";
import { Toaster }                 from "react-hot-toast";
import "./globals.css";

const Inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextKey - Inheritance Protocol",
  description: "Non-custodial crypto inheritance. Your assets, your rules.",
  icons: { icon: "/favicon.ico"},
};

export const viewport: Viewport = {
  themeColor: "#101415",
};

export default function RootLayout({
  children,
}:{
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
    >
      <body className="h-full antialiased">
       <Providers> 
        {children}
        </Providers>
       </body>
    </html>
  );
}
