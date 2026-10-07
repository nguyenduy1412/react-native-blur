# Website search assets

These files are ready to deploy to the root of `https://kaizer-app.vercel.app`:

| File | Public URL | Purpose |
| --- | --- | --- |
| `robots.txt` | `/robots.txt` | Allows Google, ChatGPT Search and Claude search crawlers. |
| `sitemap.xml` | `/sitemap.xml` | Declares the current canonical landing page. Add a `<url>` entry whenever a new public docs/article page is published. |
| `llms.txt` | `/llms.txt` | Gives AI tools a concise, factual package summary and canonical sources. |

For a Vercel static site, copy these files into its deployed `public/` directory. For a framework site, expose the same exact paths through its static-assets mechanism. Do not use a `noindex` meta tag or an `X-Robots-Tag: noindex` response header on the documentation page.

The current Vercel page is a client-rendered Expo web page whose initial HTML has an empty `<title>`. The website source must set a server-rendered/static title, description, canonical URL, Open Graph metadata, and JSON-LD. Those changes cannot be applied from this package repository because that source is not present here.
