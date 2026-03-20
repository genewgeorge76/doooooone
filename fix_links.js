const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const htmlFileNames = new Set(files.map(f => f.replace('.html', '')));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace href="/page" with href="/page.html"
  content = content.replace(/href="\/([^"#\.]+)"/g, (match, p1) => {
    if (htmlFileNames.has(p1)) {
      return `href="/${p1}.html"`;
    }
    return match;
  });

  // Also replace canonical links: href="https://jwordenasphaltpaving.com/page"
  content = content.replace(/href="https:\/\/jwordenasphaltpaving\.com\/([^"#\.]+)"/g, (match, p1) => {
    if (htmlFileNames.has(p1)) {
      return `href="https://jwordenasphaltpaving.com/${p1}.html"`;
    }
    return match;
  });

  // Also replace og:url
  content = content.replace(/content="https:\/\/jwordenasphaltpaving\.com\/([^"#\.]+)"/g, (match, p1) => {
    if (htmlFileNames.has(p1)) {
      return `content="https://jwordenasphaltpaving.com/${p1}.html"`;
    }
    return match;
  });

  // Also replace in schema json-ld "url": "https://..."
  content = content.replace(/"url":\s*"https:\/\/jwordenasphaltpaving\.com\/([^"#\.]+)"/g, (match, p1) => {
    if (htmlFileNames.has(p1)) {
      return `"url": "https://jwordenasphaltpaving.com/${p1}.html"`;
    }
    return match;
  });
  
  // schema "@id": "https://..."
  content = content.replace(/"@id":\s*"https:\/\/jwordenasphaltpaving\.com\/([^"#\.]+)#([^"]*)"/g, (match, p1, p2) => {
    if (htmlFileNames.has(p1)) {
      return `"@id": "https://jwordenasphaltpaving.com/${p1}.html#${p2}"`;
    }
    return match;
  });

  // schema "item": "https://..."
  content = content.replace(/"item":\s*"https:\/\/jwordenasphaltpaving\.com\/([^"#\.]+)"/g, (match, p1) => {
    if (htmlFileNames.has(p1)) {
      return `"item": "https://jwordenasphaltpaving.com/${p1}.html"`;
    }
    return match;
  });


  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Fixed links in HTML files');
