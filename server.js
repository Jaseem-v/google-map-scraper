const express = require('express');
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Cleanup function to remove old Excel files
function cleanupOldFiles() {
    try {
        const files = fs.readdirSync('.');
        const excelFiles = files.filter(file => file.endsWith('.xlsx') && file.includes('-'));
        
        excelFiles.forEach(file => {
            try {
                fs.unlinkSync(file);
                console.log(`DEBUG: Cleaned up old file: ${file}`);
            } catch (error) {
                console.error(`Error deleting file ${file}:`, error.message);
            }
        });
        
        if (excelFiles.length > 0) {
            console.log(`DEBUG: Cleaned up ${excelFiles.length} old Excel files`);
        }
    } catch (error) {
        console.error('Error during cleanup:', error.message);
    }
}

// Cleanup old files on startup
cleanupOldFiles();

function removeEmojis(text) {
    if (!text) return '';
    // Remove all non-ASCII characters and keep only basic printable characters
    return text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // Remove all emoji and symbol ranges
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove miscellaneous symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
        .replace(/[\u{2000}-\u{206F}]/gu, '')   // Remove general punctuation
        .replace(/[\u{2070}-\u{209F}]/gu, '')   // Remove superscripts and subscripts
        .replace(/[\u{20A0}-\u{20CF}]/gu, '')   // Remove currency symbols
        .replace(/[\u{20D0}-\u{20FF}]/gu, '')   // Remove combining diacritical marks
        .replace(/[\u{2100}-\u{214F}]/gu, '')   // Remove letterlike symbols
        .replace(/[\u{2150}-\u{218F}]/gu, '')   // Remove number forms
        .replace(/[\u{2190}-\u{21FF}]/gu, '')   // Remove arrows
        .replace(/[\u{2200}-\u{22FF}]/gu, '')   // Remove mathematical operators
        .replace(/[\u{2300}-\u{23FF}]/gu, '')   // Remove miscellaneous technical
        .replace(/[\u{2400}-\u{243F}]/gu, '')   // Remove control pictures
        .replace(/[\u{2440}-\u{245F}]/gu, '')   // Remove optical character recognition
        .replace(/[\u{2460}-\u{24FF}]/gu, '')   // Remove enclosed alphanumerics
        .replace(/[\u{2500}-\u{257F}]/gu, '')   // Remove box drawing
        .replace(/[\u{2580}-\u{259F}]/gu, '')   // Remove block elements
        .replace(/[\u{25A0}-\u{25FF}]/gu, '')   // Remove geometric shapes
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove miscellaneous symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
        .replace(/[\u{27C0}-\u{27EF}]/gu, '')   // Remove miscellaneous mathematical symbols-A
        .replace(/[\u{27F0}-\u{27FF}]/gu, '')   // Remove supplemental arrows-A
        .replace(/[\u{2800}-\u{28FF}]/gu, '')   // Remove braille patterns
        .replace(/[\u{2900}-\u{297F}]/gu, '')   // Remove supplemental arrows-B
        .replace(/[\u{2980}-\u{29FF}]/gu, '')   // Remove miscellaneous mathematical symbols-B
        .replace(/[\u{2A00}-\u{2AFF}]/gu, '')   // Remove supplemental mathematical operators
        .replace(/[\u{2B00}-\u{2BFF}]/gu, '')   // Remove miscellaneous symbols and arrows
        .replace(/[\u{2C00}-\u{2C5F}]/gu, '')   // Remove glagolitic
        .replace(/[\u{2C60}-\u{2C7F}]/gu, '')   // Remove latin extended-C
        .replace(/[\u{2C80}-\u{2CFF}]/gu, '')   // Remove coptic
        .replace(/[\u{2D00}-\u{2D2F}]/gu, '')   // Remove georgian supplement
        .replace(/[\u{2D30}-\u{2D7F}]/gu, '')   // Remove tifinagh
        .replace(/[\u{2D80}-\u{2DDF}]/gu, '')   // Remove ethiopic extended
        .replace(/[\u{2DE0}-\u{2DFF}]/gu, '')   // Remove cyrillic extended-A
        .replace(/[\u{2E00}-\u{2E7F}]/gu, '')   // Remove supplemental punctuation
        .replace(/[\u{2E80}-\u{2EFF}]/gu, '')   // Remove cjk radicals supplement
        .replace(/[\u{2F00}-\u{2FDF}]/gu, '')   // Remove kangxi radicals
        .replace(/[\u{2FF0}-\u{2FFF}]/gu, '')   // Remove ideographic description characters
        .replace(/[\u{3000}-\u{303F}]/gu, '')   // Remove cjk symbols and punctuation
        .replace(/[\u{3040}-\u{309F}]/gu, '')   // Remove hiragana
        .replace(/[\u{30A0}-\u{30FF}]/gu, '')   // Remove katakana
        .replace(/[\u{3100}-\u{312F}]/gu, '')   // Remove bopomofo
        .replace(/[\u{3130}-\u{318F}]/gu, '')   // Remove hangul compatibility jamo
        .replace(/[\u{3190}-\u{319F}]/gu, '')   // Remove kanbun
        .replace(/[\u{31A0}-\u{31BF}]/gu, '')   // Remove bopomofo extended
        .replace(/[\u{31C0}-\u{31EF}]/gu, '')   // Remove cjk strokes
        .replace(/[\u{31F0}-\u{31FF}]/gu, '')   // Remove katakana phonetic extensions
        .replace(/[\u{3200}-\u{32FF}]/gu, '')   // Remove enclosed cjk letters and months
        .replace(/[\u{3300}-\u{33FF}]/gu, '')   // Remove cjk compatibility
        .replace(/[\u{3400}-\u{4DBF}]/gu, '')   // Remove cjk unified ideographs extension A
        .replace(/[\u{4DC0}-\u{4DFF}]/gu, '')   // Remove yijing hexagram symbols
        .replace(/[\u{4E00}-\u{9FFF}]/gu, '')   // Remove cjk unified ideographs
        .replace(/[\u{A000}-\u{A48F}]/gu, '')   // Remove yi syllables
        .replace(/[\u{A490}-\u{A4CF}]/gu, '')   // Remove yi radicals
        .replace(/[\u{A4D0}-\u{A4FF}]/gu, '')   // Remove lisu
        .replace(/[\u{A500}-\u{A63F}]/gu, '')   // Remove vai
        .replace(/[\u{A640}-\u{A69F}]/gu, '')   // Remove cyrillic extended-B
        .replace(/[\u{A6A0}-\u{A6FF}]/gu, '')   // Remove bamum
        .replace(/[\u{A700}-\u{A71F}]/gu, '')   // Remove modifier tone letters
        .replace(/[\u{A720}-\u{A7FF}]/gu, '')   // Remove latin extended-D
        .replace(/[\u{A800}-\u{A82F}]/gu, '')   // Remove syloti nagri
        .replace(/[\u{A830}-\u{A83F}]/gu, '')   // Remove common indic number forms
        .replace(/[\u{A840}-\u{A87F}]/gu, '')   // Remove phags-pa
        .replace(/[\u{A880}-\u{A8DF}]/gu, '')   // Remove saurashtra
        .replace(/[\u{A8E0}-\u{A8FF}]/gu, '')   // Remove devanagari extended
        .replace(/[\u{A900}-\u{A92F}]/gu, '')   // Remove kayah li
        .replace(/[\u{A930}-\u{A95F}]/gu, '')   // Remove rejang
        .replace(/[\u{A960}-\u{A97F}]/gu, '')   // Remove hangul jamo extended-A
        .replace(/[\u{A980}-\u{A9DF}]/gu, '')   // Remove javanese
        .replace(/[\u{A9E0}-\u{A9FF}]/gu, '')   // Remove myanmar extended-B
        .replace(/[\u{AA00}-\u{AA5F}]/gu, '')   // Remove cham
        .replace(/[\u{AA60}-\u{AA7F}]/gu, '')   // Remove myanmar extended-A
        .replace(/[\u{AA80}-\u{AADF}]/gu, '')   // Remove tai viet
        .replace(/[\u{AAE0}-\u{AAFF}]/gu, '')   // Remove meetei mayek extensions
        .replace(/[\u{AB00}-\u{AB2F}]/gu, '')   // Remove ethiopic extended-A
        .replace(/[\u{AB30}-\u{AB6F}]/gu, '')   // Remove latin extended-E
        .replace(/[\u{AB70}-\u{ABBF}]/gu, '')   // Remove cherokee supplement
        .replace(/[\u{ABC0}-\u{ABFF}]/gu, '')   // Remove meetei mayek
        .replace(/[\u{AC00}-\u{D7AF}]/gu, '')   // Remove hangul syllables
        .replace(/[\u{D7B0}-\u{D7FF}]/gu, '')   // Remove hangul jamo extended-B
        .replace(/[\u{D800}-\u{DB7F}]/gu, '')   // Remove high surrogates
        .replace(/[\u{DB80}-\u{DBFF}]/gu, '')   // Remove high private use surrogates
        .replace(/[\u{DC00}-\u{DFFF}]/gu, '')   // Remove low surrogates
        .replace(/[\u{E000}-\u{F8FF}]/gu, '')   // Remove private use area
        .replace(/[\u{F900}-\u{FAFF}]/gu, '')   // Remove cjk compatibility ideographs
        .replace(/[\u{FB00}-\u{FB4F}]/gu, '')   // Remove alphabetic presentation forms
        .replace(/[\u{FB50}-\u{FDFF}]/gu, '')   // Remove arabic presentation forms-A
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Remove variation selectors
        .replace(/[\u{FE10}-\u{FE1F}]/gu, '')   // Remove vertical forms
        .replace(/[\u{FE20}-\u{FE2F}]/gu, '')   // Remove combining half marks
        .replace(/[\u{FE30}-\u{FE4F}]/gu, '')   // Remove cjk compatibility forms
        .replace(/[\u{FE50}-\u{FE6F}]/gu, '')   // Remove small form variants
        .replace(/[\u{FE70}-\u{FEFF}]/gu, '')   // Remove arabic presentation forms-B
        .replace(/[\u{FF00}-\u{FFEF}]/gu, '')   // Remove halfwidth and fullwidth forms
        .replace(/[\u{FFF0}-\u{FFFF}]/gu, '')   // Remove specials
        .replace(/[^\x20-\x7E]/g, '')           // Keep only ASCII printable characters
        .replace(/\s+/g, ' ')                   // Replace multiple spaces with single space
        .trim();
}

async function scrapeGoogleMaps(page, maxCards = null, progressCallback = null) {
    try {
        console.log('DEBUG: Starting Google Maps scraper with Playwright...');
        if (maxCards) {
            console.log(`DEBUG: Maximum cards limit set to: ${maxCards}`);
        }
        
        page.setDefaultTimeout(60000);

        const data = [];
        
        console.log('DEBUG: Waiting for page to load...');
        await page.waitForTimeout(3000);
        
        // Find the scrollable container (the results feed)
        console.log('DEBUG: Looking for scrollable container...');
        const scrollContainer = page.locator('div[role="feed"].m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde');
        await scrollContainer.waitFor({ timeout: 10000 });
        console.log('DEBUG: Scrollable container found');
        
        let previousCardCount = 0;
        let noNewCardsCount = 0;
        const maxNoNewCardsAttempts = 3;
        
        while (noNewCardsCount < maxNoNewCardsAttempts) {
            console.log('DEBUG: Looking for place cards...');
            const placeCards = await page.locator('div.Nv2PK.THOPZb').all();
            console.log(`DEBUG: Found ${placeCards.length} place cards`);
            
            // Check if we've reached the maximum card limit
            if (maxCards && data.length >= maxCards) {
                console.log(`DEBUG: Reached maximum card limit of ${maxCards}. Stopping...`);
                break;
            }
            
            // Check if new cards were loaded
            if (placeCards.length === previousCardCount) {
                noNewCardsCount++;
                console.log(`DEBUG: No new cards loaded. Attempt ${noNewCardsCount}/${maxNoNewCardsAttempts}`);
            } else {
                noNewCardsCount = 0;
                console.log(`DEBUG: New cards loaded. Total: ${placeCards.length}`);
            }
            
            previousCardCount = placeCards.length;
            
            // Process only new cards, but respect the max limit
            const startIndex = data.length;
            const endIndex = maxCards ? Math.min(placeCards.length, startIndex + (maxCards - data.length)) : placeCards.length;
            
            for (let i = startIndex; i < endIndex; i++) {
                try {
                    console.log(`DEBUG: Processing card ${i + 1} of ${placeCards.length}...`);
                    
                    // Send progress update
                    if (progressCallback) {
                        progressCallback({
                            current: data.length + 1,
                            total: maxCards || 'unlimited',
                            status: 'processing',
                            message: `Processing card ${i + 1}...`
                        });
                    }
                    
                    await page.locator('div.Nv2PK.THOPZb a').nth(i).click();
                    console.log(`DEBUG: Clicked on place card link ${i + 1}`);
                    
                    console.log('DEBUG: Waiting for details panel...');
                    await page.waitForSelector('div.bJzME.Hu9e2e', { timeout: 10000 });
                    console.log('DEBUG: Details panel found');
                    
                    await page.waitForTimeout(3000);
                    console.log('DEBUG: Waited for content to load');
                    
                    console.log('DEBUG: Extracting data from CsEnBe elements...');
                    const placeData = await page.evaluate(() => {
                        const businessData = {
                            businessName: '',
                            address: '',
                            website: '',
                            mobile: '',
                            pincode: ''
                        };
                        
                        const nameElement = document.querySelector("h1.DUwDvf.lfPIob");
                        if (nameElement) {
                            businessData.businessName = nameElement.textContent.trim();
                        }
                        
                        const csEnBeElements = document.querySelectorAll("div.bJzME.Hu9e2e .CsEnBe");
                        csEnBeElements.forEach((el) => {
                            const textContent = el.textContent.trim();
                            const tooltip = el.getAttribute('data-tooltip');
                            
                            if (tooltip === 'Copy address') {
                                businessData.address = textContent;
                            } else if (tooltip === 'Open website') {
                                businessData.website = textContent;
                            } else if (tooltip === 'Copy phone number') {
                                businessData.mobile = textContent;
                            } else if (tooltip === 'Copy plus code') {
                                businessData.pincode = textContent;
                            }
                        });
                        
                        return businessData;
                    });
                    
                    const cleanData = {
                        businessName: placeData.businessName,
                        address: removeEmojis(placeData.address),
                        website: removeEmojis(placeData.website),
                        mobile: removeEmojis(placeData.mobile),
                        pincode: removeEmojis(placeData.pincode)
                    };
                    
                    if (cleanData.businessName) {
                        data.push(cleanData);
                        console.log(`Scraped: ${cleanData.businessName} (${data.length}/${maxCards || 'unlimited'})`);
                        
                        // Send progress update with scraped data
                        if (progressCallback) {
                            progressCallback({
                                current: data.length,
                                total: maxCards || 'unlimited',
                                status: 'scraped',
                                message: `Scraped: ${cleanData.businessName}`,
                                data: cleanData
                            });
                        }
                    } else {
                        console.log('DEBUG: No business data found');
                    }
                    
                } catch (error) {
                    console.log(`Error processing card ${i + 1}:`, error.message);
                    console.log(`DEBUG: Error stack:`, error.stack);
                    
                    // Send error progress update
                    if (progressCallback) {
                        progressCallback({
                            current: data.length,
                            total: maxCards || 'unlimited',
                            status: 'error',
                            message: `Error processing card ${i + 1}: ${error.message}`
                        });
                    }
                }
            }
            
            // Check if we've reached the maximum card limit after processing
            if (maxCards && data.length >= maxCards) {
                console.log(`DEBUG: Reached maximum card limit of ${maxCards}. Stopping...`);
                break;
            }
            
            // Scroll to load more results
            if (noNewCardsCount < maxNoNewCardsAttempts) {
                console.log('DEBUG: Scrolling to load more results...');
                if (progressCallback) {
                    progressCallback({
                        current: data.length,
                        total: maxCards || 'unlimited',
                        status: 'scrolling',
                        message: 'Loading more results...'
                    });
                }
                await scrollContainer.evaluate((element) => {
                    element.scrollTop = element.scrollHeight;
                });
                await page.waitForTimeout(2000);
            }
        }
        
        console.log(`DEBUG: Scraping completed. Total data collected: ${data.length}`);
        return data;
        
    } catch (error) {
        console.error('Error in scrapeGoogleMaps:', error.message);
        console.log('DEBUG: Full error stack:', error.stack);
        return [];
    }
}

async function getSearchName(page) {
    try {
        const searchNameElement = await page.locator('div[aria-label*="Results for"]').first();
        const ariaLabel = await searchNameElement.getAttribute('aria-label');
        
        if (ariaLabel) {
            const match = ariaLabel.match(/Results for (.+)/);
            if (match && match[1]) {
                const searchName = match[1].replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
                return searchName;
            }
        }
        return 'google-maps-data';
    } catch (error) {
        console.log('Error getting search name:', error.message);
        return 'google-maps-data';
    }
}

app.post('/scrape', async (req, res) => {
    const { url, maxCards } = req.body;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required' });
    }

    if (!url.startsWith('https://www.google.com/maps/')) {
        return res.status(400).json({ success: false, error: 'Invalid Google Maps URL' });
    }

    // Set default maxCards to 10 if not provided or invalid
    let finalMaxCards = 10;
    if (maxCards && !isNaN(maxCards) && maxCards > 0) {
        finalMaxCards = parseInt(maxCards);
    }
    
    // Limit maximum to prevent server overload
    if (finalMaxCards > 100) {
        finalMaxCards = 100;
    }

    let browser;
    let page;

    try {
        console.log('Starting Google Maps scraper with Playwright...');
        console.log('DEBUG: Main function started');
        console.log('DEBUG: Target URL:', url);
        console.log(`DEBUG: Maximum cards limit: ${finalMaxCards}`);

        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);

        const searchName = await getSearchName(page);
        
        // Create progress callback for WebSocket updates
        const progressCallback = (progressData) => {
            io.emit('scraping-progress', progressData);
        };

        const scrapedData = await scrapeGoogleMaps(page, finalMaxCards, progressCallback);

        if (scrapedData.length > 0) {
            console.log('DEBUG: Data scraped successfully');
            console.log(`Successfully scraped ${scrapedData.length} places`);
            
            // Generate unique filename for download
            const filename = `${searchName}-${Date.now()}.xlsx`;
            const worksheet = XLSX.utils.json_to_sheet(scrapedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Google Maps Data');
            
            // Save to Excel file temporarily
            XLSX.writeFile(workbook, filename);
            
            // Send completion update
            io.emit('scraping-complete', {
                success: true,
                data: scrapedData,
                filename: filename,
                message: `Successfully scraped ${scrapedData.length} places`
            });
            
            res.json({
                success: true,
                data: scrapedData,
                filename: filename,
                message: `Successfully scraped ${scrapedData.length} places`
            });

            // Fallback cleanup: Delete file after 5 minutes if not downloaded
            setTimeout(() => {
                try {
                    if (fs.existsSync(filename)) {
                        fs.unlinkSync(filename);
                        console.log(`DEBUG: Fallback cleanup - deleted file: ${filename}`);
                    }
                } catch (cleanupError) {
                    console.error('Error in fallback cleanup:', cleanupError.message);
                }
            }, 5 * 60 * 1000); // 5 minutes
        } else {
            console.log('No data was scraped');
            io.emit('scraping-complete', {
                success: false,
                error: 'No data was scraped from the provided URL'
            });
            res.json({
                success: false,
                error: 'No data was scraped from the provided URL'
            });
        }

    } catch (error) {
        console.error('Error in scraping:', error.message);
        io.emit('scraping-complete', {
            success: false,
            error: `Scraping failed: ${error.message}`
        });
        res.status(500).json({
            success: false,
            error: `Scraping failed: ${error.message}`
        });
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Download endpoint that serves file and cleans up
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Stream the file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up file after download completes
    fileStream.on('end', () => {
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`DEBUG: Cleaned up downloaded file: ${filename}`);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up downloaded file:', cleanupError.message);
            }
        }, 1000); // Wait 1 second after download completes
    });
    
    fileStream.on('error', (error) => {
        console.error('Error streaming file:', error.message);
        res.status(500).json({ error: 'Error downloading file' });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and navigate to the URL above`);
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    cleanupOldFiles(); // Cleanup any remaining files before shutdown
    process.exit(0);
});
