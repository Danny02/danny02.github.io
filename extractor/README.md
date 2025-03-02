# HTML Embedded Data Extractor

This tool extracts embedded data (base64-encoded or URL-encoded) from HTML files and saves them as separate files. It then updates the HTML to reference these external files instead of embedding the data.

## Features

- Extracts embedded data from `<pc-asset>` tags
- Extracts embedded JavaScript, JSON, and other data formats
- Handles both base64-encoded and URL-encoded data
- Updates the HTML to reference the extracted files
- Preserves the original HTML file and creates a new one with the modifications

## Installation

```bash
# Install dependencies
npm install

# Make the script executable
chmod +x extract-embedded-data.js
```

## Usage

```bash
# Basic usage
node extract-embedded-data.js path/to/your/file.html

# Specify an output directory
node extract-embedded-data.js path/to/your/file.html path/to/output/dir

# Using npm script
npm run extract -- path/to/your/file.html
```

## Example

```bash
# Extract data from the large HTML file in assets directory
node extract-embedded-data.js assets/25_03_01_e4_schwarz.html
```

This will:
1. Create a directory called `extracted` in the same location as the HTML file
2. Extract all embedded data to separate files in this directory
3. Create a new file called `25_03_01_e4_schwarz.extracted.html` with updated references

## How it works

The script:
1. Parses the HTML using JSDOM
2. Finds all `<pc-asset>` tags with `src` attributes starting with `data:`
3. Extracts the data and saves it to separate files
4. Updates the `src` attributes to point to the extracted files
5. Looks for embedded data in script tags or JSON data
6. Saves the modified HTML to a new file with `.extracted` added to the filename 