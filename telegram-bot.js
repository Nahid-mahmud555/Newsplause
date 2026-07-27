import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const firstName = ctx.from.first_name || 'বন্ধু';
    
    const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .single();

    if (!existing) {
        await supabase.from('subscribers').insert({
            telegram_chat_id: chatId,
            email: 'tg_' + chatId + '@telegram.user'
        });
    }

    ctx.reply('🎉 স্বাগতম ' + firstName + '!\n\n✅ আপনি সফলভাবে NewsPulse সাবস্ক্রাইব করেছেন!\n\n📰 প্রতিদিন সকালে সর্বশেষ সংবাদ পাবেন।\n💼 নতুন চাকরির নোটিফিকেশন পাবেন।');
});

bot.command('stop', async (ctx) => {
    await supabase.from('subscribers').delete().eq('telegram_chat_id', ctx.chat.id.toString());
    ctx.reply('❌ আনসাবস্ক্রাইব সম্পন্ন। /start দিয়ে আবার যুক্ত হন।');
});

bot.help((ctx) => ctx.reply('/start - সাবস্ক্রাইব\n/stop - আনসাবস্ক্রাইব\n/help - হেল্প'));

bot.launch().then(() => console.log('🤖 Telegram Bot running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
