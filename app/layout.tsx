import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google"
import { ConditionalFooter } from "@/components/conditional-footer"
import { ThemeProvider } from "@/components/theme-provider"
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="flex flex-col flex-1 min-h-screen">
            {children}
            <ConditionalFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
