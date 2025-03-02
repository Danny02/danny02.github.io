#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const mkdirp = require('mkdirp');

// Check if the required arguments are provided
if (process.argv.length < 3) {
  console.log('Usage: node extract-embedded-data.js <html-file> [output-dir]');
  process.exit(1);
}

const htmlFilePath = process.argv[2];
const outputDir = process.argv[3] || path.join(path.dirname(htmlFilePath), 'extracted');

// Create the output directory if it doesn't exist
mkdirp.sync(outputDir);

// Read the HTML file
console.log(`Reading HTML file: ${htmlFilePath}`);
const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

// Parse the HTML
const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// Helper function to ensure type directory exists
function ensureTypeDir(type) {
  const typeDir = path.join(outputDir, type);
  if (!fs.existsSync(typeDir)) {
    mkdirp.sync(typeDir);
  }
  return typeDir;
}

// Extract pc-asset tags with embedded data
const pcAssets = document.querySelectorAll('pc-asset[src^="data:"]');
console.log(`Found ${pcAssets.length} pc-asset tags with embedded data`);

pcAssets.forEach((asset, index) => {
  const id = asset.getAttribute('id') || `asset-${index}`;
  const type = asset.getAttribute('type') || 'unknown';
  const src = asset.getAttribute('src');
  
  if (!src) return;
  
  // Extract the data type and content
  const match = src.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    const mimeType = match[1];
    const base64Data = match[2];
    
    // Determine file extension and directory based on mime type
    let ext = mimeType.split('/')[1];
    let dirType;
    
    if (ext === 'ply') {
      ext = 'ply';
      dirType = 'models';
    } else if (ext === 'javascript') {
      ext = 'js';
      dirType = 'scripts';
    } else if (ext === 'json') {
      ext = 'json';
      dirType = 'data';
    } else {
      ext = 'bin';
      dirType = 'binary';
    }
    
    // Create type directory if it doesn't exist
    const typeDir = ensureTypeDir(dirType);
    
    const fileName = `${id}.${ext}`;
    const filePath = path.join(typeDir, fileName);
    
    // Write the data to a file
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`Extracted ${mimeType} data to ${filePath}`);
    
    // Update the src attribute to point to the extracted file
    const relativePath = path.relative(path.dirname(htmlFilePath), filePath);
    asset.setAttribute('src', relativePath);
  } else if (src.startsWith('data:')) {
    // Handle URL-encoded data (not base64)
    const parts = src.split(',');
    if (parts.length >= 2) {
      const mimeType = parts[0].split(':')[1].split(';')[0];
      const encodedData = parts[1];
      
      // Determine file extension and directory
      let ext = mimeType.split('/')[1];
      let dirType;
      
      if (ext === 'javascript') {
        ext = 'js';
        dirType = 'scripts';
      } else if (ext === 'json') {
        ext = 'json';
        dirType = 'data';
      } else {
        ext = 'txt';
        dirType = 'text';
      }
      
      // Create type directory if it doesn't exist
      const typeDir = ensureTypeDir(dirType);
      
      const fileName = `${id}.${ext}`;
      const filePath = path.join(typeDir, fileName);
      
      // Decode the URL-encoded data
      const decodedData = decodeURIComponent(encodedData);
      
      // Write the data to a file
      fs.writeFileSync(filePath, decodedData);
      console.log(`Extracted ${mimeType} data to ${filePath}`);
      
      // Update the src attribute
      const relativePath = path.relative(path.dirname(htmlFilePath), filePath);
      asset.setAttribute('src', relativePath);
    }
  }
});

// Extract embedded JavaScript from script tags or JSON data
const scriptContent = document.querySelector('script:not([src])');
if (scriptContent && scriptContent.textContent) {
  try {
    const jsonData = JSON.parse(scriptContent.textContent);
    
    // Look for data URLs in the JSON
    Object.entries(jsonData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('data:')) {
        const match = value.match(/^data:([^;]+);,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const encodedData = match[2];
          
          // Determine file extension and directory
          let ext = mimeType.split('/')[1];
          let dirType;
          
          if (ext === 'javascript') {
            ext = 'js';
            dirType = 'scripts';
          } else if (ext === 'json') {
            ext = 'json';
            dirType = 'data';
          } else {
            ext = 'txt';
            dirType = 'text';
          }
          
          // Create type directory if it doesn't exist
          const typeDir = ensureTypeDir(dirType);
          
          const fileName = `${key}.${ext}`;
          const filePath = path.join(typeDir, fileName);
          
          // Decode the URL-encoded data
          const decodedData = decodeURIComponent(encodedData);
          
          // Write the data to a file
          fs.writeFileSync(filePath, decodedData);
          console.log(`Extracted ${mimeType} data to ${filePath}`);
          
          // Update the JSON
          const relativePath = path.relative(path.dirname(htmlFilePath), filePath);
          jsonData[key] = relativePath;
        }
      }
    });
    
    // Update the script content
    scriptContent.textContent = JSON.stringify(jsonData, null, 2);
  } catch (e) {
    console.log('Script content is not valid JSON, skipping');
  }
}

// Save the modified HTML
const outputHtmlPath = path.join(
  path.dirname(htmlFilePath),
  path.basename(htmlFilePath, path.extname(htmlFilePath)) + '.extracted' + path.extname(htmlFilePath)
);
fs.writeFileSync(outputHtmlPath, dom.serialize());
console.log(`Saved modified HTML to ${outputHtmlPath}`); 