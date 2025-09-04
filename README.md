# Google Maps Data Scraper

A powerful tool to extract business information from Google Maps search results and save it to Excel format.

## Features

- 🌐 **Web Interface**: User-friendly browser-based interface
- 🔍 **URL Input**: Enter any Google Maps search URL
- ✅ **URL Validation**: Automatic validation of Google Maps URLs
- 📊 **Real-time Preview**: See scraped data before downloading
- 📥 **Excel Export**: Download data in CSV format
- 🚀 **Fast Scraping**: Built with Playwright for reliable data extraction

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fetch-data-to-excel
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

## Usage

### Web Interface (Recommended)

1. Start the web server:
```bash
npm run server
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Enter a Google Maps search URL (e.g., `https://www.google.com/maps/search/restaurants+in+dubai`)
4. Click "Execute Scraping"
5. Wait for the scraping to complete
6. Preview the data
7. Click "Download Excel File" to save as CSV

### Command Line

Run the scraper directly from command line:
```bash
npm start
```

## Supported Data Fields

The scraper extracts the following information for each business:
- **Business Name**: Company or establishment name
- **Address**: Physical location address
- **Website**: Business website URL
- **Mobile**: Contact phone number
- **Pincode**: Postal code or plus code

## URL Format

The scraper works with Google Maps search URLs in this format:
```
https://www.google.com/maps/search/[search+terms]/@[coordinates]/[zoom]z/...
```

## Examples

- Restaurants in Dubai: `https://www.google.com/maps/search/restaurants+in+dubai`
- Hotels in London: `https://www.google.com/maps/search/hotels+in+london`
- Clinics in Jumeirah: `https://www.google.com/maps/search/Jumeirah+aesthetic+clinic`

## Technical Details

- **Backend**: Node.js with Express
- **Scraping Engine**: Playwright (Chromium)
- **Data Processing**: XLSX library
- **Frontend**: Modern HTML5 with CSS3 and JavaScript

## Troubleshooting

### Common Issues

1. **"No data scraped" error**: 
   - Ensure the URL is a valid Google Maps search result
   - Check if the page loads completely
   - Verify the search returns business listings

2. **Server won't start**:
   - Check if port 3000 is available
   - Ensure all dependencies are installed
   - Check Node.js version (requires 14+)

3. **Scraping timeout**:
   - The scraper has a 60-second timeout
   - Slow internet connections may need more time
   - Complex pages may require longer processing

### Performance Tips

- Use specific search terms for better results
- Avoid very broad searches (e.g., "businesses in USA")
- Close other browser tabs to free up memory

## Security Notes

- The scraper runs in headless mode for security
- No data is stored on the server
- All processing happens locally
- Respect Google's terms of service and rate limits

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions, please check the troubleshooting section or create an issue in the repository. 