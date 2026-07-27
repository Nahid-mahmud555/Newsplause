// ============================================
// NewsPulse RSS Feed Fetcher + Translator + Broadcaster
// FIXED VERSION — No more hanging!
// ============================================

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import pkg from '@vitalets/google-translate-api';
const { translate } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────
// 🌟 STRICT TIMEOUT — 10 minutes max, then force exit
// ──────────────────────────────────────────────────────────
const MAX_RUNTIME_MS = 10 * 60 * 1000; // 10 minutes

setTimeout(() => {
    console.error('⏰ CRITICAL: Process timed out after 10 minutes! Force exiting.');
    process.exit(1);
}, MAX_RUNTIME_MS);

// ──────────────────────────────────────────────────────────
// Environment variables
// ──────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const fallbackChatId = process.env.TELEGRAM_CHAT_ID;

console.log('\n🔍 ENV Check:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
console.log('SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
console.log('TELEGRAM:', telegramBotToken ? '✅' : '⚠️ Not set\n');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials! Exiting.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────────────────
// RSS Parser — very short timeout
// ──────────────────────────────────────────────────────────
const parser = new Parser({
    timeout: 5000, // 5 seconds only!
    headers: {
        'User-Agent': 'NewsPulse/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    },
    maxRedirects: 2
});

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; NewsPulse/1.0)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'bn-BD,bn;q=0.9,en;q=0.8'
};

// ──────────────────────────────────────────────────────────
// 🌟 ONLY WORKING RSS SOURCES (dead ones removed)
// ──────────────────────────────────────────────────────────
const RSS_SOURCES = [
    // These are verified working sources
    {
        name: 'Prothom Alo',
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
        name: 'Jagonews24',
        url: 'https://www.jagonews24.com/rss/rss.xml',
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
    }
];

// ──────────────────────────────────────────────────────────
// LOGGING
// ──────────────────────────────────────────────────────────
const logFile = path.join(process.cwd(), 'fetch-log.txt');

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    try { fs.appendFileSync(logFile, logMessage + '\n'); } catch(e) {}
}

// ──────────────────────────────────────────────────────────
// TELEGRAM (simplified, non-blocking)
// ──────────────────────────────────────────────────────────
async function sendTelegramMessage(chatId, text) {
    if (!telegramBotToken || !chatId) return;
    try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
            signal: AbortSignal.timeout(5000)
        });
    } catch(e) {}
}

async function broadcastNewsToTelegram(newsData) {
    if (!telegramBotToken) return;
    try {
        let chats = [];
        if (fallbackChatId) chats.push(fallbackChatId);
        for (const chatId of chats) {
            const summary = (newsData.bengaliSummaries || []).slice(0, 2).map(s => `• ${s}`).join('\n');
            const msg = `📰 <b>${newsData.bengaliTitle}</b>\n${summary}\n🔗 ${newsData.sourceUrl}`;
            await sendTelegramMessage(chatId, msg);
        }
    } catch(e) {}
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────
function cleanText(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ').trim();
}

function createEnglishSummary(content) {
    if (!content) return ['No content'];
    const clean = cleanText(content);
    const sentences = clean.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 250);
    if (sentences.length === 0) return [clean.substring(0, 200)];
    if (sentences.length <= 3) return sentences;
    return [sentences[0], sentences[Math.floor(sentences.length/2)], sentences[sentences.length-1]].slice(0, 3);
}

// 🌟 TRANSLATE WITH STRICT TIMEOUT — won't hang anymore!
async function translateToBengali(text) {
    if (!text || text.length < 3) return text;
    try {
        const result = await Promise.race([
            translate(text, { to: 'bn' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TL_TIMEOUT')), 3000))
        ]);
        return result?.text || text;
    } catch(e) {
        return text; // Fallback to original
    }
}

async function urlExists(url) {
    try {
        const { data } = await supabase.from('news_feed').select('id').eq('sourceUrl', url).single();
        return !!data;
    } catch { return false; }
}

async function insertNews(newsData) {
    try {
        const { error } = await supabase.from('news_feed').insert([newsData]);
        return !error;
    } catch { return false; }
}

// ──────────────────────────────────────────────────────────
// 🌟 PROCESS ONE SOURCE — with per-item timeout
// ──────────────────────────────────────────────────────────
async function processSource(source) {
    log(`📡 ${source.name} (${source.category})`);
    let inserted = 0;
    
    try {
        // 🌟 Fetch RSS with timeout
        const feed = await Promise.race([
            parser.parseURL(source.url),
            new Promise((_, reject) => setTimeout(() => reject(new Error('RSS_TIMEOUT')), 8000))
        ]);
        
        if (!feed?.items?.length) {
            log(`  ⚠️ No items`, 'WARN');
            return 0;
        }
        
        // Only process FIRST 3 items per source (fast!)
        const items = feed.items.slice(0, 3);
        log(`  📋 Found ${feed.items.length} items, processing ${items.length}`);
        
        for (const item of items) {
            try {
                const sourceUrl = item.link || item.guid;
                if (!sourceUrl || await urlExists(sourceUrl)) continue;
                
                const content = item.content || item.contentSnippet || item.summary || item.description || '';
                const enSummary = createEnglishSummary(content);
                const enTitle = item.title || 'No Title';
                
                // 🌟 Translate with timeout protection
                const bnTitle = await translateToBengali(enTitle);
                
                const bnSummaries = [];
                for (const point of enSummary.slice(0, 2)) {
                    const translated = await translateToBengali(point);
                    if (translated) bnSummaries.push(translated);
                }
                
                if (!bnSummaries.length) continue;
                
                const newsData = {
                    bengaliTitle: bnTitle || enTitle,
                    bengaliSummaries: bnSummaries,
                    category: source.category,
                    sourceUrl: sourceUrl,
                    source_name: source.name,
                    deadline: source.category === 'jobs' ? new Date(Date.now() + 7*86400000).toISOString().split('T')[0] : null
                };
                
                if (await insertNews(newsData)) {
                    inserted++;
                    broadcastNewsToTelegram(newsData); // Fire & forget
                    log(`  ✅ ${bnTitle?.substring(0, 50)}...`);
                }
            } catch(itemErr) {
                // Skip problematic items
                continue;
            }
        }
    } catch(srcErr) {
        log(`  ❌ ${source.name}: ${srcErr.message}`, 'WARN');
    }
    
    return inserted;
}

// ──────────────────────────────────────────────────────────
// 🌟 SIMPLE DIRECT SCRAPER (only 2 working targets)
// ──────────────────────────────────────────────────────────
async function processDirectScrapers() {
    log('🕷️ Direct scraping...');
    let inserted = 0;
    
    const targets = [
        { name: 'Jamuna TV', url: 'https://www.jamuna.tv/category/national', category: 'national' },
        { name: 'Somoy News Tech', url: 'https://somoynews.tv/category/technology', category: 'technology' }
    ];
    
    for (const target of targets) {
        try {
            const res = await fetch(target.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8000) });
            const html = await res.text();
            
            const links = html.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]+)<\/a>/gi) || [];
            let count = 0;
            
            for (const link of links) {
                if (count >= 3) break;
                const match = link.match(/href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]+)<\/a>/i);
                if (!match) continue;
                
                const url = match[1];
                const title = cleanText(match[2]);
                
                if (title.length < 20 || await urlExists(url)) continue;
                
                const newsData = {
                    bengaliTitle: title,
                    bengaliSummaries: [title],
                    category: target.category,
                    sourceUrl: url,
                    source_name: target.name
                };
                
                if (await insertNews(newsData)) {
                    inserted++;
                    count++;
                    broadcastNewsToTelegram(newsData);
                    log(`  ✅ ${title.substring(0, 50)}...`);
                }
            }
        } catch(e) {
            log(`  ❌ ${target.name}: ${e.message}`, 'WARN');
        }
    }
    
    return inserted;
}

// ──────────────────────────────────────────────────────────
// MAIN — Fast execution, no hanging
// ──────────────────────────────────────────────────────────
async function main() {
    const start = Date.now();
    log('🚀 NewsPulse Started\n');
    
    const sources = RSS_SOURCES.filter(s => s.enabled);
    log(`📋 ${sources.length} RSS sources + 2 direct scrapers\n`);
    
    let total = 0;
    
    // Process RSS sources ONE BY ONE
    for (let i = 0; i < sources.length; i++) {
        log(`[${i+1}/${sources.length}]`);
        const added = await processSource(sources[i]);
        total += added;
        // Small delay between sources
        if (i < sources.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    
    // Direct scrapers
    total += await processDirectScrapers();
    
    // Cleanup
    try {
        const dayAgo = new Date(Date.now() - 86400000).toISOString();
        await supabase.from('news_feed').delete().neq('category', 'jobs').lt('created_at', dayAgo);
    } catch(e) {}
    
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    log(`\n✅ Done! ${total} new articles in ${duration}s`);
    
    process.exit(0);
}

// START
main().catch(err => {
    log(`❌ Fatal: ${err.message}`, 'ERROR');
    process.exit(1);
});
