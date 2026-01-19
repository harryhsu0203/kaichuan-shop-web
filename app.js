const API_BASE = "https://kaichuan-api.onrender.com";

const state = {
  products: [],
  cart: [],
  members: []
};

const els = {
  grid: document.getElementById("product-grid"),
  featuredGrid: document.getElementById("featured-grid"),
  cartModal: document.getElementById("cart-modal"),
  cartCount: document.getElementById("cart-count"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  memberForm: document.getElementById("member-form"),
  memberHint: document.getElementById("member-hint"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  category: document.getElementById("category"),
  openCart: document.getElementById("open-cart"),
  contactLineBtns: [document.getElementById("contact-line"), document.getElementById("open-line")].filter(Boolean)
};

function loadState() {
  state.cart = JSON.parse(localStorage.getItem("cart") || "[]");
}

function persistCart() {
  localStorage.setItem("cart", JSON.stringify(state.cart));
}

function formatPrice(num) {
  return "NT$ " + num.toLocaleString("zh-TW");
}

function productCard(p) {
  const tags = p.tags.map(tag => `<span class="tag">${tag}</span>`).join("");
  return `
    <div class="card product reveal">
      <div class="thumb">${p.image ? `<img src="${p.image}" alt="${p.name}">` : ""}</div>
      <h3>${p.name}</h3>
      <p>${p.desc || ""}</p>
      <div class="tag-row">${tags}</div>
      <div class="price">${formatPrice(p.price)}</div>
      <button class="primary" data-add="${p.id}">加入購物�?/button>
    </div>
  `;
}

async function fetchProducts() {
  const keyword = (els.search.value || "").toLowerCase();
  const sortBy = els.sort.value;
  const category = els.category.value;
  const url = new URL(API_BASE + "/products");
  if (keyword) url.searchParams.set("keyword", keyword);
  if (category !== "all") url.searchParams.set("category", category);
  if (sortBy) url.searchParams.set("sort", sortBy);
  const res = await fetch(url.toString());
  const data = await res.json();
  state.products = data;
  renderProducts();
  renderFeatured();
}

function renderProducts() {
  els.grid.innerHTML = state.products.map(productCard).join("");
  bindAddButtons();
  setupReveal();
}

function renderFeatured() {
  const featured = state.products.filter(p => p.featured).slice(0, 4);
  els.featuredGrid.innerHTML = featured.map(productCard).join("");
  bindAddButtons();
  setupReveal();
}

function bindAddButtons() {
  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

function addToCart(id) {
  const existing = state.cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    state.cart.push({ id, qty: 1 });
  }
  persistCart();
  updateCartUI();
  toggleModal(els.cartModal, true);
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  persistCart();
  updateCartUI();
}

function updateCartUI() {
  els.cartCount.textContent = state.cart.reduce((s, i) => s + i.qty, 0);
  els.cartItems.innerHTML = state.cart.map(item => {
    const p = state.products.find(pr => pr.id === item.id);
    if (!p) return "";
    return `
      <div class="cart-item">
        <div>
          <div>${p.name}</div>
          <small class="helper">${formatPrice(p.price)} x ${item.qty}</small>
        </div>
        <div>${formatPrice(p.price * item.qty)}</div>
        <button class="btn-text" data-remove="${item.id}">移除</button>
      </div>
    `;
  }).join("");
  els.cartTotal.textContent = formatPrice(state.cart.reduce((s, i) => {
    const p = state.products.find(pr => pr.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0));
  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
  });
}

function toggleModal(el, show) {
  el.classList.toggle("show", show);
}

function bindEvents() {
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").classList.remove("show");
    });
  });
  els.openCart.addEventListener("click", () => toggleModal(els.cartModal, true));
  els.search.addEventListener("input", fetchProducts);
  els.sort.addEventListener("change", fetchProducts);
  els.category.addEventListener("change", fetchProducts);
  document.getElementById("checkout").addEventListener("click", handleCheckout);
  els.memberForm.addEventListener("submit", handleMemberJoin);
  els.contactLineBtns.forEach(btn => btn.addEventListener("click", openLine));
}

async function handleCheckout() {
  if (!state.cart.length) {
    alert("購物車為空，請先加入商品�?);
    return;
  }
  try {
    const res = await fetch(API_BASE + "/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: state.cart })
    });
    if (!res.ok) throw new Error("下單失敗");
    alert("已收到訂單，專人將與您確認付款與出貨�?);
    state.cart = [];
    persistCart();
    updateCartUI();
    toggleModal(els.cartModal, false);
  } catch (err) {
    alert(err.message || "下單失敗");
  }
}

async function handleMemberJoin(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const record = {
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    intent: form.get("intent")
  };
  try {
    const res = await fetch(API_BASE + "/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error("送出失敗，請稍後再試");
    els.memberHint.textContent = "已加入會員，顧問將於 1 個工作日內與您聯繫�?;
    els.memberHint.style.color = "var(--gold)";
    e.target.reset();
  } catch (err) {
    els.memberHint.textContent = err.message;
    els.memberHint.style.color = "tomato";
  }
}

function openLine() {
  window.open("https://line.me/R/ti/p/@kaichuan", "_blank");
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function setupReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  }, { threshold: 0.2 });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

function init() {
  loadState();
  bindEvents();
  fetchProducts();
  updateCartUI();
}

init();

