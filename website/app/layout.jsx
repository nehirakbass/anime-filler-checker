import './globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
  title: 'Anime Filler Checker — Find Anime Filler Episodes Instantly',
  description: 'Find anime filler episodes instantly. Free tool that auto-detects filler, canon, and mixed episodes for Naruto, One Piece, Bleach, Dragon Ball & 500+ anime. Browser extension & Stremio addon.',
  keywords: 'anime filler checker, anime filler finder, find anime filler, anime filler list, anime filler episodes, anime filler guide, which episodes are filler, skip anime filler, anime canon episodes, is this episode filler, filler detector, naruto filler, one piece filler, bleach filler, anime filler checker extension',
  metadataBase: new URL('https://animefillerchecker.com'),
  alternates: {
    canonical: 'https://animefillerchecker.com',
  },
  openGraph: {
    title: 'Anime Filler Checker — Find Anime Filler Episodes Instantly',
    description: 'Find anime filler episodes instantly. Free tool for 500+ anime — auto-detects filler, canon & mixed episodes. Browser extension & Stremio addon.',
    type: 'website',
    url: 'https://animefillerchecker.com',
    siteName: 'Anime Filler Checker',
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anime Filler Checker — Find Anime Filler Episodes Instantly',
    description: 'Find anime filler episodes for Naruto, One Piece, Bleach & 500+ anime. Free browser extension & Stremio addon.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon128.png', sizes: '128x128', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: {
    'msapplication-TileImage': '/ms-icon-144x144.png',
    'msapplication-TileColor': '#07080d',
    'google': 'notranslate',
    'content-language': 'en',
  },
}

export const viewport = {
  themeColor: '#07080d',
}

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Anime Filler Checker',
  url: 'https://animefillerchecker.com',
  description: 'Browser extension that auto-detects anime episodes and shows filler/canon status instantly on the page.',
  applicationCategory: 'BrowserExtension',
  operatingSystem: 'Chrome, Firefox, Edge',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Nehir Akbas', url: 'https://nehirakbas.com' },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Anime Filler Checker',
  url: 'https://animefillerchecker.com',
  description: 'Find anime filler episodes instantly. Free tool that auto-detects filler, canon, and mixed episodes for 500+ anime.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://animefillerchecker.com/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
