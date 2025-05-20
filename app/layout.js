import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import MyNavbar from "@/components/navbar";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";
import Script from "next/script";
import "./globals.css";
import Footer from "@/components/footer";

// Optimize font loading
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap", // Improves CLS
  // Optional: adjust weight/style as needed
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap", // Improves CLS
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: {
    default: "Notar.io | Sistem Validasi Dokumen Akademik Digital",
    template: "%s | Notar.io"
  },
  description: "Sistem validasi dokumen akademik berbasis tanda tangan digital untuk kampus dan institusi pendidikan",
  
  metadataBase: new URL("https://notario.example.com"),
  
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://notario.example.com",
    title: "Notar.io | Sistem Validasi Dokumen Akademik Digital",
    description: "Sistem validasi dokumen akademik berbasis tanda tangan digital untuk kampus dan institusi pendidikan",
    siteName: "Notar.io",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Notar.io - Platform Validasi Dokumen Digital",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Notar.io | Sistem Validasi Dokumen Akademik Digital",
    description: "Sistem validasi dokumen akademik berbasis tanda tangan digital untuk kampus dan institusi pendidikan",
    images: ["/images/twitter-image.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${fraunces.variable} ${plexMono.variable} font-serif antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster />
            <MyNavbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}