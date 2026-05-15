Goal: ship BisDak SEO fixes. 40→80/100. Order CR→H→M.

CR-1 Canonical collapse. app/layout.tsx: delete alternates.canonical from root; keep metadataBase=new URL('https://bisdak.co.nz'). Every page (/, /blog, /blog/[slug], /tools, /tools/[t], /jobs, /search, /submit) exports alternates:{canonical:'/<path>'}. Each page's canonical must be its own URL.

CR-2 /search & /jobs return 403. middleware.ts: matcher=['/admin/:path*','/dashboard/:path*']. No (?!api|_next) catch-all. Both routes → 200.

CR-3 Business pages SSR only 104 words. app/business/[slug]/page.tsx Server Component renders in initial HTML: <h1>, lead <p>, <dl> Category/Address(street+suburb+city+region+postal)/Phone(tel:)/Website/Hours, <section>About 60–120 unique words, conditional <ReviewsSection> only if reviews exist, <RelatedListings limit=6> same category+city. ≥300 rendered words.

CR-4 404 leak. Delete robots:{index:true,follow:true} from root layout. app/not-found.tsx metadata:{title:'404 — Page not found', robots:{index:false,follow:false}, alternates:{canonical:undefined}}. 404 must have 1 robots meta, no homepage canonical.

CR-5 LocalBusiness schema (lib/schema.ts). category→@type map: Restaurant, Bakery, FoodEstablishment, FinancialService, GroceryStore, BeautySalon, HairSalon, MedicalBusiness, Dentist, AutoRepair, fallback LocalBusiness. Add: telephone, address.streetAddress/addressLocality/postalCode, geo{lat,lng}, openingHoursSpecification[], image=/api/og/[slug], priceRange, sameAs[], hasMap, areaServed, @id=page#business. aggregateRating only if reviews exist.

H-1 app/layout.tsx JSON-LD: Organization (@id=site#organization, logo, areaServed:NZ, sameAs) + WebSite with SearchAction urlTemplate https://bisdak.co.nz/search?q={search_term_string}. Needs CR-2.

H-2 public/llms.txt: About, Business directory, Community blog (4 cornerstone posts), Free tools (mortgage/PAYE/GST/currency/time-zone), Contact hello@bisdak.co.nz. GET /llms.txt→200.

H-3 Title double-brand. Keep template '%s — BisDak NZ'. Pages whose own title already has "BisDak" (e.g. app/blog/page.tsx): strip brand or use title:{absolute:'<full>'}.

H-4 BreadcrumbList on /business & /blog (Home→Category|Blog→Current). WebApplication on /tools/*: FinanceApplication (mortgage/PAYE/GST/currency) or UtilityApplication (timer); free NZD offer; publisher→site#organization.

H-5 Create app/about, app/contact, app/authors/[slug]. BlogPosting.author Organization→Person{name,url:/authors/<slug>}.

H-6 BlogPosting add: image (ImageObject 1200x630), dateModified (fallback datePublished), mainEntityOfPage @id=canonical.

H-7 Hero LCP: replace jeepney2.mp4 with WebP <80KB OR add poster="…" + preload="none" + lazy-load below fold.

M-1 next.config.ts headers(): X-Content-Type-Options:nosniff, X-Frame-Options:SAMEORIGIN, Referrer-Policy:strict-origin-when-cross-origin, Permissions-Policy:camera=(),microphone=(),geolocation=(self). No strict CSP yet.
M-2 app/sitemap.ts: business entries priority 0.5, changeFrequency monthly, lastModified=biz.updatedAt.
M-3 New app/category/[slug] + app/city/[slug] hubs: server-rendered ItemList + 200-word intro + ItemList schema.
M-4 Listing badges (Owner-claimed/Phone-verified/Community-submitted) + /verification page.
M-5 /admin → 401.
M-6 GSC domain property + GA4.

DONE when:
- /search, /jobs, /llms.txt all return 200
- /does-not-exist returns 404 with exactly 1 robots meta
- canonical on /, /blog, /blog/*, /tools, /tools/* is each page's own URL
- /business/[slug] rendered body ≥300 words (strip tags from curl output)
- homepage JSON-LD includes Organization and WebSite @type
