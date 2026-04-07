# Privacy Policy — Anime Filler Checker

**Last updated:** April 2026

## Overview
Anime Filler Checker is a browser extension and Stremio addon that detects anime episode information and checks if episodes are filler using publicly available data from AnimeFillerList.com.

## Data Collection
This extension does **NOT** collect, store, transmit, or sell any personal data.

Specifically, we do NOT collect:
- Browsing history
- Personal information
- Account credentials
- IP addresses
- Usage analytics or telemetry
- Any form of user tracking

## Data Storage
The only data stored locally on your device is:
- **Filler list cache**: Episode data fetched from AnimeFillerList.com is cached locally in your browser's storage for 14 days to improve performance. This cache contains only publicly available anime episode classifications (canon/filler/mixed). No personal data is included.
- **MAL score cache**: Anime score and info fetched from the Jikan API (MyAnimeList) is cached locally for 5 days. This contains only publicly available data (score, member count, airing status).
- **Season data cache**: Anime season/sequel chain data fetched from the Jikan API is cached locally for 14 days. This is used to calculate correct episode numbers for multi-season anime.
- **Watch history**: Your last 8 watched anime episodes are stored locally to show recent activity in the extension popup. This data never leaves your device.

This cached data:
- Is stored only on your local device using Chrome's `storage.local` API
- Is never transmitted to any server
- Can be cleared at any time by removing the extension
- Contains no personal or identifying information

## Network Requests
The extension makes network requests only to:
- `https://www.animefillerlist.com` — To fetch publicly available anime filler/canon episode data
- `https://api.jikan.moe` — To fetch anime scores, member counts, and airing status from MyAnimeList (via the public Jikan API)

No other network requests are made. No data is sent to any analytics service, advertising network, or third-party server.

## Permissions
- **activeTab**: Used to read the current page's DOM and URL to detect the anime name and episode number being watched. No page content is stored or transmitted.
- **storage**: Used to cache anime filler data, watch history, and user preferences locally for faster subsequent lookups.
- **host_permissions (animefillerlist.com)**: Required to fetch episode data from AnimeFillerList.com.
- **host_permissions (api.jikan.moe)**: Required to fetch anime metadata (scores, season info, sequel chains) from MyAnimeList via the Jikan API.
- **content_scripts (all_urls)**: The extension runs on all URLs but only activates on user-configured streaming sites (e.g. Crunchyroll, Netflix, HiAnime). On non-streaming sites, the extension does nothing. The extension reads only anime-related DOM elements (titles, episode numbers) and does not access, store, or transmit any other page content.

## Stremio Addon
The Stremio addon is a server-side component hosted on Vercel. It processes anime metadata requests from Stremio clients:
- It fetches publicly available filler data from AnimeFillerList.com and metadata from the Jikan API on behalf of the user.
- It does NOT log, store, or track any user data, IP addresses, or viewing habits.
- No analytics or telemetry of any kind is collected.
- The addon is open source and can be self-hosted.

## Third-Party Services
- [AnimeFillerList.com](https://www.animefillerlist.com) — Filler/canon episode data. We are not affiliated with AnimeFillerList.com.
- [Jikan API](https://jikan.moe) — Public REST API for MyAnimeList data (scores, member counts, season info). We are not affiliated with Jikan or MyAnimeList.
- [Vercel](https://vercel.com) — Hosting platform for the Stremio addon and project website. See their privacy policy at vercel.com/legal/privacy-policy.

Please refer to their respective websites for their own privacy policies.

## Changes
If this privacy policy changes, the updated version will be published alongside the extension update.

## Contact
For questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/nehirakbass/anime-filler-checker) or contact via the Chrome Web Store developer page.
