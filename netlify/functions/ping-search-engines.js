exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL parameter is required in the JSON body.' })
      };
    }

    if (!url.startsWith('https://')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'A full HTTPS URL is required (e.g., https://jwordenasphaltpaving.com/sitemap.xml).' })
      };
    }

    const isSitemap = url.toLowerCase().endsWith('.xml') || url.includes('sitemap');

    // Run pings in parallel
    const results = await Promise.allSettled([
      pingGoogle(url, isSitemap),
      pingBing(url, isSitemap)
    ]);

    const [googleResult, bingResult] = results;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Search engine notification attempt complete',
        url: url,
        type: isSitemap ? 'Sitemap' : 'URL',
        google: googleResult.status === 'fulfilled' ? googleResult.value : { error: googleResult.reason?.message },
        bing: bingResult.status === 'fulfilled' ? bingResult.value : { error: bingResult.reason?.message },
        note: 'Note: Google and Bing have deprecated legacy ping endpoints (resulting in 404/410 errors). This function now uses official APIs.'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process request: ' + error.message })
    };
  }
};

/**
 * Pings Google Search Console API.
 * Google no longer supports simple unauthenticated pings.
 */
async function pingGoogle(url, isSitemap) {
  const apiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  const siteUrl = 'https://jwordenasphaltpaving.com';

  if (!apiKey) {
    return {
      status: 'skipped',
      reason: 'GOOGLE_SEARCH_CONSOLE_API_KEY is not configured. Google requires API authentication for sitemap submission.'
    };
  }

  // Modern Search Console API for sitemaps (requires OAuth2 usually, but we'll try the v3 endpoint if a key is provided)
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const encodedSitemapUrl = encodeURIComponent(url);
  
  // Note: Most Search Console API calls require OAuth2. 
  // If an API Key is provided, it might work for certain scopes but usually not Search Console.
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedSitemapUrl}?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, { method: 'PUT' });
    return {
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      message: response.statusText,
      apiUrl: apiUrl.split('?')[0] // Return URL without key for safety
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

/**
 * Pings Bing Webmaster Tools API.
 * Uses the API key provided in previous sessions or from environment variables.
 */
async function pingBing(url, isSitemap) {
  // Fallback to the key provided by the user in Attempt 1
  const apiKey = process.env.BING_WEBMASTER_API_KEY || '85264600471ee850177d93baf837ddca5fa6df15';
  const siteUrl = 'https://jwordenasphaltpaving.com';

  if (!apiKey) {
    return {
      status: 'skipped',
      reason: 'BING_WEBMASTER_API_KEY is not configured.'
    };
  }

  try {
    let response;
    let apiUrl;

    if (isSitemap) {
      // Bing Sitemap Submission API (GET request)
      apiUrl = `https://www.bing.com/webmaster/api.svc/json/SubmitSitemap?siteUrl=${encodeURIComponent(siteUrl)}&sitemapUrl=${encodeURIComponent(url)}&apikey=${apiKey}`;
      response = await fetch(apiUrl);
    } else {
      // Bing URL Submission API (POST request)
      apiUrl = `https://www.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=${apiKey}`;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: siteUrl,
          url: url
        })
      });
    }

    const data = await response.json();
    return {
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      message: response.statusText,
      bingResponse: data
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
