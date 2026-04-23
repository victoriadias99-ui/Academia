import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const ACADEMIA_URL   = process.env.ACADEMIA_URL   || "https://academia-wine.vercel.app/";
const ADMIN_EMAILS   = ["victoria.pdias99@gmail.com", "admin@gmail.com"];

const COURSE_MAPPING: Record<string, string> = {
  excel:              "12286845",
  excel_intermedio:   "12286854",
  excel_avanzado:     "12052707",
  sql:                "12305404",
  windows_server:     "13018504",
  pbi_avanzado:       "12107061",
  powerbi:            "12305086",
  powerpoint:         "12072965",
  word:               "12073015",
  aleman:             "14775505",
  italiano:           "12776926",
  italiano_intermedio:"16225291",
  italiano_avanzado:  "16790466",
  frances:            "13968526",
  ingles:             "12727702",
  ingles_intermedio:  "12727823",
  japones:            "13968522",
};

const COURSE_NAMES: Record<string, string> = {
  excel:              "Excel Inicial",
  excel_intermedio:   "Excel Intermedio",
  excel_avanzado:     "Excel Avanzado",
  sql:                "Sql Server - Inicial",
  windows_server:     "Windows Server",
  pbi_avanzado:       "Power Bi - Avanzado",
  powerbi:            "Power Bi - Inicial",
  powerpoint:         "Power Point",
  word:               "Word",
  aleman:             "Alemán",
  italiano:           "Italiano Inicial",
  italiano_intermedio:"Italiano A2",
  italiano_avanzado:  "Italiano B1",
  frances:            "Francés",
  ingles:             "Inglés Inicial",
  ingles_intermedio:  "Inglés Intermedio",
  japones:            "Japonés",
};

const PACK_MAPPING: Record<string, string[]> = {
  excel_promo:            ["excel", "excel_intermedio", "excel_avanzado"],
  office:                 ["excel", "powerpoint", "word"],
  prom_pbi_excel:         ["excel", "excel_intermedio", "excel_avanzado", "powerbi"],
  pack_italiano_avanzado: ["italiano", "italiano_intermedio", "italiano_avanzado"],
  pack_italiano_ingles:   ["italiano", "ingles"],
};

const expandSlugsToIds = (slugs: string[]): string[] => {
  const ids = new Set<string>();
  for (const slug of slugs) {
    if (PACK_MAPPING[slug]) {
      for (const s of PACK_MAPPING[slug]) {
        const id = COURSE_MAPPING[s];
        if (id) ids.add(id);
      }
    } else {
      const id = COURSE_MAPPING[slug] || slug;
      ids.add(id);
    }
  }
  return Array.from(ids);
};

// ─── MYSQL POOL ──────────────────────────────────────────────────────────────
let _pool: mysql.Pool | null = null;
const getPool = (): mysql.Pool => {
  if (!_pool) {
    _pool = mysql.createPool({
      host:               process.env.MYSQL_HOST,
      port:               parseInt(process.env.MYSQL_PORT || "3306"),
      user:               process.env.MYSQL_USER,
      password:           process.env.MYSQL_PASSWORD,
      database:           process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit:    5,
      ssl:                { rejectUnauthorized: false },
    });
  }
  return _pool;
};

// ─── EMAIL ───────────────────────────────────────────────────────────────────
const buildWelcomeHtml = (
  nombre: string,
  email: string,
  password: string,
  loginUrl: string
): string => {
  const BRAND_COLOR  = "#1a472a";
  const ACCENT_COLOR = "#4ecdc4";
  const LIGHT_BG     = "#f8f9fa";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Poppins,Arial,sans-serif;background-color:#ffffff;padding:20px 0;margin:0;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(26,71,42,0.08);">

    <!-- Header -->
    <div style="background-color:${BRAND_COLOR};padding:40px 20px;text-align:center;border-bottom:4px solid ${ACCENT_COLOR};">
      <h1 style="font-size:32px;color:#ffffff;margin:0 0 8px 0;font-weight:bold;">📊 Aprende Excel</h1>
      <p style="font-size:14px;color:#e8f5e9;margin:0;">Tu acceso está listo</p>
    </div>

    <!-- Welcome -->
    <div style="padding:40px 30px;">
      <h2 style="font-size:24px;color:${BRAND_COLOR};margin:0 0 16px 0;font-weight:600;">¡Bienvenido, ${nombre}! 🎉</h2>
      <p style="font-size:15px;color:#555555;line-height:1.6;margin:0 0 24px 0;">
        Gracias por confiar en nosotros. Tu cuenta ha sido activada exitosamente y ya puedes acceder a todos nuestros cursos de Excel.
      </p>
    </div>

    <!-- Credentials -->
    <div style="padding:0 30px 30px 30px;">
      <p style="font-size:14px;font-weight:600;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px 0;">
        Tus datos de acceso:
      </p>

      <div style="background-color:${LIGHT_BG};padding:16px;border-radius:8px;border-left:4px solid ${ACCENT_COLOR};margin-bottom:12px;">
        <p style="font-size:12px;font-weight:600;color:#888888;text-transform:uppercase;margin:0 0 8px 0;letter-spacing:0.3px;">📧 Usuario</p>
        <p style="font-size:16px;font-family:monospace;color:${BRAND_COLOR};margin:0;font-weight:600;word-break:break-all;">${email}</p>
      </div>

      <div style="background-color:${LIGHT_BG};padding:16px;border-radius:8px;border-left:4px solid ${ACCENT_COLOR};margin-bottom:16px;">
        <p style="font-size:12px;font-weight:600;color:#888888;text-transform:uppercase;margin:0 0 8px 0;letter-spacing:0.3px;">🔐 Contraseña</p>
        <p style="font-size:16px;font-family:monospace;color:${BRAND_COLOR};margin:0;font-weight:600;word-break:break-all;">${password}</p>
      </div>

      <div style="font-size:13px;color:#d32f2f;background-color:#ffebee;padding:12px 14px;border-radius:6px;margin:0;line-height:1.5;">
        ⚠️ <strong>Importante:</strong> Por tu seguridad, recomendamos cambiar la contraseña en tu primer acceso. No compartas estos datos con nadie.
      </div>
    </div>

    <!-- CTA Button -->
    <div style="padding:30px;text-align:center;">
      <a href="${loginUrl}"
         style="background-color:${ACCENT_COLOR};color:#ffffff;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;display:inline-block;padding:16px 40px;">
        Inicia Sesión Aquí
      </a>
    </div>

    <!-- Links -->
    <div style="padding:20px 30px;background-color:${LIGHT_BG};text-align:center;">
      <a href="${loginUrl}" style="color:${BRAND_COLOR};text-decoration:none;font-size:14px;font-weight:500;margin:0 16px;">Portal de Cursos</a>
      <a href="https://aprendeexcel.com/ayuda" style="color:${BRAND_COLOR};text-decoration:none;font-size:14px;font-weight:500;margin:0 16px;">Centro de Ayuda</a>
    </div>

    <!-- Divider -->
    <div style="height:1px;background-color:#e0e0e0;margin:0 30px;"></div>

    <!-- Footer -->
    <div style="padding:30px;background-color:#fafafa;text-align:center;">
      <p style="font-size:12px;color:#999999;margin:8px 0;line-height:1.5;">
        ¿Necesitas ayuda? Contáctanos en
        <a href="mailto:soporte@aprendeexcel.com" style="color:${BRAND_COLOR};text-decoration:none;font-weight:500;">soporte@aprendeexcel.com</a>
      </p>
      <p style="font-size:12px;color:#999999;margin:8px 0;">© 2024 Aprende Excel. Todos los derechos reservados.</p>
    </div>

  </div>
</body>
</html>`;
};

const sendWelcomeEmail = async (
  email: string,
  nombre: string,
  password: string,
): Promise<void> => {
  const loginUrl = process.env.ACADEMIA_URL || "https://academia-production-c4cc.up.railway.app";
  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || "smtp.resend.com",
    port:   parseInt(process.env.EMAIL_PORT || "465"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "resend",
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });

  await transporter.sendMail({
    from: '"Academia Aprende Excel" <soporte@aprende-excel.com>',
    to:      email,
    subject: "¡Bienvenido/a a la Academia Aprende Excel! - Tus credenciales de acceso",
    html:    buildWelcomeHtml(nombre, email, password, loginUrl),
  });
};

const buildResetPasswordHtml = (
  nombre: string,
  email: string,
  password: string,
  loginUrl: string
): string => {
  const BRAND_COLOR  = "#1a472a";
  const ACCENT_COLOR = "#4ecdc4";
  const LIGHT_BG     = "#f8f9fa";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Poppins,Arial,sans-serif;background-color:#ffffff;padding:20px 0;margin:0;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(26,71,42,0.08);">
    <div style="background-color:${BRAND_COLOR};padding:40px 20px;text-align:center;border-bottom:4px solid ${ACCENT_COLOR};">
      <h1 style="font-size:32px;color:#ffffff;margin:0 0 8px 0;font-weight:bold;">🔐 Aprende Excel</h1>
      <p style="font-size:14px;color:#e8f5e9;margin:0;">Restablecimiento de contraseña</p>
    </div>
    <div style="padding:40px 30px;">
      <h2 style="font-size:24px;color:${BRAND_COLOR};margin:0 0 16px 0;font-weight:600;">Hola, ${nombre}</h2>
      <p style="font-size:15px;color:#555555;line-height:1.6;margin:0 0 24px 0;">
        Recibimos tu solicitud de restablecimiento de contraseña. Generamos una nueva contraseña provisoria para que puedas volver a acceder a tu cuenta.
      </p>
    </div>
    <div style="padding:0 30px 30px 30px;">
      <p style="font-size:14px;font-weight:600;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px 0;">
        Tus nuevos datos de acceso:
      </p>
      <div style="background-color:${LIGHT_BG};padding:16px;border-radius:8px;border-left:4px solid ${ACCENT_COLOR};margin-bottom:12px;">
        <p style="font-size:12px;font-weight:600;color:#888888;text-transform:uppercase;margin:0 0 8px 0;letter-spacing:0.3px;">📧 Usuario</p>
        <p style="font-size:16px;font-family:monospace;color:${BRAND_COLOR};margin:0;font-weight:600;word-break:break-all;">${email}</p>
      </div>
      <div style="background-color:${LIGHT_BG};padding:16px;border-radius:8px;border-left:4px solid ${ACCENT_COLOR};margin-bottom:16px;">
        <p style="font-size:12px;font-weight:600;color:#888888;text-transform:uppercase;margin:0 0 8px 0;letter-spacing:0.3px;">🔐 Nueva contraseña</p>
        <p style="font-size:16px;font-family:monospace;color:${BRAND_COLOR};margin:0;font-weight:600;word-break:break-all;">${password}</p>
      </div>
      <div style="font-size:13px;color:#d32f2f;background-color:#ffebee;padding:12px 14px;border-radius:6px;margin:0;line-height:1.5;">
        ⚠️ <strong>Importante:</strong> Por tu seguridad, cambia esta contraseña desde tu perfil apenas ingreses. Si vos no solicitaste este cambio, contáctanos de inmediato.
      </div>
    </div>
    <div style="padding:30px;text-align:center;">
      <a href="${loginUrl}"
         style="background-color:${ACCENT_COLOR};color:#ffffff;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;display:inline-block;padding:16px 40px;">
        Inicia Sesión
      </a>
    </div>
    <div style="padding:20px 30px;background-color:${LIGHT_BG};text-align:center;">
      <a href="${loginUrl}" style="color:${BRAND_COLOR};text-decoration:none;font-size:14px;font-weight:500;margin:0 16px;">Portal de Cursos</a>
      <a href="mailto:soporte@aprende-excel.com" style="color:${BRAND_COLOR};text-decoration:none;font-size:14px;font-weight:500;margin:0 16px;">Soporte</a>
    </div>
    <div style="height:1px;background-color:#e0e0e0;margin:0 30px;"></div>
    <div style="padding:30px;background-color:#fafafa;text-align:center;">
      <p style="font-size:12px;color:#999999;margin:8px 0;line-height:1.5;">
        ¿Necesitas ayuda? Contáctanos en
        <a href="mailto:soporte@aprende-excel.com" style="color:${BRAND_COLOR};text-decoration:none;font-weight:500;">soporte@aprende-excel.com</a>
      </p>
      <p style="font-size:12px;color:#999999;margin:8px 0;">© 2024 Aprende Excel. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;
};

// Envío via HTTP API de Resend (evita ETIMEDOUT contra smtp.resend.com en hosts con egress SMTP bloqueado)
const sendViaResendApi = async (opts: { from: string; to: string; subject: string; html: string }): Promise<void> => {
  const apiKey = process.env.EMAIL_PASS || "";
  if (!apiKey.startsWith("re_")) {
    throw new Error("EMAIL_PASS no es una API key de Resend valida (debe empezar con 're_')");
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(opts),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Resend API ${resp.status}: ${detail}`);
  }
};

const useResendHttp = (process.env.EMAIL_PASS || "").startsWith("re_");

const sendResetPasswordEmail = async (
  email: string,
  nombre: string,
  password: string,
): Promise<void> => {
  const loginUrl = process.env.ACADEMIA_URL || "https://academia.aprende-excel.com";
  const fromAddress = process.env.EMAIL_FROM || '"Academia Aprende Excel" <soporte@aprende-excel.com>';
  const subject     = "Restablecimiento de contraseña - Academia Aprende Excel";
  const html        = buildResetPasswordHtml(nombre, email, password, loginUrl);

  if (useResendHttp) {
    await sendViaResendApi({ from: fromAddress, to: email, subject, html });
    return;
  }

  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || "smtp.resend.com",
    port:   parseInt(process.env.EMAIL_PORT || "465"),
    secure: process.env.EMAIL_SECURE !== "false",
    auth: {
      user: process.env.EMAIL_USER || "resend",
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });

  await transporter.sendMail({ from: fromAddress, to: email, subject, html });
};

// ─── DB HELPERS ──────────────────────────────────────────────────────────────
const parseUser = (u: any) => ({
  ...u,
  progreso:
    typeof u.progreso === "string"
      ? JSON.parse(u.progreso || "{}")
      : u.progreso || {},
});

const getUserByEmail = async (email: string): Promise<any | null> => {
  const [rows] = await getPool().query(
    "SELECT * FROM academia_usuarios WHERE email = ? LIMIT 1",
    [email]
  );
  const user = (rows as any[])[0];
  return user ? parseUser(user) : null;
};

const getUsers = async (): Promise<any[]> => {
  const [rows] = await getPool().query("SELECT * FROM academia_usuarios");
  return (rows as any[]).map(parseUser);
};

const saveUser = async (user: any): Promise<void> => {
  await getPool().query(
    `INSERT INTO academia_usuarios
       (id, email, password, nombre, apellido, cursos, activo, vencimiento, progreso, fecha_creacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       password=VALUES(password), nombre=VALUES(nombre), apellido=VALUES(apellido),
       cursos=VALUES(cursos), activo=VALUES(activo), vencimiento=VALUES(vencimiento),
       progreso=VALUES(progreso)`,
    [
      user.id,
      user.email,
      user.password,
      user.nombre,
      user.apellido || "",
      user.cursos || "",
      user.activo ?? 1,
      user.vencimiento || null,
      JSON.stringify(user.progreso || {}),
      user.fecha_creacion || new Date().toISOString().split("T")[0],
    ]
  );
};

const updateUserFields = async (
  email: string,
  fields: Record<string, any>
): Promise<void> => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `\`${k}\`=?`).join(", ");
  const values = keys.map((k) =>
    k === "progreso" ? JSON.stringify(fields[k]) : fields[k]
  );
  await getPool().query(
    `UPDATE academia_usuarios SET ${setClause} WHERE email=?`,
    [...values, email]
  );
};

const getUserProgress = async (
  email: string
): Promise<Record<string, string[]>> => {
  const user = await getUserByEmail(email);
  return user?.progreso || {};
};

const addUserProgress = async (
  email: string,
  courseId: string,
  leccionId: string
): Promise<void> => {
  const user = await getUserByEmail(email);
  const progreso: Record<string, string[]> = user?.progreso || {};
  if (!progreso[courseId]) progreso[courseId] = [];
  if (!progreso[courseId].includes(leccionId)) progreso[courseId].push(leccionId);
  await updateUserFields(email, { progreso });
};

const getCourseDb = async (id: number): Promise<any | null> => {
  const [rows] = await getPool().query(
    "SELECT * FROM academia_cursos WHERE id = ? LIMIT 1",
    [id]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    ...row,
    precios_paises: typeof row.precios_paises === "string"
      ? JSON.parse(row.precios_paises || "{}")
      : row.precios_paises || {},
  };
};

const getAllCoursesDb = async (): Promise<Record<number, any>> => {
  const [rows] = await getPool().query("SELECT * FROM academia_cursos");
  const map: Record<number, any> = {};
  for (const row of rows as any[]) {
    map[row.id] = {
      ...row,
      precios_paises: typeof row.precios_paises === "string"
        ? JSON.parse(row.precios_paises || "{}")
        : row.precios_paises || {},
    };
  }
  return map;
};

const upsertCourseDb = async (id: number, fields: {
  stripe_price_id?: string;
  precio_ars?: number;
  precio_usd?: number;
  precios_paises?: Record<string, any>;
  activo?: number;
}): Promise<void> => {
  await getPool().query(
    `INSERT INTO academia_cursos (id, stripe_price_id, precio_ars, precio_usd, precios_paises, activo)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       stripe_price_id=VALUES(stripe_price_id),
       precio_ars=VALUES(precio_ars),
       precio_usd=VALUES(precio_usd),
       precios_paises=VALUES(precios_paises),
       activo=VALUES(activo)`,
    [
      id,
      fields.stripe_price_id ?? "",
      fields.precio_ars ?? 0,
      fields.precio_usd ?? 0,
      JSON.stringify(fields.precios_paises ?? {}),
      fields.activo ?? 1,
    ]
  );
};

// ─── PDF COURSES (MySQL) ─────────────────────────────────────────────────────
let _pdfTableReady = false;
const ensurePdfTable = async (): Promise<void> => {
  if (_pdfTableReady) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS academia_pdf_cursos (
      id BIGINT NOT NULL AUTO_INCREMENT,
      slug VARCHAR(255) NOT NULL,
      nombre VARCHAR(500) NOT NULL,
      descripcion TEXT NULL,
      imagen_url TEXT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      modulos JSON NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  _pdfTableReady = true;
};

const parsePdfCourse = (row: any): any => ({
  ...row,
  modulos: typeof row.modulos === "string" ? JSON.parse(row.modulos || "[]") : (row.modulos ?? []),
});

const getPdfCourses = async (): Promise<any[]> => {
  await ensurePdfTable();
  const [rows] = await getPool().query("SELECT * FROM academia_pdf_cursos ORDER BY id");
  return (rows as any[]).map(parsePdfCourse);
};

const getPdfCourseById = async (id: number): Promise<any | null> => {
  await ensurePdfTable();
  const [rows] = await getPool().query("SELECT * FROM academia_pdf_cursos WHERE id = ? LIMIT 1", [id]);
  const row = (rows as any[])[0];
  return row ? parsePdfCourse(row) : null;
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const generatePassword = (len = 12): string => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

// ─── JWT ─────────────────────────────────────────────────────────────────────
const signToken = (user: any) =>
  jwt.sign(
    {
      id:      user.id,
      nombre:  user.nombre,
      email:   user.email,
      inicial: user.inicial,
      role:    user.role,
      foto_url: user.foto_url ?? null,
      cursos:  user.cursos ?? "",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
};

// ─── MIDDLEWARES ─────────────────────────────────────────────────────────────
const requireAuth = (req: any, res: any, next: any) => {
  const auth  = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "Token invalido" });
  req.user = user;
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  const auth  = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  const user = verifyToken(token);
  if (!user || user.role !== "admin")
    return res.status(403).json({ error: "No autorizado" });
  req.user = user;
  next();
};

// ─── VIMEO ───────────────────────────────────────────────────────────────────
const VIMEO_TOKEN = process.env.VIMEO_TOKEN || "713ab24da995946cc8ebeaabd1a90880";
const FOLDER_IDS  = [
  "12286845", // excel
  "12286854", // excel_intermedio
  "12052707", // excel_avanzado
  "12305404", // sql
  "13018504", // windows_server
  "12107061", // pbi_avanzado
  "12305086", // powerbi
  "12072965", // powerpoint
  "12073015", // word
  "14775505", // aleman
  "12776926", // italiano
  "16225291", // italiano_intermedio (A2)
  "16790466", // italiano_avanzado (B1)
  "13968526", // frances
  "12727702", // ingles
  "12727823", // ingles_intermedio
  "13968522", // japones
];
let vimeoCourses: any[]               = [];
let vimeoLessons: Record<number, any[]> = {};
let vimeoLoadPromise: Promise<void> | null = null;

async function loadVimeo() {
  if (vimeoLoadPromise) return vimeoLoadPromise;
  vimeoLoadPromise = (async () => {
    const results = await Promise.all(
      FOLDER_IDS.map(async (folderId) => {
        try {
          const [folderRes, videosRes] = await Promise.all([
            fetch(`https://api.vimeo.com/me/projects/${folderId}`, {
              headers: { Authorization: `Bearer ${VIMEO_TOKEN}` },
            }),
            fetch(
              `https://api.vimeo.com/me/projects/${folderId}/videos?per_page=100&sort=date&direction=asc`,
              { headers: { Authorization: `Bearer ${VIMEO_TOKEN}` } }
            ),
          ]);
          if (!folderRes.ok) return null;
          const [folderData, videosData]: [any, any] = await Promise.all([
            folderRes.json(),
            videosRes.json(),
          ]);
          const courseId = parseInt(folderId);
          const videos: any[] = (videosRes.ok ? videosData.data : []) || [];
          videos.sort(
            (a: any, b: any) =>
              parseInt(a.name.match(/\d+/)?.[0] || "0") -
              parseInt(b.name.match(/\d+/)?.[0] || "0")
          );
          const lessons = videos.map((v: any) => {
            const vimeo_id = v.uri.split("/").pop();
            return {
              id: vimeo_id, titulo: v.name, vimeo_id,
              duracion: v.duration, completada: false,
            };
          });
          return {
            courseId,
            course: {
              id:          courseId,
              nombre:      folderData.name,
              descripcion: folderData.description || `Curso de ${folderData.name}`,
              imagen_url:
                videos?.[0]?.pictures?.base_link ||
                `https://picsum.photos/seed/${folderId}/400/250`,
              progreso:           0,
              total_lecciones:    lessons.length,
              lecciones_completadas: 0,
            },
            lessons,
          };
        } catch (e) {
          console.error(`Error cargando curso ${folderId}:`, e);
          return null;
        }
      })
    );
    for (const r of results) {
      if (r) {
        vimeoCourses.push(r.course);
        vimeoLessons[r.courseId] = r.lessons;
      }
    }
  })();
  return vimeoLoadPromise;
}

// ─── EXPRESS APP ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "10mb" }));

// ─── POST /api/webhook/purchase ───────────────────────────────────────────────
// Llamado por la landing PHP tras confirmar el pago.
// Requiere header: x-webhook-secret: <WEBHOOK_SECRET>
// Body: { email, nombre, apellido?, cursos: string[] }
app.post("/api/webhook/purchase", async (req, res) => {
  const secret = req.headers["x-webhook-secret"];
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  const { email: rawEmail, nombre, apellido, cursos } = req.body;
  if (!rawEmail || !nombre || !Array.isArray(cursos) || cursos.length === 0)
    return res
      .status(400)
      .json({ error: "Campos requeridos: email, nombre, cursos[]" });

  const email = (rawEmail as string).toLowerCase().trim();
  try {
    const existing = await getUserByEmail(email);

    if (existing) {
      const current = (existing.cursos as string).split("|").filter(Boolean);
      const toAdd   = (cursos as string[]).filter((c) => !current.includes(c));
      if (toAdd.length > 0)
        await updateUserFields(email, { cursos: [...current, ...toAdd].join("|") });
      return res.json({ status: "ok", created: false });
    }

    const password = generatePassword();
    const hashed   = await bcrypt.hash(password, 10);
    await saveUser({
      id:             Date.now(),
      email,
      password:       hashed,
      nombre:         (nombre as string).trim(),
      apellido:       ((apellido as string) || "").trim(),
      cursos:         (cursos as string[]).join("|"),
      activo:         1,
      fecha_creacion: new Date().toISOString().split("T")[0],
      progreso:       {},
    });

    await sendWelcomeEmail(email, (nombre as string).trim(), password);
    return res.json({ status: "ok", created: true });
  } catch (e) {
    console.error("Error en webhook/purchase:", e);
    return res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /api/test/email ──────────────────────────────────────────────────────
// Uso: /api/test/email?secret=<WEBHOOK_SECRET>&email=tucorreo@gmail.com
app.get("/api/test/email", async (req, res) => {
  const { secret, email } = req.query as { secret: string; email: string };
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET)
    return res.status(401).json({ error: "No autorizado" });
  if (!email) return res.status(400).json({ error: "Falta el parámetro email" });
  try {
    const password = generatePassword();
    await sendWelcomeEmail(email, "Test", password);
    return res.json({ status: "ok", message: `Email de prueba enviado a ${email}`, password });
  } catch (e: any) {
    return res.status(500).json({ error: "Error al enviar email", detail: e?.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email: rawEmail, password } = req.body;
  const email = rawEmail?.toLowerCase().trim();
  if (!email || !password)
    return res.status(400).json({ error: "Email y contrasena requeridos" });

  try {
    const user = await getUserByEmail(email);
    if (!user)
      return res.status(401).json({ error: "Credenciales incorrectas" });
    if (!user.activo)
      return res.status(403).json({ error: "Cuenta desactivada." });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const role     = ADMIN_EMAILS.includes(email) ? "admin" : "user";
    const userData = {
      id:      user.id,
      nombre:  `${user.nombre} ${user.apellido || ""}`.trim(),
      email:   user.email,
      inicial: user.nombre.charAt(0).toUpperCase(),
      role,
      foto_url: null,
      cursos:  user.cursos || "",
    };
    return res.json({
      status: "ok", role, token: signToken(userData), usuario: userData,
    });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err?.message || err);
    return res.status(500).json({ error: "Error interno", detalle: err?.message || String(err) });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { email: rawEmail, password, nombre, apellido, cursos } = req.body;
  if (!rawEmail || !password || !nombre)
    return res.status(400).json({ error: "Faltan datos" });
  const email = (rawEmail as string).toLowerCase().trim();
  try {
    if (await getUserByEmail(email))
      return res.status(400).json({ error: "El usuario ya existe" });
    const hashed = await bcrypt.hash(password, 10);
    await saveUser({
      id: Date.now(), email, password: hashed,
      nombre, apellido: apellido || "", cursos: cursos || "",
      activo: 1, fecha_creacion: new Date().toISOString().split("T")[0],
      progreso: {},
    });
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

app.get("/api/auth/perfil", requireAuth, (req: any, res) =>
  res.json({ usuario: req.user })
);

app.post("/api/auth/logout", (_, res) => res.json({ status: "ok" }));

app.post("/api/auth/update-profile", requireAuth, (req: any, res) => {
  const { nombre, email, foto_url } = req.body;
  if (!nombre || !email)
    return res.status(400).json({ error: "Nombre y email requeridos" });
  const updated = {
    ...req.user, nombre, email,
    inicial: (nombre as string).charAt(0).toUpperCase(),
    foto_url: foto_url ?? req.user.foto_url,
  };
  res.json({ status: "ok", usuario: updated, token: signToken(updated) });
});

app.post("/api/auth/change-password", requireAuth, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Campos requeridos" });
  try {
    const user = await getUserByEmail(req.user.email);
    if (!user)
      return res.status(404).json({ error: "Usuario no encontrado" });
    if (!await bcrypt.compare(currentPassword, user.password))
      return res.status(401).json({ error: "Contrasena actual incorrecta" });
    await updateUserFields(req.user.email, {
      password: await bcrypt.hash(newPassword, 10),
    });
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const rawEmail = req.body?.email;
  if (!rawEmail)
    return res.status(400).json({ error: "Email requerido" });
  const email = String(rawEmail).toLowerCase().trim();
  try {
    const user = await getUserByEmail(email);
    // Respuesta neutra: no confirmamos existencia del email para prevenir enumeración.
    if (!user) return res.json({ status: "ok" });
    if (!user.activo)
      return res.status(403).json({ error: "Cuenta desactivada. Contacta a soporte." });

    // 1) Generamos la contraseña y la guardamos en la base YA.
    //    Si el mail falla, el usuario puede volver a pedir reset.
    const newPassword = generatePassword();
    const hashed      = await bcrypt.hash(newPassword, 10);
    await updateUserFields(email, { password: hashed });

    // 2) Respondemos de inmediato (no bloqueamos al frontend esperando al SMTP).
    res.json({ status: "ok" });

    // 3) Mail en background. Si falla queda logueado.
    sendResetPasswordEmail(email, user.nombre || "", newPassword).catch((mailErr: any) => {
      console.error("RESET-PASSWORD mail error (background):", mailErr?.message || mailErr);
    });
    return;
  } catch (e: any) {
    console.error("RESET-PASSWORD ERROR:", e?.message || e);
    if (!res.headersSent) return res.status(500).json({ error: "No se pudo restablecer la contraseña" });
  }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────
app.get("/api/admin/dashboard", requireAdmin, async (_, res) => {
  try {
    const [users, coursesDb] = await Promise.all([getUsers(), getAllCoursesDb()]);

    const usuariosConCurso = users.filter((u: any) =>
      (u.cursos || "").split("|").filter(Boolean).length > 0
    );

    const tsOf = (u: any): number => {
      if (u.fecha_creacion) {
        const t = new Date(u.fecha_creacion).getTime();
        if (!isNaN(t)) return t;
      }
      return typeof u.id === "number" ? u.id : 0;
    };

    const formatFecha = (u: any): string => {
      if (u.fecha_creacion) {
        const d = new Date(u.fecha_creacion);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      }
      if (typeof u.id === "number" && u.id > 1e12) {
        return new Date(u.id).toISOString().split("T")[0];
      }
      return "-";
    };

    const recent = [...usuariosConCurso]
      .sort((a: any, b: any) => tsOf(b) - tsOf(a))
      .slice(0, 10);

    const ultimasCompras = recent.map((u: any) => {
      const slugs = (u.cursos || "").split("|").filter(Boolean);
      const firstSlug = slugs[0] || "";
      const vimeoId = parseInt(COURSE_MAPPING[firstSlug] || "0");
      const curso   = COURSE_NAMES[firstSlug] || firstSlug || "-";
      const monto   = vimeoId && coursesDb[vimeoId]?.precio_ars ? coursesDb[vimeoId].precio_ars : 0;
      return {
        email:  u.email,
        nombre: `${u.nombre} ${u.apellido || ""}`.trim(),
        curso,
        monto,
        fecha:  formatFecha(u),
      };
    });

    res.json({
      stats: {
        totalAlumnos:   users.length,
        alumnosActivos: users.filter((u: any) => u.activo).length,
        cursosActivos:  FOLDER_IDS.length,
      },
      ultimasCompras,
    });
  } catch (e) {
    console.error("Error en /api/admin/dashboard:", e);
    res.status(500).json({ error: "Error interno" });
  }
});

app.get("/api/admin/usuarios", requireAdmin, async (req, res) => {
  try {
    const q     = (req.query.buscar as string)?.toLowerCase();
    const users = await getUsers();
    const result = users.map((u) => ({
      email:        u.email,
      nombre:       `${u.nombre} ${u.apellido || ""}`.trim(),
      cursos:       (u.cursos || "").split("|").filter(Boolean).length,
      registro:     u.fecha_creacion,
      activo:       !!u.activo,
      vencimiento:  u.vencimiento || "",
      cursos_slugs: u.cursos || "",
    }));
    res.json({
      usuarios: q
        ? result.filter(
            (u) =>
              u.nombre.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q)
          )
        : result,
    });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

app.post("/api/admin/usuarios/suscripcion", requireAdmin, async (req, res) => {
  const { email, meses, activo } = req.body;
  try {
    const fields: Record<string, any> = {};
    if (meses !== undefined) {
      const d = new Date();
      d.setMonth(d.getMonth() + parseInt(meses));
      fields.vencimiento = d.toISOString().split("T")[0];
      fields.activo      = 1;
    }
    if (activo !== undefined) fields.activo = activo ? 1 : 0;
    await updateUserFields(email, fields);
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

app.put("/api/admin/usuarios/:email", requireAdmin, async (req, res) => {
  const { email }                        = req.params;
  const { nombre, cursos, activo, vencimiento } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (user) {
      const fields: Record<string, any> = {};
      if (nombre      !== undefined) fields.nombre      = nombre;
      if (cursos      !== undefined) fields.cursos      = cursos;
      if (activo      !== undefined) fields.activo      = activo ? 1 : 0;
      if (vencimiento !== undefined) fields.vencimiento = vencimiento;
      if (Object.keys(fields).length > 0) await updateUserFields(email, fields);
    } else {
      await saveUser({
        id: Date.now(), email, password: "",
        nombre: nombre || "", apellido: "",
        cursos: cursos || "",
        activo: activo !== undefined ? (activo ? 1 : 0) : 1,
        vencimiento: vencimiento || null,
        progreso: {},
        fecha_creacion: new Date().toISOString().split("T")[0],
      });
    }
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

app.delete("/api/admin/usuarios/:email", requireAdmin, async (req, res) => {
  try {
    await getPool().query("DELETE FROM academia_usuarios WHERE email = ?", [
      req.params.email,
    ]);
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

app.get("/api/admin/ventas", requireAdmin, (_, res) =>
  res.json({ ventas: [] })
);

// ─── ADMIN PDF COURSES ────────────────────────────────────────────────────────
app.get("/api/admin/cursos-pdf", requireAdmin, async (_req, res) => {
  try { res.json({ cursos: await getPdfCourses() }); }
  catch { res.status(500).json({ error: "Error interno" }); }
});

app.post("/api/admin/cursos-pdf", requireAdmin, async (req, res) => {
  const { nombre, descripcion, imagen_url, slug } = req.body;
  if (!nombre || !slug) return res.status(400).json({ error: "Nombre y slug son requeridos" });
  try {
    await ensurePdfTable();
    const [result]: any = await getPool().query(
      "INSERT INTO academia_pdf_cursos (slug, nombre, descripcion, imagen_url, activo, modulos) VALUES (?, ?, ?, ?, 1, '[]')",
      [slug, nombre, descripcion || "", imagen_url || ""]
    );
    const curso = await getPdfCourseById(result.insertId);
    res.json({ status: "ok", curso });
  } catch (e: any) {
    if (e?.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "El slug ya existe" });
    res.status(500).json({ error: "Error interno" });
  }
});

app.put("/api/admin/cursos-pdf/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, descripcion, imagen_url, slug, activo } = req.body;
  try {
    const fields: string[] = [];
    const vals: any[] = [];
    if (nombre      !== undefined) { fields.push("nombre=?");      vals.push(nombre); }
    if (descripcion !== undefined) { fields.push("descripcion=?"); vals.push(descripcion); }
    if (imagen_url  !== undefined) { fields.push("imagen_url=?");  vals.push(imagen_url); }
    if (slug        !== undefined) { fields.push("slug=?");        vals.push(slug); }
    if (activo      !== undefined) { fields.push("activo=?");      vals.push(activo ? 1 : 0); }
    if (fields.length) await getPool().query(`UPDATE academia_pdf_cursos SET ${fields.join(",")} WHERE id=?`, [...vals, id]);
    res.json({ status: "ok", curso: await getPdfCourseById(id) });
  } catch { res.status(500).json({ error: "Error interno" }); }
});

app.delete("/api/admin/cursos-pdf/:id", requireAdmin, async (req, res) => {
  try {
    await ensurePdfTable();
    await getPool().query("DELETE FROM academia_pdf_cursos WHERE id=?", [parseInt(req.params.id)]);
    res.json({ status: "ok" });
  } catch { res.status(500).json({ error: "Error interno" }); }
});

app.post("/api/admin/cursos-pdf/:id/modulos", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { titulo, pdf_url, orden } = req.body;
  if (!titulo || !pdf_url) return res.status(400).json({ error: "Titulo y URL del PDF son requeridos" });
  try {
    const course = await getPdfCourseById(id);
    if (!course) return res.status(404).json({ error: "Curso no encontrado" });
    const modulo = { id: `pdf_${id}_${Date.now()}`, titulo, pdf_url, orden: orden ?? (course.modulos.length + 1) };
    const modulos = [...course.modulos, modulo].sort((a: any, b: any) => a.orden - b.orden);
    await getPool().query("UPDATE academia_pdf_cursos SET modulos=? WHERE id=?", [JSON.stringify(modulos), id]);
    res.json({ status: "ok", modulo });
  } catch { res.status(500).json({ error: "Error interno" }); }
});

app.put("/api/admin/cursos-pdf/:id/modulos/:moduloId", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { moduloId } = req.params;
  const { titulo, pdf_url, orden } = req.body;
  try {
    const course = await getPdfCourseById(id);
    if (!course) return res.status(404).json({ error: "Curso no encontrado" });
    const modulos = course.modulos.map((m: any) => {
      if (m.id !== moduloId) return m;
      return { ...m, ...(titulo !== undefined && { titulo }), ...(pdf_url !== undefined && { pdf_url }), ...(orden !== undefined && { orden }) };
    }).sort((a: any, b: any) => a.orden - b.orden);
    await getPool().query("UPDATE academia_pdf_cursos SET modulos=? WHERE id=?", [JSON.stringify(modulos), id]);
    res.json({ status: "ok", modulo: modulos.find((m: any) => m.id === moduloId) });
  } catch { res.status(500).json({ error: "Error interno" }); }
});

app.delete("/api/admin/cursos-pdf/:id/modulos/:moduloId", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { moduloId } = req.params;
  try {
    const course = await getPdfCourseById(id);
    if (!course) return res.status(404).json({ error: "Curso no encontrado" });
    const modulos = course.modulos.filter((m: any) => m.id !== moduloId);
    await getPool().query("UPDATE academia_pdf_cursos SET modulos=? WHERE id=?", [JSON.stringify(modulos), id]);
    res.json({ status: "ok" });
  } catch { res.status(500).json({ error: "Error interno" }); }
});

// ─── CURSOS ───────────────────────────────────────────────────────────────────
app.get("/api/cursos/mis-cursos", requireAuth, async (req: any, res) => {
  await loadVimeo();
  const [progreso, dbUser, dbCourses, pdfAll] = await Promise.all([
    getUserProgress(req.user.email),
    getUserByEmail(req.user.email),
    getAllCoursesDb(),
    getPdfCourses(),
  ]);
  const slugs = (dbUser?.cursos ?? req.user.cursos ?? "") as string;
  const slugList = slugs.split("|").filter(Boolean);

  const cursosBase =
    req.user.role === "admin"
      ? vimeoCourses
      : (() => {
          const ids = expandSlugsToIds(slugList);
          return vimeoCourses.filter((c) => ids.includes(c.id.toString()));
        })();

  const cursosPdf = (req.user.role === "admin"
    ? pdfAll
    : pdfAll.filter((c: any) => c.activo && slugList.includes(c.slug))
  ).map((c: any) => {
    const done  = (progreso[c.id.toString()] || []).length;
    const total = c.modulos.length;
    return {
      id: c.id, nombre: c.nombre, descripcion: c.descripcion, imagen_url: c.imagen_url,
      tipo: "pdf", slug: c.slug, activo: !!c.activo,
      stripe_price_id: "", precio_ars: 0, precio_usd: 0, precios_paises: {},
      lecciones_completadas: done, total_lecciones: total,
      progreso: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  res.json({
    cursos: [
      ...cursosBase.map((c) => {
        const done    = (progreso[c.id.toString()] || []).length;
        const total   = c.total_lecciones;
        const dbExtra = dbCourses[c.id] || {};
        return {
          ...c,
          stripe_price_id: dbExtra.stripe_price_id ?? "",
          precio_ars:      dbExtra.precio_ars ?? 0,
          precio_usd:      dbExtra.precio_usd ?? 0,
          precios_paises:  dbExtra.precios_paises ?? {},
          activo:          dbExtra.activo !== undefined ? !!dbExtra.activo : true,
          lecciones_completadas: done,
          progreso: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      }),
      ...cursosPdf,
    ],
  });
});

// ─── ADMIN CURSOS ─────────────────────────────────────────────────────────────
app.put("/api/admin/cursos/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  const { stripe_price_id, precio_ars, precio_usd, precios_paises, activo } = req.body;
  try {
    await upsertCourseDb(id, { stripe_price_id, precio_ars, precio_usd, precios_paises, activo });
    res.json({ status: "ok" });
  } catch (e) {
    console.error("Error updating course:", e);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

app.get("/api/cursos/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);

  const pdfCourse = await getPdfCourseById(id);
  if (pdfCourse) {
    if (req.user.role !== "admin") {
      const dbUser = await getUserByEmail(req.user.email);
      const slugList = (dbUser?.cursos ?? req.user.cursos ?? "").split("|").filter(Boolean);
      if (!slugList.includes(pdfCourse.slug))
        return res.status(403).json({ error: "No tenes acceso a este curso" });
    }
    const completadas = (await getUserProgress(req.user.email))[id.toString()] || [];
    const lecciones = pdfCourse.modulos.map((m: any) => ({
      id: m.id, titulo: m.titulo, pdf_url: m.pdf_url, vimeo_id: "", duracion: 0,
      completada: completadas.includes(m.id), tipo: "pdf", orden: m.orden,
    }));
    const done = lecciones.filter((l: any) => l.completada).length;
    const total = lecciones.length;
    return res.json({
      curso: { ...pdfCourse, lecciones_completadas: done, total_lecciones: total, progreso: total > 0 ? Math.round((done / total) * 100) : 0 },
      lecciones,
    });
  }

  await loadVimeo();
  const curso = vimeoCourses.find((c) => c.id === id);
  if (!curso)
    return res.status(404).json({ error: "Curso no encontrado" });

  if (req.user.role !== "admin") {
    const dbUser = await getUserByEmail(req.user.email);
    const slugs  = (dbUser?.cursos ?? req.user.cursos ?? "") as string;
    const ids    = expandSlugsToIds(slugs.split("|").filter(Boolean));
    if (!ids.includes(id.toString()))
      return res.status(403).json({ error: "No tenes acceso a este curso" });
  }

  const completadas = (await getUserProgress(req.user.email))[id.toString()] || [];
  const lecciones   = (vimeoLessons[id] || []).map((l: any) => ({
    ...l, completada: completadas.includes(l.id),
  }));
  const done  = lecciones.filter((l: any) => l.completada).length;
  const total = lecciones.length;

  res.json({
    curso: {
      ...curso,
      lecciones_completadas: done,
      progreso: total > 0 ? Math.round((done / total) * 100) : 0,
    },
    lecciones,
  });
});

app.post("/api/cursos/progreso/:leccionId", requireAuth, async (req: any, res) => {
  const { leccionId }        = req.params;
  const { completada, courseId } = req.body;
  if (!completada || !courseId) return res.json({ status: "ok", leccionId });

  try {
    await addUserProgress(req.user.email, courseId.toString(), leccionId);
    res.json({ status: "ok", leccionId });
  } catch (err) {
    console.error("Error saving progress:", err);
    res.status(500).json({ error: "No se pudo guardar el progreso" });
  }
});

// ─── VERCEL SERVERLESS HANDLER ───────────────────────────────────────────────
export default function handler(req: any, res: any) {
  return app(req, res);
}
