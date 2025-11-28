import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/theme.css";
import { APP_NAME_FULL } from "@/utils/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME_FULL,
  description: "Plataforma de capacitación política con cursos en línea y transmisión en vivo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="skillzone" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
