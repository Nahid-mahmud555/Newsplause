// ============================================
// email-service.js — Gmail SMTP Email Sender
// ============================================

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;

if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error('❌ GMAIL_USER or GMAIL_APP_PASS not set!');
}

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASS
    }
});

// Verify connection
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Gmail connection failed:', error.message);
    } else {
        console.log('✅ Gmail SMTP ready to send emails');
    }
});

/**
 * Send a single email
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} html - email body (HTML)
 * @returns {boolean} success
 */
export async function sendEmail(to, subject, html) {
    try {
        const info = await transporter.sendMail({
            from: `"NewsPulse" <${GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        
        console.log(`✅ Email sent: ${info.messageId} → ${to}`);
        return true;
    } catch(e) {
        console.error(`❌ Email failed to ${to}:`, e.message);
        return false;
    }
}

/**
 * Send daily digest to all subscribers
 * @param {Array} newsData - array of news articles
 * @param {Array} subscribers - array of subscriber emails
 */
export async function sendDailyDigest(newsData, subscribers) {
    if (!newsData?.length || !subscribers?.length) {
        console.log('⚠️ No news or subscribers for digest');
        return;
    }

    console.log(`📧 Preparing digest: ${newsData.length} articles → ${subscribers.length} subscribers`);

    // Build email HTML
    const newsHtml = newsData.slice(0, 10).map((n, i) => `
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
            <span style="font-size:12px;color:#64748b;">
                ${n.category === 'jobs' ? '💼' : n.category === 'technology' ? '💻' : n.category === 'sports' ? '⚽' : '📰'} 
                ${n.source_name || 'NewsPulse'}
            </span>
            <h3 style="margin:8px 0;color:#1e293b;font-size:16px;">${n.bengaliTitle || 'No Title'}</h3>
            <ul style="padding-left:20px;color:#475569;font-size:14px;">
                ${(n.bengaliSummaries || []).slice(0, 3).map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('')}
            </ul>
            <a href="${n.sourceUrl || '#'}" 
               style="display:inline-block;margin-top:8px;padding:8px 16px;background:#6366f1;color:#fff;text-decoration:none;border-radius:20px;font-size:13px;">
               বিস্তারিত পড়ুন →
            </a>
        </div>
    `).join('');

    const dateStr = new Date().toLocaleDateString('bn-BD', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const html = `
        <div style="max-width:600px;margin:0 auto;font-family:'Noto Sans Bengali',Arial,sans-serif;">
            <!-- Header -->
            <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px 12px 0 0;">
                <h1 style="margin:0;font-size:24px;">📰 NewsPulse</h1>
                <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${dateStr} — আজকের সংবাদ</p>
            </div>
            
            <!-- News Content -->
            <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-top:none;">
                ${newsHtml}
            </div>
            
            <!-- Footer -->
            <div style="text-align:center;padding:16px;background:#f1f5f9;border-radius:0 0 12px 12px;font-size:12px;color:#94a3b8;">
                <p>আপনি NewsPulse সাবস্ক্রাইবার হিসেবে এই ইমেইল পাচ্ছেন।</p>
                <p>© ${new Date().getFullYear()} NewsPulse · প্রতিদিন সকাল ৮টায়</p>
            </div>
        </div>
    `;

    // Send to each subscriber
    let sentCount = 0;
    for (const sub of subscribers) {
        const email = sub.email;
        if (!email || email.startsWith('tg_')) continue; // Skip telegram-only users
        
        const success = await sendEmail(email, `📰 NewsPulse — আজকের সংবাদ (${dateStr})`, html);
        if (success) sentCount++;
        
        // Rate limit: 500ms gap between emails (Gmail free limit: ~100/day)
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`✅ Digest sent: ${sentCount}/${subscribers.length} subscribers`);
}
