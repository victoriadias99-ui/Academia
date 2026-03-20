import express from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

const JWT_SECRET = "academia-excel-jwt-secret-2024";

const app = express();
app.use(express.json({ limit: "10mb" }));

const signToken = (user: any) =>
  jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, inicial: user.inicial, role: user.role, foto_url: user.foto_url ?? null, cursos: user.cursos ?? "" },
    JWT_SECRET, { expiresIn: "7d" }
  );

const verifyToken = (token: string) => {
  try { return jwt.verify(token, JWT_SECRET) as any; } catch { return null; }
};

const requireAuth = (req: any, res: any, next: any) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "Token inválido" });
  req.user = user;
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const user = verifyToken(token);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "No autorizado" });
  req.user = user;
  next();
};

const DB_PATH = path.join("/tmp", "usuarios.json");
const getUsers = (): any[] => {
  if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, JSON.stringify([])); return []; }
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); } catch { return []; }
};
const saveUsers = (users: any[]) => fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));

const COURSE_MAPPING: Record<string, string> = {
  excel: "12286845", excel_intermedio: "12286854",
  excel_avanzado: "12052707", excel_promo: "12305404",
};

const ADMIN_EMAILS = ["victoria.pdias99@gmail.com", "admin@gmail.com"];

const TEST_USERS: Record<string, any> = {
  "juan@example.com": { id: 2, nombre: "Juan Pérez", email: "juan@example.com", inicial: "J", role: "user", foto_url: null, cursos: "excel" },
  "maria@example.com": { id: 3, nombre: "Maria Garcia", email: "maria@example.com", inicial: "M", role: "user", foto_url: null, cursos: "excel_intermedio" },
  "pedro@example.com": { id: 4, nombre: "Pedro Lopez", email: "pedro@example.com", inicial: "P", role: "user", foto_url: null, cursos: "excel_avanzado" },
};

const VIMEO_TOKEN = "713ab24da995946cc8ebeaabd1a90880";
const FOLDER_IDS = ["12286845", "12286854", "12052707", "12305404", "13018504", "12107061", "12305086"];
let vimeoCourses: any[] = [];
let vimeoLessons: Record<number, any[]> = {};
let vimeoLoaded = false;

async function loadVimeo() {
  if (vimeoLoaded) return;
  vimeoLoaded = true;
  for (const folderId of FOLDER_IDS) {
    try {
      const folderRes = await fetch(`https://api.vimeo.com/me/projects/${folderId}`, { headers: { Authorization: `Bearer ${VIMEO_TOKEN}` } });
      const folderData: any = await folderRes.json();
      if (!folderRes.ok) continue;
      const courseId = parseInt(folderId);
      let videos: any[] = [];
      const res = await fetch(`https://api.vimeo.com/me/projects/${folderId}/videos?per_page=100&sort=date&direction=asc`, { headers: { Authorization: `Bearer ${VIMEO_TOKEN}` } });
      const data: any = await res.json();
      if (res.ok) videos = data.data || [];
      videos.sort((a: any, b: any) => parseInt(a.name.match(/\d+/)?.[0] || "0") - parseInt(b.name.match(/\d+/)?.[0] || "0"));
      const lessons = videos.map((v: any) => { const vimeo_id = v.uri.split("/").pop(); return { id: vimeo_id, titulo: v.name, vimeo_id, duracion: v.duration, completada: false }; });
      vimeoCourses.push({ id: courseId, nombre: folderData.name, descripcion: folderData.description || `Curso de ${folderData.name}`, imagen_url: videos?.[0]?.pictures?.base_link || `https://picsum.photos/seed/${folderId}/400/250`, progreso: 0, total_lecciones: lessons.length, lecciones_completadas: 0 });
      vimeoLessons[courseId] = lessons;
    } catch (e) { console.error(`Error curso ${folderId}:`, e); }
  }
}

const mockStudents = [
  { email: "juan@example.com", nombre: "Juan Pérez", cursos: 2, registro: "2024-01-15", activo: true, vencimiento: "2027-12-31" },
  { email: "maria@example.com", nombre: "Maria Garcia", cursos: 1, registro: "2024-02-10", activo: true, vencimiento: "2027-06-10" },
  { email: "pedro@example.com", nombre: "Pedro Lopez", cursos: 3, registro: "2023-12-05", activo: false, vencimiento: "2024-01-01" },
];
const mockSales = [
  { email: "juan@example.com", nombre: "Juan Pérez", curso: "Excel Nivel Inicial", monto: 25.0, fecha: "2024-03-08" },
  { email: "maria@example.com", nombre: "Maria Garcia", curso: "Excel Nivel Intermedio", monto: 35.0, fecha: "2024-03-07" },
  { email: "ana@example.com", nombre: "Ana Martinez", curso: "Power BI Inicial", monto: 45.0, fecha: "2024-03-06" },
];
const mockCourses = [
  { id: 1, nombre: "Excel Nivel Inicial", descripcion: "Aprendé desde cero.", imagen_url: "https://picsum.photos/seed/excel1/400/250", progreso: 45, total_lecciones: 10, lecciones_completadas: 4 },
  { id: 2, nombre: "Excel Nivel Intermedio", descripcion: "Tablas dinámicas y más.", imagen_url: "https://picsum.photos/seed/excel2/400/250", progreso: 0, total_lecciones: 12, lecciones_completadas: 0 },
  { id: 3, nombre: "Power BI Inicial", descripcion: "Tableros interactivos.", imagen_url: "https://picsum.photos/seed/pbi/400/250", progreso: 100, total_lecciones: 8, lecciones_completadas: 8 },
];
const mockLessons: Record<number, any[]> = {
  1: [
    { id: 101, titulo: "Introducción a la interfaz", vimeo_id: "76979871", duracion: 320, completada: true },
    { id: 102, titulo: "Celdas, filas y columnas", vimeo_id: "76979871", duracion: 450, completada: true },
    { id: 103, titulo: "Formatos básicos", vimeo_id: "76979871", duracion: 280, completada: false },
    { id: 104, titulo: "Primeras fórmulas", vimeo_id: "76979871", duracion: 600, completada: false },
    { id: 105, titulo: "Suma y Promedio", vimeo_id: "76979871", duracion: 420, completada: false },
  ],
  2: Array.from({ length: 12 }, (_, i) => ({ id: 201 + i, titulo: `Lección Intermedia ${i + 1}`, vimeo_id: "76979871", duracion: 400 + i * 10, completada: false })),
  3: Array.from({ length: 8 }, (_, i) => ({ id: 301 + i, titulo: `Lección Power BI ${i + 1}`, vimeo_id: "76979871", duracion: 500 + i * 5, completada: true })),
};

// AUTH
app.post("/api/auth/login", async (req, res) => {
  const { email: rawEmail, password } = req.body;
  const email = rawEmail?.toLowerCase().trim();
  if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });
  if (ADMIN_EMAILS.includes(email)) {
    const user = { id: 0, nombre: "Administrador", email, inicial: "A", role: "admin", foto_url: null, cursos: "" };
    return res.json({ status: "ok", role: "admin", token: signToken(user), usuario: user });
  }
  if (TEST_USERS[email]) {
    return res.json({ status: "ok", role: "user", token: signToken(TEST_USERS[email]), usuario: TEST_USERS[email] });
  }
  try {
    const users = getUsers();
    const user = users.find((u: any) => u.email === email);
    if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });
    if (!user.activo) return res.status(403).json({ error: "Cuenta desactivada." });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Credenciales incorrectas" });
    const userData = { id: user.id, nombre: `${user.nombre} ${user.apellido || ""}`.trim(), email: user.email, inicial: user.nombre.charAt(0).toUpperCase(), role: "user", foto_url: null, cursos: user.cursos || "" };
    return res.json({ status: "ok", role: "user", token: signToken(userData), usuario: userData });
  } catch { return res.status(500).json({ error: "Error interno" }); }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, nombre, apellido, cursos } = req.body;
  if (!email || !password || !nombre) return res.status(400).json({ error: "Faltan datos" });
  try {
    const users = getUsers();
    if (users.find((u: any) => u.email === email)) return res.status(400).json({ error: "El usuario ya existe" });
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ id: Date.now(), email: email.toLowerCase().trim(), password: hashedPassword, nombre, apellido: apellido || "", cursos: cursos || "", activo: 1, fecha_creacion: new Date().toISOString().split("T")[0] });
    saveUsers(users);
    res.json({ status: "ok" });
  } catch { res.status(500).json({ error: "Error al crear usuario" }); }
});

app.get("/api/auth/perfil", requireAuth, (req: any, res) => res.json({ usuario: req.user }));
app.post("/api/auth/logout", (req, res) => res.json({ status: "ok" }));
app.post("/api/auth/update-profile", requireAuth, (req: any, res) => {
  const { nombre, email, foto_url } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: "Nombre y email requeridos" });
  const updated = { ...req.user, nombre, email, inicial: nombre.charAt(0).toUpperCase(), foto_url: foto_url ?? req.user.foto_url };
  res.json({ status: "ok", usuario: updated, token: signToken(updated) });
});
app.post("/api/auth/change-password", requireAuth, (req, res) => {
  if (!req.body.currentPassword || !req.body.newPassword) return res.status(400).json({ error: "Campos requeridos" });
  res.json({ status: "ok" });
});
app.post("/api/auth/reset-password", (req, res) => {
  if (!req.body.email) return res.status(400).json({ error: "Email requerido" });
  res.json({ status: "ok" });
});

// ADMIN
app.get("/api/admin/dashboard", requireAdmin, (req, res) => res.json({ stats: { totalAlumnos: 1250, totalVentas: 850, ingresosUSD: 12450.5, cursosActivos: mockCourses.length }, ultimasCompras: mockSales }));
app.get("/api/admin/usuarios", requireAdmin, (req, res) => { const q = (req.query.buscar as string)?.toLowerCase(); res.json({ usuarios: q ? mockStudents.filter(s => s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : mockStudents }); });
app.post("/api/admin/usuarios/suscripcion", requireAdmin, (req, res) => { const { email, meses, activo } = req.body; const idx = mockStudents.findIndex(s => s.email === email); if (idx === -1) return res.status(404).json({ error: "No encontrado" }); if (meses !== undefined) { const d = new Date(); d.setMonth(d.getMonth() + parseInt(meses)); (mockStudents[idx] as any).vencimiento = d.toISOString().split("T")[0]; mockStudents[idx].activo = true; } if (activo !== undefined) mockStudents[idx].activo = activo; res.json({ status: "ok", usuario: mockStudents[idx] }); });
app.put("/api/admin/usuarios/:email", requireAdmin, (req, res) => { const idx = mockStudents.findIndex(s => s.email === req.params.email); if (idx !== -1) { mockStudents[idx] = { ...mockStudents[idx], ...req.body, email: req.params.email }; res.json({ status: "ok" }); } else res.status(404).json({ error: "No encontrado" }); });
app.delete("/api/admin/usuarios/:email", requireAdmin, (req, res) => { const idx = mockStudents.findIndex(s => s.email === req.params.email); if (idx !== -1) { mockStudents.splice(idx, 1); res.json({ status: "ok" }); } else res.status(404).json({ error: "No encontrado" }); });
app.get("/api/admin/ventas", requireAdmin, (req, res) => res.json({ ventas: mockSales }));

// CURSOS
app.get("/api/cursos/mis-cursos", requireAuth, async (req: any, res) => {
  await loadVimeo();
  const user = req.user;
  if (user.role === "admin") return res.json({ cursos: vimeoCourses });
  const slugs = (user.cursos || "").split("|").filter(Boolean);
  const ids = slugs.map((s: string) => COURSE_MAPPING[s]).filter(Boolean);
  res.json({ cursos: vimeoCourses.filter(c => ids.includes(c.id.toString())) });
});

app.get("/api/cursos/:id", requireAuth, async (req: any, res) => {
  await loadVimeo();
  const id = parseInt(req.params.id);
  const curso = vimeoCourses.find(c => c.id === id);
  if (curso) res.json({ curso, lecciones: vimeoLessons[id] || [] });
  else res.status(404).json({ error: "Curso no encontrado" });
});

app.post("/api/cursos/progreso/:leccionId", requireAuth, (req, res) => res.json({ status: "ok" }));

export default app;
