# M-6 — Google Search Console + GA4 setup (manual)

These two integrations cannot be code-shipped; they're verifications and connections you do once in the Google admin UIs. This doc walks through each, plus the optional `/seo google` integration that pulls live data into future audits.

## 1. Google Search Console — domain property

1. Visit https://search.google.com/search-console/welcome.
2. Choose **Domain** (not URL-prefix). Enter `bisdak.co.nz`.
3. GSC will show a TXT record. In your DNS host (Cloudflare/Vercel/Squarespace — wherever `bisdak.co.nz` is registered), add the TXT record at the apex (`@` or empty host).
4. After DNS propagates (5–60 min), click **Verify** in GSC.
5. Inside GSC → **Sitemaps** (left nav) → submit `https://bisdak.co.nz/sitemap.xml`.
6. Inside GSC → **Indexing → Pages** to watch indexation status post-deploy. Expect 24–72 hours after pushing the canonical fix for affected URLs to re-index.

### Things to check 7 days after deploy

- **Performance → Search results**: Are blog and tool pages now appearing as their own URLs (instead of consolidating into `/`)?
- **Indexing → Pages → "Alternate page with proper canonical tag"**: should drop to ~0 for pages that previously had bad canonicals.
- **Indexing → Pages → "Crawled — currently not indexed"**: business pages with thin content may show up; flag for content enrichment.
- **Enhancements → Structured data**: Organization, WebSite, LocalBusiness (per page type), BlogPosting, BreadcrumbList, WebApplication should all appear with 0 errors.

## 2. GA4 — basic property + organic-search reporting

1. Visit https://analytics.google.com → **Admin** → **Create property** → name `BisDak` → time zone `Pacific/Auckland` → currency `NZD`.
2. Create a **Web data stream** for `https://bisdak.co.nz`.
3. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
4. Install via `next/script` in `app/layout.tsx`. The standard pattern (you can add later):
   ```tsx
   import Script from 'next/script'
   // ... inside <head> or <body>
   {process.env.NEXT_PUBLIC_GA_ID && (
     <>
       <Script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
       <Script id="ga4">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{anonymize_ip:true});`}</Script>
     </>
   )}
   ```
   Set `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` in Vercel environment variables. Skipped from this implementation pass because no measurement ID exists yet.

5. In GA4 → **Admin → Property → Product links → Search Console links** → link the GSC property. This unlocks the Search Console report inside GA4.

### Things to check after install

- **Reports → Acquisition → Traffic acquisition** with the channel grouping = "Organic Search" — daily session count baseline.
- **Reports → Pages and screens** — landing-page-level traffic, useful for measuring CR-3 impact on `/business/*` pages.

## 3. Optional — `/seo google` integration for follow-up audits

If you want future `/seo google` runs (CrUX field data, URL inspection, GA4 export) to work without manual exports, run:

```
python ~/.claude/skills/seo-google/scripts/google_auth.py
```

Then sign in with the Google account that owns the GSC property. The script saves a token under `~/.claude/.seo-google-token.json`. Subsequent `/seo audit bisdak.co.nz` runs will auto-detect it and pull real CWV/INP/CLS field data, indexation status, and organic-traffic trends.

## 4. PageSpeed Insights — one-off sanity check

After deploy, run:

```
open "https://pagespeed.web.dev/analysis?url=https://bisdak.co.nz/"
open "https://pagespeed.web.dev/analysis?url=https://bisdak.co.nz/business/jollibee-auckland-central"
open "https://pagespeed.web.dev/analysis?url=https://bisdak.co.nz/blog/welcome-to-bisdak"
```

The H-7 hero LCP fix (poster + `preload="metadata"`) should drop mobile LCP from ~4s into the 2.5s "Good" band. INP and CLS should already be in green.
