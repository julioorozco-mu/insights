import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/theme.css";
import { APP_NAME_FULL } from "@/utils/constants";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta" });

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
      <body className={`${font.variable} font-sans bg-brand-background text-slate-900`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
