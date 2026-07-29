# NewsPulse 🚀

*Automated Real-Time News Intelligence Engine*

> *"In a world overflowing with endless digital noise and feeds, your time is your most expensive currency. NewsPulse wasn’t build in a corporate boardroom to chase revenue—it was born from a simple desire to give people their precious time back."*

🌐 **Live Web Application:** https://newsplause.vercel.app/

---

## 💡 The Story Behind the Project

How many news portals do you check every morning? How many times a day do you waste scrolling through endless feeds just to stay updated?

Nobody gave me this blueprint, and I didn't copy it from anywhere. I simply got tired of a daily personal frustration and decided to engineer my own solution from scratch. That is how **NewsPulse (v1.0)** was born.

Previously, users had to manually visit the web application to stay informed. With this first major automated release, that friction is completely gone.

**NewsPulse** is a fully automated, real-time news intelligence engine. It quietly works in the background—collecting live articles from trusted Bangladeshi news sources, filtering duplicate content, processing and organizing the data, and instantly delivering clean, structured news directly to your Telegram inbox.

No clickbait.

No unnecessary clutter.

No endless scrolling.

Just the information that matters.

---

## 🧠 Why Open Source & Free?

I don't claim to be an expert. I'm simply a Computer Science student who loves learning and continuously building projects in **Data Engineering, Artificial Intelligence, and DevOps**.

I strongly believe that solving real-world problems doesn't require a fancy title or a massive company—it only requires curiosity, consistency, and a genuine intention to help people.

That's why **NewsPulse is completely Free and Open Source.**

If this project...

- helps another student understand automated data pipelines,
- saves a developer valuable time,
- helps a busy professional stay informed effortlessly,
- or inspires someone to build something even better...

then this project has already achieved its purpose.

Money isn't everything.

Although server infrastructure and paid APIs may become necessary in the future, until then this project will remain open for everyone.

---

## ⚙️ Technical Architecture

- **Automated Scraping:** Collects live news from verified RSS feeds and custom web scrapers.
- **Smart Database (Supabase):** Stores and manages structured articles in real time.
- **Telegram Broadcasting:** Instantly pushes formatted news updates to Telegram users.
- **GitHub Actions Automation:** Executes scheduled cron jobs and manual workflows, allowing the entire pipeline to operate even when your computer is offline.

---

## 🔄 Processing Pipeline

```text
Collect News
      │
      ▼
RSS Parsing / Web Scraping
      │
      ▼
Content Cleaning
      │
      ▼
Metadata Extraction
      │
      ▼
Language Translation
      │
      ▼
Duplicate Detection
      │
      ▼
Database Storage
      │
      ▼
Telegram Notification
```

---

## 📱 How to Use It (Step-by-Step Guide)

Because the entire system runs automatically, you don't need to constantly visit the web application.

### **1. Visit the Web Application (Optional)**

Visit:

> https://newsplause.vercel.app/

- Browse available news categories.
- Subscribe using your email to receive important announcements and future newsletters.

---

### **2. Start the Telegram Bot**

Open Telegram and search for:

```text
@newsplause_bot
```

or simply visit:

> https://t.me/newsplause_bot

Then click **Start** or send:

```text
/start
```

---


### 📸 Proof of Work (Telegram Automation Live Demo)

Here is the proof of work showing the automated real-time news updates being successfully delivered to Telegram over 3 consecutive days:

* **Day 01:** Successfully tested and verified the automated news scraping and broadcasting pipeline.
  ![Day 01 Proof](./Day_01.png)

* **Day 02:** Continuous background execution delivering filtered and clean news updates seamlessly.
  ![Day 02 Proof](./Day_02.png)

* **Day 03:** Stable automated performance running smoothly without any manual intervention.
  ![Day 03 Proof](./Day_03.png)



### **3. Important**

Once you've started the bot, you never need to open the website again.

The automation pipeline handles everything behind the scenes and delivers breaking news directly to your Telegram.

---

### **4. Enjoy 🚀**

Sit back and let NewsPulse keep you updated automatically.

---

## 🛠️ Installation (For Developers)

Clone the repository:

```bash
git clone https://github.com/nahid-mahmud555/news-pulse.git
```

Move into the project directory:

```bash
cd news-pulse
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Run the application:

```bash
node index.js
```

---

## 🌱 Join the Journey

This is only **Version 1.0**.

The roadmap ahead includes:

- 🤖 AI-powered News Summaries
- 🌍 Browser Extension
- 📱 Better User Experience
- ⚙️ Advanced Data Engineering Pipelines
- 📊 Smarter News Processing

If this project resonates with you:

- ⭐ Star the repository
- 🍴 Fork it
- 🚀 Submit a Pull Request
- 💡 Share your ideas

Every contribution is appreciated.

---

## 📜 License

This project is licensed under the **MIT License**.

You are free to use, modify, distribute, and contribute in accordance with the license.

---

## 👨‍💻 Author

**Nahid Mahmud**

*Computer Science & Engineering Student*

**Varendra University**

**GitHub:** https://github.com/nahid-mahmud555

---

<div align="center">

### Built with ❤️ using Node.js, Supabase & Telegram Bot API

### Empowering Automated News Intelligence Through Open Source.

⭐ **If this repository added value to your workflow, please consider giving it a Star. It truly helps support future development.**

</div>
