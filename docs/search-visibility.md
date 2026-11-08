# Search visibility and crawler controls

The entire Supper Club application requests no crawling through `/robots.txt`
(`User-agent: *`, `Disallow: /`). All responses also send
`X-Robots-Tag: noindex, nofollow, noarchive`, and HTML includes robots metadata.
These rules apply after deploying the updated image; a PR alone changes nothing live.

Verify the deployed hostname (replace the placeholder):

```sh
curl -fsS https://YOUR-SUBDOMAIN/robots.txt
curl -I https://YOUR-SUBDOMAIN/reviews
```

Verify the same header on a review, an uploaded image, and the login page.
In page source, check `<meta name="robots" ...>` contains `noindex`.

## Remove URLs already present in search

1. Verify ownership of the precise subdomain in Google Search Console and Bing
   Webmaster Tools. Keep removal requests restricted to that subdomain.
2. In Google Search Console, use Removals → New request → Remove all URLs with
   this prefix, using the full `https://YOUR-SUBDOMAIN/` prefix. Include a separate
   HTTP prefix if HTTP URLs were indexed. Google removal requests are temporary.
3. Use Bing Webmaster Tools' URL blocking/removal controls for the same subdomain.
4. Monitor indexed URLs and renew temporary requests as needed. Remove any sitemap
   submissions for this subdomain.

A crawler blocked by robots.txt cannot fetch the noindex directive. Therefore these
settings discourage future crawling but do not guarantee permanent removal of
already-indexed URLs; search engines can retain a URL-only result. Permanent removal
requires allowing a controlled recrawl of noindex pages, returning 404/410, or placing
content behind authentication. The default here keeps crawling blocked and link
access available, as requested.

Robots directives are voluntary. They do not stop noncompliant scrapers or provide
access control, and they do not prevent third-party tracking. No analytics or login
policy is changed by these controls.
