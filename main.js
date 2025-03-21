const Apify = require('apify');
const MediumScraper = require('./scraper');
const { exportData } = require('./utils');

Apify.main(async () => {
    const { log } = Apify.utils;
    
    // Get input
    const input = await Apify.getInput();
    
    // Validate required input
    if (!input?.authorUrl) {
        throw new Error('Author URL is required');
    }

    // Initialize scraper
    const scraper = new MediumScraper(input);
    
    try {
        // Initialize scraper
        await scraper.initialize();
        
        log.info('Starting to scrape articles...', { url: input.authorUrl });
        const startTime = Date.now();
        
        // Scrape articles
        const articles = await scraper.scrapeArticles();
        
        // Filter articles by tags if specified
        const filteredArticles = input.tags && input.tags.length > 0
            ? articles.filter(article => 
                article.tags.some(tag => input.tags.includes(tag.toLowerCase()))
            )
            : articles;
        
        // Calculate statistics
        const stats = {
            total_articles_scraped: filteredArticles.length,
            total_comments_scraped: filteredArticles.reduce((sum, article) => sum + (article.comments?.length || 0), 0),
            time_taken: `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`
        };

        // Export data in requested format
        const outputFormat = input.outputFormat || 'json';
        await exportData(filteredArticles, outputFormat, './output');

        // Store results in default dataset
        await Apify.pushData({
            articles: filteredArticles,
            stats
        });

        log.info('Scraping completed successfully!', stats);

    } catch (error) {
        log.error('An error occurred during scraping:', { error: error.message });
        throw error;
    } finally {
        // Clean up
        await scraper.close();
    }
});