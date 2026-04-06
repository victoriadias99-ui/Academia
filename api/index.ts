import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const JWT_SECRET     = process.env.JWT_SECRET     || "academia-excel-jwt-secret-2024";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const ACADEMIA_URL   = process.env.ACADEMIA_URL   || "https://academia-aprende-excel.vercel.app";
const ADMIN_EMAILS   = ["victoria.pdias99@gmail.com", "admin@gmail.com"];

const COURSE_MAPPING: Record<string, string> = {
  excel:            "12286845",
  excel_intermedio: "12286854",
  excel_avanzado:   "12052707",
  excel_promo:      "12305404",
};

const COURSE_NAMES: Record<string, string> = {
  excel:            "Excel Nivel Inicial",
  excel_intermedio: "Excel Nivel Intermedio",
  excel_avanzado:   "Excel Nivel Avanzado",
  excel_promo:      "Pack Excel Completo",
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
const sendWelcomeEmail = async (
  email: string,
  nombre: string,
  password: string,
  cursos: string[]
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const cursoList = cursos
    .map((c) => `<li style="margin:6px 0;">${COURSE_NAMES[c] || c}</li>`)
    .join("");

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || '"Academia Aprende Excel" <academia@aprendeexcel.com>',
    to:      email,
    subject: "Bienvenido/a a la Academia Aprende Excel - Tus credenciales de acceso",
    html: `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;background:#fff;">
  <div style="text-align:center;margin-bottom:28px;">
    <h1 style="color:#1a5276;margin:0;font-size:26px;">Academia Aprende Excel</h1>
  </div>
  <h2 style="color:#1a5276;">Hola, ${nombre}!</h2>
  <p>Tu compra fue confirmada. Ya podes acceder a tus cursos:</p>
  <ul style="background:#eaf4fb;padding:14px 28px;border-radius:8px;margin:16px 0;">
    ${cursoList}
  </ul>
  <h3 style="margin-top:28px;color:#1a5276;">Tus credenciales de acceso</h3>
  <table style="border-collapse:collapse;width:100%;background:#f8f9fa;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="padding:12px 20px;font-weight:bold;border-bottom:1px solid #dee2e6;width:130px;">Usuario</td>
      <td style="padding:12px 20px;border-bottom:1px solid #dee2e6;">${email}</td>
    </tr>
    <tr>
      <td style="padding:12px 20px;font-weight:bold;">Contrasena</td>
      <td style="padding:12px 20px;font-family:monospace;font-size:18px;letter-spacing:3px;font-weight:bold;">${password}</td>
    </tr>
  </table>
  <div style="text-align:center;margin:36px 0 24px;">
    <a href="${ACADEMIA_URL}"
       style="background:#1a5276;color:#fff;padding:14px 36px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">
      Ingresar a la Academia
    </a>
  </div>
  <p style="color:#777;font-size:13px;">
    Por seguridad, te recomendamos cambiar tu contrasena desde tu perfil luego del primer ingreso.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
  <p style="color:#aaa;font-size:12px;text-align:center;">
    Si no realizaste esta compra, ignora este email o contactanos a traves de nuestro sitio.
  </p>
</body>
</html>`,
  });
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
  "12286845", "12286854", "12052707",
  "12305404", "13018504", "12107061", "12305086",
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

    await sendWelcomeEmail(email, (nombre as string).trim(), password, cursos as string[]);
    return res.json({ status: "ok", created: true });
  } catch (e) {
    console.error("Error en webhook/purchase:", e);
    return res.status(500).json({ error: "Error interno" });
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
  } catch {
    return res.status(500).json({ error: "Error interno" });
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

app.post("/api/auth/reset-password", (req, res) => {
  if (!req.body.email)
    return res.status(400).json({ error: "Email requerido" });
  res.json({ status: "ok" });
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────
app.get("/api/admin/dashboard", requireAdmin, async (_, res) => {
  try {
    const users = await getUsers();
    res.json({
      stats: {
        totalAlumnos:  users.length,
        totalVentas:   users.length,
        ingresosUSD:   0,
        cursosActivos: FOLDER_IDS.length,
      },
      ultimasCompras: [],
    });
  } catch {
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

// ─── CURSOS ───────────────────────────────────────────────────────────────────
app.get("/api/cursos/mis-cursos", requireAuth, async (req: any, res) => {
  await loadVimeo();
  const progreso = await getUserProgress(req.user.email);
  const dbUser   = await getUserByEmail(req.user.email);
  const slugs    = (dbUser?.cursos ?? req.user.cursos ?? "") as string;

  const cursosBase =
    req.user.role === "admin"
      ? vimeoCourses
      : (() => {
          const ids = slugs
            .split("|")
            .filter(Boolean)
            .map((s: string) => COURSE_MAPPING[s] || s);
          return vimeoCourses.filter((c) => ids.includes(c.id.toString()));
        })();

  res.json({
    cursos: cursosBase.map((c) => {
      const done  = (progreso[c.id.toString()] || []).length;
      const total = c.total_lecciones;
      return {
        ...c,
        lecciones_completadas: done,
        progreso: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }),
  });
});

app.get("/api/cursos/:id", requireAuth, async (req: any, res) => {
  await loadVimeo();
  const id    = parseInt(req.params.id);
  const curso = vimeoCourses.find((c) => c.id === id);
  if (!curso)
    return res.status(404).json({ error: "Curso no encontrado" });

  if (req.user.role !== "admin") {
    const dbUser = await getUserByEmail(req.user.email);
    const slugs  = (dbUser?.cursos ?? req.user.cursos ?? "") as string;
    const ids    = slugs
      .split("|")
      .filter(Boolean)
      .map((s: string) => COURSE_MAPPING[s] || s);
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
  const { leccionId }  = req.params;
  const { completada } = req.body;
  if (!completada) return res.json({ status: "ok", leccionId });

  await loadVimeo();
  let courseId: string | null = null;
  for (const [cid, lessons] of Object.entries(vimeoLessons)) {
    if ((lessons as any[]).some((l: any) => l.id === leccionId)) {
      courseId = cid;
      break;
    }
  }
  if (!courseId) return res.json({ status: "ok", leccionId });

  await addUserProgress(req.user.email, courseId, leccionId);
  res.json({ status: "ok", leccionId });
});

// ─── VERCEL SERVERLESS HANDLER ───────────────────────────────────────────────
export default function handler(req: any, res: any) {
  return app(req, res);
}
