import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PinCheck } from '@/lib/checkPin';
import { Toaster } from "@/components/ui/toaster";
import { ModifiedTimeProvider } from "@/context/ModifiedTimeContext";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RWS TV Project Management",
  description: "This app is made for RWS for Project Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* {children} */}
        <PinCheck>
          <ModifiedTimeProvider>
            {children}
          </ModifiedTimeProvider>
        </PinCheck>
        <Toaster />
      </body>
    </html>
  );
}
