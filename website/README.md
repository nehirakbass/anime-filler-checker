# Anime Filler Checker — Website

Landing page for the [Anime Filler Checker](https://animefillerchecker.com) browser extension.

Built with **React 19** + **Vite** and deployed on **Vercel**.

## Stack
- React 19 + React Router
- Vite 8
- Vercel Serverless Functions (waitlist API)
- Vercel Analytics
- Resend (email)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Structure
```
src/
├── pages/
│   ├── Home.jsx        # Landing page with hero, features, how-it-works, CTA
│   └── Privacy.jsx     # Privacy policy
├── components/
│   ├── InteractiveDemo.jsx   # Interactive browser mockup demo
│   └── TechDemo.jsx          # Animated pipeline showing how detection works
├── App.jsx
├── main.jsx
└── index.css
api/
└── waitlist.js         # Vercel serverless function for email waitlist
public/
├── favicon.ico, favicon-*.png
├── icon48.png, icon128.png
└── og-image.png
```
