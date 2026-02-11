import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SavedPropertiesProvider } from "@/contexts/SavedPropertiesContext";
import { ApplicationsProvider } from "@/contexts/ApplicationsContext";

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
  title: "EstoSpaces | Modern Property Management & Discovery in the UK",
  description: "Find your perfect space with EstoSpaces. The ultimate property platform for UK tenants, managers, and owners. Streamlined applications, real-time tracking, and expert support.",
  keywords: ["UK property", "real estate", "rentals", "property management", "Leicester rentals", "London apartments"],
  authors: [{ name: "EstoSpaces Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased`}>
        <AuthProvider>
          <SavedPropertiesProvider>
            <ApplicationsProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ApplicationsProvider>
          </SavedPropertiesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
