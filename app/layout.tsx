import type { Metadata, Viewport } from "next";
import { Providers }               from "./providers";
import { Toaster }                 from "react-hot-toast";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
       <Providers> 
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
              style: {
                background: "#1d2022",
                color:      "#e0e3e5",
                border:     "1px solid #3c4a42",
                borderRadius: "4px",
                fontSize:   "13px",
              },
              success: { iconTheme: { primary: "#4edea3", secondary: "#003824" } },
              error:   { iconTheme: { primary: "#ffb4ab", secondary: "#690005" } },
            }}
          />
        </Providers>
       </body>
    </html>
  );
}
