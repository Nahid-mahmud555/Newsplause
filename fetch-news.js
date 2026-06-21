import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import pkg from '@vitalets/google-translate-api';
const { translate } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const parser = new Parser({
    timeout: 15000,
    headers: {
        'User-Agent': 'NewsPulse/1.0 (News Aggregator Bot)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    maxRedirects: 3
});

// ============================================
// RSS SOURCES CONFIGURATION
// ============================================
const RSS_SOURCES = [
    { name: 'Prothom Alo English', url: 'https://en.prothomalo.com/feed', category: 'national', enabled: true, isBangla: false },
    { name: 'Prothom Alo Bangla', url: 'https://www.prothomalo.com/feed/', category: 'national', enabled: true, isBangla: true },
    { name: 'Jugantor National', url: 'https://www.jugantor.com/feed/national', category: 'national', enabled: true, isBangla: true },
    { name: 'Jugantor World', url: 'https://www.jugantor.com/feed/international', category: 'national', enabled: true, isBangla: true },
    { name: 'Bangladesh Pratidin Main', url: 'https://bdpratidin.net/rss/category/bangladesh', category: 'national', enabled: true, isBangla: true },
    { name: 'Bangladesh Pratidin World', url: 'https://bdpratidin.net/rss/category/international', category: 'national', enabled: true, isBangla: true },
    { name: 'Bangladesh Pratidin Sports', url: 'https://bdpratidin.net/rss/category/sports', category: 'sports', enabled: true, isBangla: true },
    { name: 'JagoNews24 Main', url: 'https://www.jagonews24.com/rss/rss.xml', category: 'national', enabled: true, isBangla: true },
    { name: 'JagoNews24 National', url: 'https://www.jagonews24.com/rss/category/1', category: 'national', enabled: true, isBangla: true },
    { name: 'JagoNews24 World', url: 'https://www.jagonews24.com/rss/category/3', category: 'national', enabled: true, isBangla: true },
    { name: 'JagoNews24 Sports', url: 'https://www.jagonews24.com/rss/category/5', category: 'sports', enabled: true, isBangla: true },
    { name: 'Banglanews24 Tech', url: 'https://www.banglanews24.com/rss/category/9', category: 'technology', enabled: true, isBangla: true },
    { name: 'Banglanews24 National', url: 'https://www.banglanews24.com/rss/category/1', category: 'national', enabled: true, isBangla: true },
    { name: 'Banglanews24 Business', url: 'https://www.banglanews24.com/rss/category/4', category: 'national', enabled: true, isBangla: true },
    { name: 'BDJobs Official', url: 'https://corporate.bdjobs.com/rss/bdjobs.xml', category: 'jobs', enabled: true, isBangla: true },
    { name: 'Jugantor Jobs', url: 'https://www.jugantor.com/feed/jobs', category: 'jobs', enabled: true, isBangla: true },
    { name: 'JagoNews24 Jobs', url: 'https://www.jagonews24.com/rss/category/10', category: 'jobs', enabled: true, isBangla: true },
    { name: 'Banglanews24 Jobs', url: 'https://www.banglanews24.com/rss/category/6', category: 'jobs', enabled: true, isBangla: true },
    { name: 'Prothom Alo Education', url: 'https://www.prothomalo.com/feed/education/admission', category: 'national', enabled: true, isBangla: true },
    { name: 'Jugantor Tutorial', url: 'https://www.jugantor.com/feed/tutorial', category: 'national', enabled: true, isBangla: true },
    { name: 'JagoNews24 Education', url: 'https://www.jagonews24.com/rss/category/34', category: 'national', enabled: true, isBangla: true },
    { name: 'Banglanews24 Features', url: 'https://www.banglanews24.com/rss/category/11', category: 'national', enabled: true, isBangla: true },
    { name: 'The Daily Star', url: 'https://www.thedailystar.net/frontpage/rss.xml', category: 'national', enabled: true, isBangla: false },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'technology', enabled: true, isBangla: false },
    { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'technology', enabled: true, isBangla: false },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'technology', enabled: true, isBangla: false },
    { name: 'ESPN Cricinfo', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', category: 'sports', enabled: true, isBangla: false },
    { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'sports', enabled: true, isBangla: false }
];

// ============================================
// LOGGING UTILITY (With Auto-cap to prevent high storage use)
// ============================================
const logFile = path.join(process.cwd(), 'fetch-log.txt');

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    
    console.log(logMessage);
    
    try {
        if (fs.existsSync(logFile) && fs.statSync(logFile).size > 5 * 1024 * 1024) {
            fs.writeFileSync(logFile, `[Log Rotation Started at ${timestamp}]\n`); // Reset if > 5MB
        }
        fs.appendFileSync(logFile, logMessage + '\n');
    } catch (error) {}
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '') 
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================
// CREATE INTELLIGENT SUMMARY (Supports English & Bangla)
// ============================================
function createSummaryPoints(content, isBangla = false) {
    if (!content) return ['No content available'];
    const cleanContent = cleanText(content);
    
    // Split Regex based on language context (Handles English periods and Bengali Ddari)
    const splitRegex = isBangla ? /(?<=[।!?])\s+/ : /(?<=[.!?])\s+/;
    const sentences = cleanContent
        .split(splitRegex)
        .map(s => s.trim())
        .filter(s => s.length > 15 && s.length < 300);
    
    if (sentences.length === 0) {
        const fallbackText = cleanContent.substring(0, 200).trim();
        return fallbackText ? [fallbackText] : ['No content available'];
    }
    
    let selected = [];
    if (sentences.length <= 3) {
        selected = [...sentences];
    } else {
        selected = [sentences[0], sentences[Math.floor(sentences.length / 2)], sentences[sentences.length - 1]];
        selected = [...new Set(selected)];
        
        // Fill up to 3 sentences if deduplication cut it short
        let index = 1;
        while (selected.length < 3 && index < sentences.length) {
            if (!selected.includes(sentences[index])) {
                selected.push(sentences[index]);
            }
            index++;
        }
    }
    
    // Final sanity check filtering
    const validSentences = selected.filter(s => s !== "" && !/^[.\s\-…।]+$/.test(s));
    return validSentences.slice(0, 3).map(s => s.substring(0, 200).trim());
}

// ============================================
// TRANSLATE TO BENGALI
// ============================================
async function translateToBengali(text) {
    if (!text || text.trim().length === 0 || /^[.\s\-…]+$/.test(text.trim())) {
        return text;
    }
    
    let retries = 3;
    while (retries > 0) {
        try {
            const result = await translate(text, { to: 'bn', forceTo: true });
            if (result && result.text && result.text.trim().length > 0) {
                return result.text;
            }
            throw new Error('Empty translation');
        } catch (error) {
            retries--;
            if (retries === 0) {
                log(`Translation failed after all retries: ${error.message}`, 'ERROR');
                return text; 
            }
            const waitTime = (4 - retries) * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    return text;
}

async function urlExists(url) {
    try {
        const { data, error } = await supabase
            .from('news_feed')
            .select('id')
            .eq('sourceUrl', url)
            .single();
        if (error && error.code !== 'PGRST116') return false;
        return data !== null;
    } catch (error) {
        return false;
    }
}

async function insertNews(newsData) {
    try {
        const { data, error } = await supabase.from('news_feed').insert([newsData]).select();
        if (error) {
            if (error.code === '23505') return { success: false, reason: 'duplicate' };
            return { success: false, reason: 'error' };
        }
        return { success: true, data };
    } catch (error) {
        return { success: false, reason: 'exception' };
    }
}

function validateSummaries(summaries) {
    if (!summaries || !Array.isArray(summaries)) return [];
    return summaries.filter(s => {
        if (!s) return false;
        const trimmed = s.toString().trim();
        return trimmed !== "" && 
               trimmed !== "..." && 
               !/^[.\s\-…।]+$/.test(trimmed) &&
               trimmed !== "অনুবাদ উপলব্ধ নয়";
    });
}

// ============================================
// PROCESS RSS SOURCE
// ============================================
async function processSource(source) {
    log(`\n📡 Processing: ${source.name} (${source.category})`);
    
    try {
        const feed = await parser.parseURL(source.url);
        if (!feed || !feed.items || feed.items.length === 0) {
            log(`   ⚠️ No items found in feed`, 'WARN');
            return 0;
        }
        
        log(`   📦 Found ${feed.items.length} items`);
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        const itemsToProcess = feed.items.slice(0, 10);
        
        for (let i = 0; i < itemsToProcess.length; i++) {
            const item = itemsToProcess[i];
            try {
                const sourceUrl = item.link || item.guid;
                if (!sourceUrl) {
                    skippedCount++;
                    continue;
                }
                
                const exists = await urlExists(sourceUrl);
                if (exists) {
                    skippedCount++;
                    continue;
                }
                
                const content = item.content || item.contentSnippet || item.summary || item.description || item.title || '';
                
                // Smart abstraction points based on language origin
                const sourceSummaries = createSummaryPoints(content, source.isBangla);
                const validSourceSummaries = validateSummaries(sourceSummaries);
                
                if (validSourceSummaries.length === 0) {
                    skippedCount++;
                    continue;
                }
                
                const englishTitle = item.title || 'No Title';
                let bengaliTitle = englishTitle;
                const validBengaliSummaries = [];
                
                // CRITICAL CONDITIONAL TRANSLATION (Only hit API if source language is English)
                if (!source.isBangla) {
                    log(`   🔄 Translating content from English source...`);
                    bengaliTitle = await translateToBengali(englishTitle);
                    
                    for (const point of validSourceSummaries) {
                        let translated = await translateToBengali(point);
                        validBengaliSummaries.push(translated);
                        await new Promise(resolve => setTimeout(resolve, 300)); // standard throttling
                    }
                } else {
                    // Direct map without hitting translation API if it's already in Bangla
                    bengaliTitle = englishTitle;
                    validBengaliSummaries.push(...validSourceSummaries);
                }
                
                const finalBengaliSummaries = validateSummaries(validBengaliSummaries);
                if (finalBengaliSummaries.length === 0) {
                    skippedCount++;
                    continue;
                }
                
                const newsData = {
                    bengaliTitle: bengaliTitle,
                    bengaliSummaries: finalBengaliSummaries,
                    category: source.category,
                    sourceUrl: sourceUrl,
                    source_name: source.name,
                    deadLine: source.category === 'jobs' ? 
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null
                };
                
                const result = await insertNews(newsData);
                if (result.success) {
                    processedCount++;
                    log(`   ✅ [${i+1}/${itemsToProcess.length}] Inserted: "${bengaliTitle.substring(0, 40)}..."`);
                } else {
                    errorCount++;
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                errorCount++;
                log(`   ❌ Error processing item: ${error.message}`, 'ERROR');
            }
        }
        
        log(`   📊 Source Summary: ${processedCount} inserted, ${skippedCount} skipped`);
        return processedCount;
        
    } catch (error) {
        log(`❌ Error fetching ${source.name}: ${error.message}`, 'ERROR');
        return -1;
    }
}

// ============================================
// CLEANUP OLD RECORDS
// ============================================
async function cleanupOldRecords() {
    log('\n🧹 Starting database cleanup...');
    let deleted24h = 0;
    let deletedJobs = 0;
    
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: oldNews, error: fetchError } = await supabase
            .from('news_feed')
            .select('id')
            .neq('category', 'jobs')
            .lt('created_at', twentyFourHoursAgo);
            
        if (!fetchError && oldNews && oldNews.length > 0) {
            const { error: deleteError } = await supabase
                .from('news_feed')
                .delete()
                .neq('category', 'jobs')
                .lt('created_at', twentyFourHoursAgo);
            if (!deleteError) deleted24h = oldNews.length;
        }
    } catch (error) {}
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: expiredJobs, error: fetchError } = await supabase
            .from('news_feed')
            .select('id')
            .eq('category', 'jobs')
            .lt('deadLine', today);
            
        if (!fetchError && expiredJobs && expiredJobs.length > 0) {
            const { error: deleteError } = await supabase
                .from('news_feed')
                .delete()
                .eq('category', 'jobs')
                .lt('deadLine', today);
            if (!deleteError) deletedJobs = expiredJobs.length;
        }
    } catch (error) {}
    
    log(`   ✅ Cleaned up: ${deleted24h} old updates, ${deletedJobs} expired jobs`);
    return deleted24h + deletedJobs;
}

async function getDatabaseStats() {
    try {
        const { count, error } = await supabase
            .from('news_feed')
            .select('*', { count: 'exact', head: true });
        return error ? 0 : count || 0;
    } catch (error) {
        return 0;
    }
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
    const startTime = Date.now();
    log('============================================================');
    log('🚀 NewsPulse Automated News Fetcher Core Framework Engine');
    log('============================================================');
    
    const initialCount = await getDatabaseStats();
    const enabledSources = RSS_SOURCES.filter(source => source.enabled);
    
    let totalInserted = 0;
    let successfulSources = 0;
    let failedSources = 0;
    
    for (let i = 0; i < enabledSources.length; i++) {
        const source = enabledSources[i];
        const inserted = await processSource(source);
        
        if (inserted >= 0) {
            successfulSources++;
            totalInserted += inserted;
        } else {
            failedSources++;
        }
        
        if (i < enabledSources.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Cooldown
        }
    }
    
    const deletedCount = await cleanupOldRecords();
    const finalCount = await getDatabaseStats();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n============================================================');
    log('📊 FINAL EXECUTION REPORT');
    log(`⏱️  Duration: ${duration}s | Inserted: ${totalInserted} | Deleted: ${deletedCount}`);
    log(`📈 Database Records Track: ${initialCount} -> ${finalCount}`);
    log('============================================================');
}

process.on('unhandledRejection', (error) => { process.exit(1); });
process.on('uncaughtException', (error) => { process.exit(1); });

main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
