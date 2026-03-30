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

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does Anime Filler Checker work on Crunchyroll?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Crunchyroll filler extension detects the anime and episode you\'re watching and overlays a badge — FILLER, CANON, or MIXED — directly on the Crunchyroll page. It acts as a Crunchyroll filler labeler so you never have to leave the tab to check.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it work on 9anime and other streaming sites?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — the extension works on any anime streaming site including 9anime, GogoAnime, Zoro, and more. It reads the episode from the URL and page title, so it adapts to whatever site you watch on.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which Naruto episodes are filler?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Naruto has a notoriously high filler rate — around 41% of episodes. With Anime Filler Checker installed, each Naruto episode is automatically labeled when you open it. You can also open the popup to look up any episode in the Naruto filler list manually.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a filler episode in anime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A filler episode is one not based on the original manga. Studios produce them to avoid overtaking the source material. Filler episodes don\'t advance the main story and can generally be skipped — though some are worth watching for character moments.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I know if an episode is filler without Googling it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'That\'s exactly what Anime Filler Checker solves. Once installed, it auto-detects the episode and shows its status on-screen — no tab-switching, no spoiler risk from search results. It\'s a live filler detector built into your browser.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it support One Piece and Bleach?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. One Piece filler episodes and Bleach filler arcs are fully supported. Both series have large filler stretches, so the badge is especially useful there. In total, 500+ anime are supported including Dragon Ball Z, Boruto, Black Clover, and Fairy Tail.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is the Anime Filler Checker extension safe to install?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Anime Filler Checker is fully open source — you can read every line of code on GitHub. It requests no personal data, collects no analytics, and has no ads. It\'s listed on the Chrome Web Store and Firefox Add-ons.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use it without installing a browser extension?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Currently no, but the extension is free and easy to install and you dont need to create an account. For the future there is a stremio addon in the works. Stay tuned!',
      },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
