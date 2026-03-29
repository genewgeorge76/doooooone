const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();
const issues = [];
let totalPages = 0;

function getAllHtmlFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.netlify') {
        arrayOfFiles = getAllHtmlFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.html')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const htmlFiles = getAllHtmlFiles(directoryPath);
totalPages = htmlFiles.length;

const validFiles = new Set(htmlFiles.map(f => f.replace(directoryPath, '').replace(/^\//, '')));
// add some default valid paths that are root paths
validFiles.add('');
validFiles.add('/');

const existingAssets = new Set();
function addAssets(dirPath) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.netlify') {
        addAssets(fullPath);
      }
    } else {
      existingAssets.add(fullPath.replace(directoryPath, '').replace(/^\//, ''));
    }
  });
}
addAssets(directoryPath);

htmlFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = filePath.replace(directoryPath, '').replace(/^\//, '');

  // Check title
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    issues.push(`${relativePath}: Missing <title> tag`);
  } else if (!titleMatch[1].trim()) {
    issues.push(`${relativePath}: Empty <title> tag`);
  }

  // Check description
  const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i) || 
                    content.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
  if (!descMatch) {
    issues.push(`${relativePath}: Missing meta description`);
  } else if (!descMatch[1].trim()) {
    issues.push(`${relativePath}: Empty meta description`);
  }
  
  // check h1
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) {
    issues.push(`${relativePath}: Missing <h1> tag`);
  }

  // Check links
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let hrefMatch;
  while ((hrefMatch = hrefRegex.exec(content)) !== null) {
    const link = hrefMatch[1];
    if (link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('#')) continue;
    
    // Normalize link
    let normalizedLink = link.split('#')[0].split('?')[0]; // strip hash and query
    if (normalizedLink === '') continue; // was just a hash or query
    
    if (normalizedLink.startsWith('/')) {
        normalizedLink = normalizedLink.substring(1);
    }

    if (!existingAssets.has(normalizedLink) && !validFiles.has(normalizedLink)) {
        // sometimes they map to .html implicitly or index.html
        if (!existingAssets.has(normalizedLink + '.html') && !existingAssets.has(normalizedLink + '/index.html')) {
            issues.push(`${relativePath}: Broken link to '${link}'`);
        }
    }
  }

  // Check images
  const srcRegex = /src=["']([^"']+)["']/gi;
  let srcMatch;
  while ((srcMatch = srcRegex.exec(content)) !== null) {
    const src = srcMatch[1];
    if (src.startsWith('http') || src.startsWith('data:')) continue;
    
    let normalizedSrc = src.split('?')[0];
    if (normalizedSrc.startsWith('/')) {
        normalizedSrc = normalizedSrc.substring(1);
    }
    
    if (!existingAssets.has(normalizedSrc)) {
      issues.push(`${relativePath}: Broken image source to '${src}'`);
    }
  }
});

console.log(JSON.stringify({ totalPages, issues }, null, 2));
