import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, BookOpen, PlayCircle, DollarSign, LogOut, Search, Plus, X,
  CheckCircle2, AlertCircle, ShieldCheck, ShieldX, Calendar, Edit2, Trash2,
  FileText, Link2, MessageSquare, Upload, FolderOpen, Bug, AlertTriangle, ShieldAlert,
  ChevronDown, ChevronRight, LifeBuoy, Mail, Phone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// JWT helper — lee el token guardado por App.tsx
const getToken = () => localStorage.getItem("token");
const authFetch = (url: string, options: RequestInit = {}) =>
  fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });

interface AdminStats { totalAlumnos: number; alumnosActivos: number; cursosActivos: number; }
interface Sale { email: string; nombre: string; curso: string; monto: number; fecha: string; }
interface Student { email: string; nombre: string; academia: string; cursos: number; cursos_slugs?: string; registro: string; ultimo_login: string; activo: boolean; vencimiento: string; role?: string; }

// Mapeo de Vimeo ID → slug (para cursos que tienen slug en el backend)
const VIMEO_TO_SLUG: Record<number, string> = {
  12286845: "excel",
  12286854: "excel_intermedio",
  12052707: "excel_avanzado",
  12305404: "sql",
  13018504: "windows_server",
  12107061: "pbi_avanzado",
  12305086: "powerbi",
  12072965: "powerpoint",
  12073015: "word",
  14775505: "aleman",
  12776926: "italiano",
  16225291: "italiano_intermedio",
  16790466: "italiano_avanzado",
  13968526: "frances",
  12727702: "ingles",
  12727823: "ingles_intermedio",
  13968522: "japones",
};

// Agrupación por academia. Usado por el selector del panel admin.
const ACADEMIA_EXCEL = "Aprende Excel";
const ACADEMIA_IDIOMAS = "Aprende Idiomas";
const IDIOMA_VIMEO_IDS = new Set<number>([
  14775505, 12776926, 16225291, 16790466, 13968526, 12727702, 12727823, 13968522,
]);
const IDIOMA_SLUGS = new Set<string>([
  "aleman", "italiano", "italiano_intermedio", "italiano_avanzado",
  "frances", "ingles", "ingles_intermedio", "japones",
  "pack_italiano_avanzado", "pack_italiano_ingles",
]);
const getCourseAcademia = (vimeoId: number): string =>
  IDIOMA_VIMEO_IDS.has(vimeoId) ? ACADEMIA_IDIOMAS : ACADEMIA_EXCEL;
const getAcademiaForIdentifier = (id: string): string => {
  if (IDIOMA_SLUGS.has(id)) return ACADEMIA_IDIOMAS;
  const n = parseInt(id, 10);
  if (!isNaN(n) && IDIOMA_VIMEO_IDS.has(n)) return ACADEMIA_IDIOMAS;
  return ACADEMIA_EXCEL;
};

// Devuelve el identificador a usar para un curso (slug si existe, ID de Vimeo como string si no)
const getCourseIdentifier = (vimeoId: number): string =>
  VIMEO_TO_SLUG[vimeoId] || vimeoId.toString();

// Devuelve el nombre legible de un identificador usando la lista de cursos
const getCourseDisplayName = (identifier: string, courseList: Course[]): string => {
  const course = courseList.find(c =>
    getCourseIdentifier(c.id) === identifier || c.id.toString() === identifier
  );
  return course?.nombre || identifier;
};
interface PrecioPais { precio: number; stripe_price_id: string; }
interface Course { id: number; nombre: string; academia: string; stripe_price_id: string; precio_ars: number; precio_usd: number; precios_paises?: Record<string, PrecioPais>; activo: boolean; descripcion?: string; imagen_url?: string; orden?: number; }

// Tasas de conversión USD → moneda local (mismas que logicprecios.php en la landing)
const TASAS_DESDE_USD: Record<string, number> = {
  ARS: 1100, MXN: 17.5, COP: 4000, CLP: 950, PEN: 3.7,
  UYU: 39,   PYG: 7300, BOB: 6.9,  BRL: 5.0, CRC: 530,
  GTQ: 7.8,  DOP: 57,   HNL: 24.5, NIO: 36.5,
  USD: 1,
};
const precioALocalAUSD = (precio: number, moneda: string): number => {
  const tasa = TASAS_DESDE_USD[moneda] || 1;
  return moneda === "USD" ? precio : Math.round((precio / tasa) * 100) / 100;
};

const LATAM_PAISES = [
  { codigo: "AR", nombre: "Argentina",            bandera: "🇦🇷", moneda: "ARS" },
  { codigo: "MX", nombre: "México",               bandera: "🇲🇽", moneda: "MXN" },
  { codigo: "CO", nombre: "Colombia",             bandera: "🇨🇴", moneda: "COP" },
  { codigo: "CL", nombre: "Chile",                bandera: "🇨🇱", moneda: "CLP" },
  { codigo: "PE", nombre: "Perú",                 bandera: "🇵🇪", moneda: "PEN" },
  { codigo: "UY", nombre: "Uruguay",              bandera: "🇺🇾", moneda: "UYU" },
  { codigo: "PY", nombre: "Paraguay",             bandera: "🇵🇾", moneda: "PYG" },
  { codigo: "BO", nombre: "Bolivia",              bandera: "🇧🇴", moneda: "BOB" },
  { codigo: "EC", nombre: "Ecuador",              bandera: "🇪🇨", moneda: "USD" },
  { codigo: "VE", nombre: "Venezuela",            bandera: "🇻🇪", moneda: "USD" },
  { codigo: "PA", nombre: "Panamá",               bandera: "🇵🇦", moneda: "USD" },
  { codigo: "SV", nombre: "El Salvador",          bandera: "🇸🇻", moneda: "USD" },
  { codigo: "BR", nombre: "Brasil",               bandera: "🇧🇷", moneda: "BRL" },
  { codigo: "CR", nombre: "Costa Rica",           bandera: "🇨🇷", moneda: "CRC" },
  { codigo: "GT", nombre: "Guatemala",            bandera: "🇬🇹", moneda: "GTQ" },
  { codigo: "DO", nombre: "Rep. Dominicana",      bandera: "🇩🇴", moneda: "DOP" },
  { codigo: "HN", nombre: "Honduras",             bandera: "🇭🇳", moneda: "HNL" },
  { codigo: "NI", nombre: "Nicaragua",            bandera: "🇳🇮", moneda: "NIO" },
];
interface Lesson { id: number; titulo: string; vimeo_id: string; duracion: number; preview: boolean; orden: number; }
interface Recurso { id: number; curso_id: string; tipo: "pdf" | "link" | "comentario"; titulo: string; contenido: string; created_at: string; }

type IssueCriticidad = "critica" | "alta" | "media" | "baja";
type IssueTipo = "bug" | "error" | "warning" | "seguridad" | "performance";
type IssueOrigen = "academia" | "landing";
interface Issue {
  id: string;
  titulo: string;
  archivo: string;
  detalles: string;
  criticidad: IssueCriticidad;
  tipo: IssueTipo;
  origen: IssueOrigen;
}

const ISSUES_CATALOG: Issue[] = [
  // ── Academia ─────────────────────────────────────────────────────────────
  { id: "SEC-001", titulo: "JWT secret hardcodeado y débil", archivo: "server_jwt.ts:9", detalles: "JWT_SECRET está hardcodeado como 'academia-excel-jwt-secret-2024' sin variable de entorno. Un atacante puede forjar tokens de admin.", criticidad: "critica", tipo: "seguridad", origen: "academia" },
  { id: "SEC-002", titulo: "Token de Vimeo expuesto en el repositorio", archivo: "server_jwt.ts:240", detalles: "VIMEO_TOKEN con valor por defecto hardcodeado. Cualquiera con acceso al repo puede consumir la cuenta de Vimeo.", criticidad: "critica", tipo: "seguridad", origen: "academia" },
  { id: "SEC-006", titulo: "Webhook /api/webhook/purchase sin HMAC", archivo: "server_jwt.ts:984-988", detalles: "El webhook valida un header plano en lugar de firma HMAC-SHA256. Permite replay y falsificación de compras.", criticidad: "critica", tipo: "seguridad", origen: "academia" },
  { id: "BUG-004", titulo: "Progreso de lecciones sin validar acceso al curso", archivo: "server_jwt.ts:724-747", detalles: "POST /api/cursos/progreso no verifica que el usuario tenga el curso. Un alumno puede marcar lecciones de cursos que no compró.", criticidad: "critica", tipo: "seguridad", origen: "academia" },
  { id: "SEC-003", titulo: "Email de admin hardcodeado", archivo: "server_jwt.ts:53, usuarios.json:4", detalles: "victoria.pdias99@gmail.com aparece hardcodeado como admin. Expone la cuenta principal al público del repo.", criticidad: "alta", tipo: "seguridad", origen: "academia" },
  { id: "SEC-005", titulo: "Login acepta contraseña en texto plano (legacy)", archivo: "server_jwt.ts:332-341", detalles: "Fallback para passwords sin hash sigue activo. Un atacante con acceso a la BD podría autenticarse directamente.", criticidad: "alta", tipo: "seguridad", origen: "academia" },
  { id: "SEC-004", titulo: "SQL update dinámico con field-keys sin lista blanca", archivo: "server_jwt.ts:188-194", detalles: "updateUserField concatena claves al SET. Si las keys vinieran de input, habría inyección SQL.", criticidad: "alta", tipo: "seguridad", origen: "academia" },
  { id: "PERF-003", titulo: "GET /api/admin/usuarios sin paginación", archivo: "AdminDashboard.tsx:206", detalles: "Devuelve todos los alumnos en una sola respuesta. A miles de filas puede colgar el navegador.", criticidad: "alta", tipo: "performance", origen: "academia" },
  { id: "BUG-002", titulo: "useEffect carga Google Fonts sin array de deps", archivo: "App.tsx:941-946", detalles: "El efecto se ejecuta en cada render e inyecta un nuevo <link>. Memory leak y duplicación de nodos.", criticidad: "media", tipo: "bug", origen: "academia" },
  { id: "BUG-001", titulo: "useEffect principal no incluye selectedRecursoCursoId", archivo: "AdminDashboard.tsx:166-172", detalles: "Cambiar de curso en la pestaña Recursos no dispara el refetch porque la dep falta.", criticidad: "media", tipo: "bug", origen: "academia" },
  { id: "PERF-001", titulo: "authFetch sin AbortController ni timeout", archivo: "App.tsx:49, AdminDashboard.tsx:11", detalles: "Si el backend no responde, las requests quedan colgadas y el UI se traba.", criticidad: "media", tipo: "warning", origen: "academia" },
  { id: "TYPE-001", titulo: "Uso excesivo de 'any' en server_jwt.ts", archivo: "server_jwt.ts:17,25,29,35", detalles: "Anula la seguridad de tipos. Refactorear a interfaces para req/res y usuarios.", criticidad: "media", tipo: "warning", origen: "academia" },
  { id: "BUG-003", titulo: "generateId con Math.random puede colisionar", archivo: "server_jwt.ts:814", detalles: "Math.random()*2e9 no es criptográfico. Riesgo de colisión y de predicción de IDs.", criticidad: "media", tipo: "bug", origen: "academia" },
  { id: "ACC-001", titulo: "Links de PDF sin validación MIME", archivo: "App.tsx:618", detalles: "La descarga confía en la extensión. Un admin podría subir un archivo con MIME distinto.", criticidad: "media", tipo: "seguridad", origen: "academia" },
  { id: "ACC-002", titulo: "Imágenes de cursos con alt posiblemente vacío", archivo: "App.tsx:322", detalles: "Si course.nombre es undefined, el alt queda vacío. Falla WCAG 1.1.1.", criticidad: "baja", tipo: "warning", origen: "academia" },
  // ── Landing ──────────────────────────────────────────────────────────────
  { id: "AUTH-001", titulo: "checkAbandonedUser.php sin validación de token", archivo: "checkAbandonedUser.php:21", detalles: "La comprobación de token está comentada y reemplazada por true. Cualquiera accede a emails y teléfonos de ventas abandonadas.", criticidad: "critica", tipo: "seguridad", origen: "landing" },
  { id: "BACKEND-001", titulo: "Stripe secret key leída desde BD", archivo: "recuperar_carrito.php:60-73", detalles: "La STRIPE_SECRET_KEY se obtiene de la BD y se pasa a Stripe::setApiKey() sin origen validado. Debe ir por env var.", criticidad: "alta", tipo: "seguridad", origen: "landing" },
  { id: "CRED-001", titulo: "Credenciales MySQL con fallback hardcodeado", archivo: "a-includes/conexion2.php:2-10", detalles: "Si faltan vars de entorno, cae a usuario 'aprendee_admin_argentina'. Riesgo si el deploy olvida el .env.", criticidad: "alta", tipo: "seguridad", origen: "landing" },
  { id: "COOKIE-001", titulo: "$_COOKIE serializada en BD sin cifrar", archivo: "a-includes/logicparametros.php:135-146", detalles: "Se guardan todas las cookies del visitante en DB en texto claro. Exposición severa si la BD se filtra.", criticidad: "alta", tipo: "seguridad", origen: "landing" },
  { id: "ARCH-002", titulo: "WordPress antiguo expuesto en /archivos-sin-uso", archivo: "archivos-sin-uso/Basura a revisar/cursemia-oficial/", detalles: "Instalación completa con wp-login.php accesible. Superficie de ataque enorme (CVEs conocidos).", criticidad: "alta", tipo: "seguridad", origen: "landing" },
  { id: "INJ-001", titulo: "idVenta de $_GET reusado en JSON sin escapar", archivo: "unirse.php:9", detalles: "Aunque se usan prepared statements, el valor se interpola luego en JS y puede producir XSS.", criticidad: "alta", tipo: "seguridad", origen: "landing" },
  { id: "DEBUG-001", titulo: "Debug bar expuesta con ?dev o ?resetip", archivo: "a-includes/logicparametros.php:175-184", detalles: "Muestra IP, país y estado de caché en producción. Permite enumeración de infraestructura.", criticidad: "media", tipo: "seguridad", origen: "landing" },
  { id: "NOSEC-001", titulo: "display_errors activable con ?test en unirse.php", archivo: "unirse.php:2-6", detalles: "Un visitante puede forzar errores PHP visibles y filtrar rutas/SQL.", criticidad: "media", tipo: "seguridad", origen: "landing" },
  { id: "REDIR-001", titulo: "Redirección sin validar REQUEST_URI", archivo: "a-includes/logicparametros.php:153-156", detalles: "Se construye destino con REQUEST_URI sin sanitizar. Puede abrir open-redirect con payloads.", criticidad: "media", tipo: "seguridad", origen: "landing" },
  { id: "CSRF-001", titulo: "reenviar_credenciales.php sin token CSRF", archivo: "reenviar_credenciales.php", detalles: "Un sitio externo puede disparar reenvíos masivos de credenciales.", criticidad: "media", tipo: "seguridad", origen: "landing" },
  { id: "PASSWD-001", titulo: "Password temporal con entropía baja (5 bytes)", archivo: "reenviar_credenciales.php:81", detalles: "bin2hex(random_bytes(5)) da 40 bits. Recomendado ≥ 128 bits (16 bytes).", criticidad: "media", tipo: "seguridad", origen: "landing" },
  { id: "XSS-001", titulo: "URL_FACEBOOK_GROUP proveniente de JSON sin whitelistear esquema", archivo: "unirse_n.php:85", detalles: "Si la URL almacenada arranca con javascript:/data:, el htmlspecialchars no impide ejecución al hacer click.", criticidad: "media", tipo: "seguridad", origen: "landing" },
  { id: "ARCHI-001", titulo: "Archivo HTML con nombre aleatorio en root", archivo: "1hyjy51eksumvhiobbq2q19o34qzix.html", detalles: "Nombre sospechoso (posible verificación de dominio o shell). Auditar y eliminar si no se reconoce.", criticidad: "media", tipo: "warning", origen: "landing" },
  { id: "FB-PIXEL-001", titulo: "Facebook Pixel sin SRI", archivo: "unirse.php:149, unirse_n.php:121", detalles: "Script externo sin integrity hash. Si la CDN se compromete, se ejecuta código arbitrario.", criticidad: "media", tipo: "warning", origen: "landing" },
  { id: "API-001", titulo: "api-precios.php con CORS *", archivo: "api-precios.php:5", detalles: "Permite consumo desde cualquier origen. Bajo impacto pero habilita scraping fácil.", criticidad: "baja", tipo: "seguridad", origen: "landing" },
  { id: "HTACCESS-001", titulo: "CSP sólo con upgrade-insecure-requests", archivo: ".htaccess:5", detalles: "Falta default-src/script-src. No protege contra XSS inyectado.", criticidad: "baja", tipo: "warning", origen: "landing" },
  { id: "IMG-001", titulo: "Imágenes sin atributo alt", archivo: "index.php:64, unirse.php:43", detalles: "Varias <img> sin alt. Afecta accesibilidad (WCAG) y SEO.", criticidad: "baja", tipo: "warning", origen: "landing" },
];

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
      className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[100] ${type === 'success' ? 'bg-[#00a86b] text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="font-medium">{message}</span>
    </motion.div>
  );
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} relative`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#dee2e6]">
          <h2 className="text-xl font-bold text-[#0d2137]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
};

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [academiaFilter, setAcademiaFilter] = useState<string>(() => localStorage.getItem("academiaFilter") || "todas");
  useEffect(() => { localStorage.setItem("academiaFilter", academiaFilter); }, [academiaFilter]);
  const filteredCourses = academiaFilter === "todas"
    ? courses
    : courses.filter(c => getCourseAcademia(c.id) === academiaFilter);
  const filteredStudents = academiaFilter === "todas"
    ? students
    : students.filter(s => {
        if (s.role === "admin") return true;
        const ids = (s.cursos_slugs || "").split("|").filter(Boolean);
        return ids.length > 0 && ids.some(id => getAcademiaForIdentifier(id) === academiaFilter);
      });
  const filteredCourseNames = new Set(filteredCourses.map(c => c.nombre));
  const filteredSales = academiaFilter === "todas"
    ? recentSales
    : recentSales.filter(s => filteredCourseNames.has(s.curso));
  const filteredStats = academiaFilter === "todas"
    ? stats
    : {
        totalAlumnos: filteredStudents.length,
        alumnosActivos: filteredStudents.filter(s => s.activo).length,
        cursosActivos: filteredCourses.filter(c => c.activo !== false).length,
      };
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedPaisCode, setSelectedPaisCode] = useState<string | null>("AR");
  const [importandoPrecios, setImportandoPrecios] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [addCourseDropdownEmail, setAddCourseDropdownEmail] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState<{ academia: string; nombre: string; descripcion: string; imagen_url: string; stripe_price_id: string; precio_ars: number; precio_usd: number; orden: number; precios_paises: Record<string, PrecioPais> }>({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0, precios_paises: {} });
  const [lessonForm, setLessonForm] = useState({ titulo: "", vimeo_id: "", duracion: 0, orden: 0, preview: false });
  const [studentForm, setStudentForm] = useState({ nombre: "", email: "", nuevoEmail: "", cursos: "", activo: true, vencimiento: "" });
  const [dolarInfo, setDolarInfo] = useState<{ tipo: string; venta: number } | null>(null);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [selectedRecursoCursoId, setSelectedRecursoCursoId] = useState<string>("");
  const [isRecursoModalOpen, setIsRecursoModalOpen] = useState(false);
  const [recursoForm, setRecursoForm] = useState({ tipo: "link" as "pdf" | "link" | "comentario", titulo: "", contenido: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supportTickets, setSupportTickets] = useState<Array<{ id: number; nombre: string; email: string; telefono: string; consulta: string; estado: 'pendiente' | 'resuelto'; created_at: string }>>([]);
  const [supportFilter, setSupportFilter] = useState<'todos' | 'pendiente' | 'resuelto'>('pendiente');
  const fetchSupportTickets = async () => {
    try {
      const res = await authFetch('/api/admin/soporte');
      if (res.ok) { const data = await res.json(); setSupportTickets(data.tickets || []); }
    } catch { console.error('Error cargando tickets de soporte'); }
  };
  const updateTicketEstado = async (id: number, estado: 'pendiente' | 'resuelto') => {
    try {
      const res = await authFetch(`/api/admin/soporte/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) });
      if (res.ok) { setToast({ message: estado === 'resuelto' ? '✓ Ticket marcado como resuelto' : '↺ Ticket marcado como pendiente', type: 'success' }); fetchSupportTickets(); }
    } catch { setToast({ message: 'Error de conexión', type: 'error' }); }
  };
  const deleteTicket = async (id: number) => {
    if (!confirm('¿Eliminar esta consulta de soporte?')) return;
    try {
      const res = await authFetch(`/api/admin/soporte/${id}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: '✓ Consulta eliminada', type: 'success' }); fetchSupportTickets(); }
    } catch { setToast({ message: 'Error de conexión', type: 'error' }); }
  };

  const [issueOrigen, setIssueOrigen] = useState<"todos" | IssueOrigen>("todos");
  const [issueCritic, setIssueCritic] = useState<"todas" | IssueCriticidad>("todas");
  const [issueTipo, setIssueTipo] = useState<"todos" | IssueTipo>("todos");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [resolvedIssues, setResolvedIssues] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("resolved_issues") || "{}"); } catch { return {}; }
  });
  const toggleResolved = (id: string) => {
    setResolvedIssues(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("resolved_issues", JSON.stringify(next));
      return next;
    });
  };

  const CRIT_META: Record<IssueCriticidad, { label: string; bg: string; text: string; border: string; order: number }> = {
    critica: { label: "Crítica", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    order: 0 },
    alta:    { label: "Alta",    bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", order: 1 },
    media:   { label: "Media",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  order: 2 },
    baja:    { label: "Baja",    bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200",    order: 3 },
  };
  const TIPO_META: Record<IssueTipo, { label: string; Icon: any }> = {
    bug:         { label: "Bug",         Icon: Bug },
    error:       { label: "Error",       Icon: AlertCircle },
    warning:     { label: "Warning",     Icon: AlertTriangle },
    seguridad:   { label: "Seguridad",   Icon: ShieldAlert },
    performance: { label: "Performance", Icon: AlertTriangle },
  };

  const filteredIssues = ISSUES_CATALOG
    .filter(i => issueOrigen === "todos" || i.origen === issueOrigen)
    .filter(i => issueCritic === "todas" || i.criticidad === issueCritic)
    .filter(i => issueTipo === "todos" || i.tipo === issueTipo)
    .sort((a, b) => CRIT_META[a.criticidad].order - CRIT_META[b.criticidad].order);

  const issueCounts = {
    critica: ISSUES_CATALOG.filter(i => i.criticidad === "critica" && !resolvedIssues[i.id]).length,
    alta:    ISSUES_CATALOG.filter(i => i.criticidad === "alta" && !resolvedIssues[i.id]).length,
    media:   ISSUES_CATALOG.filter(i => i.criticidad === "media" && !resolvedIssues[i.id]).length,
    baja:    ISSUES_CATALOG.filter(i => i.criticidad === "baja" && !resolvedIssues[i.id]).length,
    resueltos: Object.values(resolvedIssues).filter(Boolean).length,
    total: ISSUES_CATALOG.length,
  };

  const fetchDolar = async () => {
    try {
      // Intenta blue primero, luego oficial como fallback
      const res = await fetch("https://dolarapi.com/v1/dolares/blue");
      if (res.ok) {
        const data = await res.json();
        setDolarInfo({ tipo: "Blue", venta: data.venta });
        return;
      }
    } catch {}
    try {
      const res = await fetch("https://dolarapi.com/v1/dolares/oficial");
      if (res.ok) {
        const data = await res.json();
        setDolarInfo({ tipo: "Oficial", venta: data.venta });
      }
    } catch {}
  };

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
    if (activeTab === "alumnos") { fetchStudents(); fetchCourses(); }
    if (activeTab === "cursos") { fetchCourses(); fetchDolar(); }
    if (activeTab === "lecciones") { fetchCourses(); if (selectedCourseId) fetchLessons(selectedCourseId); }
    if (activeTab === "recursos") { fetchCourses(); if (selectedRecursoCursoId) fetchRecursos(selectedRecursoCursoId); }
    if (activeTab === "soporte") fetchSupportTickets();
  }, [activeTab, selectedCourseId]);

  const checkAuth = async () => {
    try {
      const res = await authFetch('/api/auth/perfil');
      if (!res.ok) {
        localStorage.removeItem("token");
        onLogout();
        return;
      }
      const data = await res.json();
      if (data.usuario?.role !== "admin") {
        localStorage.removeItem("token");
        onLogout();
        return;
      }
      setUser(data.usuario);
    } catch (err) {
      console.error("Auth check failed", err);
      onLogout();
    } finally {
      setAuthChecked(true);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await authFetch('/api/admin/dashboard');
      const data = await res.json();
      setStats(data.stats);
      setRecentSales(data.ultimasCompras || []);
    } catch (e) { console.error(e); }
  };

  const fetchStudents = async (query = "") => {
    try {
      const res = await authFetch(`/api/admin/usuarios?buscar=${query}`);
      const data = await res.json();
      setStudents(data.usuarios || []);
    } catch (e) { console.error(e); }
  };

  const fetchCourses = async () => {
    try {
      const res = await authFetch('/api/cursos/mis-cursos');
      const data = await res.json();
      setCourses(data.cursos || []);
    } catch (e) { console.error(e); }
  };

  const fetchLessons = async (courseId: number) => {
    try {
      const res = await authFetch(`/api/cursos/${courseId}`);
      const data = await res.json();
      setLessons(data.lecciones || []);
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  const handleUpdateSubscription = async (email: string, meses?: number, activo?: boolean) => {
    try {
      const res = await authFetch('/api/admin/usuarios/suscripcion', { method: 'POST', body: JSON.stringify({ email, meses, activo }) });
      if (res.ok) { setToast({ message: "✓ Suscripción actualizada", type: 'success' }); fetchStudents(searchQuery); }
      else setToast({ message: "Error al actualizar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const payload: any = { nombre: studentForm.nombre, cursos: studentForm.cursos, activo: studentForm.activo, vencimiento: studentForm.vencimiento };
      if (studentForm.nuevoEmail && studentForm.nuevoEmail !== studentForm.email) payload.nuevoEmail = studentForm.nuevoEmail;
      const res = await authFetch(`/api/admin/usuarios/${editingStudent.email}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (res.ok) { setToast({ message: "✓ Alumno actualizado", type: 'success' }); setIsStudentModalOpen(false); setEditingStudent(null); fetchStudents(searchQuery); }
      else setToast({ message: "Error al actualizar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleDeleteStudent = async (email: string) => {
    if (!confirm("¿Estás seguro de eliminar este alumno?")) return;
    try {
      const res = await authFetch(`/api/admin/usuarios/${email}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ Alumno eliminado", type: 'success' }); fetchStudents(searchQuery); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const fetchRecursos = async (cursoId: string) => {
    if (!cursoId) return;
    try {
      const res = await authFetch(`/api/admin/recursos?cursoId=${cursoId}`);
      const data = await res.json();
      setRecursos(data.recursos || []);
    } catch { console.error("Error cargando recursos"); }
  };

  const handleCreateRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecursoCursoId) return;
    try {
      const res = await authFetch("/api/admin/recursos", {
        method: "POST",
        body: JSON.stringify({ curso_id: selectedRecursoCursoId, ...recursoForm }),
      });
      if (res.ok) {
        setToast({ message: "✓ Recurso agregado", type: "success" });
        setIsRecursoModalOpen(false);
        setRecursoForm({ tipo: "link", titulo: "", contenido: "" });
        fetchRecursos(selectedRecursoCursoId);
      } else {
        const data = await res.json();
        setToast({ message: data.error || "Error al guardar", type: "error" });
      }
    } catch { setToast({ message: "Error de conexión", type: "error" }); }
  };

  const handleDeleteRecurso = async (id: number) => {
    if (!confirm("¿Eliminar este recurso?")) return;
    try {
      const res = await authFetch(`/api/admin/recursos/${id}`, { method: "DELETE" });
      if (res.ok) { setToast({ message: "✓ Recurso eliminado", type: "success" }); fetchRecursos(selectedRecursoCursoId); }
      else setToast({ message: "Error al eliminar", type: "error" });
    } catch { setToast({ message: "Error de conexión", type: "error" }); }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setToast({ message: "El PDF no puede superar 10 MB", type: "error" }); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRecursoForm(f => ({ ...f, contenido: reader.result as string, titulo: f.titulo || file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleToggleRole = async (student: Student) => {
    const newRole = student.role === "admin" ? "user" : "admin";
    const action = newRole === "admin" ? "promover a Admin" : "quitar rol Admin";
    if (!confirm(`¿Estás seguro de ${action} a ${student.nombre}?`)) return;
    try {
      const res = await authFetch(`/api/admin/usuarios/${student.email}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setToast({ message: newRole === "admin" ? "✓ Usuario promovido a Admin" : "✓ Rol Admin removido", type: 'success' });
        fetchStudents(searchQuery);
      } else {
        const data = await res.json();
        setToast({ message: data.error || "Error al cambiar rol", type: 'error' });
      }
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleToggleCourse = async (student: Student, slug: string, add: boolean) => {
    const currentSlugs = (student.cursos_slugs || "").split("|").filter(Boolean);
    const updated = add ? [...currentSlugs, slug] : currentSlugs.filter(s => s !== slug);
    try {
      const res = await authFetch(`/api/admin/usuarios/${student.email}`, {
        method: 'PUT',
        body: JSON.stringify({ cursos: updated.join("|") })
      });
      if (res.ok) {
        setToast({ message: add ? "✓ Curso agregado" : "✓ Curso quitado", type: 'success' });
        setAddCourseDropdownEmail(null);
        fetchStudents(searchQuery);
      } else setToast({ message: "Error al actualizar cursos", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingCourse) { setToast({ message: "Los cursos se gestionan desde Vimeo", type: 'error' }); return; }
      const url = `/api/admin/cursos/${editingCourse.id}`;
      // Garantizar que precio_ars siempre refleje el precio de Argentina si está seteado
      const precioArFinal = courseForm.precios_paises["AR"]?.precio || courseForm.precio_ars;
      const body = { ...courseForm, precio_ars: precioArFinal };
      const res = await authFetch(url, { method: 'PUT', body: JSON.stringify(body) });
      if (res.ok) {
        setToast({ message: editingCourse ? "✓ Actualizado" : "✓ Guardado", type: 'success' });
        setIsCourseModalOpen(false); setEditingCourse(null); fetchCourses();
        setCourseForm({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0, precios_paises: {} });
      } else setToast({ message: "Error al guardar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleImportarPreciosLanding = async () => {
    if (!confirm("¿Importar precios actuales de la landing? Esto sobreescribirá el Precio ARS de cada curso en Railway.")) return;
    setImportandoPrecios(true);
    try {
      const res = await authFetch('/api/admin/importar-precios-landing', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `✓ ${data.importados} precios importados desde la landing`, type: 'success' });
        fetchCourses();
      } else {
        setToast({ message: data.error || "Error al importar", type: 'error' });
      }
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
    finally { setImportandoPrecios(false); }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este curso?")) return;
    try {
      const res = await authFetch(`/api/admin/cursos/${id}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ Curso eliminado", type: 'success' }); fetchCourses(); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    try {
      const url = editingLesson ? `/api/admin/lecciones/${editingLesson.id}` : '/api/admin/lecciones';
      const res = await authFetch(url, { method: editingLesson ? 'PUT' : 'POST', body: JSON.stringify({ ...lessonForm, cursoId: selectedCourseId }) });
      if (res.ok) {
        setToast({ message: editingLesson ? "✓ Actualizada" : "✓ Guardada", type: 'success' });
        setIsLessonModalOpen(false); setEditingLesson(null); fetchLessons(selectedCourseId);
        setLessonForm({ titulo: "", vimeo_id: "", duracion: 0, orden: 0, preview: false });
      } else setToast({ message: "Error al guardar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta lección?")) return;
    try {
      const res = await authFetch(`/api/admin/lecciones/${id}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ Lección eliminada", type: 'success' }); if (selectedCourseId) fetchLessons(selectedCourseId); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "alumnos", label: "Alumnos", icon: Users },
    { id: "cursos", label: "Cursos", icon: BookOpen },
    { id: "lecciones", label: "Lecciones", icon: PlayCircle },
    { id: "recursos", label: "Recursos", icon: FolderOpen },
    { id: "ventas", label: "Ventas", icon: DollarSign },
    { id: "soporte", label: "Soporte", icon: LifeBuoy },
    { id: "errores", label: "Fix de errores", icon: Bug },
  ];

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="w-8 h-8 border-4 border-[#00a86b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f5f7] font-sans overflow-hidden">
      <aside className="w-[240px] bg-[#1a5c4a] flex flex-col flex-shrink-0">
        <div className="p-6">
          <div className="flex flex-col mb-1">
            <img src="/logo-aprende-excel.png" onError={(e) => { e.currentTarget.src = "https://www.aprende-excel.com/wp-content/uploads/2023/03/logo-aprende-excel-horizontal.png"; }} alt="Aprende Excel" className="h-10 w-auto" referrerPolicy="no-referrer" />
            <span className="text-[#00a86b] text-[10px] font-bold uppercase tracking-wider mt-1">Admin</span>
          </div>
        </div>
        <div className="h-[1px] bg-white/15 mx-6 mb-4"></div>
        <div className="px-6 mb-4">
          <label className="block text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">Academia</label>
          <select
            value={academiaFilter}
            onChange={(e) => setAcademiaFilter(e.target.value)}
            className="w-full bg-[#134735] text-white text-sm px-3 py-2 rounded-md border border-white/15 focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50 cursor-pointer"
          >
            <option value="todas">Todas</option>
            <option value={ACADEMIA_EXCEL}>Aprende Excel</option>
            <option value={ACADEMIA_IDIOMAS}>Aprende Idiomas</option>
          </select>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${activeTab === item.id ? "bg-[#00a86b]/20 border-l-[3px] border-[#00a86b] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
              <item.icon size={20} className={activeTab === item.id ? "text-[#00a86b]" : "text-white/70 group-hover:text-white"} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 mt-auto">
          <div className="flex items-center gap-3 mb-4 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#00a86b] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.inicial || 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-white font-bold text-xs truncate">{user?.nombre || 'Admin'}</div>
              <div className="text-white/50 text-[10px] truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-white/20 text-white hover:bg-red-600 hover:border-red-600 transition-all duration-200">
            <LogOut size={18} /><span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-[#0d2137]">Dashboard</h1>
                <p className="text-gray-500">Resumen general de la academia</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[
                  { label: "Total Alumnos", value: filteredStats?.totalAlumnos, icon: Users },
                  { label: "Alumnos Activos", value: filteredStats?.alumnosActivos, icon: Users },
                  { label: "Cursos Activos", value: filteredStats?.cursosActivos, icon: BookOpen },
                ].map((card) => (
                  <div key={card.label} className="bg-white p-5 rounded-lg border border-[#dee2e6] shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 font-medium">{card.label}</span>
                      <card.icon className="text-[#00a86b]" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-[#0d2137]">{card.value ?? '-'}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#dee2e6]"><h2 className="text-lg font-bold text-[#0d2137]">Últimas compras</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1a5c4a] text-white">
                      <tr><th className="px-6 py-4 font-semibold">Email</th><th className="px-6 py-4 font-semibold">Nombre</th><th className="px-6 py-4 font-semibold">Curso</th><th className="px-6 py-4 font-semibold">Monto</th><th className="px-6 py-4 font-semibold">Fecha</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6]">
                      {filteredSales.map((sale, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-600">{sale.email}</td>
                          <td className="px-6 py-4 font-medium text-[#0d2137]">{sale.nombre}</td>
                          <td className="px-6 py-4 text-gray-600">{sale.curso}</td>
                          <td className="px-6 py-4 font-bold text-[#00a86b]">${sale.monto}</td>
                          <td className="px-6 py-4 text-gray-500">{sale.fecha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "alumnos" && (
            <motion.div key="alumnos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div><h1 className="text-3xl font-bold text-[#0d2137]">Alumnos</h1><p className="text-gray-500">Gestión de estudiantes registrados</p></div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Buscar por nombre o email..." className="pl-10 pr-4 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50 w-full md:w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <button onClick={() => fetchStudents(searchQuery)} className="bg-[#00a86b] text-white px-6 py-2 rounded-md font-medium hover:bg-[#008f5a] transition-colors">Buscar</button>
                </div>
              </header>
              <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1a5c4a] text-white">
                      <tr><th className="px-6 py-4 font-semibold">Email</th><th className="px-6 py-4 font-semibold">Nombre</th><th className="px-6 py-4 font-semibold">Cursos asignados</th><th className="px-6 py-4 font-semibold">Rol</th><th className="px-6 py-4 font-semibold">Estado</th><th className="px-6 py-4 font-semibold">Vencimiento</th><th className="px-6 py-4 font-semibold">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6]">
                      {filteredStudents.map((student, i) => {
                        const assignedIds = (student.cursos_slugs || "").split("|").filter(Boolean);
                        const availableCourses = filteredCourses.filter(c => !assignedIds.includes(getCourseIdentifier(c.id)));
                        return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-600 text-sm">{student.email}</td>
                          <td className="px-6 py-4 font-medium text-[#0d2137]">{student.nombre}</td>
                          <td className="px-6 py-4 min-w-[220px]">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                {assignedIds.length === 0 && <span className="text-xs text-gray-400 italic">Sin cursos asignados</span>}
                                {assignedIds.map(id => (
                                  <span key={id} className="flex items-center gap-1 bg-[#eaf4ee] text-[#1a5c4a] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#c3e6cb]">
                                    {getCourseDisplayName(id, courses)}
                                    <button onClick={() => handleToggleCourse(student, id, false)} title="Quitar curso" className="hover:text-red-600 transition-colors ml-0.5">
                                      <X size={10} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              {availableCourses.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => { if (e.target.value) handleToggleCourse(student, e.target.value, true); }}
                                  className="text-xs border border-[#dee2e6] rounded-md px-2 py-1.5 text-gray-500 bg-white focus:outline-none focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b]/30 cursor-pointer w-full max-w-[180px]"
                                >
                                  <option value="">＋ Agregar curso...</option>
                                  {availableCourses.map(c => (
                                    <option key={c.id} value={getCourseIdentifier(c.id)}>{c.nombre}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleRole(student)}
                              title={student.role === "admin" ? "Quitar admin" : "Hacer admin"}
                              className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer border transition-colors ${student.role === "admin" ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200' : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'}`}>
                              {student.role === "admin" ? "Admin" : "Usuario"}
                            </button>
                          </td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${student.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.activo ? 'Activo' : 'Inactivo'}</span></td>
                          <td className="px-6 py-4"><div className="flex items-center gap-2 text-gray-500 text-sm"><Calendar size={14} className="text-gray-400" />{student.vencimiento || '-'}</div></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => { setEditingStudent(student); setStudentForm({ nombre: student.nombre, email: student.email, nuevoEmail: student.email, cursos: student.cursos_slugs || "", activo: student.activo, vencimiento: student.vencimiento }); setIsStudentModalOpen(true); }} className="p-1.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteStudent(student.email)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
                              <button onClick={() => handleUpdateSubscription(student.email, undefined, !student.activo)} className={`p-1.5 rounded border transition-all ${student.activo ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>{student.activo ? <ShieldX size={16} /> : <ShieldCheck size={16} />}</button>
                              <div className="flex bg-gray-100 rounded p-1">
                                {[1, 3, 12].map(m => (<button key={m} onClick={() => handleUpdateSubscription(student.email, m)} className="px-2 py-1 text-[10px] font-bold hover:bg-white rounded transition-all text-[#1a5c4a]">{m}M</button>))}
                              </div>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "cursos" && (
            <motion.div key="cursos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="flex items-center justify-between mb-8">
                <div><h1 className="text-3xl font-bold text-[#0d2137]">Cursos</h1><p className="text-gray-500">Administración de la oferta académica</p></div>
                <div className="flex gap-2">
                  <button onClick={handleImportarPreciosLanding} disabled={importandoPrecios} className="border border-[#1a7a5e] text-[#1a7a5e] px-4 py-2 rounded-md font-medium hover:bg-[#f0faf6] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                    {importandoPrecios ? "Importando..." : "↓ Importar precios de la landing"}
                  </button>
                  <button onClick={() => { setEditingCourse(null); setCourseForm({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0, precios_paises: {} }); setIsCourseModalOpen(true); }} className="bg-[#1a7a5e] text-white px-6 py-2 rounded-md font-medium hover:bg-[#00a86b] transition-colors flex items-center gap-2"><Plus size={20} />Agregar curso</button>
                </div>
              </header>
              <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1a5c4a] text-white">
                      <tr><th className="px-6 py-4 font-semibold">Nombre</th><th className="px-6 py-4 font-semibold">Academia</th><th className="px-6 py-4 font-semibold">Stripe Price ID</th><th className="px-6 py-4 font-semibold">Precio ARS</th><th className="px-6 py-4 font-semibold">Precio USD</th><th className="px-6 py-4 font-semibold">Activo</th><th className="px-6 py-4 font-semibold">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6]">
                      {filteredCourses.map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-[#0d2137]">{course.nombre}</td>
                          <td className="px-6 py-4 text-gray-600">{course.academia || "Aprende Excel"}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">{course.stripe_price_id || "price_..."}</td>
                          <td className="px-6 py-4 text-gray-600">${course.precio_ars?.toLocaleString("es-AR") || "0"}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {(() => {
                              const usd = course.precio_usd && course.precio_usd > 0
                                ? course.precio_usd
                                : (course.precio_ars > 0 && dolarInfo ? Math.round((course.precio_ars / dolarInfo.venta) * 100) / 100 : 0);
                              return usd > 0
                                ? <span>${usd.toFixed(2)}</span>
                                : <span className="text-gray-300">$0.00</span>;
                            })()}
                          </td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${course.activo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{course.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => {
                                setEditingCourse(course);
                                const pp = { ...(course.precios_paises || {}) };
                                // Si hay precio_ars pero AR no tiene precio en precios_paises, pre-popularlo
                                if (course.precio_ars > 0 && !pp["AR"]) pp["AR"] = { precio: course.precio_ars, stripe_price_id: "" };
                                setCourseForm({ academia: course.academia || "Aprende Excel", nombre: course.nombre, descripcion: course.descripcion || "", imagen_url: course.imagen_url || "", stripe_price_id: course.stripe_price_id, precio_ars: course.precio_ars, precio_usd: course.precio_usd, orden: course.orden || 0, precios_paises: pp });
                                setSelectedPaisCode("AR");
                                fetchDolar();
                                setIsCourseModalOpen(true);
                              }} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteCourse(course.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "lecciones" && (
            <motion.div key="lecciones" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div><h1 className="text-3xl font-bold text-[#0d2137]">Lecciones</h1><p className="text-gray-500">Contenido de los cursos</p></div>
                <div className="flex gap-2">
                  <select className="px-4 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50 bg-white" value={selectedCourseId || ""} onChange={(e) => setSelectedCourseId(Number(e.target.value))}>
                    <option value="">Seleccionar curso...</option>
                    {filteredCourses.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                  </select>
                  <button disabled={!selectedCourseId} onClick={() => { setEditingLesson(null); setLessonForm({ titulo: "", vimeo_id: "", duracion: 0, orden: 0, preview: false }); setIsLessonModalOpen(true); }} className="bg-[#00a86b] text-white px-6 py-2 rounded-md font-medium hover:bg-[#008f5a] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={20} />Agregar lección</button>
                </div>
              </header>
              {selectedCourseId ? (
                <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#1a5c4a] text-white">
                        <tr><th className="px-6 py-4 font-semibold w-16">#</th><th className="px-6 py-4 font-semibold">Título</th><th className="px-6 py-4 font-semibold">Vimeo ID</th><th className="px-6 py-4 font-semibold">Duración</th><th className="px-6 py-4 font-semibold">Preview</th><th className="px-6 py-4 font-semibold">Acciones</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#dee2e6]">
                        {lessons.map((lesson, i) => (
                          <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-gray-400 font-mono">{lesson.orden || i + 1}</td>
                            <td className="px-6 py-4 font-medium text-[#0d2137]">{lesson.titulo}</td>
                            <td className="px-6 py-4 text-gray-600 font-mono text-sm">{lesson.vimeo_id}</td>
                            <td className="px-6 py-4 text-gray-500">{Math.floor(lesson.duracion / 60)}:{(lesson.duracion % 60).toString().padStart(2, '0')}</td>
                            <td className="px-6 py-4">{lesson.preview ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Sí</span> : <span className="text-gray-300 text-[10px] font-bold uppercase">No</span>}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button onClick={() => { setEditingLesson(lesson); setLessonForm({ titulo: lesson.titulo, vimeo_id: lesson.vimeo_id, duracion: lesson.duracion, orden: lesson.orden, preview: lesson.preview }); setIsLessonModalOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteLesson(lesson.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-dashed border-[#dee2e6] p-12 text-center">
                  <PlayCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Seleccioná un curso para ver y gestionar sus lecciones</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "recursos" && (
            <motion.div key="recursos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div><h1 className="text-3xl font-bold text-[#0d2137]">Recursos</h1><p className="text-gray-500">PDFs, links y comentarios por curso</p></div>
                <div className="flex gap-2">
                  <select className="px-4 py-2 rounded-md border border-[#dee2e6] bg-white focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50"
                    value={selectedRecursoCursoId}
                    onChange={e => { setSelectedRecursoCursoId(e.target.value); fetchRecursos(e.target.value); }}>
                    <option value="">Seleccionar curso...</option>
                    {filteredCourses.map(c => <option key={c.id} value={c.id.toString()}>{c.nombre}</option>)}
                  </select>
                  <button disabled={!selectedRecursoCursoId}
                    onClick={() => { setRecursoForm({ tipo: "link", titulo: "", contenido: "" }); setIsRecursoModalOpen(true); }}
                    className="bg-[#00a86b] text-white px-6 py-2 rounded-md font-medium hover:bg-[#008f5a] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus size={20} />Agregar recurso
                  </button>
                </div>
              </header>
              {!selectedRecursoCursoId ? (
                <div className="bg-white rounded-lg border border-dashed border-[#dee2e6] p-12 text-center">
                  <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Seleccioná un curso para ver y gestionar sus recursos</p>
                </div>
              ) : recursos.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-[#dee2e6] p-12 text-center">
                  <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay recursos para este curso todavía</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {recursos.map(r => (
                    <div key={r.id} className="bg-white rounded-lg border border-[#dee2e6] shadow-sm p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {r.tipo === "pdf" && <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0"><FileText size={16} className="text-red-600" /></div>}
                          {r.tipo === "link" && <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><Link2 size={16} className="text-blue-600" /></div>}
                          {r.tipo === "comentario" && <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0"><MessageSquare size={16} className="text-yellow-600" /></div>}
                          <div>
                            <p className="font-semibold text-[#0d2137] text-sm">{r.titulo}</p>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${r.tipo === "pdf" ? "bg-red-100 text-red-600" : r.tipo === "link" ? "bg-blue-100 text-blue-600" : "bg-yellow-100 text-yellow-600"}`}>{r.tipo}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteRecurso(r.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors shrink-0"><Trash2 size={15} /></button>
                      </div>
                      {r.tipo === "link" && <a href={r.contenido} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate">{r.contenido}</a>}
                      {r.tipo === "comentario" && <p className="text-xs text-gray-600 whitespace-pre-wrap">{r.contenido}</p>}
                      {r.tipo === "pdf" && r.contenido && (
                        <a href={r.contenido} download={r.titulo} className="inline-flex items-center gap-1.5 text-xs text-[#1a5c4a] font-medium hover:underline">
                          <FileText size={13} />Descargar PDF
                        </a>
                      )}
                      <p className="text-[10px] text-gray-400 mt-auto">{new Date(r.created_at).toLocaleDateString("es-AR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "ventas" && (
            <motion.div key="ventas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="mb-8"><h1 className="text-3xl font-bold text-[#0d2137]">Ventas</h1><p className="text-gray-500">Historial de transacciones</p></header>
              <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1a5c4a] text-white">
                      <tr><th className="px-6 py-4 font-semibold">Email</th><th className="px-6 py-4 font-semibold">Nombre</th><th className="px-6 py-4 font-semibold">Curso</th><th className="px-6 py-4 font-semibold">Monto</th><th className="px-6 py-4 font-semibold">Fecha</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6]">
                      {filteredSales.map((sale, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-600">{sale.email}</td>
                          <td className="px-6 py-4 font-medium text-[#0d2137]">{sale.nombre}</td>
                          <td className="px-6 py-4 text-gray-600">{sale.curso}</td>
                          <td className="px-6 py-4 font-bold text-[#00a86b]">${sale.monto}</td>
                          <td className="px-6 py-4 text-gray-500">{sale.fecha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "soporte" && (
            <motion.div key="soporte" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137]">Soporte</h1>
                  <p className="text-gray-500">Consultas recibidas desde la página de login</p>
                </div>
                <div className="flex gap-2">
                  {(['pendiente', 'resuelto', 'todos'] as const).map(f => {
                    const count = f === 'todos' ? supportTickets.length : supportTickets.filter(t => t.estado === f).length;
                    return (
                      <button key={f} onClick={() => setSupportFilter(f)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${supportFilter === f ? 'bg-[#1a5c4a] text-white' : 'bg-white border border-[#dee2e6] text-gray-700 hover:bg-gray-50'}`}>
                        {f === 'pendiente' ? 'Pendientes' : f === 'resuelto' ? 'Resueltas' : 'Todas'} ({count})
                      </button>
                    );
                  })}
                </div>
              </header>
              <div className="space-y-3">
                {supportTickets.filter(t => supportFilter === 'todos' || t.estado === supportFilter).length === 0 ? (
                  <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm p-12 text-center text-gray-500">
                    <LifeBuoy size={40} className="mx-auto mb-3 text-gray-300" />
                    No hay consultas {supportFilter === 'pendiente' ? 'pendientes' : supportFilter === 'resuelto' ? 'resueltas' : ''}.
                  </div>
                ) : supportTickets.filter(t => supportFilter === 'todos' || t.estado === supportFilter).map(t => (
                  <div key={t.id} className={`bg-white rounded-lg border shadow-sm p-5 ${t.estado === 'resuelto' ? 'border-[#dee2e6] opacity-70' : 'border-[#00a86b]/30'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.estado === 'resuelto' ? 'bg-gray-100 text-gray-500' : 'bg-[#00a86b]/10 text-[#00a86b]'}`}>
                          <LifeBuoy size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-[#0d2137]">{t.nombre}</div>
                          <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString('es-AR')}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${t.estado === 'resuelto' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                        {t.estado === 'resuelto' ? 'Resuelto' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 mb-3">
                      <a href={`mailto:${t.email}`} className="flex items-center gap-1.5 hover:text-[#00a86b]"><Mail size={14} />{t.email}</a>
                      {t.telefono && <a href={`tel:${t.telefono}`} className="flex items-center gap-1.5 hover:text-[#00a86b]"><Phone size={14} />{t.telefono}</a>}
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap mb-3">{t.consulta}</div>
                    <div className="flex gap-2 flex-wrap">
                      {t.estado === 'pendiente' ? (
                        <button onClick={() => updateTicketEstado(t.id, 'resuelto')} className="px-4 py-2 rounded-md bg-[#00a86b] text-white text-sm font-medium hover:bg-[#008f5a] flex items-center gap-1.5">
                          <CheckCircle2 size={16} /> Marcar como resuelta
                        </button>
                      ) : (
                        <button onClick={() => updateTicketEstado(t.id, 'pendiente')} className="px-4 py-2 rounded-md bg-white border border-[#dee2e6] text-gray-700 text-sm font-medium hover:bg-gray-50">
                          Reabrir
                        </button>
                      )}
                      <a href={`mailto:${t.email}?subject=Re: tu consulta en Academia`} className="px-4 py-2 rounded-md bg-white border border-[#dee2e6] text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
                        <Mail size={16} /> Responder
                      </a>
                      <button onClick={() => deleteTicket(t.id)} className="px-4 py-2 rounded-md bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 flex items-center gap-1.5 ml-auto">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "errores" && (
            <motion.div key="errores" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137] flex items-center gap-3"><Bug className="text-[#00a86b]" size={28}/>Fix de errores</h1>
                  <p className="text-gray-500">Bugs, warnings y riesgos de seguridad detectados en la Academia y la landing de ventas.</p>
                </div>
                <div className="text-xs text-gray-500">
                  Auditoría automática · {ISSUES_CATALOG.length} hallazgos
                </div>
              </header>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {([
                  { key: "critica", label: "Críticas", color: "red" },
                  { key: "alta", label: "Altas", color: "orange" },
                  { key: "media", label: "Medias", color: "amber" },
                  { key: "baja", label: "Bajas", color: "sky" },
                ] as const).map(c => (
                  <div key={c.key} className={`bg-white p-4 rounded-lg border border-[#dee2e6] shadow-sm`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider text-${c.color}-600`}>{c.label}</div>
                    <div className="text-2xl font-bold text-[#0d2137] mt-1">{issueCounts[c.key]}</div>
                  </div>
                ))}
                <div className="bg-[#00a86b]/10 p-4 rounded-lg border border-[#00a86b]/30">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#1a5c4a]">Resueltos</div>
                  <div className="text-2xl font-bold text-[#1a5c4a] mt-1">{issueCounts.resueltos}/{issueCounts.total}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm p-4 mb-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Origen:</span>
                  {(["todos","academia","landing"] as const).map(o => (
                    <button key={o} onClick={() => setIssueOrigen(o)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${issueOrigen===o ? "bg-[#1a5c4a] text-white border-[#1a5c4a]" : "bg-white text-gray-600 border-[#dee2e6] hover:border-gray-400"}`}>
                      {o === "todos" ? "Todos" : o === "academia" ? "Academia" : "Landing ventas"}
                    </button>
                  ))}
                </div>
                <div className="w-px bg-[#dee2e6]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Criticidad:</span>
                  {(["todas","critica","alta","media","baja"] as const).map(c => (
                    <button key={c} onClick={() => setIssueCritic(c)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${issueCritic===c ? "bg-[#1a5c4a] text-white border-[#1a5c4a]" : "bg-white text-gray-600 border-[#dee2e6] hover:border-gray-400"}`}>
                      {c === "todas" ? "Todas" : CRIT_META[c].label}
                    </button>
                  ))}
                </div>
                <div className="w-px bg-[#dee2e6]" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tipo:</span>
                  {(["todos","bug","error","warning","seguridad","performance"] as const).map(t => (
                    <button key={t} onClick={() => setIssueTipo(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${issueTipo===t ? "bg-[#1a5c4a] text-white border-[#1a5c4a]" : "bg-white text-gray-600 border-[#dee2e6] hover:border-gray-400"}`}>
                      {t === "todos" ? "Todos" : TIPO_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredIssues.length === 0 && (
                  <div className="bg-white rounded-lg border border-[#dee2e6] p-8 text-center text-gray-400">No hay hallazgos con estos filtros.</div>
                )}
                {filteredIssues.map(issue => {
                  const crit = CRIT_META[issue.criticidad];
                  const TipoIcon = TIPO_META[issue.tipo].Icon;
                  const resolved = !!resolvedIssues[issue.id];
                  const expanded = expandedIssue === issue.id;
                  return (
                    <div key={issue.id}
                      className={`bg-white rounded-lg border shadow-sm transition-all ${resolved ? "border-[#dee2e6] opacity-60" : crit.border}`}>
                      <button
                        onClick={() => setExpandedIssue(expanded ? null : issue.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                        {expanded ? <ChevronDown size={18} className="text-gray-400 shrink-0"/> : <ChevronRight size={18} className="text-gray-400 shrink-0"/>}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${crit.bg} ${crit.text} ${crit.border} border shrink-0`}>
                          {crit.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                          <TipoIcon size={14}/>{TIPO_META[issue.tipo].label}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">{issue.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${issue.origen==="academia" ? "bg-[#00a86b]/15 text-[#1a5c4a]" : "bg-indigo-50 text-indigo-700"}`}>
                          {issue.origen === "academia" ? "Academia" : "Landing"}
                        </span>
                        <span className={`flex-1 font-medium ${resolved ? "line-through text-gray-400" : "text-[#0d2137]"}`}>{issue.titulo}</span>
                        <span className="text-[11px] font-mono text-gray-400 truncate max-w-[240px] hidden md:block">{issue.archivo}</span>
                      </button>
                      {expanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-[#dee2e6] bg-gray-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                            <div className="md:col-span-2">
                              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Detalles</div>
                              <p className="text-gray-700 leading-relaxed">{issue.detalles}</p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Ubicación</div>
                                <code className="text-xs bg-white border border-[#dee2e6] rounded px-2 py-1 block break-all">{issue.archivo}</code>
                              </div>
                              <button
                                onClick={() => toggleResolved(issue.id)}
                                className={`w-full px-3 py-2 rounded-md text-sm font-medium border transition-all ${resolved ? "bg-white text-gray-500 border-[#dee2e6] hover:bg-gray-100" : "bg-[#00a86b] text-white border-[#00a86b] hover:bg-[#008f5a]"}`}>
                                {resolved ? "Reabrir" : "Marcar como resuelto"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal isOpen={isCourseModalOpen} onClose={() => { setIsCourseModalOpen(false); setEditingCourse(null); }} title={`Editar precios — ${editingCourse?.nombre || ''}`} maxWidth="max-w-3xl">
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <p className="text-sm text-gray-500">El nombre y contenido del curso se gestionan desde Vimeo. Acá podés editar los precios por país y los IDs de Stripe.</p>
          {dolarInfo && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700">
              <span>💵 Dólar {dolarInfo.tipo} (venta):</span>
              <span className="font-bold">${dolarInfo.venta.toLocaleString("es-AR")} ARS</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Stripe Price ID global (USD)</label>
              <input type="text" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none font-mono text-sm" placeholder="price_..." value={courseForm.stripe_price_id} onChange={e => setCourseForm({...courseForm, stripe_price_id: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Precio USD {dolarInfo && <span className="text-gray-400 font-normal">(referencia)</span>}</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" placeholder="0.00" value={courseForm.precio_usd || ""} onChange={e => setCourseForm({...courseForm, precio_usd: Number(e.target.value)})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Precios por país (LATAM)</label>

            {/* Fila scrollable de banderas */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {LATAM_PAISES.map(({ codigo, bandera, nombre }) => {
                const tieneP = (courseForm.precios_paises[codigo]?.precio || 0) > 0;
                const activo = selectedPaisCode === codigo;
                return (
                  <button
                    key={codigo}
                    type="button"
                    title={nombre}
                    onClick={() => setSelectedPaisCode(codigo)}
                    className={`relative flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all
                      ${activo
                        ? "border-[#1a7a5e] bg-[#f0faf6] shadow-sm"
                        : "border-transparent hover:border-[#dee2e6] hover:bg-gray-50"
                      }`}
                  >
                    <span className="text-2xl leading-none">{bandera}</span>
                    <span className="text-[10px] font-semibold text-gray-500">{codigo}</span>
                    {tieneP && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00a86b]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Panel del país seleccionado */}
            {selectedPaisCode && (() => {
              const pais = LATAM_PAISES.find(p => p.codigo === selectedPaisCode)!;
              const entry = courseForm.precios_paises[selectedPaisCode] || { precio: 0, stripe_price_id: "" };
              const usdEq = pais.moneda === "ARS" && dolarInfo
                ? Math.round((entry.precio / dolarInfo.venta) * 100) / 100
                : precioALocalAUSD(entry.precio, pais.moneda);
              return (
                <div className="rounded-xl border-2 border-[#1a7a5e] bg-[#f0faf6] p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl leading-none">{pais.bandera}</span>
                    <div>
                      <p className="font-bold text-[#0d2137]">{pais.nombre}</p>
                      <p className="text-xs text-gray-500">Moneda local: <span className="font-semibold">{pais.moneda}</span></p>
                    </div>
                    {entry.precio > 0 && (
                      <div className="ml-auto text-right">
                        <p className="text-xs text-gray-400">Equivale a</p>
                        <p className="text-lg font-bold text-[#1a7a5e]">≈ USD {usdEq.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Precio en {pais.moneda}</label>
                      <input
                        type="number" min="0"
                        className="w-full px-3 py-2 rounded-lg border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/40 bg-white text-sm"
                        placeholder="0"
                        value={entry.precio || ""}
                        onChange={e => {
                          const precio = Number(e.target.value);
                          const esAR = selectedPaisCode === "AR";
                          const usdAuto = esAR && dolarInfo && dolarInfo.venta > 0
                            ? Math.round((precio / dolarInfo.venta) * 100) / 100
                            : courseForm.precio_usd;
                          setCourseForm({
                            ...courseForm,
                            precio_ars: esAR ? precio : courseForm.precio_ars,
                            precio_usd: esAR ? usdAuto : courseForm.precio_usd,
                            precios_paises: { ...courseForm.precios_paises, [selectedPaisCode]: { ...entry, precio } }
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Stripe Price ID</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/40 bg-white font-mono text-xs"
                        placeholder="price_..."
                        value={entry.stripe_price_id || ""}
                        onChange={e => {
                          setCourseForm({ ...courseForm, precios_paises: { ...courseForm.precios_paises, [selectedPaisCode]: { ...entry, stripe_price_id: e.target.value } } });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsCourseModalOpen(false)} className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isStudentModalOpen} onClose={() => { setIsStudentModalOpen(false); setEditingStudent(null); }} title="Editar Alumno">
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Nombre</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={studentForm.nombre} onChange={e => setStudentForm({...studentForm, nombre: e.target.value})} /></div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50" value={studentForm.nuevoEmail} onChange={e => setStudentForm({...studentForm, nuevoEmail: e.target.value})} />
            {studentForm.nuevoEmail !== studentForm.email && <p className="text-xs text-amber-600">Se cambiará el email de <span className="font-mono">{studentForm.email}</span></p>}
          </div>
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Vencimiento</label><input type="date" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={studentForm.vencimiento} onChange={e => setStudentForm({...studentForm, vencimiento: e.target.value})} /></div>
<div className="flex items-center gap-2"><input type="checkbox" id="student-active" checked={studentForm.activo} onChange={e => setStudentForm({...studentForm, activo: e.target.checked})} /><label htmlFor="student-active" className="text-sm font-medium text-gray-700">Activo</label></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsStudentModalOpen(false); setEditingStudent(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancelar</button>
            <button type="submit" className="bg-[#00a86b] text-white px-6 py-2 rounded-md font-medium hover:bg-[#008f5a] transition-colors">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isLessonModalOpen} onClose={() => { setIsLessonModalOpen(false); setEditingLesson(null); }} title={editingLesson ? "Editar Lección" : "Nueva Lección"}>
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Título</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={lessonForm.titulo} onChange={e => setLessonForm({...lessonForm, titulo: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Vimeo ID</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={lessonForm.vimeo_id} onChange={e => setLessonForm({...lessonForm, vimeo_id: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Duración (segundos)</label><input type="number" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={lessonForm.duracion} onChange={e => setLessonForm({...lessonForm, duracion: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Orden</label><input type="number" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={lessonForm.orden} onChange={e => setLessonForm({...lessonForm, orden: Number(e.target.value)})} /></div>
            <div className="flex items-center gap-2 pt-6"><input type="checkbox" id="is_preview" checked={lessonForm.preview} onChange={e => setLessonForm({...lessonForm, preview: e.target.checked})} /><label htmlFor="is_preview" className="text-sm font-medium text-gray-700">Es preview</label></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsLessonModalOpen(false)} className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRecursoModalOpen} onClose={() => setIsRecursoModalOpen(false)} title="Agregar recurso">
        <form onSubmit={handleCreateRecurso} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tipo de recurso</label>
            <div className="grid grid-cols-3 gap-2">
              {(["pdf", "link", "comentario"] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setRecursoForm(f => ({ ...f, tipo: t, contenido: "" }))}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-md border text-sm font-medium transition-all ${recursoForm.tipo === t ? "border-[#00a86b] bg-[#eaf4ee] text-[#1a5c4a]" : "border-[#dee2e6] text-gray-500 hover:border-gray-400"}`}>
                  {t === "pdf" && <FileText size={18} />}
                  {t === "link" && <Link2 size={18} />}
                  {t === "comentario" && <MessageSquare size={18} />}
                  {t === "pdf" ? "PDF" : t === "link" ? "Link" : "Comentario"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50"
              placeholder={recursoForm.tipo === "pdf" ? "Ej: Ejercicios Módulo 1" : recursoForm.tipo === "link" ? "Ej: Documentación oficial" : "Ej: Nota importante"}
              value={recursoForm.titulo} onChange={e => setRecursoForm(f => ({ ...f, titulo: e.target.value }))} />
          </div>
          {recursoForm.tipo === "pdf" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Archivo PDF</label>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#dee2e6] rounded-md text-gray-500 hover:border-[#00a86b] hover:text-[#1a5c4a] transition-all">
                <Upload size={18} />
                {recursoForm.contenido ? "PDF cargado ✓ (click para cambiar)" : "Click para subir PDF (máx. 10 MB)"}
              </button>
            </div>
          )}
          {recursoForm.tipo === "link" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">URL</label>
              <input type="url" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50"
                placeholder="https://..." value={recursoForm.contenido} onChange={e => setRecursoForm(f => ({ ...f, contenido: e.target.value }))} />
            </div>
          )}
          {recursoForm.tipo === "comentario" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Contenido</label>
              <textarea rows={4} required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50"
                placeholder="Escribí una nota o comentario para los alumnos..."
                value={recursoForm.contenido} onChange={e => setRecursoForm(f => ({ ...f, contenido: e.target.value }))} />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsRecursoModalOpen(false)} className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={recursoForm.tipo === "pdf" && !recursoForm.contenido}
              className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Guardar</button>
          </div>
        </form>
      </Modal>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
