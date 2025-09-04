const { chromium } = require('playwright');
const XLSX = require('xlsx');

function removeEmojis(text) {
    if (!text) return '';
    // Remove all non-ASCII characters and keep only basic printable characters
    return text
        .replace(/[^\x20-\x7E]/g, '')  // Keep only ASCII printable characters (space to ~)
        .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
        .trim();
}

async function scrapeGoogleMaps(page, maxCards = null) {
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
                    } else {
                        console.log('DEBUG: No business data found');
                    }
                    
                } catch (error) {
                    console.log(`Error processing card ${i + 1}:`, error.message);
                    console.log(`DEBUG: Error stack:`, error.stack);
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

async function saveToExcel(data, filename) {
    try {
        console.log('DEBUG: Starting Excel save process...');
        console.log('DEBUG: Data to save:', JSON.stringify(data, null, 2));
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Google Maps Data');
        XLSX.writeFile(workbook, filename);
        console.log(`Data saved to ${filename}`);
        console.log('DEBUG: Excel file saved successfully');
    } catch (error) {
        console.error('Error saving to Excel:', error.message);
        console.log('DEBUG: Excel save error stack:', error.stack);
    }
}

async function main(maxCards = null) {
    const url = 'https://www.google.com/maps/search/Jumeirah+aesthetic+clinic/@25.2028961,55.1654013,13z/data=!4m2!2m1!6e1?entry=ttu&g_ep=EgoyMDI1MDcyOS4wIKXMDSoASAFQAw%3D%3D';
    
    console.log('Starting Google Maps scraper with Playwright...');
    if (maxCards) {
        console.log(`Maximum cards limit: ${maxCards}`);
    } else {
        console.log('No limit set - will scrape all available results');
    }
    console.log('DEBUG: Main function started');
    console.log('DEBUG: Target URL:', url);
    
    let browser;
    let page;
    
    try {
        browser = await chromium.launch({ headless: false });
        page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);
        
        const searchName = await getSearchName(page);
        const filename = `${searchName}.xlsx`;
        
        console.log(`DEBUG: Search name: ${searchName}`);
        console.log(`DEBUG: Filename: ${filename}`);
        
        const scrapedData = await scrapeGoogleMaps(page, maxCards);
        
        if (scrapedData.length > 0) {
            console.log('DEBUG: Data scraped successfully, saving to Excel...');
            await saveToExcel(scrapedData, filename);
            console.log(`Successfully scraped ${scrapedData.length} places`);
        } else {
            console.log('No data was scraped');
            console.log('DEBUG: No data to save');
        }
    } catch (error) {
        console.error('Error in main function:', error.message);
        console.log('DEBUG: Main function error stack:', error.stack);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
    
    console.log('DEBUG: Main function completed');
}

// Usage examples:
// main() - Scrape all available results (no limit)
// main(10) - Scrape maximum 10 cards
// main(50) - Scrape maximum 50 cards

// Change the number below to set your desired limit, or remove the parameter for unlimited
main(10).catch(error => {
    console.error('Main error:', error.message);
    process.exit(1);
}); 