import type { Metadata } from "next";
import { Instrument_Serif, Manrope, IBM_Plex_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const instrumentSelf = Instrument_Serif({
    variable: "--font-instrument-serif",
    weight: "400",
    style: ["normal", "italic"],
    subsets: ["latin"],
});

const manrope = Manrope({
    variable: "--font-manrope",
    subsets: ["latin"],
});

const plexMano = IBM_Plex_Mono({
    variable: "--font-plex-mano",
    weight: ["400", "500"],
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "PDF tools that stay out of your way",
    description:
        "Merge, split, and reorganize PDFs in your browser. No accounts, no watermarks, nothing saved longer than it needs to be.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${instrumentSelf.variable} ${plexMano.variable} ${manrope.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col font-sans">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
            </body>
        </html>
    );
}
