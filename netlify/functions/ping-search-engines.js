// Netlify function to ping search engines with the sitemap URL.
// Trigger this function via a Netlify deploy hook or scheduled event
// to notify Google and Bing whenever the site is updated.

const SITEMAP_URL = "https://jwordenasphaltpaving.com/sitemap.xml";

// Use Bing Webmaster API if an API key is provided in environment variables
const BING_API_KEY = process.env.BING_WEBMASTER_API_KEY;

const PING_URLS = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  BING_API_KEY 
    ? `https://www.bing.com/webmaster/api.svc/json/SubmitSitemap?siteUrl=https://jwordenasphaltpaving.com&sitemapUrl=${encodeURIComponent(SITEMAP_URL)}&apikey=${BING_API_KEY}`
    : `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

exports.handler = async function (event, context) {
  const results = await Promise.allSettled(
    PING_URLS.map(async (url) => {
      const response = await fetch(url);
      return { url, status: response.status, ok: response.ok };
    })
  );

  const summary = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return { url: PING_URLS[index], error: result.reason?.message || "Unknown error" };
  });

  const allOk = results.every(
    (result) => result.status === "fulfilled" && result.value.ok
  );

  return {
    statusCode: allOk ? 200 : 207,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sitemapUrl: SITEMAP_URL, results: summary }),
  };
};
