import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Autonomous Hotel OS",
    description: "Experience the Future of Hospitality",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased h-screen w-screen flex flex-col">
                {children}
            </body>
        </html>
    );
}
