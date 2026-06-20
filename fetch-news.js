// ──────────────────────────────────────────────────────────
// CONFIG - Key-gulo soho eikhane dewa ache
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
let userProfile = null;

// ──────────────────────────────────────────────────────────
// CATEGORY NAVIGATION FILTERING
// ──────────────────────────────────────────────────────────
function filterCategoryNav() {
  const allButtons = document.querySelectorAll("#categoryNav .tab-btn");
  if (!userProfile || !userProfile.categories) return;

  const allowed = ["all", ...userProfile.categories];
  
  allButtons.forEach(btn => {
    const cat = btn.dataset.category;
    if (allowed.includes(cat)) {
      btn.style.setProperty('display', 'inline-flex', 'important');
    } else {
      btn.style.setProperty('display', 'none', 'important');
    }
  });
}

// ──────────────────────────────────────────────────────────
// ONBOARDING & STORAGE
// ──────────────────────────────────────────────────────────
function loadUserProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveUserProfile(profile) {
  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
}

function hideOnboarding() {
  const overlay = document.getElementById("onboardingOverlay");
  overlay.style.display = "none";
  overlay.classList.add("hidden");
  
  if (userProfile) {
    const badge = document.getElementById("profileBadge");
    const info = document.getElementById("profileInfo");
    badge.classList.remove("hidden");
    info.textContent = `বয়স ${userProfile.age} · ${userProfile.categories.length} ক্যাটাগরি`;
  }
  filterCategoryNav();
}

function completeOnboarding() {
  const age = parseInt(document.getElementById("ageInput").value);
  const checkedCategories = [];
  document.querySelectorAll("#categoryGrid input[type='checkbox']:checked").forEach(cb => checkedCategories.push(cb.value));

  if (!age || checkedCategories.length === 0) return;

  userProfile = { age, categories: checkedCategories };
  saveUserProfile(userProfile);
  
  activeCategory = checkedCategories[0];
  hideOnboarding();
  fetchArticles(activeCategory);
  setupRealtime();
}

// ──────────────────────────────────────────────────────────
// FETCH & RENDER
// ──────────────────────────────────────────────────────────
async function fetchArticles(category) {
  const grid = document.getElementById("newsGrid");
  grid.innerHTML = "<div>Loading...</div>";

  let query = db.from("news_feed").select("*").order("created_at", { ascending: false }).limit(50);
  if (category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error || !data) { grid.innerHTML = "<div>No news found</div>"; return; }

  grid.innerHTML = data.map(article => `
    <article class="card">
      <h3>${article.bengaliTitle}</h3>
      <a href="${article.sourceUrl}" target="_blank">পড়ুন</a>
    </article>
  `).join("");
}

function setupRealtime() {
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel("newspulse_live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_feed" }, (payload) => {
      if (activeCategory === "all" || payload.new.category === activeCategory) fetchArticles(activeCategory);
    })
    .subscribe();
}

// ──────────────────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────────────────
function initializeApp() {
  userProfile = loadUserProfile();
  if (!userProfile) {
    document.getElementById("onboardingOverlay").style.display = "flex";
  } else {
    filterCategoryNav();
    fetchArticles("all");
    setupRealtime();
    hideOnboarding();
  }
}

initializeApp();
