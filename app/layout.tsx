import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google"
import { StoreProvider } from "@/app/context/store"
import { Footer } from "@/components/footer"
import { Watermark } from "@/components/ui/watermark"
import "./globals.css"

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

const fontSerif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
})

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Marcelo P. Gayeta Funeral Services | Dignified Memorials & Tributes",
  description: "Providing compassionate, high-quality, and professional funeral, wake setups, and hearse transport services in Sariaya, Quezon Province.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
        <StoreProvider>
          <Watermark />
          <div className="flex flex-col flex-1 min-h-screen">
            {children}
            <Footer />
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}
