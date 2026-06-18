import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import googleTranslate from '@vitalets/google-translate-api';
import dotenv from 'dotenv';

dotenv.config();

// সুপাবেস ইউআরএল এর শেষের স্ল্যাশ (/) থাকলে তা স্বয়ংক্রিয়ভাবে মুছে ফেলার লজিক
let supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
if (supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim() : '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[ERROR] Missing Supabase environment variables!');
  process.exit(1);
}

// ফ্রেশ ইউআরএল দিয়ে ক্লায়েন্ট তৈরি
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

const parser = new Parser();
const TABLE_NAME = 'news_feed'; 

const RSS_SOURCES = [
  { name: 'Prothom Alo English', url: 'https://en.prothomalo.com/feed', category: 'national' },
  { name: 'The Daily Star', url: 'https://www.thedailystar.net/frontpage/rss.xml', category: 'national' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'technology' }
];

async function translateText(text, targetLang = 'bn') {
  if (!text) return '';
  try {
    const res = await googleTranslate(String(text), { to: targetLang });
    return res.text;
  } catch (err) {
    console.error(`[WARN] Translation failed, using original text. Error: ${err.message}`);
    return text;
  }
}

async function fetchAndProcessNews() {
  console.log('============================================================');
  console.log('🚀 NewsPulse Automated News Fetcher Started');
  console.log('============================================================');

  for (const source of RSS_SOURCES) {
    console.log(`\n📡 Processing: ${source.name}`);
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items.slice(0, 5);
      
      console.log(`📦 Found ${feed.items.length} items. Processing top ${items.length}...`);

      for (let item of items) {
        // ডেইলি স্টারের টাইটেল অবজেক্ট অবজেক্ট এরর দূর করার জন্য ফিক্স
        let rawTitle = '';
        if (item.title) {
          if (typeof item.title === 'object') {
            rawTitle = item.title._ || item.title.text || JSON.stringify(item.title);
          } else {
            rawTitle = String(item.title);
          }
        } else {
          rawTitle = 'No Title';
        }
        
        let cleanTitle = rawTitle.substring(0, 200);
        let newsUrl = item.link || item.guid || '';

        console.log(`\n📝 Processing item: "${cleanTitle.substring(0, 50)}..."`);

        // ১. ডুপ্লিকেট ইউআরএল চেক
        const { data: existing, error: checkError } = await supabase
          .from(TABLE_NAME)
          .select('sourceUrl')
          .eq('sourceUrl', newsUrl)
          .maybeSingle();

        if (checkError) {
          console.error(`[ERROR] Error checking URL existence: ${checkError.message}`);
          console.error(`Details: ${JSON.stringify(checkError)}`);
          continue; 
        }

        if (existing) {
          console.log(`⏭️ News already exists. Skipping.`);
          continue;
        }

        // ২. অনুবাদ
        console.log(`🔄 Translating title to Bengali...`);
        const translatedTitle = await translateText(cleanTitle, 'bn');

        let rawSummary = item.contentSnippet || item.content || '';
        let cleanSummary = String(rawSummary).substring(0, 500);
        
        console.log(`🔄 Translating summary to Bengali...`);
        const translatedSummary = await translateText(cleanSummary, 'bn');
        const summaryArray = [translatedSummary];

        // ৩. ডেটাবেস ইনসার্ট
        const { error: insertError } = await supabase
          .from(TABLE_NAME)
          .insert([{
            bengaliTitle: translatedTitle,
            bengaliSummaries: summaryArray,
            category: source.category,
            sourceUrl: newsUrl
          }]);

        if (insertError) {
          console.error(`[ERROR] Insert error: ${insertError.message}`);
          console.error(`Details: ${JSON.stringify(insertError)}`);
        } else {
          console.log(`✅ Successfully inserted news into Supabase!`);
        }
      }
    } catch (error) {
      console.error(`[ERROR] Error processing source ${source.name}: ${error.message}`);
    }
  }
}

if (process.argv.includes('--cleanup-only')) {
  console.log('🧹 Cleanup mode active');
} else {
  fetchAndProcessNews();
}
