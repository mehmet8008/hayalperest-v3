import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

// 1. Site Başlığı ve Açıklaması
export const metadata: Metadata = {
  title: "HayalPerest | Metaverse",
  description: "Fiziksel ve Dijital Evrenin Birleşimi",
  icons: {
    icon: "/favicon.ico",
  },
};

// 2. Mobil Uygulama Ayarları (PWA için Kritik Kısım)
export const viewport: Viewport = {
  themeColor: "#020617", // Telefonun üst barını siyah yapar
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Mobilde zoom yapıp tasarımı bozmasınlar
  userScalable: false,
};

// 3. Ana İskelet
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ClerkProvider: Tüm siteyi kimlik doğrulama sistemiyle sarar
    // appearance={{ baseTheme: dark }}: Giriş ekranını otomatik koyu tema yapar
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: "#ec4899" } // HayalPerest Pembesi
      }}
    >
      <html lang="tr">
        <body className="bg-slate-950 text-white antialiased">
           {children}
        </body>
      </html>
    </ClerkProvider>
  );
}