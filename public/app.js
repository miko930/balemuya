// 🔧 FikirFix Admin Dashboard Core Application Logic

let currentTab = "overview";
let allJobs = [];
let allWorkers = [];
let selectedJobId = null;

// Amharic category labels mapping
const CATEGORY_MAP = {
  "plumber": "🔧 ፕሎምቢንግ",
  "electrician": "⚡ ኤሌክትሪሻን",
  "painter": "🎨 ቀለም ቀቢ",
  "carpenter": "🪚 አናጢ",
  "ac": "❄️ ኤ/ሲ ጥገና",
  "handyman": "🔩 አጠቃላይ ጥገና"
};

// Urgency labels mapping
const URGENCY_MAP = {
  "asap": "🔴 አሁኑኑ (< 2 ሰዓት)",
  "today": "🟡 ዛሬ",
  "scheduled": "🟢 ቀን ይምረጡ"
};

// Status labels mapping
const STATUS_LABELS = {
  PENDING: "⏳ ባለሙያ እየተፈለገ",
  ASSIGNED: "🏃 ባለሙያ በመምጣት ላይ",
  IN_PROGRESS: "🔧 ሥራ ላይ",
  COMPLETED: "✅ ተጠናቀቀ",
  CANCELLED: "❌ ተሰርዟል",
  DISPUTED: "⚠️ ቅሬታ ቀርቧል"
};

// On Page Load
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupEventListeners();
  loadDashboardData();
});

// Setup navigation events
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update sidebar buttons
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  });

  // Update panels display
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `panel-${tabName}`);
  });

  // Update page title
  const titles = {
    overview: "Dashboard Overview",
    jobs: "Bookings Management",
    workers: "Workers Directory"
  };
  const subtitles = {
    overview: "Real-time statistics & bookings tracking for Addis Ababa",
    jobs: "Filter, search and update active job orders",
    workers: "Manage registered handymen, availability, and verification status"
  };
  
  document.getElementById("page-title").innerText = titles[tabName];
  document.getElementById("page-subtitle").innerText = subtitles[tabName];

  // Specific tab loading logic
  if (tabName === "overview") {
    loadDashboardData();
  } else if (tabName === "jobs") {
    loadJobsData();
  } else if (tabName === "workers") {
    loadWorkersData();
  }
}

// Setup action listeners
function setupEventListeners() {
  // Sync button
  document.getElementById("refresh-btn").addEventListener("click", () => {
    const icon = document.querySelector(".btn-icon");
    icon.classList.add("active");
    
    Promise.all([
      loadDashboardData(),
      currentTab === "jobs" ? loadJobsData() : Promise.resolve(),
      currentTab === "workers" ? loadWorkersData() : Promise.resolve()
    ]).finally(() => {
      setTimeout(() => icon.classList.remove("active"), 600);
    });
  });

  // Filters buttons on Bookings panel
  document.querySelectorAll(".btn-filter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const status = btn.getAttribute("data-status");
      loadJobsData(status);
    });
  });

  // Modal Save Changes
  document.getElementById("save-job-btn").addEventListener("click", saveJobChanges);

  // Activate worker form submit
  document.getElementById("activate-worker-form").addEventListener("submit", handleActivateWorkerSubmit);
}

// Global Loaders
async function loadDashboardData() {
  try {
    // Stats
    const statsRes = await fetch("/api/stats");
    const stats = await statsRes.json();
    
    document.getElementById("stat-total-jobs").innerText = stats.totalJobs;
    document.getElementById("stat-active-jobs").innerText = stats.activeJobs;
    document.getElementById("stat-revenue").innerText = `${stats.totalRevenue.toLocaleString()} ETB`;
    document.getElementById("stat-rating").innerText = `${stats.avgRating} / 5.0`;

    // Disputes
    const disputesRes = await fetch("/api/jobs?status=DISPUTED");
    const disputes = await disputesRes.json();
    document.getElementById("dispute-count").innerText = `${disputes.length} unresolved`;
    
    const disputesBody = document.getElementById("disputes-table-body");
    disputesBody.innerHTML = "";
    
    if (disputes.length === 0) {
      disputesBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No active disputes found. Good job!</td></tr>`;
    } else {
      disputes.forEach(job => {
        disputesBody.appendChild(createDisputeRow(job));
      });
    }

    // Recent Jobs
    const recentRes = await fetch("/api/jobs");
    const allRecent = await recentRes.json();
    const recent = allRecent.slice(0, 5); // top 5
    
    const recentBody = document.getElementById("recent-jobs-table-body");
    recentBody.innerHTML = "";
    
    if (recent.length === 0) {
      recentBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No bookings found in DB.</td></tr>`;
    } else {
      recent.forEach(job => {
        recentBody.appendChild(createRecentJobRow(job));
      });
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

async function loadJobsData(statusFilter = "") {
  try {
    const url = statusFilter ? `/api/jobs?status=${statusFilter}` : "/api/jobs";
    const res = await fetch(url);
    allJobs = await res.json();
    
    const body = document.getElementById("all-jobs-table-body");
    body.innerHTML = "";
    
    if (allJobs.length === 0) {
      body.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No bookings found with this filter.</td></tr>`;
    } else {
      allJobs.forEach(job => {
        body.appendChild(createJobRow(job));
      });
    }
  } catch (error) {
    console.error("Error loading jobs:", error);
  }
}

async function loadWorkersData() {
  try {
    const res = await fetch("/api/workers");
    allWorkers = await res.json();

    // Split into pending (unverified) and active (verified) workers
    const pending = allWorkers.filter(w => !w.isVerified);
    const active = allWorkers.filter(w => w.isVerified);

    // ── Render pending workers table ──
    const pendingBody = document.getElementById("pending-workers-body");
    const pendingCount = document.getElementById("pending-count");
    pendingCount.innerText = `${pending.length} pending`;
    pendingBody.innerHTML = "";

    if (pending.length === 0) {
      pendingBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No pending workers. Tell workers to message /start on the worker bot.</td></tr>`;
    } else {
      pending.forEach(worker => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>#${worker.id}</strong></td>
          <td>${worker.firstName}</td>
          <td><code style="background:rgba(139,92,246,0.15); padding:2px 8px; border-radius:6px; font-size:13px;">${worker.telegramId}</code></td>
          <td>${new Date(worker.createdAt).toLocaleString()}</td>
          <td>
            <button class="btn btn-primary py-1 px-3" onclick="openActivateWorkerModal(${worker.id}, '${worker.firstName.replace(/'/g, "\\'")}', '${worker.telegramId}')">
              ✅ Activate
            </button>
          </td>
        `;
        pendingBody.appendChild(tr);
      });
    }

    // ── Render active workers grid ──
    const grid = document.getElementById("workers-list-grid");
    grid.innerHTML = "";

    if (active.length === 0) {
      grid.innerHTML = `<div class="text-center py-4 text-muted full-width">No active workers yet. Activate pending workers above!</div>`;
    } else {
      active.forEach(worker => {
        grid.appendChild(createWorkerCard(worker));
      });
    }
  } catch (error) {
    console.error("Error loading workers:", error);
  }
}

// DOM Creators
function createDisputeRow(job) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><strong>#${job.id}</strong></td>
    <td>${CATEGORY_MAP[job.category] || job.category}</td>
    <td>
      <div class="user-cell">
        <span>${job.customer.firstName}</span>
        <small class="text-muted">${job.customer.phone || "—"}</small>
      </div>
    </td>
    <td>
      <div class="user-cell">
        <span>${job.worker ? job.worker.firstName : "Not assigned"}</span>
        <small class="text-muted">${job.worker ? job.worker.phone : "—"}</small>
      </div>
    </td>
    <td>${job.address}</td>
    <td>${new Date(job.createdAt).toLocaleString()}</td>
    <td>${job.finalPrice ? job.finalPrice + " ETB" : "—"}</td>
    <td>
      <button class="btn btn-secondary py-1 px-3" onclick="openJobModal(${job.id})">Inspect</button>
    </td>
  `;
  return tr;
}

function createRecentJobRow(job) {
  const tr = document.createElement("tr");
  const price = job.finalPrice ? `${job.finalPrice} ETB` : (job.quotedPrice || "—");
  tr.innerHTML = `
    <td><strong>#${job.id}</strong></td>
    <td>${CATEGORY_MAP[job.category] || job.category}</td>
    <td>${job.customer.firstName}</td>
    <td>${job.subCity || "—"}</td>
    <td><span class="urgency-dot ${job.urgency}"></span> ${URGENCY_MAP[job.urgency] || job.urgency}</td>
    <td><span class="badge badge-${job.status.toLowerCase().replace('_', '-')}">${STATUS_LABELS[job.status] || job.status}</span></td>
    <td>${new Date(job.createdAt).toLocaleDateString()}</td>
    <td>${price}</td>
  `;
  tr.style.cursor = "pointer";
  tr.addEventListener("click", () => openJobModal(job.id));
  return tr;
}

function createJobRow(job) {
  const tr = document.createElement("tr");
  const finalPrice = job.finalPrice ? `${job.finalPrice} ETB` : "—";
  tr.innerHTML = `
    <td><strong>#${job.id}</strong></td>
    <td>${CATEGORY_MAP[job.category] || job.category}</td>
    <td>
      <div class="user-cell">
        <span>${job.customer.firstName}</span>
        <small class="text-muted">${job.customer.phone || "—"}</small>
      </div>
    </td>
    <td>
      <div class="user-cell">
        <span>${job.worker ? job.worker.firstName : "Not assigned"}</span>
        <small class="text-muted">${job.worker ? job.worker.phone : "—"}</small>
      </div>
    </td>
    <td>${job.subCity || "—"}</td>
    <td>${URGENCY_MAP[job.urgency] || job.urgency}</td>
    <td>${job.quotedPrice || "—"}</td>
    <td>${finalPrice}</td>
    <td><span class="badge badge-${job.status.toLowerCase().replace('_', '-')}">${STATUS_LABELS[job.status] || job.status}</span></td>
    <td>
      <button class="btn btn-secondary py-1 px-3" onclick="openJobModal(${job.id})">Edit</button>
    </td>
  `;
  return tr;
}

function createWorkerCard(worker) {
  const card = document.createElement("div");
  card.className = "worker-card glass";
  
  // Convert categories to display tags
  const tagsHtml = worker.category.map(cat => `<span class="worker-tag">${CATEGORY_MAP[cat] || cat}</span>`).join(" ");

  card.innerHTML = `
    <div class="worker-header">
      <div class="worker-profile-info">
        <div class="worker-avatar-bubble">${worker.firstName.slice(0,1)}</div>
        <div class="worker-meta">
          <h3>${worker.firstName}</h3>
          <span>📍 Subcity: ${worker.subCity || "—"}</span>
        </div>
      </div>
      <span class="badge badge-${worker.isVerified ? 'completed' : 'cancelled'}">${worker.isVerified ? 'Trusted' : 'Suspended'}</span>
    </div>
    <div class="worker-body">
      <div class="worker-body-row">
        <span>Phone Number:</span>
        <span>${worker.phone || "—"}</span>
      </div>
      <div class="worker-body-row">
        <span>Jobs Completed:</span>
        <span>${worker.jobsCompleted}</span>
      </div>
      <div class="worker-body-row">
        <span>Average Rating:</span>
        <span class="worker-rating-stars">⭐ ${worker.rating.toFixed(1)} / 5.0</span>
      </div>
      <div class="worker-body-row" style="flex-direction: column; gap: 6px; margin-top: 6px;">
        <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted);">Specialties:</span>
        <div class="worker-tags">${tagsHtml}</div>
      </div>
    </div>
    <div class="worker-footer">
      <span class="toggle-label">Accepting Jobs</span>
      <label class="switch">
        <input type="checkbox" id="avail-switch-${worker.id}" ${worker.isAvailable ? 'checked' : ''} onchange="toggleWorkerAvailability(${worker.id}, this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  `;
  return card;
}

// Modal Controllers
async function openJobModal(jobId) {
  try {
    selectedJobId = jobId;
    const res = await fetch(`/api/jobs`);
    const jobs = await res.json();
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) return;

    // Fetch latest workers to ensure we have up-to-date availability/specialty
    const workersRes = await fetch("/api/workers");
    allWorkers = await workersRes.json();

    document.getElementById("modal-job-id").innerText = job.id;
    document.getElementById("modal-job-category").innerText = CATEGORY_MAP[job.category] || job.category;
    document.getElementById("modal-job-urgency").innerText = URGENCY_MAP[job.urgency] || job.urgency;
    document.getElementById("modal-job-date").innerText = new Date(job.createdAt).toLocaleString();
    
    // Status Badge
    const statusBadge = document.getElementById("modal-job-status");
    statusBadge.innerText = STATUS_LABELS[job.status] || job.status;
    statusBadge.className = `badge badge-${job.status.toLowerCase().replace('_', '-')}`;

    // Customer
    document.getElementById("modal-client-name").innerText = job.customer.firstName;
    document.getElementById("modal-client-phone").innerText = job.customer.phone || "—";
    document.getElementById("modal-job-address").innerText = job.address;

    // Worker
    document.getElementById("modal-worker-name").innerText = job.worker ? job.worker.firstName : "Not assigned";
    document.getElementById("modal-worker-phone").innerText = job.worker ? job.worker.phone : "—";
    document.getElementById("modal-worker-subcity").innerText = job.worker ? job.worker.subCity : "—";

    // Description
    document.getElementById("modal-job-description").innerText = job.description;

    // Admin fields
    document.getElementById("control-status").value = job.status;
    document.getElementById("control-price").value = job.finalPrice || "";

    // Populate workers dropdown
    const workerSelect = document.getElementById("control-worker");
    workerSelect.innerHTML = `<option value="">-- No Worker --</option>`;

    // Filter workers by category and verification status
    const matchingWorkers = allWorkers.filter(w => w.isVerified && w.category.includes(job.category));
    matchingWorkers.forEach(w => {
      const option = document.createElement("option");
      option.value = w.id;
      option.innerText = `${w.firstName} (📞 ${w.phone || "No phone"})`;
      workerSelect.appendChild(option);
    });

    workerSelect.value = job.workerId || "";

    // Show Overlay
    document.getElementById("job-modal").classList.add("active");
  } catch (error) {
    console.error("Failed to open job modal details:", error);
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
  selectedJobId = null;
}

// API Mutations
async function saveJobChanges() {
  if (!selectedJobId) return;

  const status = document.getElementById("control-status").value;
  const finalPriceVal = document.getElementById("control-price").value;
  const finalPrice = finalPriceVal !== "" ? parseInt(finalPriceVal, 10) : null;
  const workerVal = document.getElementById("control-worker").value;
  const workerId = workerVal !== "" ? parseInt(workerVal, 10) : null;

  try {
    const res = await fetch(`/api/jobs?id=${selectedJobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, finalPrice, workerId })
    });

    if (res.ok) {
      closeModal("job-modal");
      // Refresh active view
      if (currentTab === "overview") {
        loadDashboardData();
      } else {
        loadJobsData();
      }
    } else {
      alert("Failed to save changes. Please try again.");
    }
  } catch (error) {
    console.error("Error saving job details:", error);
  }
}

async function toggleWorkerAvailability(workerId, isAvailable) {
  try {
    const res = await fetch(`/api/workers?id=${workerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable })
    });
    
    if (!res.ok) {
      alert("Failed to update availability status.");
      // Revert switch visually
      document.getElementById(`avail-switch-${workerId}`).checked = !isAvailable;
    }
  } catch (error) {
    console.error("Error toggling worker availability:", error);
  }
}

function openActivateWorkerModal(workerId, workerName, telegramId) {
  document.getElementById("activate-error-msg").style.display = "none";
  document.getElementById("activate-worker-form").reset();
  document.getElementById("activate-worker-id").value = workerId;
  document.getElementById("activate-worker-name").innerText = workerName;
  document.getElementById("activate-worker-tg-display").value = telegramId;
  document.getElementById("activate-worker-modal").classList.add("active");
}

async function handleActivateWorkerSubmit(e) {
  e.preventDefault();

  const errorMsgDiv = document.getElementById("activate-error-msg");
  errorMsgDiv.style.display = "none";

  const workerId = document.getElementById("activate-worker-id").value;
  const phone = document.getElementById("activate-worker-phone").value;
  const subCity = document.getElementById("activate-worker-subcity").value;

  const checkboxes = document.querySelectorAll('input[name="activate-specialty"]:checked');
  const category = Array.from(checkboxes).map(cb => cb.value);

  if (category.length === 0) {
    errorMsgDiv.innerText = "❌ Please select at least one specialty category.";
    errorMsgDiv.style.display = "block";
    return;
  }

  try {
    const res = await fetch(`/api/workers?id=${workerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, subCity, category })
    });

    const data = await res.json();

    if (res.ok) {
      closeModal("activate-worker-modal");
      loadWorkersData();
    } else {
      errorMsgDiv.innerText = `❌ ${data.error || "Failed to activate worker."}`;
      errorMsgDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Error activating worker:", error);
    errorMsgDiv.innerText = "❌ Connection error. Please try again.";
    errorMsgDiv.style.display = "block";
  }
}

// Global switch handler (used by index.html links)
window.switchTab = switchTab;
window.openJobModal = openJobModal;
window.closeModal = closeModal;
window.toggleWorkerAvailability = toggleWorkerAvailability;
window.openActivateWorkerModal = openActivateWorkerModal;

