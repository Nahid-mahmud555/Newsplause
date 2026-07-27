# 📰 NewsPulse

<div align="center">

<h1>NewsPulse</h1>

<h3>Intelligent Multi-Source News Aggregation, Processing & Real-Time Broadcasting Platform</h3>

<p>
A modern, automated news intelligence system that continuously collects, processes, translates, categorizes, stores, and distributes breaking news from trusted sources with minimal latency.
</p>

<p>

<img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>

<img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>

<img src="https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white"/>

<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>

</p>

<p>

<img src="https://img.shields.io/github/stars/nahid-mahmud555/news-pulse?style=social"/>
<img src="https://img.shields.io/github/forks/nahid-mahmud555/news-pulse?style=social"/>
<img src="https://img.shields.io/github/watchers/nahid-mahmud555/news-pulse?style=social"/>

</p>

</div>

---

## Abstract

**NewsPulse** is an intelligent news aggregation and distribution platform engineered to automate the complete news delivery pipeline—from data acquisition to end-user notification.

The system continuously monitors multiple trusted national and international news providers, extracts the latest articles through RSS feeds and direct web scraping techniques, performs automated language translation, cleans and normalizes content, detects duplicate publications, securely stores structured data in **Supabase PostgreSQL**, and instantly broadcasts categorized breaking news through the **Telegram Bot API**.

Designed with scalability, reliability, and maintainability in mind, NewsPulse minimizes manual intervention while ensuring low-latency delivery of high-quality news updates. The architecture follows a modular design that allows effortless integration of additional news providers, storage backends, and notification channels.

Whether deployed as a personal news assistant, an organizational information service, or the backbone of a larger media platform, NewsPulse provides an efficient, extensible, and production-ready solution for automated news intelligence.

---

# ✨ Highlights

* 🌍 Aggregates news from multiple trusted publishers
* ⚡ Near real-time news collection and processing
* 📰 RSS feed ingestion with automatic fallback web scraping
* 🤖 Intelligent article parsing and metadata extraction
* 🇧🇩 Automatic English → Bengali translation
* 🧹 HTML sanitization and content normalization
* 🚫 Duplicate article detection
* 🗄 Structured storage using Supabase PostgreSQL
* 📡 Instant Telegram broadcasting
* 📂 Automatic category organization
* 🔄 Continuous automated execution
* 🛡 Robust error handling and retry mechanism
* 📈 Lightweight, scalable, and production-ready architecture

---

# 🏗 System Architecture

```text
                   ┌─────────────────────────┐
                   │   RSS Feeds / Websites  │
                   └─────────────┬───────────┘
                                 │
                                 ▼
                     Fetch Latest Articles
                                 │
                                 ▼
                  Parse & Extract Structured Data
                                 │
                                 ▼
                    Clean • Normalize • Validate
                                 │
                                 ▼
                    Translate English → Bengali
                                 │
                                 ▼
                     Duplicate Detection Engine
                                 │
                                 ▼
                     Store in Supabase Database
                                 │
                                 ▼
                   Telegram Broadcasting Service
                                 │
                                 ▼
                          End Users
```

---

# ⚙ Core Features

## Intelligent News Aggregation

NewsPulse continuously monitors multiple trusted news providers and automatically collects newly published articles with minimal delay.

---

## Multi-Source Collection

Supports RSS feeds together with intelligent HTML parsing, ensuring uninterrupted data collection even when RSS endpoints become unavailable.

---

## Smart Translation

Automatically translates English headlines, summaries, and article metadata into Bengali while preserving contextual accuracy.

---

## Content Processing

Every article undergoes cleaning, normalization, metadata extraction, and formatting before entering the database.

---

## Duplicate Detection

Implements database-level duplicate prevention to eliminate repeated publications and maintain data integrity.

---

## Secure Data Storage

Stores structured news articles using Supabase PostgreSQL with efficient indexing for fast querying and retrieval.

---

## Telegram Broadcasting

Automatically delivers categorized breaking news directly to Telegram channels, groups, or private chats.

---

## Modular Design

The project architecture is modular, making it easy to integrate new data sources, translation engines, databases, or notification services.

---

# 🛠 Technology Stack

| Layer        | Technology                     |
| ------------ | ------------------------------ |
| Runtime      | Node.js                        |
| Language     | JavaScript (ES6+)              |
| Database     | PostgreSQL                     |
| Backend      | Supabase                       |
| RSS Parser   | rss-parser                     |
| Translation  | @vitalets/google-translate-api |
| Notification | Telegram Bot API               |
| Deployment   | Linux / VPS / Docker Ready     |

---

# 📂 Project Structure

```text
news-pulse/

├── index.js
├── package.json
├── package-lock.json
├── README.md
├── .env

├── services/
│   ├── rssService.js
│   ├── scraper.js
│   ├── translator.js
│   └── telegram.js
│
├── database/
│   └── supabase.js
│
├── utils/
│   ├── parser.js
│   ├── cleaner.js
│   └── validator.js
│
└── logs/
```

---

# 🚀 Installation

Clone the repository.

```bash
git clone https://github.com/nahid-mahmud555/news-pulse.git
```

Move into the project directory.

```bash
cd news-pulse
```

Install dependencies.

```bash
npm install
```

Create an environment configuration.

```env
SUPABASE_URL=your_supabase_project_url

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

TELEGRAM_BOT_TOKEN=your_bot_token

TELEGRAM_CHAT_ID=your_chat_id
```

Run the application.

```bash
node index.js
```

---

# 📊 Processing Pipeline

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

# 📌 Requirements

* Node.js v18 or newer
* Supabase Project
* Telegram Bot
* Internet Connection

---

# 🎯 Future Roadmap

* AI-powered article summarization
* Named Entity Recognition (NER)
* Sentiment Analysis
* News recommendation engine
* Keyword-based subscriptions
* Email notifications
* REST API
* GraphQL API
* Web Dashboard
* Analytics Panel
* Docker deployment
* Kubernetes support
* Multi-language translation
* AI-generated news insights

---

# 🤝 Contributing

Contributions are always welcome.

If you discover a bug, have an idea for a new feature, or would like to improve the project, feel free to fork the repository, create a new branch, and submit a Pull Request.

Every contribution—whether it's code, documentation, testing, or feedback—helps improve NewsPulse for the community.

---

# ⭐ Support the Project

If you found **NewsPulse** useful, informative, or inspiring, consider giving this repository a **⭐ Star**.

Your support helps increase the project's visibility, encourages continued development, and motivates future open-source contributions.

Every ⭐ is sincerely appreciated.

---

# 📄 License

This project is distributed under the **MIT License**.

You are free to use, modify, and distribute the software in accordance with the terms of the license.

---

# 👨‍💻 Author

## Nahid Mahmud

**Computer Science & Engineering Student**
**Varendra University**

GitHub: **https://github.com/nahid-mahmud555**

---

<div align="center">

## Built with ❤️ using Node.js, Supabase & Telegram API

### Empowering Automated News Intelligence Through Open Source.

### ⭐ Thank you for visiting the repository.

**If this project added value to your work, please consider leaving a Star. It truly helps the project grow.**

</div>
