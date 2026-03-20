const fs = require('fs');
const path = require('path');

const htmlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix schema bad image URL
  content = content.replace(
    /"image":\s*"https:\/\/jwordenasphaltpaving\.com\/Asphalt Paving Richmond VA _ J\. Worden & Sons _ \(804\) 446-1296 file needed_files\/20180209_014704733_iOS\.jpg"/g,
    '"image": "https://jwordenasphaltpaving.com/assets/images/20180209_014725276_iOS.jpg"'
  );

  // Fix schema logo URL
  content = content.replace(
    /"logo":\s*"https:\/\/jwordenasphaltpaving\.com\/images\/logo\.png"/g,
    '"logo": "https://jwordenasphaltpaving.com/assets/images/20160721_204440000_iOS.jpg"'
  );

  // Remove fake google site verification
  content = content.replace(
    /<!-- ADD THE GOOGLE VERIFICATION CODE HERE -->\s*<meta name="google-site-verification" content="1a2b3c4d5e6f7g8h9i0j\.\.\." \/>/g,
    ''
  );
  content = content.replace(
    /<meta name="google-site-verification" content="1a2b3c4d5e6f7g8h9i0j\.\.\." \/>/g,
    ''
  );

  // Fix relative URLs in og:image and twitter:image
  content = content.replace(
    /content="assets\/images\//g,
    'content="https://jwordenasphaltpaving.com/assets/images/'
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('SEO fixes applied.');
