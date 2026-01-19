import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const PORT = process.env.PORT || 4000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "92304727";
const DB_PATH = process.env.DB_PATH || "data.db";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      tags TEXT DEFAULT '[]',
      description TEXT,
      image TEXT,
      featured INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      intent TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      items TEXT NOT NULL,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM products").get().c;
  if (count === 0) seedProducts();
}

function seedProducts() {
  const now = new Date().toISOString();
  const seed = [
    {
      id: crypto.randomUUID(),
      name: "黑金電競旗艦 4090",
      category: "電競主機",
      price: 189000,
      tags: ["RTX 4090", "i9 14900K", "水冷", "靜音"],
      description: "為極致遊戲與 8K 創作打造，全銅水冷迴路，黑金線材客製。",
      image: "https://images.unsplash.com/photo-1587202372775-98973a9c8af8?auto=format&fit=crop&w=1200&q=80",
      featured: 1,
      stock: 5
    },
    {
      id: crypto.randomUUID(),
      name: "創作工作站 4080 Super",
      category: "電競主機",
      price: 138000,
      tags: ["RTX 4080S", "i7 14700K", "玻璃側透", "ARGB"],
      description: "4K 剪輯 / 3D 製圖即開即用，靜音風道 + 淨化線材管理。",
      image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
      featured: 1,
      stock: 8
    },
    {
      id: crypto.randomUUID(),
      name: "文書靜音 SFF 全黑",
      category: "文書主機",
      price: 46800,
      tags: ["全黑", "SFF", "靜音", "Wi-Fi 6E"],
      description: "7 公升極簡小鋼炮，靜音風扇與減震腳座，桌面隱形配置。",
      image: "https://images.unsplash.com/photo-1545239351-46ef2b1cc004?auto=format&fit=crop&w=1200&q=80",
      featured: 1,
      stock: 12
    },
    {
      id: crypto.randomUUID(),
      name: "27 吋 4K IPS 專業螢幕",
      category: "螢幕",
      price: 15800,
      tags: ["4K", "IPS", "99% sRGB"],
      description: "精準色彩校正，雙 HDMI + USB-C，創作者首選。",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      featured: 0,
      stock: 20
    },
    {
      id: crypto.randomUUID(),
      name: "34 吋 UWQHD 曲面電競螢幕",
      category: "螢幕",
      price: 19800,
      tags: ["165Hz", "曲面", "1ms"],
      description: "超寬沉浸視野，支援 FreeSync / G-SYNC Compatible。",
      image: "https://images.unsplash.com/photo-1545239351-f1bff6c4fc9a?auto=format&fit=crop&w=1200&q=80",
      featured: 0,
      stock: 15
    },
    {
      id: crypto.randomUUID(),
      name: "機械鍵盤 聖金客製版",
      category: "周邊",
      price: 5280,
      tags: ["熱插拔", "PBT", "靜音軸"],
      description: "黑金配色，客製消音墊與潤軸，支援三模連線。",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      featured: 0,
      stock: 30
    },
    {
      id: crypto.randomUUID(),
      name: "X99 雙路主機板",
      category: "零組件",
      price: 9800,
      tags: ["X99", "雙路", "工作站"],
      description: "高效多工計算平台，適合虛擬化與渲染節點。",
      image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1200&q=80",
      featured: 0,
      stock: 18
    }
  ];
  const stmt = db.prepare(`
    INSERT INTO products (id, name, category, price, tags, description, image, featured, stock, is_active, created_at, updated_at)
    VALUES (@id, @name, @category, @price, @tags, @description, @image, @featured, @stock, 1, @created_at, @updated_at)
  `);
  const nowTime = new Date().toISOString();
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run({
        ...item,
        tags: JSON.stringify(item.tags),
        created_at: nowTime,
        updated_at: nowTime
      });
    }
  });
  insertMany(seed);
}

initDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (token !== "admin-auth") return res.status(401).json({ message: "Unauthorized" });
  next();
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "prod" });
});

app.get("/products", (req, res) => {
  const { keyword = "", category, sort = "featured", include_inactive } = req.query;
  const params = [];
  let sql = "SELECT * FROM products WHERE 1=1 ";
  if (!include_inactive) sql += "AND is_active = 1 ";
  if (keyword) {
    sql += "AND (LOWER(name) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(description) LIKE ?) ";
    const like = `%${keyword.toLowerCase()}%`;
    params.push(like, like, like);
  }
  if (category) {
    sql += "AND category = ? ";
    params.push(category);
  }
  if (sort === "price-asc") sql += "ORDER BY price ASC";
  else if (sort === "price-desc") sql += "ORDER BY price DESC";
  else sql += "ORDER BY featured DESC, updated_at DESC";

  const rows = db.prepare(sql).all(...params).map(deserializeProduct);
  res.json(rows);
});

app.post("/products", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.name || !body.category || body.price == null) {
    return res.status(400).json({ message: "缺少必要欄位" });
  }
  const now = new Date().toISOString();
  const product = {
    id: crypto.randomUUID(),
    name: body.name,
    category: body.category,
    price: Number(body.price),
    tags: JSON.stringify(body.tags || []),
    description: body.desc || body.description || "",
    image: body.image || "",
    featured: body.featured ? 1 : 0,
    stock: Number(body.stock || 0),
    is_active: body.is_active === 0 ? 0 : 1,
    created_at: now,
    updated_at: now
  };
  db.prepare(`
    INSERT INTO products (id, name, category, price, tags, description, image, featured, stock, is_active, created_at, updated_at)
    VALUES (@id, @name, @category, @price, @tags, @description, @image, @featured, @stock, @is_active, @created_at, @updated_at)
  `).run(product);
  res.json(deserializeProduct(product));
});

app.patch("/products/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const exists = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!exists) return res.status(404).json({ message: "not found" });
  const now = new Date().toISOString();
  const merged = {
    ...exists,
    ...req.body,
    tags: req.body.tags ? JSON.stringify(req.body.tags) : exists.tags,
    description: req.body.desc ?? req.body.description ?? exists.description,
    price: req.body.price != null ? Number(req.body.price) : exists.price,
    stock: req.body.stock != null ? Number(req.body.stock) : exists.stock,
    featured: req.body.featured != null ? (req.body.featured ? 1 : 0) : exists.featured,
    is_active: req.body.is_active != null ? (req.body.is_active ? 1 : 0) : exists.is_active,
    updated_at: now
  };
  db.prepare(`
    UPDATE products SET
      name=@name,
      category=@category,
      price=@price,
      tags=@tags,
      description=@description,
      image=@image,
      featured=@featured,
      stock=@stock,
      is_active=@is_active,
      updated_at=@updated_at
    WHERE id=@id
  `).run(merged);
  res.json(deserializeProduct(merged));
});

app.delete("/products/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/leads", (req, res) => {
  const { name, email, phone, intent } = req.body || {};
  if (!name || !email) return res.status(400).json({ message: "缺少姓名或 Email" });
  const row = {
    id: crypto.randomUUID(),
    name,
    email,
    phone: phone || "",
    intent: intent || "",
    created_at: new Date().toISOString()
  };
  db.prepare("INSERT INTO leads (id, name, email, phone, intent, created_at) VALUES (@id,@name,@email,@phone,@intent,@created_at)").run(row);
  res.json({ ok: true, id: row.id });
});

app.get("/leads", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/orders", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "購物車為空" });
  }
  let total = 0;
  for (const item of items) {
    const p = db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1").get(item.id);
    if (!p) return res.status(400).json({ message: `商品不存在: ${item.id}` });
    total += p.price * (item.qty || 1);
  }
  const order = {
    id: crypto.randomUUID(),
    items: JSON.stringify(items),
    total,
    created_at: new Date().toISOString()
  };
  db.prepare("INSERT INTO orders (id, items, total, created_at) VALUES (@id,@items,@total,@created_at)").run(order);
  res.json({ ok: true, order_id: order.id, total });
});

app.get("/orders", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items) })));
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ ok: true, token: "admin-auth" });
  }
  res.status(401).json({ message: "Unauthorized" });
});

function deserializeProduct(row) {
  return {
    ...row,
    tags: typeof row.tags === "string" ? JSON.parse(row.tags || "[]") : row.tags,
    featured: !!row.featured,
    is_active: !!row.is_active
  };
}

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});





