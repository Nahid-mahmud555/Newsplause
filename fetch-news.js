// ============================================
// NewsPulse RSS Feed Fetcher + Translator + Broadcaster
// ============================================

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import pkg from '@vitalets/google-translate-api';
const { translate } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// ──────────────────────────────────────────────────────────
// Global Process Hard Timeout (prevent hanging for hours)
// ──────────────────────────────────────────────────────────
const GLOBAL_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

setTimeout(() => {
    console.error('❌ CRITICAL ERROR: Process timed out after 20 minutes! Force exiting.');
    process.exit(1);
}, GLOBAL_TIMEOUT_MS);

// ──────────────────────────────────────────────────────────
// Initialize Supabase client
// ──────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const fallbackChatId = process.env.TELEGRAM_CHAT_ID;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Missing Supabase credentials!');
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────────────────
// Initialize RSS Parser with custom headers & strict timeout
// ──────────────────────────────────────────────────────────
const parser = new Parser({
    timeout: 10000, // 10 seconds to prevent hanging
    headers: {
        'User-Agent': 'NewsPulse/1.0 (News Aggregator Bot)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    maxRedirects: 3
});

// ──────────────────────────────────────────────────────────
// Real browser headers (for built-in fetch)
// ──────────────────────────────────────────────────────────
const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7'
};

// ──────────────────────────────────────────────────────────
// RSS SOURCES CONFIGURATION
// ──────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────
// LOGGING UTILITY
// ──────────────────────────────────────────────────────────
const logFile = path.join(process.cwd(), 'fetch-log.txt');

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    
    console.log(logMessage);
    
    try {
        fs.appendFileSync(logFile, logMessage + '\n');
    } catch (error) {
        // Silently fail if can't write to log file
    }
}

// ──────────────────────────────────────────────────────────
// TELEGRAM NOTIFICATION UTILITY
// ──────────────────────────────────────────────────────────
async function sendTelegramMessage(chatId, text) {
    if (!telegramBotToken || !chatId) return;

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            }),
            signal: AbortSignal.timeout(8000)
        });
        
        const data = await response.json();
        if (!data.ok) {
            log(`⚠️ Telegram sending failed for ${chatId}: ${data.description}`, 'WARN');
        }
    } catch (error) {
        log(`❌ Telegram API Error: ${error.message}`, 'ERROR');
    }
}

async function broadcastNewsToTelegram(newsData) {
    if (!telegramBotToken) {
        log(`ℹ️ TELEGRAM_BOT_TOKEN not provided, skipping Telegram broadcast.`, 'INFO');
        return;
    }

    try {
        let recipientChatIds = [];

        // Fetch subscribers from Supabase
        const { data: subscribers, error } = await supabase
            .from('subscribers')
            .select('telegram_chat_id, chat_id');

        if (!error && subscribers && subscribers.length > 0) {
            recipientChatIds = subscribers
                .map(sub => sub.telegram_chat_id || sub.chat_id)
                .filter(Boolean);
        }

        // Fallback to default chat ID if no subscribers
        if (recipientChatIds.length === 0 && fallbackChatId) {
            recipientChatIds.push(fallbackChatId);
        }

        if (recipientChatIds.length === 0) {
            log(`ℹ️ No active subscribers found for Telegram broadcast.`);
            return;
        }

        // Build message
        const summaries = newsData.bengaliSummaries && newsData.bengaliSummaries.length > 0
            ? newsData.bengaliSummaries.map(s => `• ${s}`).join('\n')
            : '';

        const categoryEmoji = 
            newsData.category === 'jobs' ? '💼' : 
            newsData.category === 'technology' ? '💻' : 
            newsData.category === 'sports' ? '⚽' : '📰';

        let message = `${categoryEmoji} <b>${newsData.bengaliTitle}</b>\n`;
        if (newsData.source_name) message += `🏛️ <i>উৎস: ${newsData.source_name}</i>\n`;
        if (summaries) message += `\n${summaries}\n`;
        if (newsData.sourceUrl) message += `\n🔗 <a href="${newsData.sourceUrl}">বিস্তারিত পড়ুন</a>`;

        log(`📢 Broadcasting news to ${recipientChatIds.length} Telegram subscribers...`);

        // Send to each subscriber with delay
        for (const chatId of recipientChatIds) {
            await sendTelegramMessage(chatId, message);
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    } catch (error) {
        log(`❌ Broadcast Exception: ${error.message}`, 'ERROR');
    }
}

// ──────────────────────────────────────────────────────────
// CLEAN TEXT UTILITY
// ──────────────────────────────────────────────────────────
function cleanText(text) {
    if (!text) return '';
    
    return text
        .replace(/<[^>]*>/g, '')           // Remove HTML tags
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
        .replace(/\s+/g, ' ')              // Collapse whitespace
        .trim();
}

// ──────────────────────────────────────────────────────────
// CREATE ENGLISH SUMMARY (Algorithmic)
// Takes content and extracts 3 representative sentences
// ──────────────────────────────────────────────────────────
function createEnglishSummary(content) {
    if (!content) return ['No content available'];
    
    const cleanContent = cleanText(content);
    
    // Split into sentences (handles . ! ? as delimiters)
    const sentences = cleanContent
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 300);
    
    if (sentences.length === 0) {
        const fallbackText = cleanContent.substring(0, 200).trim();
        return fallbackText ? [fallbackText] : ['No content available'];
    }
    
    let selected = [];
    
    // Select 3 representative sentences: first, middle, last
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
        selected = [...new Set(selected)]; // Remove duplicates
        
        // If we have less than 3 after dedup, add another unique sentence
        if (selected.length < 3 && sentences.length > 3) {
            const additional = sentences.find(s => !selected.includes(s));
            if (additional) selected.push(additional);
        }
    }
    
    // Filter out empty or punctuation-only sentences
    const validSentences = selected.filter(s => {
        const trimmed = s.trim();
        return trimmed !== "" && !/^[.\s\-…]+$/.test(trimmed);
    });
    
    if (validSentences.length === 0) {
        const firstValid = sentences.find(s => {
            const trimmed = s.trim();
            return trimmed !== "" && !/^[.\s\-…]+$/.test(trimmed);
        });
        if (firstValid) validSentences.push(firstValid);
    }
    
    // Return max 3 sentences, each max 200 chars
    return validSentences.slice(0, 3).map(s => s.substring(0, 200).trim());
}

// ──────────────────────────────────────────────────────────
// LIGHTWEIGHT TRANSLATE (Non-Blocking with Timeout)
// Translates text to Bengali, falls back to original on error
// ──────────────────────────────────────────────────────────
async function translateToBengali(text) {
    if (!text || text.trim().length === 0 || /^[.\s\-…]+$/.test(text.trim())) {
        return text;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const result = await Promise.race([
            translate(text, { to: 'bn', forceTo: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Translation timeout')), 4000))
        ]);
        
        clearTimeout(timeoutId);

        if (result && result.text && result.text.trim().length > 0) {
            return result.text;
        }
    } catch (error) {
        // Fallback to original text if translation fails/times out
    }
    
    return text;
}

// ──────────────────────────────────────────────────────────
// CHECK IF URL EXISTS IN DATABASE
// Returns true if URL already exists, false otherwise
// ──────────────────────────────────────────────────────────
async function urlExists(url) {
    try {
        const { data, error } = await supabase
            .from('news_feed')
            .select('id')
            .eq('sourceUrl', url)
            .single();
        
        // PGRST116 means no rows returned (URL doesn't exist)
        if (error && error.code !== 'PGRST116') {
            return false;
        }
        
        return data !== null;
    } catch (error) {
        return false;
    }
}

// ──────────────────────────────────────────────────────────
// INSERT NEWS INTO DATABASE
// Returns { success, reason, data }
// ──────────────────────────────────────────────────────────
async function insertNews(newsData) {
    try {
        const { data, error } = await supabase
            .from('news_feed')
            .insert([newsData])
            .select();
        
        if (error) {
            // 23505 = duplicate key violation
            if (error.code === '23505') {
                return { success: false, reason: 'duplicate' };
            }
            return { success: false, reason: 'error' };
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, reason: 'exception' };
    }
}

// ──────────────────────────────────────────────────────────
// VALIDATE SUMMARIES
// Filters out empty, null, or punctuation-only strings
// ──────────────────────────────────────────────────────────
function validateSummaries(summaries) {
    if (!summaries || !Array.isArray(summaries)) return [];
    
    return summaries.filter(s => {
        if (!s) return false;
        const trimmed = s.toString().trim();
        return trimmed !== "" && 
               trimmed !== "..." && 
               trimmed !== ".." && 
               trimmed !== "." && 
               !/^[.\s\-…]+$/.test(trimmed);
    });
}

// ──────────────────────────────────────────────────────────
// ZERO-INSTALL DIRECT SCRAPER
// Uses RegEx on raw HTML to extract links and titles
// ──────────────────────────────────────────────────────────
async function processDirectScrapersFree() {
    log('\n🕷️ Starting Zero-Install RegEx HTML Scraping with Anti-Spam Engine...');
    let totalDirectInserted = 0;

    const targets = [
        { name: 'Channel i Direct National', url: 'https://www.channelionline.com/category/national/', category: 'national', domain: 'channelionline.com' },
        { name: 'Channel i Direct Jobs', url: 'https://www.channelionline.com/category/corporate-news/job-market/', category: 'jobs', domain: 'channelionline.com' },
        { name: 'Jamuna TV Direct National', url: 'https://www.jamuna.tv/category/national', category: 'national', domain: 'jamuna.tv' },
        { name: 'Somoy News Direct Tech', url: 'https://somoynews.tv/category/technology', category: 'technology', domain: 'somoynews.tv' }
    ];

    // Whitelist of Bengali job-related keywords
    const jobWhitelist = ['চাকরি', 'নিয়োগ', 'ক্যারিয়ার', 'পদ', 'বিজ্ঞপ্তি', 'জব', 'খালি', 'আবেদন', 'কর্মসংস্থান', 'বিসিএস'];
    
    // Global blacklist of spam words
    const globalBlacklist = ['পড়ুন', 'ভিডিও', 'সর্বশেষ', 'জনপ্রিয়', 'লাইভ', 'ফেসবুক', 'টুইটার', 'ইউটিউব', 'বিজ্ঞাপন'];

    for (const target of targets) {
        try {
            const response = await fetch(target.url, { 
                headers: FETCH_HEADERS, 
                signal: AbortSignal.timeout(10000) 
            });
            const html = await response.text();

            // Regex to find all <a> tags with href
            const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            let count = 0;

            while ((match = linkRegex.exec(html)) !== null && count < 5) {
                const sourceUrl = match[1];
                let title = cleanText(match[2]);

                // Skip invalid URLs
                if (!sourceUrl || sourceUrl.includes('#') || !sourceUrl.startsWith('http')) continue;
                if (!sourceUrl.includes(target.domain)) continue;
                
                // Skip short titles
                if (title.length < 15 || title.includes('পড়ুন')) continue;

                // Skip spam words
                if (globalBlacklist.some(word => title.includes(word))) continue;

                // For jobs category, check job keywords
                if (target.category === 'jobs' && !jobWhitelist.some(word => title.includes(word))) continue;

                // Skip if URL already exists in database
                if (await urlExists(sourceUrl)) continue;

                count++;
                
                const newsData = {
                    bengaliTitle: title,
                    bengaliSummaries: [title], // Use title as summary since we don't have content
                    category: target.category,
                    sourceUrl: sourceUrl,
                    source_name: target.name,
                    deadline: target.category === 'jobs' 
                        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                        : null
                };

                const result = await insertNews(newsData);
                if (result.success) {
                    totalDirectInserted++;
                    await broadcastNewsToTelegram(newsData);
                }
            }
        } catch (error) {
            log(`❌ RegEx Scraping Exception for ${target.name}: ${error.message}`, 'WARN');
        }
    }
    return totalDirectInserted;
}

// ──────────────────────────────────────────────────────────
// PROCESS RSS SOURCE
// Fetches RSS feed, translates, and inserts into database
// Returns number of successfully inserted articles
// ──────────────────────────────────────────────────────────
async function processSource(source) {
    log(`\n📡 Processing: ${source.name} (${source.category})`);
    
    try {
        const feed = await parser.parseURL(source.url);
        
        if (!feed || !feed.items || feed.items.length === 0) {
            log(`⚠️ No items found for ${source.name}`, 'WARN');
            return 0;
        }
        
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Process top 5 items to keep runtime fast & safe
        const itemsToProcess = feed.items.slice(0, 5);
        
        for (let i = 0; i < itemsToProcess.length; i++) {
            const item = itemsToProcess[i];
            
            try {
                const sourceUrl = item.link || item.guid;
                if (!sourceUrl) {
                    skippedCount++;
                    continue;
                }
                
                // Skip if URL already exists
                if (await urlExists(sourceUrl)) {
                    skippedCount++;
                    continue;
                }
                
                // Get content from item
                const content = item.content || item.contentSnippet || item.summary || item.description || item.title || '';
                
                // Create English summary
                const englishSummary = createEnglishSummary(content);
                const validEnglishSummary = validateSummaries(englishSummary);
                
                if (validEnglishSummary.length === 0) {
                    skippedCount++;
                    continue;
                }
                
                // Translate title to Bengali
                const englishTitle = item.title || 'No Title';
                let bengaliTitle = await translateToBengali(englishTitle);
                
                // Translate each summary point to Bengali
                const bengaliSummaries = [];
                for (const point of validEnglishSummary) {
                    let translated = await translateToBengali(point);
                    bengaliSummaries.push(translated);
                }
                
                const validBengaliSummaries = validateSummaries(bengaliSummaries);
                if (validBengaliSummaries.length === 0) {
                    skippedCount++;
                    continue;
                }
                
                // Prepare news data object
                const newsData = {
                    bengaliTitle: bengaliTitle,
                    bengaliSummaries: validBengaliSummaries,
                    category: source.category,
                    sourceUrl: sourceUrl,
                    source_name: source.name,
                    deadline: source.category === 'jobs' 
                        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                        : null
                };
                
                // Insert into database
                const result = await insertNews(newsData);
                
                if (result.success) {
                    processedCount++;
                    // Broadcast to Telegram
                    await broadcastNewsToTelegram(newsData);
                } else if (result.reason === 'duplicate') {
                    skippedCount++;
                } else {
                    errorCount++;
                }
                
            } catch (error) {
                errorCount++;
                log(`Error processing item from ${source.name}: ${error.message}`, 'WARN');
                continue;
            }
        }
        
        log(`📊 ${source.name}: ✅ ${processedCount} inserted, ⏭️ ${skippedCount} skipped, ❌ ${errorCount} errors`);
        return processedCount;
    } catch (error) {
        log(`❌ Error fetching ${source.name}: ${error.message}`, 'WARN');
        return 0;
    }
}

// ──────────────────────────────────────────────────────────
// CLEANUP OLD RECORDS
// Removes old news (24h+) and expired job postings
// Returns total number of deleted records
// ──────────────────────────────────────────────────────────
async function cleanupOldRecords() {
    log('\n🧹 Starting database cleanup...');
    let deleted24h = 0;
    let deletedJobs = 0;
    
    try {
        // Delete non-job news older than 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: oldNews } = await supabase
            .from('news_feed')
            .select('id')
            .neq('category', 'jobs')
            .lt('created_at', twentyFourHoursAgo);
        
        if (oldNews && oldNews.length > 0) {
            const { error: deleteError } = await supabase
                .from('news_feed')
                .delete()
                .neq('category', 'jobs')
                .lt('created_at', twentyFourHoursAgo);
                
            if (!deleteError) {
                deleted24h = oldNews.length;
            }
        }
    } catch (error) {
        log(`Cleanup warning (24h): ${error.message}`, 'WARN');
    }
    
    try {
        // Delete expired job postings
        const today = new Date().toISOString().split('T')[0];
        const { data: expiredJobs } = await supabase
            .from('news_feed')
            .select('id')
            .eq('category', 'jobs')
            .lt('deadline', today);
        
        if (expiredJobs && expiredJobs.length > 0) {
            const { error: deleteError } = await supabase
                .from('news_feed')
                .delete()
                .eq('category', 'jobs')
                .lt('deadline', today);
                
            if (!deleteError) {
                deletedJobs = expiredJobs.length;
            }
        }
    } catch (error) {
        log(`Cleanup warning (jobs): ${error.message}`, 'WARN');
    }
    
    const total = deleted24h + deletedJobs;
    log(`🧹 Cleanup: ${total} records deleted (${deleted24h} old news, ${deletedJobs} expired jobs)`);
    return total;
}

// ──────────────────────────────────────────────────────────
// CHECK DATABASE STATS
// Returns total number of records in news_feed table
// ──────────────────────────────────────────────────────────
async function getDatabaseStats() {
    try {
        const { count, error } = await supabase
            .from('news_feed')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            return 0;
        }
        
        return count || 0;
    } catch (error) {
        return 0;
    }
}

// ──────────────────────────────────────────────────────────
// MAIN FUNCTION
// Orchestrates the entire fetch → translate → insert → broadcast pipeline
// ──────────────────────────────────────────────────────────
async function main() {
    const startTime = Date.now();
    log('🚀 ============================================');
    log('🚀 NewsPulse Automated News Fetcher Started');
    log('🚀 ============================================');
    
    // Get initial database count
    const initialCount = await getDatabaseStats();
    log(`📊 Initial database count: ${initialCount}`);
    
    // Filter enabled sources only
    const enabledSources = RSS_SOURCES.filter(source => source.enabled);
    log(`📋 Total enabled RSS sources: ${enabledSources.length}`);
    
    let totalInserted = 0;
    let successfulSources = 0;
    
    // Process each RSS source
    for (let i = 0; i < enabledSources.length; i++) {
        const source = enabledSources[i];
        log(`\n[${i + 1}/${enabledSources.length}] Processing source...`);
        
        const inserted = await processSource(source);
        
        if (inserted >= 0) {
            successfulSources++;
            totalInserted += inserted;
        }
        
        // Delay between sources to avoid rate limiting
        if (i < enabledSources.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Run direct scrapers
    const directInsertedCount = await processDirectScrapersFree();
    totalInserted += directInsertedCount;
    
    // Cleanup old records
    await cleanupOldRecords();
    
    // Get final database count
    const finalCount = await getDatabaseStats();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Summary
    log('\n📊 ============================================');
    log(`📊 FINAL SUMMARY`);
    log(`📊 ============================================`);
    log(`📊 Initial count: ${initialCount}`);
    log(`📊 Final count: ${finalCount}`);
    log(`📊 Total inserted: ${totalInserted} (RSS: ${totalInserted - directInsertedCount}, Direct: ${directInsertedCount})`);
    log(`📊 Successful sources: ${successfulSources}/${enabledSources.length}`);
    log(`📊 Duration: ${duration} seconds`);
    log('✅ NewsPulse Fetch Complete!');
    
    process.exit(0);
}

// ──────────────────────────────────────────────────────────
// EXECUTE SCRIPT
// ──────────────────────────────────────────────────────────
main().catch((err) => {
    log(`❌ Critical Unhandled Engine Failure: ${err.message}`, 'ERROR');
    log(`❌ Stack trace: ${err.stack}`, 'ERROR');
    process.exit(1);
});
