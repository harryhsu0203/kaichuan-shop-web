const API_BASE = "https://kaichuan-api.onrender.com";

const els = {
  user: document.getElementById("admin-user"),
  pass: document.getElementById("admin-pass"),
  login: document.getElementById("login-btn"),
  logout: document.getElementById("logout-btn"),
  createForm: document.getElementById("create-form"),
  createHint: document.getElementById("create-hint"),
  list: document.getElementById("product-list"),
  orderList: document.getElementById("order-list"),
  leadList: document.getElementById("lead-list"),
  search: document.getElementById("search"),
  rowTpl: document.getElementById("product-row"),
  statProducts: document.getElementById("stat-products"),
  statOrders: document.getElementById("stat-orders"),
  statLeads: document.getElementById("stat-leads"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  panels: Array.from(document.querySelectorAll(".panel"))
};

let token = localStorage.getItem("admin_token") || "";

function setToken(value) {
  token = value;
  if (value) localStorage.setItem("admin_token", value);
  else localStorage.removeItem("admin_token");
}

function authHeaders() {
  return token ? { Authorization: "Bearer " + token } : {};
}

async function login(username, password) {
  const res = await fetch(API_BASE + "/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) return false;
  const data = await res.json();
  setToken(data.token);
  return true;
}

async function loadProducts() {
  const keyword = els.search.value.trim().toLowerCase();
  const url = new URL(API_BASE + "/products");
  url.searchParams.set("include_inactive", "1");
  if (keyword) url.searchParams.set("keyword", keyword);
  const res = await fetch(url);
  const data = await res.json();
  renderList(data);
  els.statProducts.textContent = data.length;
}

async function loadOrders() {
  if (!token) return;
  const res = await authedFetch("/orders");
  const data = await res.json();
  renderOrders(data);
  els.statOrders.textContent = data.length;
}

async function loadLeads() {
  if (!token) return;
  const res = await authedFetch("/leads");
  const data = await res.json();
  renderLeads(data);
  els.statLeads.textContent = data.length;
}

function renderList(list) {
  els.list.innerHTML = "";
  list.forEach((p) => {
    const node = els.rowTpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;
    node.querySelector(".title").textContent = p.name;
    node.querySelector(".meta").textContent = `${p.category} ｜ NT$ ${p.price.toLocaleString()} ｜ 庫存 ${p.stock} ｜ ${p.is_active ? "上架" : "下架"} ｜ ${p.featured ? "精選" : ""}`;
    const tagsBox = node.querySelector(".tags");
    tagsBox.innerHTML = p.tags.map(t => `<span class="tag">${t}</span>`).join("");
    node.querySelector("[data-action='feature']").textContent = p.featured ? "取消精選" : "設為精選";
    node.querySelector("[data-action='toggle']").textContent = p.is_active ? "下架" : "上架";

    node.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => handleAction(p, btn.dataset.action));
    });
    els.list.appendChild(node);
  });
}

function renderOrders(list) {
  els.orderList.innerHTML = list.map(order => {
    const items = order.items.map(i => `${i.id} x${i.qty}`).join(", ");
    return `
      <div class="row">
        <div class="info">
          <div class="title">訂單 ${order.id}</div>
          <div class="meta">總額 NT$ ${order.total.toLocaleString()} ｜ ${new Date(order.created_at).toLocaleString()}</div>
          <div class="tags"><span class="tag">${items}</span></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderLeads(list) {
  els.leadList.innerHTML = list.map(lead => `
    <div class="row">
      <div class="info">
        <div class="title">${lead.name} (${lead.intent || "未填"})</div>
        <div class="meta">${lead.email} ｜ ${lead.phone || "未提供"} ｜ ${new Date(lead.created_at).toLocaleString()}</div>
      </div>
    </div>
  `).join("");
}

async function handleAction(product, action) {
  if (!token) return alert("請先登入");
  if (action === "delete") {
    if (!confirm("確定刪除？")) return;
    await authedFetch("/products/" + product.id, { method: "DELETE" });
  } else if (action === "feature") {
    await authedFetch("/products/" + product.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !product.featured })
    });
  } else if (action === "toggle") {
    await authedFetch("/products/" + product.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !product.is_active })
    });
  }
  loadProducts();
}

async function authedFetch(path, options = {}) {
  const headers = { ...(options.headers || {}), ...authHeaders() };
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "request failed");
  }
  return res;
}

function switchTab(tabId) {
  els.tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
  els.panels.forEach(panel => panel.classList.toggle("show", panel.id === tabId));
}

function bindEvents() {
  els.tabs.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

  els.login.addEventListener("click", async () => {
    const username = els.user.value.trim();
    const password = els.pass.value.trim();
    if (!username || !password) return alert("請輸入帳號與密碼");
    const ok = await login(username, password);
    if (!ok) {
      setToken("");
      alert("帳號或密碼錯誤");
    } else {
      alert("登入成功");
      refreshAll();
    }
  });

  els.logout.addEventListener("click", () => {
    setToken("");
    alert("已登出");
  });

  els.createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!token) return alert("請先登入");
    const form = new FormData(e.target);
    const body = {
      name: form.get("name"),
      category: form.get("category"),
      price: Number(form.get("price") || 0),
      stock: Number(form.get("stock") || 0),
      tags: (form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean),
      image: form.get("image"),
      desc: form.get("desc"),
      featured: form.get("featured") === "on",
      is_active: form.get("is_active") === "on"
    };
    try {
      await authedFetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      els.createHint.textContent = "已新增";
      els.createHint.style.color = "#d9b256";
      e.target.reset();
      refreshAll();
    } catch (err) {
      els.createHint.textContent = err.message;
      els.createHint.style.color = "tomato";
    }
  });

  els.search.addEventListener("input", debounce(loadProducts, 250));
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function refreshAll() {
  loadProducts();
  loadOrders();
  loadLeads();
}

function init() {
  bindEvents();
  if (token) refreshAll();
}

init();

