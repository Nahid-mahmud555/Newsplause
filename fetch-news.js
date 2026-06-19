<script>
    // ──────────────────────────────────────────────────────────
    // CONFIG
    // ──────────────────────────────────────────────────────────
    const SUPABASE_URL      = "https://bysrzzwcipgeeuntfkit.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_UrM7qtGcB_vkHuoF5BlnJg_4R8WfPY2";

    const STORAGE_KEY_CATEGORY = "newspulse_preferred_category";
    const STORAGE_KEY_PROFILE  = "newspulse_user_profile";
    
    const VALID_CATEGORIES = ["all", "technology", "national", "sports", "jobs", "crime"];

    // ──────────────────────────────────────────────────────────
    // INIT SUPABASE
    // ──────────────────────────────────────────────────────────
    const { createClient } = supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ──────────────────────────────────────────────────────────
    // GLOBAL STATE
    // ──────────────────────────────────────────────────────────
    let activeCategory = "all";
    let realtimeChannel = null;
    let userProfile = null; // { age, categories: [] }

    // ──────────────────────────────────────────────────────────
    // CATEGORY NAVIGATION VISIBILITY
    // ──────────────────────────────────────────────────────────
    
    /**
     * ইউজারের প্রোফাইল অনুযায়ী নেভিগেশন বাটন ফিল্টার করে
     * সব (All) বাটন সবসময় দেখাবে + ইউজারের সিলেক্ট করা ক্যাটাগরিগুলো
     */
    function filterCategoryNav() {
      const allButtons = document.querySelectorAll("#categoryNav .tab-btn");
      
      if (!userProfile || !userProfile.categories || userProfile.categories.length === 0) {
        // যদি প্রোফাইল না থাকে, সব বাটন দেখাও
        allButtons.forEach(btn => btn.style.display = "");
        return;
      }

      const allowedCategories = ["all", ...userProfile.categories];
      
      allButtons.forEach(btn => {
        const btnCategory = btn.dataset.category;
        if (allowedCategories.includes(btnCategory)) {
          btn.style.display = ""; // দেখাও
        } else {
          btn.style.display = "none"; // হাইড করো
        }
      });
    }

    // ──────────────────────────────────────────────────────────
    // ONBOARDING LOGIC
    // ──────────────────────────────────────────────────────────
    function hasUserProfile() {
      try {
        return localStorage.getItem(STORAGE_KEY_PROFILE) !== null;
      } catch {
        return false;
      }
    }

    function loadUserProfile() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
        if (!raw) return null;
        const profile = JSON.parse(raw);
        if (profile && Array.isArray(profile.categories) && profile.age) {
          return profile;
        }
        return null;
      } catch {
        return null;
      }
    }

    function saveUserProfile(profile) {
      try {
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
        console.log("[Onboarding] Profile saved:", profile);
      } catch (error) {
        console.warn("[Onboarding] Could not save profile:", error.message);
      }
    }

    function showOnboarding() {
      document.getElementById("onboardingOverlay").classList.remove("hidden");
      goToStep(1);
    }

    function hideOnboarding() {
      const overlay = document.getElementById("onboardingOverlay");
      overlay.classList.add("hidden");
      updateProfileBadge();
      filterCategoryNav(); // নেভিগেশন ফিল্টার আপডেট
    }

    function goToStep(stepNumber) {
      // Update steps
      document.querySelectorAll(".onboarding-step").forEach(s => s.classList.remove("active"));
      document.getElementById(`step${stepNumber}`).classList.add("active");

      // Update step indicators
      document.querySelectorAll(".step-dot").forEach((dot, i) => {
        dot.classList.remove("active", "completed");
        if (i + 1 === stepNumber) dot.classList.add("active");
        if (i + 1 < stepNumber) dot.classList.add("completed");
      });

      // Hide error messages
      document.querySelectorAll(".error-message").forEach(el => el.classList.remove("show"));
    }

    function completeOnboarding() {
      const ageInput = document.getElementById("ageInput");
      const ageError = document.getElementById("ageError");
      const categoryError = document.getElementById("categoryError");
      
      // Validate age
      const age = parseInt(ageInput.value);
      if (!age || age < 10 || age > 100) {
        ageError.classList.add("show");
        ageInput.focus();
        return;
      }
      ageError.classList.remove("show");

      // Validate categories
      const checkedCategories = [];
      document.querySelectorAll("#categoryGrid input[type='checkbox']:checked").forEach(cb => {
        checkedCategories.push(cb.value);
      });

      if (checkedCategories.length === 0) {
        categoryError.classList.add("show");
        return;
      }
      categoryError.classList.remove("show");

      // Save user profile
      userProfile = {
        age: age,
        categories: checkedCategories
      };
      saveUserProfile(userProfile);

      // Set active category to the first preferred category
      const preferredCategory = userProfile.categories[0];
      activeCategory = preferredCategory;

      // Save category preference
      saveCategoryPreference(preferredCategory);

      // Update UI
      updateActiveButton(preferredCategory);
      hideOnboarding();
      filterCategoryNav(); // নেভিগেশন ফিল্টার

      // Fetch filtered news
      fetchArticles(preferredCategory);

      // Setup realtime
      setupRealtime();

      console.log("[Onboarding] Complete. Profile:", userProfile);
    }

    function updateProfileBadge() {
      const badge = document.getElementById("profileBadge");
      const avatar = document.getElementById("profileAvatar");
      const info = document.getElementById("profileInfo");

      if (userProfile) {
        badge.classList.remove("hidden");
        avatar.textContent = userProfile.age.toString().charAt(0) || "N";
        info.textContent = `বয়স ${userProfile.age} · ${userProfile.categories.length} ক্যাটাগরি`;
        
        // Re-onboard on click
        badge.onclick = () => {
          showOnboarding();
        };
      }
    }

    // Category checkbox toggle
    document.getElementById("categoryGrid").addEventListener("click", (e) => {
      const checkbox = e.target.closest(".category-checkbox");
      if (!checkbox) return;

      const input = checkbox.querySelector("input[type='checkbox']");
      input.checked = !input.checked;
      
      if (input.checked) {
        checkbox.classList.add("selected");
      } else {
        checkbox.classList.remove("selected");
      }

      // Hide category error when at least one selected
      const anyChecked = document.querySelectorAll("#categoryGrid input[type='checkbox']:checked").length > 0;
      if (anyChecked) {
        document.getElementById("categoryError").classList.remove("show");
      }
    });

    // ──────────────────────────────────────────────────────────
    // CATEGORY PREFERENCE SYSTEM
    // ──────────────────────────────────────────────────────────
    function saveCategoryPreference(category) {
      try {
        localStorage.setItem(STORAGE_KEY_CATEGORY, category);
      } catch (error) {
        console.warn("[Preference] Could not save category:", error.message);
      }
    }

    function getCategoryPreference() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CATEGORY);
        if (saved && VALID_CATEGORIES.includes(saved)) {
          return saved;
        }
      } catch (error) {
        console.warn("[Preference] Could not read category:", error.message);
      }
      return "all";
    }

    function updateCategory(category) {
      if (!VALID_CATEGORIES.includes(category)) return;
      if (category === activeCategory) return;

      activeCategory = category;
      saveCategoryPreference(category);
      updateActiveButton(category);
      setupRealtime();
      fetchArticles(category);
    }

    function updateActiveButton(category) {
      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.category === category) {
          btn.classList.add("active");
        }
      });
    }

    // ──────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────
    function timeAgo(dateStr) {
      const diff  = Date.now() - new Date(dateStr).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days  = Math.floor(hours / 24);
      if (days  > 0) return `${days} দিন আগে`;
      if (hours > 0) return `${hours} ঘণ্টা আগে`;
      if (mins  > 0) return `${mins} মিনিট আগে`;
      return "এইমাত্র";
    }

    function catClass(cat) {
      const map = {
        technology: "cat-technology",
        national:   "cat-national",
        sports:     "cat-sports",
        jobs:       "cat-jobs",
        crime:      "cat-crime",
      };
      return map[cat] || "cat-national";
    }

    function catLabel(cat) {
      const map = {
        technology: "প্রযুক্তি",
        national:   "জাতীয়",
        sports:     "খেলাধুলা",
        jobs:       "চাকরি",
        crime:      "বিশ্ব",
      };
      return map[cat] || cat;
    }

    function formatDeadline(dateStr) {
      if (!dateStr) return "";
      return new Date(dateStr).toLocaleDateString("bn-BD", {
        day: "numeric", month: "short", year: "numeric"
      });
    }

    function escapeHtml(str = "") {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // ──────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────
    function renderSkeletons(count = 6) {
      return Array.from({ length: count }).map(() => `
        <div class="skeleton-card">
          <div class="sk-row">
            <div class="skeleton sk-s"></div>
            <div class="skeleton sk-xs"></div>
          </div>
          <div class="skeleton sk-l" style="height:16px"></div>
          <div class="skeleton" style="height:14px;width:75%"></div>
          <div class="sk-bullets">
            <div class="skeleton sk-b1"></div>
            <div class="skeleton sk-b2"></div>
            <div class="skeleton sk-b3"></div>
          </div>
          <div class="skeleton" style="height:11px;width:40%"></div>
        </div>
      `).join("");
    }

    function renderCard(article, index) {
      const bullets = (article.bengaliSummaries || []).map((b) => `
        <li class="bullet-item">
          <span class="bullet-arrow">▸</span>
          <span>${escapeHtml(b)}</span>
        </li>
      `).join("");

      const deadlineHtml = (article.category === "jobs" && article.deadline)
        ? `<span class="deadline-label">শেষ: ${formatDeadline(article.deadline)}</span>`
        : `<span class="source-label">সূত্র: <span class="source-name">${escapeHtml(article.source_name || "অজানা")}</span></span>`;

      return `
        <article class="card" style="animation-delay:${index * 55}ms" role="article">
          <div class="card-meta">
            <span class="cat-badge ${catClass(article.category)}">${catLabel(article.category)}</span>
            <time class="time-ago">${timeAgo(article.created_at)}</time>
          </div>
          <h2 class="card-title">${escapeHtml(article.bengaliTitle)}</h2>
          <ul class="bullet-list">${bullets}</ul>
          <div class="card-footer">
            ${deadlineHtml}
            <a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer"
               class="read-link" aria-label="মূল সংবাদ পড়ুন">পড়ুন →</a>
          </div>
        </article>
      `;
    }

    function renderEmpty(category) {
      const msg = category === "all"
        ? "পাইপলাইন শীঘ্রই সংবাদ আনবে"
        : "এই বিভাগে এখন কোনো সংবাদ নেই";
      return `
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <p class="empty-title">কোনো সংবাদ নেই</p>
          <p class="empty-sub">${msg}</p>
        </div>
      `;
    }

    // ──────────────────────────────────────────────────────────
    // FETCH ARTICLES WITH CATEGORY FILTERING
    // ──────────────────────────────────────────────────────────
    async function fetchArticles(category) {
      const grid  = document.getElementById("newsGrid");
      const count = document.getElementById("resultCount");

      grid.innerHTML = renderSkeletons(6);
      count.textContent = "";

      try {
        let query = db
          .from("news_feed")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(50);

        if (category !== "all") {
          query = query.eq("category", category);
        }

        const { data, error, count: total } = await query;

        if (error) {
          console.error("Supabase error:", error.message);
          grid.innerHTML = renderEmpty(category);
          count.textContent = "ডেটা লোড করতে সমস্যা হয়েছে";
          return;
        }

        if (category === "all") {
          count.textContent = `${total || 0} টি সংবাদ পাওয়া গেছে (সকল বিভাগ)`;
        } else {
          count.textContent = `${total || 0} টি সংবাদ পাওয়া গেছে (${catLabel(category)} বিভাগ)`;
        }

        if (!data || data.length === 0) {
          grid.innerHTML = renderEmpty(category);
          return;
        }

        let filteredData = data;
        if (category !== "all") {
          filteredData = data.filter(article => article.category === category);
        }

        grid.innerHTML = filteredData.map((article, i) => renderCard(article, i)).join("");
      } catch (err) {
        console.error("[Fetch] Unexpected error:", err);
        grid.innerHTML = renderEmpty(category);
        count.textContent = "ডেটা লোড করতে সমস্যা হয়েছে";
      }
    }

    // ──────────────────────────────────────────────────────────
    // REALTIME SUBSCRIPTION
    // ──────────────────────────────────────────────────────────
    function setupRealtime() {
      if (realtimeChannel) {
        db.removeChannel(realtimeChannel);
      }

      realtimeChannel = db.channel("newspulse_live")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "news_feed",
        }, (payload) => {
          if (activeCategory === "all" || payload.new.category === activeCategory) {
            fetchArticles(activeCategory);
          }
        })
        .subscribe();
    }

    // ──────────────────────────────────────────────────────────
    // INITIALIZATION
    // ──────────────────────────────────────────────────────────
    function initializeApp() {
      // Load user profile
      userProfile = loadUserProfile();

      if (!userProfile) {
        // First-time user: show onboarding
        showOnboarding();
        updateActiveButton("all");
      } else {
        // Returning user: load preferences
        filterCategoryNav(); // আগে নেভিগেশন ফিল্টার করো
        
        const savedCategory = getCategoryPreference();
        activeCategory = savedCategory;
        updateActiveButton(savedCategory);
        fetchArticles(savedCategory);
        setupRealtime();
        updateProfileBadge();
        hideOnboarding();
      }

      console.log("[NewsPulse] Initialized. Profile:", userProfile);
    }

    // ──────────────────────────────────────────────────────────
    // CATEGORY TABS EVENT LISTENER
    // ──────────────────────────────────────────────────────────
    document.getElementById("categoryNav").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      updateCategory(btn.dataset.category);
    });

    // ──────────────────────────────────────────────────────────
    // BOOT
    // ──────────────────────────────────────────────────────────
    initializeApp();
  </script>
