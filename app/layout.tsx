import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SociaLIA',
    template: '%s | SociaLIA',
  },
  description: 'Social Intelligence & Political Analytics Platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-surface text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
