import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import googleTranslate from '@vitalets/google-translate-api';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[ERROR] Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

const parser = new Parser();

// 🎯 তোর সুপাবেস টেবিলের নাম এখানে সেট করে দিলাম
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
      const items = feed.items.slice(0, 5); // প্রতি সোর্স থেকে ৫টা করে নিউজ নেবে
      
      console.log(`📦 Found ${feed.items.length} items. Processing top ${items.length}...`);

      for (let item of items) {
        let rawTitle = item.title ? (typeof item.title === 'object' ? item.title._ || item.title.text : String(item.title)) : 'No Title';
        let cleanTitle = rawTitle.substring(0, 200);
        let newsUrl = item.link || item.guid;

        console.log(`\n📝 Processing item: "${cleanTitle.substring(0, 50)}..."`);

        // ১. তোর কলাম 'sourceUrl' অনুযায়ী ডুপ্লিকেট চেক করছি
        const { data: existing, error: checkError } = await supabase
          .from(TABLE_NAME)
          .select('sourceUrl')
          .eq('sourceUrl', newsUrl)
          .maybeSingle();

        if (checkError) {
          console.error(`[ERROR] Error checking URL existence: ${checkError.message}`);
          continue; 
        }

        if (existing) {
          console.log(`⏭️ News already exists. Skipping.`);
          continue;
        }

        // ২. অনুবাদ প্রক্রিয়া
        console.log(`🔄 Translating title to Bengali...`);
        const translatedTitle = await translateText(cleanTitle, 'bn');

        let rawSummary = item.contentSnippet || item.content || '';
        let cleanSummary = String(rawSummary).substring(0, 500);
        
        console.log(`🔄 Translating summary to Bengali...`);
        const translatedSummary = await translateText(cleanSummary, 'bn');

        // 🚨 যেহেতু তোর কলামে text[] (Array) নেওয়া আছে, তাই একটা অ্যারের ভেতরে সামারিটা ঢোকাচ্ছি
        const summaryArray = [translatedSummary];

        // ৩. তোর ডাটাবেসের কলামের নাম অনুযায়ী ইনসার্ট করছি মামা
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
