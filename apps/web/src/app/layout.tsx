import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Prazo", template: "%s | Prazo" },
  description: "Matrizes de responsabilidade com cobrança automática por WhatsApp e e-mail.",
};

export const viewport: Viewport = {
  themeColor: "#EEF0F3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={onest.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
