const API_BASE = "https://kaichuan-api.onrender.com";

const els = {
  token: document.getElementById("token-input"),
  login: document.getElementById("login-btn"),
  logout: document.getElementById("logout-btn"),
  createForm: document.getElementById("create-form"),
  createHint: document.getElementById("create-hint"),
  list: document.getElementById("product-list"),
  search: document.getElementById("search"),
  rowTpl: document.getElementById("product-row")
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

async function verifyToken() {
  if (!token) return false;
  const res = await fetch(API_BASE + "/admin/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  return res.ok;
}

async function loadProducts() {
  const keyword = els.search.value.trim().toLowerCase();
  const url = new URL(API_BASE + "/products");
  url.searchParams.set("include_inactive", "1");
  if (keyword) url.searchParams.set("keyword", keyword);
  const res = await fetch(url);
  const data = await res.json();
  renderList(data);
}

function renderList(list) {
  els.list.innerHTML = "";
  list.forEach((p) => {
    const node = els.rowTpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;
    node.querySelector(".title").textContent = p.name;
    node.querySelector(".meta").textContent = `${p.category} �?NT$ ${p.price.toLocaleString()} �?庫存 ${p.stock} �?${p.is_active ? "上架" : "下架"} �?${p.featured ? "精選" : ""}`;
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

async function handleAction(product, action) {
  if (!token) return alert("請先登入");
  if (action === "delete") {
    if (!confirm("確定刪除�?)) return;
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

function bindEvents() {
  els.login.addEventListener("click", async () => {
    const val = els.token.value.trim();
    if (!val) return alert("請輸�?token");
    setToken(val);
    const ok = await verifyToken();
    if (!ok) {
      setToken("");
      alert("Token 驗證失敗");
    } else {
      alert("登入成功");
      loadProducts();
    }
  });

  els.logout.addEventListener("click", () => {
    setToken("");
    alert("已登�?);
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
      els.createHint.textContent = "已新�?;
      e.target.reset();
      loadProducts();
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

async function init() {
  els.token.value = token;
  bindEvents();
  if (token && await verifyToken()) {
    loadProducts();
  }
}

init();





