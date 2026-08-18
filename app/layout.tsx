import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ConditionalFooter } from "@/components/conditional-footer"
import { ThemeProvider } from "@/components/theme-provider"
import { LastPageTracker } from "@/components/last-page-tracker"
import "./globals.css"

const font = Inter({
  variable: "--font-sans",
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
      className={`${font.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <LastPageTracker />
          <div className="flex flex-col flex-1 min-h-screen">
            {children}
            <ConditionalFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
