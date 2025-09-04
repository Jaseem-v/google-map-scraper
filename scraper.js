const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

async function scrapeGoogleMaps(url) {
    let browser;
    let page;
    try {
        console.log('DEBUG: Starting Google Maps scraper...');
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        console.log('DEBUG: Browser launched successfully');

        page = await browser.newPage();
        console.log('DEBUG: Page created');
        
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        console.log('DEBUG: Page timeouts set to 60 seconds');
        
        console.log('DEBUG: Navigating to URL:', url);
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });
            console.log('DEBUG: Successfully navigated to URL');
        } catch (navigationError) {
            console.log('DEBUG: Navigation error:', navigationError.message);
            console.log('DEBUG: Trying with different wait strategy...');
            await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            console.log('DEBUG: Successfully navigated to URL with domcontentloaded');
        }

        const data = [];
        let pageCount = 0;

        while (true) {
            try {
                pageCount++;
                console.log(`DEBUG: Starting to process page ${pageCount}`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log('DEBUG: Waited 3 seconds after page load');

                                        console.log('DEBUG: Looking for place cards...');
                        const placeCards = await page.$$('div.Nv2PK.THOPZb.CpccDe');
                        console.log(`DEBUG: Found ${placeCards.length} place cards on page ${pageCount}`);
                        
                        // Debug: Check what elements are actually present
                        const debugInfo = await page.evaluate(() => {
                            const cards = document.querySelectorAll('div.Nv2PK.THOPZb.CpccDe');
                            const links = document.querySelectorAll('div.Nv2PK.THOPZb.CpccDe a');
                            const bJzMEDivs = document.querySelectorAll('div.bJzME.Hu9e2e');
                            
                            return {
                                cardsCount: cards.length,
                                linksCount: links.length,
                                bJzMEDivsCount: bJzMEDivs.length,
                                hasTVLSc: bJzMEDivs.length > 0 ? bJzMEDivs[0].classList.contains('tTVLSc') : false
                            };
                        });
                        console.log('DEBUG: Page elements info:', debugInfo);
                
                // Process only the first place card for now
                if (placeCards.length > 0) {
                    try {
                        console.log(`DEBUG: Processing first card only on page ${pageCount}`);
                        
                        // Click on the first place card link (same as your console code)
                        console.log(`DEBUG: Clicking on first place card link...`);
                        const clickResult = await page.evaluate(() => {
                            const link = document.querySelector("div.Nv2PK.THOPZb.CpccDe a");
                            if (link) {
                                console.log('DEBUG: Found link, clicking...');
                                console.log('DEBUG: Link href:', link.href);
                                link.click();
                                return true;
                            } else {
                                console.log('DEBUG: No link found');
                                return false;
                            }
                        });
                        console.log(`DEBUG: Click result:`, clickResult);
                        
                        // Wait longer for content to load and check multiple times
                        console.log('DEBUG: Waiting and checking for tTVLSc class...');
                        let hasTVLScClass = false;
                        for (let i = 0; i < 10; i++) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            console.log(`DEBUG: Check ${i + 1}/10 - Waiting for tTVLSc class...`);
                            
                            const checkResult = await page.evaluate(() => {
                                const div = document.querySelector('div.bJzME.Hu9e2e');
                                console.log(div.outerHTML);
                                
                                if (div) {
                                    const hasClass = div.classList.contains('tTVLSc');
                                    console.log(`DEBUG: div.bJzME.Hu9e2e found, has tTVLSc class: ${hasClass}`);
                                    console.log(`DEBUG: Current classes: ${div.className}`);
                                    return hasClass;
                                } else {
                                    console.log('DEBUG: div.bJzME.Hu9e2e not found');
                                    return false;
                                }
                            });
                            
                            if (checkResult) {
                                hasTVLScClass = true;
                                console.log(`DEBUG: tTVLSc class found on check ${i + 1}`);
                                break;
                            }
                        }
                        console.log('DEBUG: Final tTVLSc class check result:', hasTVLScClass);

                        // Extract data from CsEnBe elements (same as your console code)
                        console.log('DEBUG: Extracting data from CsEnBe elements...');
                        const placeData = await page.evaluate(() => {
                            const businessData = {
                                businessName: '',
                                csEnBeData: []
                            };
                            
                            // Get business name from the clicked card
                            const nameElement = document.querySelector("div.Nv2PK.THOPZb.CpccDe .qBF1Pd");
                            if (nameElement) {
                                businessData.businessName = nameElement.textContent.trim();
                            }
                            
                            // Get all CsEnBe elements and their text content
                            const csEnBeElements = document.querySelectorAll("div.bJzME.Hu9e2e .CsEnBe");
                            csEnBeElements.forEach((el, index) => {
                                businessData.csEnBeData.push({
                                    index: index + 1,
                                    textContent: el.textContent.trim()
                                });
                            });
                            
                            return businessData;
                        });
                        
                        if (placeData.csEnBeData.length > 0) {
                            data.push(placeData);
                            console.log(`Scraped: ${placeData.businessName} - Found ${placeData.csEnBeData.length} CsEnBe elements`);
                            console.log(`DEBUG: CsEnBe data:`, JSON.stringify(placeData.csEnBeData, null, 2));
                            console.log(`DEBUG: Total data collected so far: ${data.length}`);
                        } else {
                            console.log('DEBUG: No CsEnBe elements found');
                        }
                    } catch (error) {
                        console.log(`Error processing first card:`, error.message);
                        console.log(`DEBUG: Error stack:`, error.stack);
                    }
                }
                
                // End scraping after processing first page
                console.log('DEBUG: Finished processing first page, ending scraping');
                break;
            } catch (error) {
                console.log('Error in main scraping loop:', error.message);
                console.log('DEBUG: Error occurred on page', pageCount);
                console.log('DEBUG: Error stack:', error.stack);
                break;
            }
        }

        console.log(`DEBUG: Scraping completed. Total pages processed: ${pageCount}`);
        console.log(`DEBUG: Total data collected: ${data.length}`);
        return data;
    } catch (error) {
        console.error('Error in scrapeGoogleMaps:', error.message);
        console.log('DEBUG: Full error stack:', error.stack);
        return [];
    } finally {
        if (page) {
            try {
                console.log('DEBUG: Closing page...');
                await page.close();
                console.log('DEBUG: Page closed successfully');
            } catch (error) {
                console.log('Error closing page:', error.message);
            }
        }
        
        if (browser) {
            try {
                console.log('DEBUG: Closing browser...');
                await browser.close();
                console.log('DEBUG: Browser closed successfully');
            } catch (error) {
                console.log('Error closing browser:', error.message);
            }
        }
    }
}

async function extractPlaceData(page) {
    const data = {};
    console.log('DEBUG: Starting data extraction...');

    try {
        console.log('DEBUG: Looking for div with class tTVLSc...');
        const contentDiv = await page.$('div.tTVLSc');

        console.log('DEBUG: Content div found:', contentDiv);
        
        if (contentDiv) {
            // Extract only the main business listing content
            data.businessListings = await contentDiv.evaluate(el => {
                const listings = [];
                const businessCards = el.querySelectorAll('.Nv2PK.THOPZb.CpccDe');
                
                businessCards.forEach((card, index) => {
                    const businessData = {};
                    
                    // Business name
                    const nameElement = card.querySelector('.qBF1Pd');
                    if (nameElement) {
                        businessData.name = nameElement.textContent.trim();
                    }
                    
                    // Rating and reviews
                    const ratingElement = card.querySelector('.MW4etd');
                    const reviewsElement = card.querySelector('.UY7F9');
                    if (ratingElement) {
                        businessData.rating = ratingElement.textContent.trim();
                    }
                    if (reviewsElement) {
                        businessData.reviews = reviewsElement.textContent.trim();
                    }
                    
                    // Business type and address
                    const typeAddressElements = card.querySelectorAll('.W4Efsd span');
                    if (typeAddressElements.length > 0) {
                        businessData.type = typeAddressElements[0]?.textContent.trim();
                        businessData.address = typeAddressElements[2]?.textContent.trim();
                    }
                    
                    // Hours
                    const hoursElement = card.querySelector('.W4Efsd span[style*="font-weight: 400"]');
                    if (hoursElement) {
                        businessData.hours = hoursElement.textContent.trim();
                    }
                    
                    // Services
                    const servicesElement = card.querySelector('.ah5Ghc span');
                    if (servicesElement) {
                        businessData.services = servicesElement.textContent.trim();
                    }
                    
                    if (businessData.name) {
                        listings.push(businessData);
                    }
                });
                
                return listings;
            });
            
            console.log('DEBUG: Business listings extracted:', data.businessListings.length);
            console.log('DEBUG: Business data:', JSON.stringify(data.businessListings, null, 2));
            
            // Now extract detailed information from kR99db fdkmkc divs
            console.log('DEBUG: Looking for detailed info divs...');
            const detailedInfoDivs = await page.$$('div.kR99db.fdkmkc');
            console.log('DEBUG: Found detailed info divs:', detailedInfoDivs.length);
            
            if (detailedInfoDivs.length > 0) {
                data.detailedInfo = [];
                for (let i = 0; i < detailedInfoDivs.length; i++) {
                    const divInfo = await detailedInfoDivs[i].evaluate(el => {
                        const info = {};
                        
                        // Get all text content
                        info.text = el.textContent.trim();
                        
                        // Look for phone numbers (common patterns)
                        const phoneMatch = el.textContent.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                        if (phoneMatch) {
                            info.phone = phoneMatch[0];
                        }
                        
                        // Look for website links
                        const websiteElement = el.querySelector('a[href*="http"]');
                        if (websiteElement) {
                            info.website = websiteElement.href;
                        }
                        
                        // Look for address (usually longer text)
                        const addressText = el.textContent.trim();
                        if (addressText.length > 20 && !phoneMatch && !websiteElement) {
                            info.address = addressText;
                        }
                        
                        return info;
                    });
                    
                    data.detailedInfo.push(divInfo);
                    console.log(`DEBUG: Detailed info ${i + 1}:`, divInfo);
                }
            }
        } else {
            console.log('DEBUG: Div with class tTVLSc not found');
        }

        console.log('DEBUG: Data extraction completed');
        console.log('DEBUG: Final extracted data:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.log('Error extracting data:', error.message);
        console.log('DEBUG: Data extraction error stack:', error.stack);
    }

    return data;
}

async function saveToExcel(data, filename = 'google_maps_data.xlsx') {
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

async function main() {
    const url = 'https://www.google.com/maps/search/Jumeirah+aesthetic+clinic/@25.2028961,55.1654013,13z/data=!4m2!2m1!6e1?entry=ttu&g_ep=EgoyMDI1MDcyOS4wIKXMDSoASAFQAw%3D%3D';
    
    console.log('Starting Google Maps scraper...');
    console.log('DEBUG: Main function started');
    console.log('DEBUG: Target URL:', url);
    
    try {
        const scrapedData = await scrapeGoogleMaps(url);
        
        if (scrapedData.length > 0) {
            console.log('DEBUG: Data scraped successfully, saving to Excel...');
            // await saveToExcel(scrapedData);
            console.log(`Successfully scraped ${scrapedData.length} places`);
        } else {
            console.log('No data was scraped');
            console.log('DEBUG: No data to save');
        }
    } catch (error) {
        console.error('Error in main function:', error.message);
        console.log('DEBUG: Main function error stack:', error.stack);
    }
    
    console.log('DEBUG: Main function completed');
}

main().catch(error => {
    console.error('Main error:', error.message);
    process.exit(1);
}); 