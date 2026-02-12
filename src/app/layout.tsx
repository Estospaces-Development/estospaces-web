import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SavedPropertiesProvider } from "@/contexts/SavedPropertiesContext";
import { ApplicationsProvider } from "@/contexts/ApplicationsContext";
import { PropertyProvider } from "@/contexts/PropertyContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Estospaces | Modern Property Management & Discovery in the UK",
  description: "Find your perfect space with Estospaces. The ultimate property platform for UK tenants, managers, and owners. Streamlined applications, real-time tracking, and expert support.",
  keywords: ["property management", "real estate UK", "tenant portal", "manager dashboard", "Estospaces"],
  authors: [{ name: "Estospaces Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <SavedPropertiesProvider>
            <PropertyProvider>
              <ApplicationsProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </ApplicationsProvider>
            </PropertyProvider>
          </SavedPropertiesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
