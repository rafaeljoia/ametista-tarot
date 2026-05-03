import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Geist is loaded via @next/font self-hosted; falls back to Inter in tailwind config.
const geist = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ametista Tarot — Cartomancia & Tarot Online',
  description:
    'Conecte-se em tempo real com cartomantes e taróloga(o)s especializados. Respostas claras, acolhimento e privacidade — quando você precisar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geist.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
