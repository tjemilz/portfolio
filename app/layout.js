import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AuthProvider } from "./providers/AuthProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: {
    default: "Emilien Fourgnier - Photographe",
    template: "%s | Emilien Fourgnier"
  },
  description: "Portfolio photographique d'Emilien Fourgnier - Street photography, Noir & Blanc, Exploration urbaine. Découvrez mon univers visuel à travers des clichés authentiques.",
  keywords: ["photographie", "photographe", "street photography", "noir et blanc", "portfolio", "Emilien Fourgnier", "photo urbaine", "exploration"],
  authors: [{ name: "Emilien Fourgnier" }],
  creator: "Emilien Fourgnier",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://emilienfourgnier.com",
    siteName: "Emilien Fourgnier - Photographe",
    title: "Emilien Fourgnier - Photographe",
    description: "Portfolio photographique d'Emilien Fourgnier - Street photography, Noir & Blanc, Exploration urbaine.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Emilien Fourgnier - Portfolio Photographique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Emilien Fourgnier - Photographe",
    description: "Portfolio photographique - Street photography, Noir & Blanc, Exploration urbaine.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased bg-cream text-gray-900`}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
