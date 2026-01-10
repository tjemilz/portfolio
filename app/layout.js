import { Tinos, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AuthProvider } from "./providers/AuthProvider";

const tinos = Tinos({
  subsets: ["latin"],
  variable: "--font-tinos",
  display: "swap",
  weight: ["400", "700"],
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
    default: "Still24 - Emilien Fourgnier",
    template: "%s | Still24"
  },
  description: "Portfolio photographique Still24 par Emilien Fourgnier - Street photography, Noir & Blanc, Exploration urbaine. Découvrez mon univers visuel à travers des clichés authentiques.",
  keywords: ["photographie", "photographe", "street photography", "noir et blanc", "portfolio", "Still24", "Emilien Fourgnier", "photo urbaine", "exploration"],
  authors: [{ name: "Emilien Fourgnier" }],
  creator: "Emilien Fourgnier",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://still24.fr",
    siteName: "Still24 - Emilien Fourgnier",
    title: "Still24 - Portfolio Photographique",
    description: "Portfolio photographique Still24 par Emilien Fourgnier - Street photography, Noir & Blanc, Exploration urbaine.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Still24 - Portfolio Photographique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Still24 - Emilien Fourgnier",
    description: "Portfolio photographique Still24 - Street photography, Noir & Blanc, Exploration urbaine.",
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
      <body className={`${tinos.variable} ${inter.variable} font-sans antialiased bg-background text-foreground`}>
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
