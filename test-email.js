// ============================================
// test-email.js — Quick email test
// Run: node test-email.js
// ============================================

import { sendEmail } from './email-service.js';
import dotenv from 'dotenv';
dotenv.config();

const testEmail = process.env.GMAIL_USER; // নিজের ইমেইলে টেস্ট করবি

console.log('📧 Sending test email to:', testEmail);

const result = await sendEmail(
    testEmail,
    '🧪 NewsPulse — Test Email',
    `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <h1 style="color:#6366f1;">✅ NewsPulse Email Test</h1>
        <p>আপনার Gmail SMTP সঠিকভাবে কনফিগার করা হয়েছে!</p>
        <p>এখন থেকে প্রতিদিন সকালে সংবাদ ডাইজেস্ট পাবেন।</p>
        <hr>
        <p style="color:#94a3b8;font-size:12px;">Sent at: ${new Date().toLocaleString('bn-BD')}</p>
    </div>
    `
);

if (result) {
    console.log('✅ Test email sent! Check your inbox.');
} else {
    console.log('❌ Test failed. Check GMAIL_USER and GMAIL_APP_PASS.');
}

process.exit(0);
