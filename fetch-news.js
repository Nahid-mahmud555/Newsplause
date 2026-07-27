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
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize RSS Parser with custom headers
const parser = new Parser({
    timeout: 15000,
    headers: {
        'User-Agent': 'NewsPulse/1.0 (News Aggregator Bot)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    maxRedirects: 3
});

// রিয়েল ব্রাউজার হেডার (বিল্ট-ইন fetch-এর জন্য)
const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7'
};

// ============================================
// RSS SOURCES CONFIGURATION
// ============================================
const RSS_SOURCES = [
    // ========== BANGLA NEWS SOURCES ==========
    {
        name: 'Prothom Alo English',
        url: 'https://en.prothomalo.com/feed',
        category: 'national',
        enabled: true
    },
    {
        name: 'Prothom Alo Bangla',
        url: 'https://www.prothomalo.com/feed/',
        category: 'national',
        enabled: true
    },
    {
        name: 'Jugantor National',
        url: 'https://www.jugantor.com/feed/national',
        category: 'national',
        enabled: true
    },
    {
        name: 'Jugantor World',
        url: 'https://www.jugantor.com/feed/international',
        category: 'national',
        enabled: true
    },
    {
        name: 'Bangladesh Pratidin Main',
        url: 'https://bdpratidin.net/rss/category/bangladesh',
        category: 'national',
        enabled: true
    },
    {
        name: 'Bangladesh Pratidin World',
        url: 'https://bdpratidin.net/rss/category/international',
        category: 'national',
        enabled: true
    },
    {
        name: 'Bangladesh Pratidin Sports',
        url: 'https://bdpratidin.net/rss/category/sports',
        category: 'sports',
        enabled: true
    },
    {
        name: 'JagoNews24 Main',
        url: 'https://www.jagonews24.com/rss/rss.xml',
        category: 'national',
        enabled: true
    },
    {
        name: 'JagoNews24 National',
        url: 'https://www.jagonews24.com/rss/category/1',
        category: 'national',
        enabled: true
    },
    {
        name: 'JagoNews24 World',
        url: 'https://www.jagonews24.com/rss/category/3',
        category: 'national',
        enabled: true
    },
    {
        name: 'JagoNews24 Sports',
        url: 'https://www.jagonews24.com/rss/category/5',
        category: 'sports',
        enabled: true
    },
    {
        name: 'Banglanews24 Tech',
        url: 'https://www.banglanews24.com/rss/category/9',
        category: 'technology',
        enabled: true
    },
    {
        name: 'Banglanews24 National',
        url: 'https://www.banglanews24.com/rss/category/1',
        category: 'national',
        enabled: true
    },
    {
        name: 'Banglanews24 Business',
        url: 'https://www.banglanews24.com/rss/category/4',
        category: 'national',
        enabled: true
    },
    // ========== JOBS SOURCES ==========
    {
        name: 'BDJobs Official',
        url: 'https://corporate.bdjobs.com/rss/bdjobs.xml',
        category: 'jobs',
        enabled: true
    },
    {
        name: 'Jugantor Jobs',
        url: 'https://www.jugantor.com/feed/jobs',
        category: 'jobs',
        enabled: true
    },
    {
        name: 'JagoNews24 Jobs',
        url: 'https://www.jagonews24.com/rss/category/10',
        category: 'jobs',
        enabled: true
    },
    {
        name: 'Banglanews24 Jobs',
        url: 'https://www.banglanews24.com/rss/category/6',
        category: 'jobs',
        enabled: true
    },
    // ========== EDUCATION / AFFAIRS SOURCES ==========
    {
        name: 'Prothom Alo Education',
        url: 'https://www.prothomalo.com/feed/education/admission',
        category: 'national',
        enabled: true
    },
    {
        name: 'Jugantor Tutorial',
        url: 'https://www.jugantor.com/feed/tutorial',
        category: 'national',
        enabled: true
    },
    {
        name: 'JagoNews24 Education',
        url: 'https://www.jagonews24.com/rss/category/34',
        category: 'national',
        enabled: true
    },
    {
        name: 'Banglanews24 Features',
        url: 'https://www.banglanews24.com/rss/category/11',
        category: 'national',
        enabled: true
    },
    // ========== ENGLISH NEWS SOURCES ==========
    {
        name: 'The Daily Star',
        url: 'https://www.thedailystar.net/frontpage/rss.xml',
        category: 'national',
        enabled: true
    },
    {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'technology',
        enabled: true
    },
    {
        name: 'BBC Technology',
        url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
        category: 'technology',
        enabled: true
    },
    {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        category: 'technology',
        enabled: true
    },
    {
        name: 'ESPN Cricinfo',
        url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
        category: 'sports',
        enabled: true
    },
    {
        name: 'BBC Sport',
        url: 'https://feeds.bbci.co.uk/sport/rss.xml',
        category: 'sports',
        enabled: true
    },
    {
        name: 'Al Jazeera English',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'national',
        enabled: false
    }
];

// ============================================
// LOGGING UTILITY
// ============================================
const logFile = path.join(process.cwd(), 'fetch-log.txt');

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    
    console.log(logMessage);
    
    try {
        fs.appendFileSync(logFile, logMessage + '\n');
    } catch (error) {
        // Silently fail
    }
}

// ============================================
// CLEAN TEXT UTILITY
// ============================================
function cleanText(text) {
    if (!text) return '';
    
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&rarr;/g, '→')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================
// CREATE ENGLISH SUMMARY (Algorithmic)
// ============================================
function createEnglishSummary(content) {
    if (!content) return ['No content available'];
    
    const cleanContent = cleanText(content);
    
    const sentences = cleanContent
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 300);
    
    if (sentences.length === 0) {
        const fallbackText = cleanContent.substring(0, 200).trim();
        return fallbackText ? [fallbackText] : ['No content available'];
    }
    
    let selected = [];
    
    if (sentences.length === 1) {
        selected = [sentences[0]];
    } else if (sentences.length === 2) {
        selected = [sentences[0], sentences[1]];
    } else if (sentences.length === 3) {
        selected = sentences;
    } else {
        const first = sentences[0];
        const middle = sentences[Math.floor(sentences.length / 2)];
        const last = sentences[sentences.length - 1];
        
        selected = [first, middle, last];
        selected = [...new Set(selected)];
        
        if (selected.length < 3 && sentences.length > 3) {
            const additional = sentences.find(s => !selected.includes(s));
            if (additional) selected.push(additional);
        }
    }
    
    const validSentences = selected.filter(s => {
        const trimmed = s.trim();
        return trimmed !== "" && !/^[.\s\-…]+$/.test(trimmed);
    });
    
    if (validSentences.length === 0) {
        const firstValid = sentences.find(s => {
            const trimmed = s.trim();
            return trimmed !== "" && !/^[.\s\-…]+$/.test(trimmed);
        });
        if (firstValid) {
            validSentences.push(firstValid);
        }
    }
    
    return validSentences.slice(0, 3).map(s => s.substring(0, 200).trim());
}

// ============================================
// TRANSLATE TO BENGALI WITH UNLIMITED RETRIES
// ============================================
async function translateToBengali(text) {
    if (!text || text.trim().length === 0 || /^[.\s\-…]+$/.test(text.trim())) {
        return text;
    }

    let attempt = 0;
    while (true) {
        attempt++;
        try {
            const result = await translate(text, { 
                to: 'bn',
                forceTo: true
            });
            
            if (result && result.text && result.text.trim().length > 0 && result.text !== 'অনুবাদ উপলব্ধ নয়') {
                return result.text;
            }
            
            throw new Error('Empty or invalid translation returned from API');
            
        } catch (error) {
            log(`⚠️ Translation API Error/Limit Exceeded (Attempt ${attempt}): ${error.message}`, 'WARN');
            log(`⏸️ Rate Limit Hit! Resting for 5 minutes (300 seconds) before retrying this item...`, 'WARN');
            
            // ৫ মিনিট ওয়েট (৩০০,০০০ মি.সে.)
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            log(`🔄 Resuming translation attempt ${attempt + 1}...`, 'INFO');
        }
    }
}

// ============================================
// CHECK IF URL EXISTS IN DATABASE
// ============================================
async function urlExists(url) {
    try {
        const { data, error } = await supabase
            .from('news_feed')
            .select('id')
            .eq('sourceUrl', url)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            log(`Error checking URL existence: ${error.message}`, 'ERROR');
            return false;
        }
        
        return data !== null;
    } catch (error) {
        log(`Exception checking URL: ${error.message}`, 'ERROR');
        return false;
    }
}

// ============================================
// INSERT NEWS INTO DATABASE
// ============================================
async function insertNews(newsData) {
    try {
        const { data, error } = await supabase
            .from('news_feed')
            .insert([newsData])
            .select();
        
        if (error) {
            if (error.code === '23505') {
                log(`Duplicate entry skipped: ${newsData.sourceUrl}`, 'WARN');
                return { success: false, reason: 'duplicate' };
            }
            
            log(`Insert error: ${error.message}`, 'ERROR');
            log(`Details: ${JSON.stringify(error)}`, 'ERROR');
            return { success: false, reason: 'error' };
        }
        
        return { success: true, data };
    } catch (error) {
        log(`Exception inserting news: ${error.message}`, 'ERROR');
        return { success: false, reason: 'exception' };
    }
}

// ============================================
// VALIDATE SUMMARIES (Remove empty/dot entries)
// ============================================
function validateSummaries(summaries) {
    if (!summaries || !Array.isArray(summaries)) return [];
    
    return summaries.filter(s => {
        if (!s) return false;
        const trimmed = s.toString().trim();
        return trimmed !== "" && 
               trimmed !== "..." && 
               trimmed !== ".." && 
               trimmed !== "." && 
               !/^[.\s\-…]+$/.test(trimmed) &&
               trimmed !== "অনুবাদ উপলব্ধ নয়";
    });
}

// =========================================================================
// ZERO-INSTALL & ZERO-LAG LIGHTWEIGHT HTML DIRECT SCRAPER WITH ANTI-SPAM
// =========================================================================
async function processDirectScrapersFree() {
    log('\n🕷️ Starting Zero-Install RegEx HTML Scraping with Anti-Spam Engine...');
    let totalDirectInserted = 0;

    // টার্গেট চ্যানেলের লিস্ট (চ্যানেল আই, যমুনা টিভি, সময় নিউজ)
    const targets = [
        { name: 'Channel i Direct National', url: 'https://www.channelionline.com/category/national/', category: 'national', domain: 'channelionline.com' },
        { name: 'Channel i Direct Jobs', url: 'https://www.channelionline.com/category/corporate-news/job-market/', category: 'jobs', domain: 'channelionline.com' },
        { name: 'Jamuna TV Direct National', url: 'https://www.jamuna.tv/category/national', category: 'national', domain: 'jamuna.tv' },
        { name: 'Somoy News Direct Tech', url: 'https://somoynews.tv/category/technology', category: 'technology', domain: 'somoynews.tv' }
    ];

    // জব সেকশনের বাধ্যতামূলক কি-ওয়ার্ড ফিল্টার (হোয়াইটলিস্ট)
    const jobWhitelist = ['চাকরি', 'নিয়োগ', 'ক্যারিয়ার', 'পদ', 'বিজ্ঞপ্তি', 'জব', 'নিয়োগ', 'খালি', 'আবেদন', 'কর্মসংস্থান', 'বিসিএস'];

    // আজেবাজে সাইডবার, মেনু বা সোশ্যাল মিডিয়া বাটন ফিল্টার (ব্ল্যাকলিস্ট)
    const globalBlacklist = [
        'পড়ুন', 'ভিডিও', 'সর্বশেষ', 'জনপ্রিয়', 'লাইভ', 'ফেসবুক', 'টুইটার', 'ইউটিউব', 
        'চ্যানেল আই', 'সাবস্ক্রাইব', 'শেয়ার', 'Jamuna TV', 'Somoy News', 'বিজ্ঞাপন'
    ];

    for (const target of targets) {
        try {
            log(`🌐 Fetching direct raw text via built-in fetch: ${target.url}`);
            
            const response = await fetch(target.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(12000) });
            const html = await response.text();

            // RegEx দিয়ে নিখুঁত এঙ্কর ট্যাগ ও টাইটেল ফিল্টারিং
            const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            let count = 0;

            while ((match = linkRegex.exec(html)) !== null && count < 8) {
                const sourceUrl = match[1];
                let title = cleanText(match[2]);

                // ১. বেসিক ইউআরএল ভ্যালিডেশন
                if (!sourceUrl || sourceUrl.includes('#') || sourceUrl.trim() === '' || !sourceUrl.startsWith('http')) continue;
                if (!sourceUrl.includes(target.domain)) continue;
                
                // ২. লেংথ এবং ইমপ্রোপার ট্যাগ ফিল্টার
                if (title.length < 15 || title.includes('<img') || title.includes('পড়ুন')) continue;

                // ৩. গ্লোবাল অ্যান্টি-স্প্যাম ব্ল্যাকলিস্ট ফিল্টার
                const hasBlacklistWord = globalBlacklist.some(word => title.includes(word));
                if (hasBlacklistWord) continue;

                // ৪. জব সেকশনের জন্য স্ট্রাকচার্ড হোয়াইটলিস্ট চেক
                if (target.category === 'jobs') {
                    const isRealJobNews = jobWhitelist.some(word => title.includes(word));
                    if (!isRealJobNews) continue; // চাকরির বাইরে সাইডবারের কোনো নিউজ জবে ঢুকবে না
                }

                // ৫. ডুপ্লিকেট ইউআরএল চেক
                const exists = await urlExists(sourceUrl);
                if (exists) continue;

                log(`   ✨ Smart Engine Validated [${target.category}]: "${title.substring(0, 50)}..."`);
                count++;

                let validBengaliSummaries = [title];

                const newsData = {
                    bengaliTitle: title,
                    bengaliSummaries: validBengaliSummaries,
                    category: target.category,
                    sourceUrl: sourceUrl,
                    source_name: target.name,
                    deadline: target.category === 'jobs' ? 
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
                        null
                };

                const result = await insertNews(newsData);
                if (result.success) {
                    totalDirectInserted++;
                    log(`      ✅ Clean direct insertion success!`);
                }
            }
            log(`   📊 Target Summary [${target.name}]: Captured smoothly using 0% extra RAM.`);
        } catch (error) {
            log(`❌ RegEx Scraping Exception for ${target.name}: ${error.message}`, 'ERROR');
        }
    }
    return totalDirectInserted;
}

// ============================================
// PROCESS RSS SOURCE
// ============================================
async function processSource(source) {
    log(`\n📡 Processing: ${source.name} (${source.category})`);
    log(`   URL: ${source.url}`);
    
    try {
        const feed = await parser.parseURL(source.url);
        
        if (!feed || !feed.items || feed.items.length === 0) {
            log(`   ⚠️  No items found in feed`, 'WARN');
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
                    log(`   ⚠️  Skipping item without URL`, 'WARN');
                    skippedCount++;
                    continue;
                }
                
                const exists = await urlExists(sourceUrl);
                if (exists) {
                    log(`   ⏭️  [${i+1}/${itemsToProcess.length}] Already exists: "${item.title?.substring(0, 50)}..."`);
                    skippedCount++;
                    continue;
                }
                
                const content = item.content || 
                               item.contentSnippet || 
                               item.summary || 
                               item.description || 
                               item.title || 
                               '';
                
                log(`   📝 [${i+1}/${itemsToProcess.length}] Creating summary: "${item.title?.substring(0, 50)}..."`);
                const englishSummary = createEnglishSummary(content);
                
                const validEnglishSummary = validateSummaries(englishSummary);
                
                if (validEnglishSummary.length === 0) {
                    log(`   ⚠️  No valid summary points after filtering, skipping`, 'WARN');
                    skippedCount++;
                    continue;
                }
                
                const englishTitle = item.title || 'No Title';

                // ==========================================================
                // ⏳ TRANSLATION SAFETY DELAY (1 to 2 mins wait before translating each news)
                // ==========================================================
                const preWaitTime = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
                log(`   ⏳ Pausing ${(preWaitTime / 1000).toFixed(0)} seconds before starting Bengali translation for API rate-limit safety...`);
                await new Promise(resolve => setTimeout(resolve, preWaitTime));
                
                log(`   ... Translating title ...`);
                let bengaliTitle = await translateToBengali(englishTitle);
                
                log(`   ... Translating ${validEnglishSummary.length} summary points ...`);
                const bengaliSummaries = [];
                for (const point of validEnglishSummary) {
                    let translated = await translateToBengali(point);
                    bengaliSummaries.push(translated);
                    // Point-to-point micro delay
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                const validBengaliSummaries = validateSummaries(bengaliSummaries);
                
                if (validBengaliSummaries.length === 0) {
                    log(`   ⚠️  No valid Bengali summaries after filtering, skipping`, 'WARN');
                    skippedCount++;
                    continue;
                }
                
                const newsData = {
                    bengaliTitle: bengaliTitle,
                    bengaliSummaries: validBengaliSummaries,
                    category: source.category,
                    sourceUrl: sourceUrl,
                    source_name: source.name,
                    deadline: source.category === 'jobs' ? 
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
                        null
                };
                
                const result = await insertNews(newsData);
                
                if (result.success) {
                    processedCount++;
                    log(`   ✅ [${i+1}/${itemsToProcess.length}] Inserted: "${bengaliTitle.substring(0, 50)}..."`);
                    log(`   📋 Summary points: ${validBengaliSummaries.length}`);
                } else if (result.reason === 'duplicate') {
                    skippedCount++;
                } else {
                    errorCount++;
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                errorCount++;
                log(`   ❌ Error processing item: ${error.message}`, 'ERROR');
                continue;
            }
        }
        
        log(`   📊 Source Summary: ${processedCount} inserted, ${skippedCount} skipped, ${errorCount} errors`);
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
    
    // Delete non-jobs older than 24 hours
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
            
            if (deleteError) {
                log(`❌ Error deleting old news: ${deleteError.message}`, 'ERROR');
            } else {
                deleted24h = oldNews.length;
                log(`   ✅ Deleted ${deleted24h} old news items (older than 24 hours)`);
            }
        } else {
            log(`   ℹ️  No old news to delete`);
        }
    } catch (error) {
        log(`❌ Exception during 24h cleanup: ${error.message}`, 'ERROR');
    }
    
    // Delete expired jobs
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: expiredJobs, error: fetchError } = await supabase
            .from('news_feed')
            .select('id')
            .eq('category', 'jobs')
            .lt('deadline', today);
        
        if (!fetchError && expiredJobs && expiredJobs.length > 0) {
            const { error: deleteError } = await supabase
                .from('news_feed')
                .delete()
                .eq('category', 'jobs')
                .lt('deadline', today);
            
            if (deleteError) {
                log(`❌ Error deleting expired jobs: ${deleteError.message}`, 'ERROR');
            } else {
                deletedJobs = expiredJobs.length;
                log(`   ✅ Deleted ${deletedJobs} expired job listings`);
            }
        } else {
            log(`   ℹ️  No expired jobs to delete`);
        }
    } catch (error) {
        log(`❌ Exception during jobs cleanup: ${error.message}`, 'ERROR');
    }
    
    const totalDeleted = deleted24h + deletedJobs;
    log(`   📊 Cleanup Summary: ${totalDeleted} total records deleted`);
    
    return totalDeleted;
}

// ============================================
// CHECK DATABASE STATS
// ============================================
async function getDatabaseStats() {
    try {
        const { count, error } = await supabase
            .from('news_feed')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            log(`Error getting count: ${error.message}`, 'ERROR');
            return 0;
        }
        
        return count || 0;
    } catch (error) {
        log(`Exception getting stats: ${error.message}`, 'ERROR');
        return 0;
    }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
    const startTime = Date.now();
    
    log('='.repeat(60));
    log('🚀 NewsPulse Automated News Fetcher Started');
    log(`⏰ Start Time: ${new Date().toISOString()}`);
    log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    log('='.repeat(60));
    
    const initialCount = await getDatabaseStats();
    log(`\n📊 Initial database records: ${initialCount}`);
    
    const enabledSources = RSS_SOURCES.filter(source => source.enabled);
    log(`\n📋 Processing ${enabledSources.length} RSS sources (${RSS_SOURCES.length - enabledSources.length} disabled)`);
    
    let totalInserted = 0;
    let successfulSources = 0;
    let failedSources = 0;
    
    // ১. প্রথাগত আরএসএস সোর্সগুলো রান হবে
    for (let i = 0; i < enabledSources.length; i++) {
        const source = enabledSources[i];
        log(`\n[Source ${i + 1}/${enabledSources.length}]`);
        
        const inserted = await processSource(source);
        
        if (inserted >= 0) {
            successfulSources++;
            totalInserted += inserted;
        } else {
            failedSources++;
        }
        
        if (i < enabledSources.length - 1) {
            log(`   ⏳ Waiting 5 seconds before next source...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    // ২. জিরো-ইনস্টল ডিরেক্ট ওয়েব স্ক্রেপার মডিউল রান হবে (কোনো প্যাকেজ ছাড়া)
    const directInsertedCount = await processDirectScrapersFree();
    totalInserted += directInsertedCount;
    
    // ৩. পুরাতন ২৪ ঘণ্টার ডাটা এবং এক্সপায়ার্ড জব কন্টেন্ট ক্লিনআপ
    const deletedCount = await cleanupOldRecords();
    
    const finalCount = await getDatabaseStats();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60));
    log('📊 FINAL REPORT WITH LIGHTWEIGHT HYBRID ENGINE');
    log('='.repeat(60));
    log(`⏱️  Duration: ${duration} seconds`);
    log(`📥 Total new items inserted: ${totalInserted} (RSS + RegEx DOM)`);
    log(`✅ Successful RSS sources: ${successfulSources}/${enabledSources.length}`);
    log(`❌ Failed RSS sources: ${failedSources}/${enabledSources.length}`);
    log(`🗑️  Records cleaned: ${deletedCount}`);
    log(`📈 Database records: ${initialCount} → ${finalCount} (${finalCount - initialCount > 0 ? '+' : ''}${finalCount - initialCount})`);
    log(`🏁 Completed at: ${new Date().toISOString()}`);
    log('='.repeat(60));
    
    if (successfulSources === 0 && directInsertedCount === 0 && enabledSources.length > 0) {
        log('⚠️  WARNING: No sources were successfully processed!', 'WARN');
    }
}

// ============================================
// ERROR HANDLING & EXECUTION
// ============================================
process.on('unhandledRejection', (error) => {
    log(`FATAL: Unhandled rejection: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log(`FATAL: Uncaught exception: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    process.exit(1);
});

// Execute main function
main()
    .then(() => {
        log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        log(`\n❌ Script failed: ${error.message}`, 'ERROR');
        log(error.stack, 'ERROR');
        process.exit(1);
    });
