// ============================================
// NewsPulse — Complete Engine
// Fetch + Translate + DB Insert + Telegram + Email
// ============================================

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import pkg from '@vitalets/google-translate-api';
const { translate } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────
// STRICT TIMEOUT — 15 minutes max
// ──────────────────────────────────────────────────────────
const MAX_RUNTIME_MS = 15 * 60 * 1000;

setTimeout(() => {
    console.error('⏰ CRITICAL: Process timed out! Force exiting.');
    process.exit(1);
}, MAX_RUNTIME_MS);

// ──────────────────────────────────────────────────────────
// Environment variables
// ──────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail = process.env.SENDER_EMAIL || 'newsletter@newspulse.buzz';

console.log('\n🔍 ENV Check:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
console.log('SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
console.log('TELEGRAM_BOT_TOKEN:', telegramBotToken ? '✅' : '⚠️ Not set');
console.log('RESEND_API_KEY:', resendApiKey ? '✅' : '⚠️ Not set (email disabled)\n');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials! Exiting.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────────────────
// Resend email client (if API key provided)
// ──────────────────────────────────────────────────────────
let resend = null;
if (resendApiKey && resendApiKey !== 'YOUR_RESEND_API_KEY') {
    resend = new Resend(resendApiKey);
    console.log('✅ Resend email client initialized\n');
} else {
    console.log('⚠️ Resend not configured — email sending disabled\n');
}

// ──────────────────────────────────────────────────────────
// RSS Parser
// ──────────────────────────────────────────────────────────
const parser = new Parser({
    timeout: 5000,
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
// RSS SOURCES
// ──────────────────────────────────────────────────────────
const RSS_SOURCES = [
    { name: 'Prothom Alo Bangla', url: 'https://www.prothomalo.com/feed/', category: 'national', enabled: true },
    { name: 'Jugantor National', url: 'https://www.jugantor.com/feed/national', category: 'national', enabled: false },
    { name: 'Jagonews24', url: 'https://www.jagonews24.com/rss/rss.xml', category: 'national', enabled: true },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'technology', enabled: true },
    { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'technology', enabled: true },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'technology', enabled: true },
    { name: 'ESPN Cricinfo', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', category: 'sports', enabled: true },
    { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'sports', enabled: true },
    { name: 'Banglanews24 Tech', url: 'https://www.banglanews24.com/rss/category/9', category: 'technology', enabled: true },
    { name: 'Banglanews24 National', url: 'https://www.banglanews24.com/rss/category/1', category: 'national', enabled: true }
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
// TELEGRAM — send message to subscribers
// ──────────────────────────────────────────────────────────
async function sendTelegramMessage(chatId, text) {
    if (!telegramBotToken || !chatId) return;
    try {
        const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: text, 
                parse_mode: 'HTML',
                disable_web_page_preview: false 
            }),
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        if (!data.ok) {
            log(`  ⚠️ Telegram send failed to ${chatId}: ${data.description}`, 'WARN');
        }
        return data.ok;
    } catch(e) {
        log(`  ❌ Telegram error: ${e.message}`, 'ERROR');
        return false;
    }
}

async function broadcastNewsToTelegram(newsData) {
    if (!telegramBotToken) return;
    
    try {
        // Get all telegram subscribers from Supabase
        const { data: subscribers, error } = await supabase
            .from('subscribers')
            .select('telegram_chat_id')
            .not('telegram_chat_id', 'is', null);

        if (error || !subscribers?.length) {
            // No telegram subscribers yet
            return;
        }

        const summaries = (newsData.bengaliSummaries || []).slice(0, 2).map(s => `• ${s}`).join('\n');
        const msg = `📰 <b>${newsData.bengaliTitle}</b>\n\n${summaries}\n\n🔗 <a href="${newsData.sourceUrl}">বিস্তারিত পড়ুন</a>\n📡 সূত্র: ${newsData.source_name}`;

        let sentCount = 0;
        for (const sub of subscribers) {
            const ok = await sendTelegramMessage(sub.telegram_chat_id, msg);
            if (ok) sentCount++;
            await new Promise(r => setTimeout(r, 500)); // Rate limit
        }
        
        if (sentCount > 0) {
            log(`  📨 Telegram: sent to ${sentCount}/${subscribers.length} subscribers`);
        }
    } catch(e) {
        log(`  ❌ Telegram broadcast error: ${e.message}`, 'ERROR');
    }
}

// ──────────────────────────────────────────────────────────
// EMAIL — send daily digest to subscribers
// ──────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
    if (!resend) return false;
    
    try {
        const { data, error } = await resend.emails.send({
            from: `NewsPulse <${senderEmail}>`,
            to: [to],
            subject: subject,
            html: html
        });
        
        if (error) {
            log(`  ⚠️ Email send failed to ${to}: ${error.message}`, 'WARN');
            return false;
        }
        
        return true;
    } catch(e) {
        log(`  ❌ Email error: ${e.message}`, 'ERROR');
        return false;
    }
}

async function sendDailyDigest() {
    if (!resend) {
        log('  ⚠️ Resend not configured, skipping email digest', 'WARN');
        return;
    }
    
    try {
        log('\n📧 Preparing daily email digest...');
        
        // Fetch latest 10 news
        const { data: newsData } = await supabase
            .from('news_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!newsData?.length) {
            log('  ⚠️ No news to send');
            return;
        }

        // Fetch email subscribers
        const { data: subscribers } = await supabase
            .from('subscribers')
            .select('email')
            .not('email', 'is', null)
            .not('email', 'like', 'tg_%');

        if (!subscribers?.length) {
            log('  ⚠️ No email subscribers yet');
            return;
        }

        log(`  📋 ${newsData.length} news articles, ${subscribers.length} email subscribers`);

        // Build email HTML
        const newsHtml = newsData.map((n, i) => `
            <div style="margin-bottom:24px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <span style="font-size:12px;color:#64748b;">${n.category === 'jobs' ? '💼' : n.category === 'technology' ? '💻' : n.category === 'sports' ? '⚽' : '📰'} ${n.source_name || ''}</span>
                <h3 style="margin:8px 0;color:#1e293b;">${n.bengaliTitle || 'No Title'}</h3>
                <ul style="padding-left:20px;color:#475569;font-size:14px;">
                    ${(n.bengaliSummaries || []).slice(0, 3).map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('')}
                </ul>
                <a href="${n.sourceUrl}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#6366f1;color:#fff;text-decoration:none;border-radius:20px;font-size:13px;">বিস্তারিত পড়ুন →</a>
            </div>
        `).join('');

        const html = `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
                <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px 12px 0 0;">
                    <h1 style="margin:0;">📰 NewsPulse</h1>
                    <p style="margin:4px 0 0;opacity:0.9;">আজকের সংবাদ — ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
                    ${newsHtml}
                </div>
                <div style="text-align:center;padding:16px;background:#f1f5f9;border-radius:0 0 12px 12px;font-size:12px;color:#94a3b8;">
                    <p>আপনি NewsPulse সাবস্ক্রাইবার হিসেবে এই ইমেইল পাচ্ছেন।</p>
                    <p>© ${new Date().getFullYear()} NewsPulse · প্রতিদিন সকাল ৮টায়</p>
                </div>
            </div>
        `;

        // Send to all subscribers
        let sentCount = 0;
        for (const sub of subscribers) {
            const ok = await sendEmail(sub.email, `📰 NewsPulse — আজকের সংবাদ (${new Date().toLocaleDateString('bn-BD')})`, html);
            if (ok) sentCount++;
            await new Promise(r => setTimeout(r, 300)); // Rate limit
        }

        log(`  ✅ Email digest sent to ${sentCount}/${subscribers.length} subscribers`);
    } catch(e) {
        log(`  ❌ Email digest error: ${e.message}`, 'ERROR');
    }
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

async function translateToBengali(text) {
    if (!text || text.length < 3) return text;
    try {
        const result = await Promise.race([
            translate(text, { to: 'bn' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TL_TIMEOUT')), 3000))
        ]);
        return result?.text || text;
    } catch(e) {
        return text;
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
        const { data, error } = await supabase.from('news_feed').insert([newsData]).select('id');
        if (error) {
            if (error.code === '23505') return { success: false, reason: 'duplicate' };
            return { success: false, reason: 'error', message: error.message };
        }
        return { success: true, id: data?.[0]?.id };
    } catch(e) {
        return { success: false, reason: 'exception', message: e.message };
    }
}

// ──────────────────────────────────────────────────────────
// PROCESS ONE RSS SOURCE
// ──────────────────────────────────────────────────────────
async function processSource(source) {
    log(`\n📡 ${source.name} (${source.category})`);
    let inserted = 0;
    let skipped = 0;
    
    try {
        const feed = await Promise.race([
            parser.parseURL(source.url),
            new Promise((_, reject) => setTimeout(() => reject(new Error('RSS_TIMEOUT')), 8000))
        ]);
        
        if (!feed?.items?.length) {
            log(`  ⚠️ No items found`, 'WARN');
            return 0;
        }
        
        const items = feed.items.slice(0, 3);
        log(`  📋 Found ${feed.items.length} items, processing ${items.length}`);
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            try {
                const sourceUrl = item.link || item.guid;
                if (!sourceUrl) { skipped++; continue; }
                
                if (await urlExists(sourceUrl)) { skipped++; continue; }
                
                const content = item.content || item.contentSnippet || item.summary || item.description || '';
                const enSummary = createEnglishSummary(content);
                const enTitle = item.title || 'No Title';
                
                const bnTitle = await translateToBengali(enTitle);
                
                const bnSummaries = [];
                for (const point of enSummary.slice(0, 2)) {
                    const translated = await translateToBengali(point);
                    if (translated) bnSummaries.push(translated);
                }
                
                if (!bnSummaries.length) { skipped++; continue; }
                
                const newsData = {
                    bengaliTitle: bnTitle || enTitle,
                    bengaliSummaries: bnSummaries,
                    category: source.category,
                    sourceUrl: sourceUrl,
                    source_name: source.name,
                    deadline: source.category === 'jobs' ? new Date(Date.now() + 7*86400000).toISOString().split('T')[0] : null
                };
                
                const result = await insertNews(newsData);
                if (result.success) {
                    inserted++;
                    log(`  ✅ ${(bnTitle || enTitle).substring(0, 60)}...`);
                    // Broadcast to Telegram subscribers
                    await broadcastNewsToTelegram(newsData);
                } else if (result.reason === 'duplicate') {
                    skipped++;
                }
            } catch(itemErr) {
                skipped++;
                continue;
            }
        }
    } catch(srcErr) {
        log(`  ❌ ${source.name}: ${srcErr.message}`, 'WARN');
    }
    
    log(`  📊 ${source.name}: ✅${inserted} ⏭️${skipped}`);
    return inserted;
}

// ──────────────────────────────────────────────────────────
// DIRECT SCRAPER
// ──────────────────────────────────────────────────────────
async function processDirectScrapers() {
    log('\n🕷️ Direct scraping...');
    let inserted = 0;
    
    const targets = [
        { name: 'Jamuna TV National', url: 'https://www.jamuna.tv/category/national', category: 'national' },
        { name: 'Somoy News Tech', url: 'https://somoynews.tv/category/technology', category: 'technology' },
        { name: 'Channel i National', url: 'https://www.channelionline.com/category/national/', category: 'national' }
    ];
    
    for (const target of targets) {
        try {
            log(`  🔍 ${target.name}...`);
            const res = await fetch(target.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8000) });
            const html = await res.text();
            
            const linkRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            let count = 0;
            
            while ((match = linkRegex.exec(html)) !== null && count < 3) {
                const url = match[1];
                let title = cleanText(match[2]);
                
                if (!url || !title || title.length < 20) continue;
                if (await urlExists(url)) continue;
                
                const newsData = {
                    bengaliTitle: title,
                    bengaliSummaries: [title],
                    category: target.category,
                    sourceUrl: url,
                    source_name: target.name
                };
                
                const result = await insertNews(newsData);
                if (result.success) {
                    inserted++;
                    count++;
                    log(`  ✅ ${title.substring(0, 60)}...`);
                    await broadcastNewsToTelegram(newsData);
                }
            }
        } catch(e) {
            log(`  ❌ ${target.name}: ${e.message}`, 'WARN');
        }
    }
    
    log(`  📊 Direct: ✅${inserted} new articles`);
    return inserted;
}

// ──────────────────────────────────────────────────────────
// CLEANUP OLD RECORDS
// ──────────────────────────────────────────────────────────
async function cleanupOldRecords() {
    try {
        const dayAgo = new Date(Date.now() - 86400000).toISOString();
        const { data: oldNews } = await supabase
            .from('news_feed')
            .select('id')
            .neq('category', 'jobs')
            .lt('created_at', dayAgo);
        
        if (oldNews?.length) {
            await supabase.from('news_feed').delete().neq('category', 'jobs').lt('created_at', dayAgo);
            log(`🧹 Cleaned ${oldNews.length} old news records`);
        }
        
        const today = new Date().toISOString().split('T')[0];
        const { data: expiredJobs } = await supabase
            .from('news_feed')
            .select('id')
            .eq('category', 'jobs')
            .lt('deadline', today);
        
        if (expiredJobs?.length) {
            await supabase.from('news_feed').delete().eq('category', 'jobs').lt('deadline', today);
            log(`🧹 Cleaned ${expiredJobs.length} expired job postings`);
        }
    } catch(e) {
        log(`⚠️ Cleanup error: ${e.message}`, 'WARN');
    }
}

// ──────────────────────────────────────────────────────────
// MAIN — Full Pipeline
// ──────────────────────────────────────────────────────────
async function main() {
    const start = Date.now();
    
    console.log('🚀 ==============================================');
    console.log('🚀 NewsPulse Complete Engine Started');
    console.log('🚀 ==============================================\n');
    
    // 1. Get initial count
    const { count: initialCount } = await supabase.from('news_feed').select('*', { count: 'exact', head: true });
    log(`📊 Database: ${initialCount || 0} articles\n`);
    
    // 2. Fetch RSS sources
    const sources = RSS_SOURCES.filter(s => s.enabled);
    log(`📡 Processing ${sources.length} RSS sources + 3 direct scrapers...\n`);
    
    let total = 0;
    
    for (let i = 0; i < sources.length; i++) {
        log(`[${i+1}/${sources.length}] ────────────────────`);
        const added = await processSource(sources[i]);
        total += added;
        if (i < sources.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    
    // 3. Direct scrapers
    log(`\n🕷️ ────────────────────`);
    total += await processDirectScrapers();
    
    // 4. Cleanup old records
    log(`\n🧹 ────────────────────`);
    await cleanupOldRecords();
    
    // 5. Send daily digest email (only if this is morning run)
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 10) {
        log(`\n📧 ────────────────────`);
        log(`🕗 Current hour: ${hour} — sending daily digest`);
        await sendDailyDigest();
    } else {
        log(`\n🕗 Current hour: ${hour} — skipping daily digest (only 6-10 AM)`);
    }
    
    // 6. Final stats
    const { count: finalCount } = await supabase.from('news_feed').select('*', { count: 'exact', head: true });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    
    console.log('\n✅ ==============================================');
    console.log(`✅ COMPLETE! ${total} new articles in ${duration}s`);
    console.log(`✅ DB: ${initialCount || 0} → ${finalCount || 0}`);
    console.log('✅ ==============================================');
    
    process.exit(0);
}

// ──────────────────────────────────────────────────────────
// START
// ──────────────────────────────────────────────────────────
main().catch(err => {
    log(`❌ Fatal error: ${err.message}`, 'ERROR');
    console.error(err.stack);
    process.exit(1);
});
