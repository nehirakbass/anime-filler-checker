# Privacy Policy — Anime Filler Checker

**Last updated:** March 2026

## Overview
Anime Filler Checker is a browser extension that detects anime episode information from web pages and checks if episodes are filler using publicly available data from AnimeFillerList.com.

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
- **Filler list cache**: Episode data fetched from AnimeFillerList.com is cached locally in your browser's storage for 24 hours to improve performance. This cache contains only publicly available anime episode classifications (canon/filler/mixed). No personal data is included.

This cached data:
- Is stored only on your local device using Chrome's `storage.local` API
- Is never transmitted to any server
- Can be cleared at any time by removing the extension
- Contains no personal or identifying information

## Network Requests
The extension makes network requests only to:
- `https://www.animefillerlist.com` — To fetch publicly available anime filler/canon episode data

No other network requests are made. No data is sent to any analytics service, advertising network, or third-party server.

## Permissions
- **activeTab**: Used to read the current page's DOM and URL to detect the anime name and episode number being watched. No page content is stored or transmitted.
- **storage**: Used to cache anime filler data locally for faster subsequent lookups.
- **host_permissions (animefillerlist.com)**: Required to fetch episode data from AnimeFillerList.com.

## Third-Party Services
This extension uses data from [AnimeFillerList.com](https://www.animefillerlist.com). We are not affiliated with AnimeFillerList.com. Please refer to their website for their own privacy policy.

## Changes
If this privacy policy changes, the updated version will be published alongside the extension update.

## Contact
For questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/nehirakbass/anime-filler-checker) or contact via the Chrome Web Store developer page.
