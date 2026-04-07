import express from "express";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

const JWT_SECRET = "academia-excel-jwt-secret-2024";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
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

  // ─── DATABASE (MySQL) ─────────────────────────────────────────
  const pool = mysql.createPool({
    host:     process.env.MYSQL_HOST     || process.env.MYSQLHOST,
    port:     parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || "3306"),
    user:     process.env.MYSQL_USER     || process.env.MYSQLUSER,
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: { rejectUnauthorized: false },
  });

  // ─── DB MIGRATIONS ───────────────────────────────────────────
  const addCol = async (sql: string) => {
    try { await pool.query(sql); }
    catch (e: any) { if (e?.errno !== 1060) console.error("Migration error:", e?.message); }
  };
  await addCol(`ALTER TABLE academia_usuarios ADD COLUMN apellido VARCHAR(100) NOT NULL DEFAULT ''`);
  await addCol(`ALTER TABLE academia_usuarios ADD COLUMN cursos TEXT DEFAULT ''`);
  await addCol(`ALTER TABLE academia_usuarios ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1`);
  await addCol(`ALTER TABLE academia_usuarios ADD COLUMN vencimiento DATE DEFAULT NULL`);
  await addCol(`ALTER TABLE academia_usuarios ADD COLUMN progreso TEXT DEFAULT '{}'`);
  await addCol(`ALTER TABLE academia_usuarios ADD COLUMN fecha_creacion DATE DEFAULT NULL`);
  console.log("Migrations OK");

  const getUsers = async (): Promise<any[]> => {
    const [rows] = await pool.query("SELECT * FROM academia_usuarios");
    return (rows as any[]).map((u) => ({
      ...u,
      progreso: typeof u.progreso === "string" ? JSON.parse(u.progreso || "{}") : u.progreso || {},
    }));
  };

  const saveUser = async (user: any) => {
    await pool.query(
      `INSERT INTO academia_usuarios (id, email, password, nombre, apellido, cursos, activo, vencimiento, progreso, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       password=VALUES(password), nombre=VALUES(nombre), apellido=VALUES(apellido),
       cursos=VALUES(cursos), activo=VALUES(activo), vencimiento=VALUES(vencimiento),
       progreso=VALUES(progreso)`,
      [
        user.id, user.email, user.password, user.nombre, user.apellido || "",
        user.cursos || "", user.activo ?? 1, user.vencimiento || null,
        JSON.stringify(user.progreso || {}),
        user.fecha_creacion || new Date().toISOString().split("T")[0],
      ]
    );
  };

  const updateUserField = async (email: string, fields: Record<string, any>) => {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const setClause = keys.map((k) => `${k}=?`).join(", ");
    const values = keys.map((k) => (k === "progreso" ? JSON.stringify(fields[k]) : fields[k]));
    await pool.query(`UPDATE academia_usuarios SET ${setClause} WHERE email=?`, [...values, email]);
  };

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

    // IMPORTANTE: Test users for development only (should be removed in production)
    if (TEST_USERS[email]) {
      const user = TEST_USERS[email];
      return res.json({ status: "ok", role: "user", token: signToken(user), usuario: user });
    }

    try {
      const users = await getUsers();
      const user = users.find((u: any) => u.email === email);

      if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });
      if (!user.activo) return res.status(403).json({ error: "Cuenta desactivada. Contactá al administrador." });

      // Validate password for all users (including admin)
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Credenciales incorrectas" });

      // Determine role: check if email is admin
      const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";

      const userData = {
        id: user.id,
        nombre: `${user.nombre} ${user.apellido || ""}`.trim(),
        email: user.email,
        inicial: user.nombre.charAt(0).toUpperCase(),
        role: role,
        foto_url: null,
        cursos: user.cursos || ""
      };

      return res.json({ status: "ok", role: role, token: signToken(userData), usuario: userData });
    } catch (e) {
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email: rawEmail, password, nombre, apellido, cursos } = req.body;
    if (!rawEmail || !password || !nombre) return res.status(400).json({ error: "Faltan datos requeridos" });
    const email = rawEmail.toLowerCase().trim();
    try {
      const users = await getUsers();
      if (users.find((u: any) => u.email === email)) return res.status(400).json({ error: "El usuario ya existe" });
      const hashedPassword = await bcrypt.hash(password, 10);
      await saveUser({ id: generateId(), email, password: hashedPassword, nombre, apellido: apellido || "", cursos: cursos || "", activo: 1, fecha_creacion: new Date().toISOString().split("T")[0], progreso: {} });
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
      const users = await getUsers();
      const user = users.find((u: any) => u.email === req.user.email);
      if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(401).json({ error: "La contraseña actual es incorrecta" });
      const newHashed = await bcrypt.hash(newPassword, 10);
      await updateUserField(req.user.email, { password: newHashed });
      res.json({ status: "ok" });
    } catch { res.status(500).json({ error: "Error al cambiar contraseña" }); }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    if (!req.body.email) return res.status(400).json({ error: "Email es requerido" });
    res.json({ status: "ok" });
  });

  // ─── ADMIN ROUTES ─────────────────────────────────────────────
  app.get("/api/admin/dashboard", requireAdmin, (req, res) =>
    res.json({ stats: { totalAlumnos: 1250, totalVentas: 850, ingresosUSD: 12450.5, cursosActivos: mockCourses.length }, ultimasCompras: mockSales })
  );

  app.get("/api/admin/usuarios", requireAdmin, async (req, res) => {
    const q = (req.query.buscar as string)?.toLowerCase();
    try {
      const dbUsers = await getUsers();
      const students = dbUsers.map((u: any) => ({
        email: u.email,
        nombre: `${u.nombre} ${u.apellido || ""}`.trim(),
        cursos: u.cursos,
        cursos_slugs: u.cursos || "",
        registro: u.fecha_creacion,
        ultimo_login: null,
        activo: !!u.activo,
        vencimiento: u.vencimiento,
      }));
      res.json({ usuarios: q ? students.filter((s: any) => s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : students });
    } catch { res.status(500).json({ error: "Error al obtener usuarios" }); }
  });

  app.post("/api/admin/usuarios/suscripcion", requireAdmin, async (req, res) => {
    const { email, meses, activo } = req.body;
    try {
      const fields: Record<string, any> = {};
      if (meses !== undefined) {
        const d = new Date(); d.setMonth(d.getMonth() + parseInt(meses));
        fields.vencimiento = d.toISOString().split("T")[0];
        fields.activo = 1;
      }
      if (activo !== undefined) fields.activo = activo ? 1 : 0;
      await updateUserField(email, fields);
      res.json({ status: "ok" });
    } catch { res.status(500).json({ error: "Error al actualizar suscripción" }); }
  });

  app.put("/api/admin/usuarios/:email", requireAdmin, async (req, res) => {
    const { email } = req.params;
    const { nombre, cursos, activo, vencimiento } = req.body;
    try {
      const users = await getUsers();
      const exists = users.find((u: any) => u.email === email);
      if (exists) {
        const fields: Record<string, any> = {};
        if (nombre !== undefined) fields.nombre = nombre;
        if (cursos !== undefined) fields.cursos = cursos;
        if (activo !== undefined) fields.activo = activo ? 1 : 0;
        if (vencimiento !== undefined) fields.vencimiento = vencimiento;
        await updateUserField(email, fields);
      } else {
        await saveUser({ id: generateId(), email, nombre: nombre || "", cursos: cursos || "", activo: activo !== undefined ? (activo ? 1 : 0) : 1, vencimiento: vencimiento || null, progreso: {}, fecha_creacion: new Date().toISOString().split("T")[0] });
      }
      res.json({ status: "ok" });
    } catch { res.status(500).json({ error: "Error al actualizar usuario" }); }
  });

  app.delete("/api/admin/usuarios/:email", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM academia_usuarios WHERE email=?", [req.params.email]);
      res.json({ status: "ok" });
    } catch { res.status(500).json({ error: "Error al eliminar usuario" }); }
  });

  app.post("/api/admin/cursos", requireAdmin, (req, res) => { const c = { id: mockCourses.length + 1, ...req.body, progreso: 0, total_lecciones: 0, lecciones_completadas: 0 }; mockCourses.push(c); res.json({ status: "ok", curso: c }); });
  app.put("/api/admin/cursos/:id", requireAdmin, (req, res) => { const idx = mockCourses.findIndex(c => c.id === parseInt(req.params.id)); if (idx !== -1) { mockCourses[idx] = { ...mockCourses[idx], ...req.body, id: parseInt(req.params.id) }; res.json({ status: "ok", curso: mockCourses[idx] }); } else res.status(404).json({ error: "No encontrado" }); });
  app.delete("/api/admin/cursos/:id", requireAdmin, (req, res) => { const idx = mockCourses.findIndex(c => c.id === parseInt(req.params.id)); if (idx !== -1) { mockCourses.splice(idx, 1); delete mockLessons[parseInt(req.params.id)]; res.json({ status: "ok" }); } else res.status(404).json({ error: "No encontrado" }); });
  app.post("/api/admin/lecciones", requireAdmin, (req, res) => { const { cursoId, ...d } = req.body; if (!mockLessons[cursoId]) mockLessons[cursoId] = []; const l = { id: Date.now(), ...d, completada: false }; mockLessons[cursoId].push(l); res.json({ status: "ok", leccion: l }); });
  app.put("/api/admin/lecciones/:id", requireAdmin, (req, res) => { const id = parseInt(req.params.id); const { cursoId, ...d } = req.body; if (!mockLessons[cursoId]) return res.status(404).json({ error: "Curso no encontrado" }); const idx = mockLessons[cursoId].findIndex((l: any) => l.id === id); if (idx !== -1) { mockLessons[cursoId][idx] = { ...mockLessons[cursoId][idx], ...d, id }; res.json({ status: "ok", leccion: mockLessons[cursoId][idx] }); } else res.status(404).json({ error: "No encontrada" }); });
  app.delete("/api/admin/lecciones/:id", requireAdmin, (req, res) => { const id = parseInt(req.params.id); for (const k in mockLessons) { const idx = mockLessons[k].findIndex((l: any) => l.id === id); if (idx !== -1) { mockLessons[k].splice(idx, 1); return res.json({ status: "ok" }); } } res.status(404).json({ error: "No encontrada" }); });
  app.get("/api/admin/ventas", requireAdmin, (req, res) => res.json({ ventas: mockSales }));

  // ─── COURSE ROUTES ────────────────────────────────────────────
  const getUserProgress = async (email: string): Promise<Record<string, string[]>> => {
    const users = await getUsers();
    const dbUser = users.find((u: any) => u.email === email);
    return dbUser?.progreso || {};
  };

  app.get("/api/cursos/mis-cursos", requireAuth, async (req: any, res) => {
    const user = req.user;
    try {
      const progreso = await getUserProgress(user.email);
      const dbUsers = await getUsers();
      const dbUser = dbUsers.find((u: any) => u.email === user.email);
      const cursosActualizados = dbUser?.cursos ?? user.cursos ?? "";

      let cursosBase = user.role === "admin"
        ? vimeoCourses
        : (() => {
          const identifiers = cursosActualizados.split("|").filter(Boolean);
          const ids = identifiers.map((s: string) => COURSE_MAPPING[s] || s).filter(Boolean);
          return vimeoCourses.filter(c => ids.includes(c.id.toString()));
        })();

      const cursos = cursosBase.map(c => {
        const completadas = (progreso[c.id.toString()] || []).length;
        const total = c.total_lecciones;
        return { ...c, lecciones_completadas: completadas, progreso: total > 0 ? Math.round((completadas / total) * 100) : 0 };
      });
      res.json({ cursos });
    } catch { res.status(500).json({ error: "Error al obtener cursos" }); }
  });

  app.get("/api/cursos/:id", requireAuth, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const curso = vimeoCourses.find(c => c.id === id);
    if (!curso) return res.status(404).json({ error: "Curso no encontrado" });
    try {
      const completadas: string[] = (await getUserProgress(req.user.email))[id.toString()] || [];
      const lecciones = (vimeoLessons[id] || []).map((l: any) => ({ ...l, completada: completadas.includes(l.id) }));
      const completadasCount = lecciones.filter((l: any) => l.completada).length;
      const total = lecciones.length;
      const cursoConProgreso = { ...curso, lecciones_completadas: completadasCount, progreso: total > 0 ? Math.round((completadasCount / total) * 100) : 0 };
      res.json({ curso: cursoConProgreso, lecciones });
    } catch { res.status(500).json({ error: "Error al obtener curso" }); }
  });

  app.post("/api/cursos/progreso/:leccionId", requireAuth, async (req: any, res) => {
    const { leccionId } = req.params;
    const { completada } = req.body;
    if (!completada) return res.json({ status: "ok", leccionId });

    let courseId: string | null = null;
    for (const [cid, lessons] of Object.entries(vimeoLessons)) {
      if ((lessons as any[]).some((l: any) => l.id === leccionId)) { courseId = cid; break; }
    }
    if (!courseId) return res.json({ status: "ok", leccionId });

    try {
      const users = await getUsers();
      let user = users.find((u: any) => u.email === req.user.email);
      if (!user) {
        await saveUser({ id: req.user.id, email: req.user.email, nombre: req.user.nombre, progreso: {}, cursos: "", activo: 1 });
        user = { progreso: {} };
      }
      const progreso = user.progreso || {};
      if (!progreso[courseId]) progreso[courseId] = [];
      if (!progreso[courseId].includes(leccionId)) progreso[courseId].push(leccionId);
      await updateUserField(req.user.email, { progreso });
      res.json({ status: "ok", leccionId });
    } catch { res.status(500).json({ error: "Error al guardar progreso" }); }
  });

  // ─── EMAIL ───────────────────────────────────────────────────
  const createTransporter = () => nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  const generateId = () => Math.floor(Math.random() * 2000000000);

  const sendWelcomeEmail = async (email: string, nombre: string, password: string) => {
    const academiaUrl = process.env.ACADEMIA_URL || "https://academia-production-c4cc.up.railway.app";
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Academia Aprende Excel" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "¡Bienvenido/a a la Academia! Tus datos de acceso",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#008B69;">¡Hola ${nombre}!</h2>
            <p>Tu compra fue procesada con éxito. Ya tenés acceso a la Academia Aprende Excel.</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:6px;margin:20px 0;">
              <p style="margin:0;"><strong>Email:</strong> ${email}</p>
              <p style="margin:8px 0 0;"><strong>Contraseña:</strong> ${password}</p>
            </div>
            <a href="${academiaUrl}" style="display:inline-block;background:#008B69;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Ingresar a la Academia →</a>
            <p style="margin-top:24px;color:#666;font-size:13px;">Podés cambiar tu contraseña una vez que ingreses.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Error enviando email:", e);
    }
  };

  const sendCourseAddedEmail = async (email: string, nombre: string, cursos: string[]) => {
    const academiaUrl = process.env.ACADEMIA_URL || "https://academia-production-c4cc.up.railway.app";
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Academia Aprende Excel" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Nuevo curso agregado a tu cuenta",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#008B69;">¡Hola ${nombre}!</h2>
            <p>Se agregó un nuevo curso a tu cuenta: <strong>${cursos.join(", ")}</strong></p>
            <a href="${academiaUrl}" style="display:inline-block;background:#008B69;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Ver mis cursos →</a>
          </div>
        `,
      });
    } catch (e) {
      console.error("Error enviando email:", e);
    }
  };

  // ─── SETUP ADMIN (uso único) ──────────────────────────────────
  app.post("/api/setup/admin", async (req, res) => {
    const { secret, email, password } = req.body;
    if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET)
      return res.status(401).json({ error: "No autorizado" });
    if (!email || !password)
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    try {
      const users = await getUsers();
      if (users.find((u: any) => u.email === email.toLowerCase().trim()))
        return res.status(400).json({ error: "El usuario ya existe" });
      const hashedPassword = await bcrypt.hash(password, 10);
      await saveUser({
        id: generateId(), email: email.toLowerCase().trim(),
        password: hashedPassword, nombre: "Admin", apellido: "",
        cursos: "", activo: 1,
        fecha_creacion: new Date().toISOString().split("T")[0], progreso: {},
      });
      res.json({ status: "ok", message: "Admin creado correctamente" });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Error al crear admin" });
    }
  });

  // ─── WEBHOOK DE COMPRA ────────────────────────────────────────
  app.post("/api/webhook/purchase", async (req, res) => {
    const secret = req.headers["x-webhook-secret"];
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret || secret !== webhookSecret)
      return res.status(401).json({ error: "No autorizado" });

    const { email: rawEmail, nombre, cursos } = req.body;
    if (!rawEmail || !nombre) return res.status(400).json({ error: "Faltan datos" });
    const email = rawEmail.toLowerCase().trim();
    const cursosArr: string[] = Array.isArray(cursos) ? cursos : (cursos ? [cursos] : []);

    try {
      const users = await getUsers();
      const existing = users.find((u: any) => u.email === email);

      if (!existing) {
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);
        const [firstName, ...rest] = nombre.trim().split(" ");
        await saveUser({
          id: generateId(), email,
          password: hashedPassword,
          nombre: firstName, apellido: rest.join(" "),
          cursos: cursosArr.join("|"),
          activo: 1,
          fecha_creacion: new Date().toISOString().split("T")[0],
          progreso: {},
        });
        await sendWelcomeEmail(email, firstName, password);
      } else {
        const existingCursos = existing.cursos ? existing.cursos.split("|") : [];
        const merged = [...new Set([...existingCursos, ...cursosArr])].filter(Boolean);
        await updateUserField(email, { cursos: merged.join("|") });
        await sendCourseAddedEmail(email, existing.nombre, cursosArr);
      }

      res.json({ status: "ok" });
    } catch (e) {
      console.error("Webhook error:", e);
      res.status(500).json({ error: "Error procesando compra" });
    }
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
