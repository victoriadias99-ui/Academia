import express from "express";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

const JWT_SECRET = "academia-excel-jwt-secret-2024";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // ─── JWT HELPERS ─────────────────────────────────────────────
  const signToken = (user: any) =>
    jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, inicial: user.inicial, role: user.role, foto_url: user.foto_url ?? null, cursos: user.cursos ?? "" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

  const verifyToken = (token: string) => {
    try { return jwt.verify(token, JWT_SECRET) as any; }
    catch { return null; }
  };

  const getTokenFromRequest = (req: any): string | null => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
    return null;
  };

  const requireAuth = (req: any, res: any, next: any) => {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = verifyToken(token);
    if (!user) return res.status(401).json({ error: "Token inválido o expirado" });
    req.user = user;
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = verifyToken(token);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    req.user = user;
    next();
  };

  // ─── DATABASE ─────────────────────────────────────────────────
  const DB_PATH = path.join(process.cwd(), "usuarios.json");
  const getUsers = (): any[] => {
    if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, JSON.stringify([])); return []; }
    try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); } catch { return []; }
  };
  const saveUsers = (users: any[]) => fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));

  // ─── COURSE MAPPING ───────────────────────────────────────────
  const COURSE_MAPPING: Record<string, string> = {
    excel: "12286845",
    excel_intermedio: "12286854",
    excel_avanzado: "12052707",
    excel_promo: "12305404",
  };

  const ADMIN_EMAILS = ["victoria.pdias99@gmail.com", "admin@gmail.com"];

  const TEST_USERS: Record<string, any> = {
    "juan@example.com": { id: 2, nombre: "Juan Pérez", email: "juan@example.com", inicial: "J", role: "user", foto_url: null, cursos: "excel" },
    "maria@example.com": { id: 3, nombre: "Maria Garcia", email: "maria@example.com", inicial: "M", role: "user", foto_url: null, cursos: "excel_intermedio" },
    "pedro@example.com": { id: 4, nombre: "Pedro Lopez", email: "pedro@example.com", inicial: "P", role: "user", foto_url: null, cursos: "excel_avanzado" },
  };

  // ─── VIMEO ────────────────────────────────────────────────────
  const VIMEO_TOKEN = "713ab24da995946cc8ebeaabd1a90880";
  const FOLDER_IDS = ["12286845", "12286854", "12052707", "12305404", "13018504", "12107061", "12305086"];
  let vimeoCourses: any[] = [];
  let vimeoLessons: Record<number, any[]> = {};

  async function fetchVideosFromFolder(folderId: string) {
    let videos: any[] = []; let page = 1; let hasMore = true;
    while (hasMore) {
      const res = await fetch(`https://api.vimeo.com/me/projects/${folderId}/videos?per_page=100&page=${page}&sort=date&direction=asc`, { headers: { Authorization: `Bearer ${VIMEO_TOKEN}` } });
      const data: any = await res.json();
      if (!res.ok) break;
      videos = [...videos, ...(data.data || [])]; hasMore = data.paging?.next != null; page++;
    }
    return videos;
  }

  async function preloadVimeoData() {
    console.log("Precargando Vimeo...");
    const courses = []; const lessonsMap: Record<number, any[]> = {};
    for (const folderId of FOLDER_IDS) {
      try {
        const folderRes = await fetch(`https://api.vimeo.com/me/projects/${folderId}`, { headers: { Authorization: `Bearer ${VIMEO_TOKEN}` } });
        const folderData: any = await folderRes.json();
        if (!folderRes.ok) continue;
        const courseId = parseInt(folderId);
        const videos = await fetchVideosFromFolder(folderId);
        videos.sort((a: any, b: any) => parseInt(a.name.match(/\d+/)?.[0] || "0") - parseInt(b.name.match(/\d+/)?.[0] || "0"));
        const lessons = videos.map((v: any) => { const vimeo_id = v.uri.split("/").pop(); return { id: vimeo_id, titulo: v.name, vimeo_id, duracion: v.duration, completada: false }; });
        courses.push({ id: courseId, nombre: folderData.name, descripcion: folderData.description || `Curso completo de ${folderData.name}`, imagen_url: videos?.[0]?.pictures?.base_link || `https://picsum.photos/seed/${folderId}/400/250`, progreso: 0, total_lecciones: lessons.length, lecciones_completadas: 0 });
        lessonsMap[courseId] = lessons;
      } catch (e) { console.error(`Error curso ${folderId}:`, e); }
    }
    vimeoCourses = courses; vimeoLessons = lessonsMap;
    console.log(`Vimeo listo: ${vimeoCourses.length} cursos.`);
  }

  await preloadVimeoData();

  // ─── MOCK DATA ────────────────────────────────────────────────
  const mockStudents = [
    { email: "juan@example.com", nombre: "Juan Pérez", cursos: 2, registro: "2024-01-15", ultimo_login: "2024-03-08", activo: true, vencimiento: "2027-12-31" },
    { email: "maria@example.com", nombre: "Maria Garcia", cursos: 1, registro: "2024-02-10", ultimo_login: "2024-03-09", activo: true, vencimiento: "2027-06-10" },
    { email: "pedro@example.com", nombre: "Pedro Lopez", cursos: 3, registro: "2023-12-05", ultimo_login: "2024-03-01", activo: false, vencimiento: "2024-01-01" },
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

  // ─── AUTH ROUTES ──────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.toLowerCase().trim();
    if (!email || !password) return res.status(400).json({ error: "Email y contraseña requeridos" });

    if (ADMIN_EMAILS.includes(email)) {
      const user = { id: 0, nombre: "Administrador", email, inicial: "A", role: "admin", foto_url: null, cursos: "" };
      return res.json({ status: "ok", role: "admin", token: signToken(user), usuario: user });
    }
    if (TEST_USERS[email]) {
      const user = TEST_USERS[email];
      return res.json({ status: "ok", role: "user", token: signToken(user), usuario: user });
    }
    try {
      const users = getUsers();
      const user = users.find((u: any) => u.email === email);
      if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });
      if (!user.activo) return res.status(403).json({ error: "Cuenta desactivada. Contactá al administrador." });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Credenciales incorrectas" });
      const userData = { id: user.id, nombre: `${user.nombre} ${user.apellido || ""}`.trim(), email: user.email, inicial: user.nombre.charAt(0).toUpperCase(), role: "user", foto_url: null, cursos: user.cursos || "" };
      return res.json({ status: "ok", role: "user", token: signToken(userData), usuario: userData });
    } catch (e) {
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email: rawEmail, password, nombre, apellido, cursos } = req.body;
    if (!rawEmail || !password || !nombre) return res.status(400).json({ error: "Faltan datos requeridos" });
    const email = rawEmail.toLowerCase().trim();
    try {
      const users = getUsers();
      if (users.find((u: any) => u.email === email)) return res.status(400).json({ error: "El usuario ya existe" });
      const hashedPassword = await bcrypt.hash(password, 10);
      users.push({ id: Date.now(), email, password: hashedPassword, nombre, apellido: apellido || "", cursos: cursos || "", activo: 1, fecha_creacion: new Date().toISOString().split("T")[0] });
      saveUsers(users);
      res.json({ status: "ok", message: "Usuario creado correctamente" });
    } catch { res.status(500).json({ error: "Error al crear usuario" }); }
  });

  app.get("/api/auth/perfil", requireAuth, (req: any, res) => res.json({ usuario: req.user }));

  app.post("/api/auth/logout", (req, res) => res.json({ status: "ok" }));

  app.post("/api/auth/update-profile", requireAuth, (req: any, res) => {
    const { nombre, email, foto_url } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: "Nombre y email son requeridos" });
    const updated = { ...req.user, nombre, email, inicial: nombre.charAt(0).toUpperCase(), foto_url: foto_url ?? req.user.foto_url };
    res.json({ status: "ok", usuario: updated, token: signToken(updated) });
  });

  app.post("/api/auth/change-password", requireAuth, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Todos los campos son requeridos" });
    try {
      const users = getUsers();
      const idx = users.findIndex((u: any) => u.email === req.user.email);
      if (idx === -1) return res.status(404).json({ error: "Usuario no encontrado" });
      const match = await bcrypt.compare(currentPassword, users[idx].password);
      if (!match) return res.status(401).json({ error: "La contraseña actual es incorrecta" });
      users[idx].password = await bcrypt.hash(newPassword, 10);
      saveUsers(users);
      res.json({ status: "ok" });
    } catch { res.status(500).json({ error: "Error al cambiar contraseña" }); }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    if (!req.body.email) return res.status(400).json({ error: "Email es requerido" });
    res.json({ status: "ok" });
  });

  // ─── ADMIN ROUTES ─────────────────────────────────────────────
  app.get("/api/admin/dashboard", requireAdmin, (req, res) => res.json({ stats: { totalAlumnos: 1250, totalVentas: 850, ingresosUSD: 12450.5, cursosActivos: mockCourses.length }, ultimasCompras: mockSales }));
  app.get("/api/admin/usuarios", requireAdmin, (req, res) => {
    const q = (req.query.buscar as string)?.toLowerCase();
    const dbUsers = getUsers();
    const allStudents = mockStudents.map(s => {
      const dbUser = dbUsers.find((u: any) => u.email === s.email);
      return { ...s, cursos_slugs: dbUser?.cursos || "" };
    });
    res.json({ usuarios: q ? allStudents.filter(s => s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : allStudents });
  });
  app.post("/api/admin/usuarios/suscripcion", requireAdmin, (req, res) => { const { email, meses, activo } = req.body; const idx = mockStudents.findIndex(s => s.email === email); if (idx === -1) return res.status(404).json({ error: "No encontrado" }); if (meses !== undefined) { const d = new Date(); d.setMonth(d.getMonth() + parseInt(meses)); (mockStudents[idx] as any).vencimiento = d.toISOString().split("T")[0]; mockStudents[idx].activo = true; } if (activo !== undefined) mockStudents[idx].activo = activo; res.json({ status: "ok", usuario: mockStudents[idx] }); });
  app.put("/api/admin/usuarios/:email", requireAdmin, (req, res) => {
    const { email } = req.params;
    const { nombre, cursos, activo, vencimiento } = req.body;
    const idx = mockStudents.findIndex(s => s.email === email);
    if (idx !== -1) mockStudents[idx] = { ...mockStudents[idx], ...req.body, email };
    const users = getUsers();
    const userIdx = users.findIndex((u: any) => u.email === email);
    if (userIdx !== -1) {
      if (nombre !== undefined) users[userIdx].nombre = nombre;
      if (cursos !== undefined) users[userIdx].cursos = cursos;
      if (activo !== undefined) users[userIdx].activo = activo;
      if (vencimiento !== undefined) users[userIdx].vencimiento = vencimiento;
    } else {
      const mockStudent = mockStudents.find(s => s.email === email);
      users.push({
        id: Date.now(), email,
        nombre: nombre || mockStudent?.nombre || "",
        cursos: cursos || "",
        activo: activo !== undefined ? activo : true,
        vencimiento: vencimiento || "",
        progreso: {}
      });
    }
    saveUsers(users);
    res.json({ status: "ok" });
  });
  app.delete("/api/admin/usuarios/:email", requireAdmin, (req, res) => { const idx = mockStudents.findIndex(s => s.email === req.params.email); if (idx !== -1) { mockStudents.splice(idx, 1); res.json({ status: "ok" }); } else res.status(404).json({ error: "No encontrado" }); });
  app.post("/api/admin/cursos", requireAdmin, (req, res) => { const c = { id: mockCourses.length + 1, ...req.body, progreso: 0, total_lecciones: 0, lecciones_completadas: 0 }; mockCourses.push(c); res.json({ status: "ok", curso: c }); });
  app.put("/api/admin/cursos/:id", requireAdmin, (req, res) => { const idx = mockCourses.findIndex(c => c.id === parseInt(req.params.id)); if (idx !== -1) { mockCourses[idx] = { ...mockCourses[idx], ...req.body, id: parseInt(req.params.id) }; res.json({ status: "ok", curso: mockCourses[idx] }); } else res.status(404).json({ error: "No encontrado" }); });
  app.delete("/api/admin/cursos/:id", requireAdmin, (req, res) => { const idx = mockCourses.findIndex(c => c.id === parseInt(req.params.id)); if (idx !== -1) { mockCourses.splice(idx, 1); delete mockLessons[parseInt(req.params.id)]; res.json({ status: "ok" }); } else res.status(404).json({ error: "No encontrado" }); });
  app.post("/api/admin/lecciones", requireAdmin, (req, res) => { const { cursoId, ...d } = req.body; if (!mockLessons[cursoId]) mockLessons[cursoId] = []; const l = { id: Date.now(), ...d, completada: false }; mockLessons[cursoId].push(l); res.json({ status: "ok", leccion: l }); });
  app.put("/api/admin/lecciones/:id", requireAdmin, (req, res) => { const id = parseInt(req.params.id); const { cursoId, ...d } = req.body; if (!mockLessons[cursoId]) return res.status(404).json({ error: "Curso no encontrado" }); const idx = mockLessons[cursoId].findIndex((l: any) => l.id === id); if (idx !== -1) { mockLessons[cursoId][idx] = { ...mockLessons[cursoId][idx], ...d, id }; res.json({ status: "ok", leccion: mockLessons[cursoId][idx] }); } else res.status(404).json({ error: "No encontrada" }); });
  app.delete("/api/admin/lecciones/:id", requireAdmin, (req, res) => { const id = parseInt(req.params.id); for (const k in mockLessons) { const idx = mockLessons[k].findIndex((l: any) => l.id === id); if (idx !== -1) { mockLessons[k].splice(idx, 1); return res.json({ status: "ok" }); } } res.status(404).json({ error: "No encontrada" }); });
  app.get("/api/admin/ventas", requireAdmin, (req, res) => res.json({ ventas: mockSales }));

  // ─── COURSE ROUTES ────────────────────────────────────────────
  const getUserProgress = (email: string): Record<string, string[]> => {
    const users = getUsers();
    const dbUser = users.find((u: any) => u.email === email);
    return dbUser?.progreso || {};
  };

  app.get("/api/cursos/mis-cursos", requireAuth, (req: any, res) => {
    const user = req.user;
    const progreso = getUserProgress(user.email);

    let cursosBase = user.role === "admin"
      ? vimeoCourses
      : (() => {
          const slugs = (user.cursos || "").split("|").filter(Boolean);
          const ids = slugs.map((s: string) => COURSE_MAPPING[s]).filter(Boolean);
          return vimeoCourses.filter(c => ids.includes(c.id.toString()));
        })();

    const cursos = cursosBase.map(c => {
      const completadas = (progreso[c.id.toString()] || []).length;
      const total = c.total_lecciones;
      return { ...c, lecciones_completadas: completadas, progreso: total > 0 ? Math.round((completadas / total) * 100) : 0 };
    });

    res.json({ cursos });
  });

  app.get("/api/cursos/:id", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id);
    const curso = vimeoCourses.find(c => c.id === id);
    if (!curso) return res.status(404).json({ error: "Curso no encontrado" });

    const completadas: string[] = getUserProgress(req.user.email)[id.toString()] || [];
    const lecciones = (vimeoLessons[id] || []).map((l: any) => ({ ...l, completada: completadas.includes(l.id) }));
    const completadasCount = lecciones.filter((l: any) => l.completada).length;
    const total = lecciones.length;
    const cursoConProgreso = { ...curso, lecciones_completadas: completadasCount, progreso: total > 0 ? Math.round((completadasCount / total) * 100) : 0 };

    res.json({ curso: cursoConProgreso, lecciones });
  });

  app.post("/api/cursos/progreso/:leccionId", requireAuth, async (req: any, res) => {
    const { leccionId } = req.params;
    const { completada } = req.body;
    if (!completada) return res.json({ status: "ok", leccionId });

    // Buscar a qué curso pertenece la lección
    let courseId: string | null = null;
    for (const [cid, lessons] of Object.entries(vimeoLessons)) {
      if ((lessons as any[]).some((l: any) => l.id === leccionId)) { courseId = cid; break; }
    }
    if (!courseId) return res.json({ status: "ok", leccionId });

    const users = getUsers();
    let idx = users.findIndex((u: any) => u.email === req.user.email);
    if (idx === -1) {
      users.push({ id: req.user.id, email: req.user.email, nombre: req.user.nombre, progreso: {} });
      idx = users.length - 1;
    }

    const progreso = users[idx].progreso || {};
    if (!progreso[courseId]) progreso[courseId] = [];
    if (!progreso[courseId].includes(leccionId)) progreso[courseId].push(leccionId);
    users[idx].progreso = progreso;
    saveUsers(users);

    res.json({ status: "ok", leccionId });
  });

  // ─── VITE / STATIC ────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server on http://localhost:${PORT}`));
}

startServer();
