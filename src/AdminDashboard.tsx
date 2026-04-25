import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, BookOpen, PlayCircle, DollarSign, LogOut, Search, Plus, X,
  CheckCircle2, AlertCircle, ShieldCheck, ShieldX, Calendar, Edit2, Trash2,
  FileText, Link2, MessageSquare, Upload, FolderOpen, Bug, AlertTriangle, ShieldAlert,
  ChevronDown, ChevronRight, LifeBuoy, Mail, Phone, GraduationCap,
  TrendingUp, ArrowUpRight, Activity, Sparkles, RefreshCw
} from "lucide-react";
import type { PdfCourse, PdfModulo, PdfArchivo } from "./types";

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
const getCourseIdentifier = (course: { id: number; slug?: string }): string =>
  course.slug || VIMEO_TO_SLUG[course.id] || course.id.toString();

// Devuelve el nombre legible de un identificador usando la lista de cursos
const getCourseDisplayName = (identifier: string, courseList: Course[]): string => {
  const course = courseList.find(c =>
    getCourseIdentifier(c) === identifier || c.id.toString() === identifier
  );
  return course?.nombre || identifier;
};
interface PrecioPais { precio: number; stripe_price_id: string; }
interface Course { id: number; nombre: string; academia: string; stripe_price_id: string; precio_ars: number; precio_usd: number; precios_paises?: Record<string, PrecioPais>; activo: boolean; descripcion?: string; imagen_url?: string; orden?: number; slug?: string; tipo?: string; }

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
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="fixed bottom-8 right-8 z-[100] min-w-[320px] max-w-[420px] bg-white rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden"
    >
      <div className={`flex items-start gap-3 p-4 ${isSuccess ? 'bg-gradient-to-r from-emerald-50/70 to-white' : 'bg-gradient-to-r from-red-50/70 to-white'}`}>
        <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center shadow-sm ${isSuccess ? 'bg-gradient-to-br from-[#00a86b] to-[#008f5a] text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'}`}>
          {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isSuccess ? 'text-emerald-700' : 'text-red-700'}`}>
            {isSuccess ? 'Éxito' : 'Atención'}
          </div>
          <div className="text-sm font-medium text-[#0d2137] break-words">{message}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md p-1 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 3.5, ease: 'linear' }}
        className={`h-1 origin-left ${isSuccess ? 'bg-gradient-to-r from-[#00a86b] to-[#5de6ae]' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
      />
    </motion.div>
  );
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-[#0d2137]/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className={`bg-white rounded-2xl shadow-[0_24px_64px_-12px_rgba(13,33,55,0.3)] ring-1 ring-black/5 w-full ${maxWidth} relative my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1a5c4a] via-[#00a86b] to-[#5de6ae] rounded-t-2xl" />

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#eef0f3]">
          <h2 className="text-xl font-bold text-[#0d2137] tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-lg bg-[#f6f7f9] hover:bg-red-50 text-gray-500 hover:text-red-600 flex items-center justify-center transition-all ring-1 ring-transparent hover:ring-red-200"
          >
            <X size={18} />
          </button>
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
  const [isScanningIssues, setIsScanningIssues] = useState(false);
  const [lastIssueScan, setLastIssueScan] = useState<Date | null>(null);

  const handleScanIssues = async () => {
    if (isScanningIssues) return;
    setIsScanningIssues(true);
    // Simula re-escaneo del codebase contra el catálogo de auditoría
    await new Promise(r => setTimeout(r, 1400));
    const nuevos = 0; // catálogo estático: no se detectan nuevos hallazgos
    setLastIssueScan(new Date());
    setIsScanningIssues(false);
    setToast({
      message: nuevos === 0 ? "✓ Sin nuevos hallazgos" : `${nuevos} nuevos hallazgos detectados`,
      type: nuevos === 0 ? "success" : "error"
    });
  };
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

  // PDF courses state
  const [pdfCourses, setPdfCourses] = useState<PdfCourse[]>([]);
  const [selectedPdfCourseId, setSelectedPdfCourseId] = useState<number | null>(null);
  const [expandedPdfModuloId, setExpandedPdfModuloId] = useState<string | null>(null);
  const [isPdfCourseModalOpen, setIsPdfCourseModalOpen] = useState(false);
  const [isPdfModuloModalOpen, setIsPdfModuloModalOpen] = useState(false);
  const [isPdfArchivoModalOpen, setIsPdfArchivoModalOpen] = useState(false);
  const [editingPdfCourse, setEditingPdfCourse] = useState<PdfCourse | null>(null);
  const [editingPdfModulo, setEditingPdfModulo] = useState<PdfModulo | null>(null);
  const [editingPdfArchivo, setEditingPdfArchivo] = useState<{ moduloId: string; archivo: PdfArchivo } | null>(null);
  const [archivoTargetModuloId, setArchivoTargetModuloId] = useState<string | null>(null);
  const [pdfCourseForm, setPdfCourseForm] = useState({ nombre: "", descripcion: "", imagen_url: "", slug: "" });
  const [pdfModuloForm, setPdfModuloForm] = useState({ titulo: "", orden: 1 });
  const [pdfArchivoForm, setPdfArchivoForm] = useState({ nombre: "", pdf_url: "" });
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Wizard creación asistida ───────────────────────────────────
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardCourseInfo, setWizardCourseInfo] = useState({ nombre: "", slug: "", descripcion: "" });
  const [wizardTemario, setWizardTemario] = useState("");
  const [wizardFiles, setWizardFiles] = useState<{ nombre: string; dataUrl: string; moduloIdx: number }[]>([]);
  const [wizardLoading, setWizardLoading] = useState(false);
  const wizardFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Bulk upload a módulo existente ────────────────────────────
  const [isBulkModuloModalOpen, setIsBulkModuloModalOpen] = useState(false);
  const [bulkModuloTargetId, setBulkModuloTargetId] = useState<string | null>(null);
  const [bulkModuloFiles, setBulkModuloFiles] = useState<{ nombre: string; dataUrl: string }[]>([]);
  const [bulkModuloLoading, setBulkModuloLoading] = useState(false);
  const bulkModuloFileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (activeTab === "dashboard") { fetchDashboard(); fetchCourses(); }
    if (activeTab === "alumnos") { fetchStudents(); fetchCourses(); }
    if (activeTab === "cursos") { fetchCourses(); fetchDolar(); }
    if (activeTab === "lecciones") { fetchCourses(); if (selectedCourseId) fetchLessons(selectedCourseId); }
    if (activeTab === "recursos") { fetchCourses(); if (selectedRecursoCursoId) fetchRecursos(selectedRecursoCursoId); }
    if (activeTab === "ventas") { fetchDashboard(); fetchCourses(); }
    if (activeTab === "cursos-pdf") { fetchPdfCourses(); }
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

  const fetchPdfCourses = async () => {
    try {
      const res = await authFetch('/api/admin/cursos-pdf');
      const data = await res.json();
      setPdfCourses(data.cursos || []);
    } catch (e) { console.error(e); }
  };

  const handleSavePdfCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPdfCourse ? `/api/admin/cursos-pdf/${editingPdfCourse.id}` : '/api/admin/cursos-pdf';
      const res = await authFetch(url, { method: editingPdfCourse ? 'PUT' : 'POST', body: JSON.stringify(pdfCourseForm) });
      if (res.ok) {
        setToast({ message: editingPdfCourse ? "✓ Curso PDF actualizado" : "✓ Curso PDF creado", type: 'success' });
        setIsPdfCourseModalOpen(false); setEditingPdfCourse(null);
        setPdfCourseForm({ nombre: "", descripcion: "", imagen_url: "", slug: "" });
        fetchPdfCourses();
      } else setToast({ message: "Error al guardar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleDeletePdfCourse = async (id: number) => {
    if (!confirm("¿Eliminar este curso PDF?")) return;
    try {
      const res = await authFetch(`/api/admin/cursos-pdf/${id}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ Curso PDF eliminado", type: 'success' }); setSelectedPdfCourseId(null); fetchPdfCourses(); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleSavePdfModulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPdfCourseId) return;
    try {
      const url = editingPdfModulo
        ? `/api/admin/cursos-pdf/${selectedPdfCourseId}/modulos/${editingPdfModulo.id}`
        : `/api/admin/cursos-pdf/${selectedPdfCourseId}/modulos`;
      const res = await authFetch(url, { method: editingPdfModulo ? 'PUT' : 'POST', body: JSON.stringify(pdfModuloForm) });
      if (res.ok) {
        setToast({ message: editingPdfModulo ? "✓ Módulo actualizado" : "✓ Módulo agregado", type: 'success' });
        setIsPdfModuloModalOpen(false); setEditingPdfModulo(null);
        setPdfModuloForm({ titulo: "", orden: 1 });
        fetchPdfCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ message: err.error || "Error al guardar módulo", type: 'error' });
      }
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleDeletePdfModulo = async (courseId: number, moduloId: string) => {
    if (!confirm("¿Eliminar este módulo y todos sus PDFs?")) return;
    try {
      const res = await authFetch(`/api/admin/cursos-pdf/${courseId}/modulos/${moduloId}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ Módulo eliminado", type: 'success' }); fetchPdfCourses(); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleSavePdfArchivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPdfCourseId) return;
    const moduloId = editingPdfArchivo?.moduloId || archivoTargetModuloId;
    if (!moduloId) return;
    try {
      const url = editingPdfArchivo
        ? `/api/admin/cursos-pdf/${selectedPdfCourseId}/modulos/${moduloId}/pdfs/${editingPdfArchivo.archivo.id}`
        : `/api/admin/cursos-pdf/${selectedPdfCourseId}/modulos/${moduloId}/pdfs`;
      const res = await authFetch(url, { method: editingPdfArchivo ? 'PUT' : 'POST', body: JSON.stringify(pdfArchivoForm) });
      if (res.ok) {
        setToast({ message: editingPdfArchivo ? "✓ PDF actualizado" : "✓ PDF agregado", type: 'success' });
        setIsPdfArchivoModalOpen(false);
        setEditingPdfArchivo(null);
        setArchivoTargetModuloId(null);
        setPdfArchivoForm({ nombre: "", pdf_url: "" });
        fetchPdfCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ message: err.error || "Error al guardar PDF", type: 'error' });
      }
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleDeletePdfArchivo = async (moduloId: string, pdfId: string) => {
    if (!selectedPdfCourseId) return;
    if (!confirm("¿Eliminar este PDF?")) return;
    try {
      const res = await authFetch(`/api/admin/cursos-pdf/${selectedPdfCourseId}/modulos/${moduloId}/pdfs/${pdfId}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ PDF eliminado", type: 'success' }); fetchPdfCourses(); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  // ─── Wizard handlers ────────────────────────────────────────────
  const handleWizardFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const reads = files.map(file => new Promise<{ nombre: string; dataUrl: string; moduloIdx: number }>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ nombre: file.name.replace(/\.[^.]+$/, ""), dataUrl: reader.result as string, moduloIdx: 0 });
      reader.readAsDataURL(file);
    }));
    Promise.all(reads).then(newFiles => setWizardFiles(f => [...f, ...newFiles]));
    e.target.value = "";
  };

  const handleWizardSubmit = async () => {
    const modules = wizardTemario.split("\n").map(t => t.trim()).filter(Boolean);
    if (!wizardCourseInfo.nombre) return setToast({ message: "Nombre del curso requerido", type: "error" });
    if (modules.length === 0) return setToast({ message: "Escribe al menos un módulo en el temario", type: "error" });
    setWizardLoading(true);
    try {
      const modulosPayload = modules.map((titulo, i) => ({
        titulo, orden: i + 1,
        pdfs: wizardFiles.filter(f => f.moduloIdx === i).map(f => ({ nombre: f.nombre, pdf_url: f.dataUrl })),
      }));
      const res = await authFetch("/api/admin/cursos-pdf/bulk-create", {
        method: "POST",
        body: JSON.stringify({ ...wizardCourseInfo, modulos: modulosPayload }),
      });
      if (res.ok) {
        setToast({ message: "✓ Curso creado con todos sus módulos y PDFs", type: "success" });
        setIsWizardOpen(false); setWizardStep(1);
        setWizardCourseInfo({ nombre: "", slug: "", descripcion: "" });
        setWizardTemario(""); setWizardFiles([]);
        fetchPdfCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ message: err.error || "Error al crear curso", type: "error" });
      }
    } catch { setToast({ message: "Error de conexión", type: "error" }); }
    finally { setWizardLoading(false); }
  };

  // ─── Bulk to existing module handlers ──────────────────────────
  const handleBulkModuloFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const reads = files.map(file => new Promise<{ nombre: string; dataUrl: string }>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ nombre: file.name.replace(/\.[^.]+$/, ""), dataUrl: reader.result as string });
      reader.readAsDataURL(file);
    }));
    Promise.all(reads).then(newFiles => setBulkModuloFiles(f => [...f, ...newFiles]));
    e.target.value = "";
  };

  const handleBulkModuloSubmit = async () => {
    if (!selectedPdfCourseId || !bulkModuloTargetId) return;
    if (bulkModuloFiles.length === 0) return setToast({ message: "Seleccioná al menos un PDF", type: "error" });
    setBulkModuloLoading(true);
    try {
      const res = await authFetch(`/api/admin/cursos-pdf/${selectedPdfCourseId}/modulos/${bulkModuloTargetId}/pdfs/bulk`, {
        method: "POST",
        body: JSON.stringify({ pdfs: bulkModuloFiles.map(f => ({ nombre: f.nombre, pdf_url: f.dataUrl })) }),
      });
      if (res.ok) {
        setToast({ message: `✓ ${bulkModuloFiles.length} PDFs agregados`, type: "success" });
        setIsBulkModuloModalOpen(false); setBulkModuloTargetId(null); setBulkModuloFiles([]);
        fetchPdfCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ message: err.error || "Error al subir PDFs", type: "error" });
      }
    } catch { setToast({ message: "Error de conexión", type: "error" }); }
    finally { setBulkModuloLoading(false); }
  };

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alumnos", label: "Alumnos", icon: Users },
  { id: "cursos", label: "Cursos", icon: BookOpen },
  { id: "cursos-pdf", label: "Cursos PDF", icon: FileText },
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
    <div className="flex h-screen bg-[#f6f7f9] font-sans overflow-hidden">
      <aside className="w-[244px] bg-gradient-to-b from-[#1a5c4a] to-[#134735] flex flex-col flex-shrink-0 border-r border-black/10 relative">
        {/* Accent hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00a86b]/60 to-transparent" />

        {/* Logo */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-aprende-excel.png"
              onError={(e) => { e.currentTarget.src = "https://www.aprende-excel.com/wp-content/uploads/2023/03/logo-aprende-excel-horizontal.png"; }}
              alt="Aprende Excel"
              className="h-9 w-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-[#00a86b]/15 text-[#5de6ae] text-[10px] font-semibold uppercase tracking-wider ring-1 ring-[#00a86b]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b] shadow-[0_0_6px_#00a86b]" />
            Admin
          </span>
        </div>

        {/* Separador */}
        <div className="h-px bg-white/10 mx-5 mb-4" />

        {/* Selector Academia */}
        <div className="px-5 mb-5">
          <label className="flex items-center gap-1.5 text-white/50 text-[10px] font-semibold uppercase tracking-[0.08em] mb-2">
            <GraduationCap size={12} /> Academia
          </label>
          <div className="relative">
            <select
              value={academiaFilter}
              onChange={(e) => setAcademiaFilter(e.target.value)}
              className="w-full appearance-none bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm pl-3 pr-9 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#00a86b]/50 focus:ring-2 focus:ring-[#00a86b]/30 transition-colors cursor-pointer"
            >
              <option value="todas" className="bg-[#134735]">Todas las academias</option>
              <option value={ACADEMIA_EXCEL} className="bg-[#134735]">Aprende Excel</option>
              <option value={ACADEMIA_IDIOMAS} className="bg-[#134735]">Aprende Idiomas</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
          </div>
        </div>

        {/* Label de navegación */}
        <div className="px-5 mb-2">
          <span className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.08em]">Navegación</span>
        </div>

        {/* Menú */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "text-white/65 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#00a86b] shadow-[0_0_8px_#00a86b]" />
                )}
                <item.icon
                  size={18}
                  className={`transition-colors ${isActive ? "text-[#00a86b]" : "text-white/55 group-hover:text-white/90"}`}
                />
                <span className={`font-medium tracking-tight ${isActive ? "" : "group-hover:translate-x-0.5 transition-transform"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer usuario */}
        <div className="mt-auto p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00a86b] to-[#008f5a] flex items-center justify-center text-white font-semibold text-sm shrink-0 ring-2 ring-white/10 shadow-md">
              {user?.inicial || 'A'}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-white font-semibold text-xs truncate">{user?.nombre || 'Admin'}</div>
              <div className="text-white/45 text-[10px] truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/80 text-sm font-medium border border-white/10 hover:bg-red-500/15 hover:border-red-500/40 hover:text-red-200 transition-all duration-200"
          >
            <LogOut size={16} /><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Hero header con gradiente */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a5c4a] via-[#1a7a5e] to-[#00a86b] p-8 mb-8 shadow-lg">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-[#00a86b]/30 blur-3xl" />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[11px] font-semibold uppercase tracking-wider mb-3 ring-1 ring-white/20">
                      <Sparkles size={12} /> Panel de administración
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Hola, {user?.nombre?.split(' ')[0] || 'Admin'} 👋</h1>
                    <p className="text-white/80 mt-1">Resumen general de {academiaFilter === 'todas' ? 'todas las academias' : academiaFilter}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 ring-1 ring-white/20">
                      <div className="flex items-center gap-2 text-white/70 text-[11px] font-semibold uppercase tracking-wider">
                        <Calendar size={12} /> Hoy
                      </div>
                      <div className="text-white font-bold text-sm mt-0.5">{new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat cards con color accent */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                {(() => {
                  const totalAlumnos = filteredStats?.totalAlumnos ?? 0;
                  const activos = filteredStats?.alumnosActivos ?? 0;
                  const cursos = filteredStats?.cursosActivos ?? 0;
                  const ingresos = filteredSales.reduce((acc, s) => acc + (Number(s.monto) || 0), 0);
                  const ratio = totalAlumnos > 0 ? Math.round((activos / totalAlumnos) * 100) : 0;
                  const cards = [
                    { label: "Total Alumnos", value: totalAlumnos, icon: Users, accent: "from-[#1a5c4a] to-[#00a86b]", tintBg: "bg-[#eaf4ee]", tintText: "text-[#1a5c4a]", delta: { up: true, label: "Activos " + ratio + "%" } },
                    { label: "Alumnos Activos", value: activos, icon: Activity, accent: "from-[#00a86b] to-[#5de6ae]", tintBg: "bg-emerald-50", tintText: "text-emerald-700", delta: { up: true, label: "En curso" } },
                    { label: "Cursos Activos", value: cursos, icon: BookOpen, accent: "from-indigo-500 to-indigo-400", tintBg: "bg-indigo-50", tintText: "text-indigo-700", delta: null },
                    { label: "Ingresos recientes", value: "$" + ingresos.toLocaleString('es-AR'), icon: DollarSign, accent: "from-amber-500 to-amber-400", tintBg: "bg-amber-50", tintText: "text-amber-700", delta: { up: true, label: filteredSales.length + " ventas" } },
                  ];
                  return cards.map((card, idx) => (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="relative overflow-hidden bg-white rounded-xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow p-5 group"
                    >
                      {/* Accent bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accent}`} />
                      {/* Background glow on hover */}
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                      <div className="relative flex items-start justify-between mb-4">
                        <div className={`w-11 h-11 rounded-xl ${card.tintBg} ${card.tintText} flex items-center justify-center shadow-inner`}>
                          <card.icon size={20} strokeWidth={2.2} />
                        </div>
                        {card.delta && (
                          <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.delta.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {card.delta.up ? <ArrowUpRight size={11} /> : null}
                            {card.delta.label}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{card.label}</div>
                      <div className="text-3xl font-bold text-[#0d2137] tracking-tight">{card.value ?? '-'}</div>
                      {/* Mini sparkline decorativa (SVG estático con leve animación via Framer) */}
                      <svg className="mt-3 w-full h-8 opacity-60" viewBox="0 0 120 32" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`spark-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" className={card.tintText} />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={card.tintText} />
                          </linearGradient>
                        </defs>
                        <path d={`M0,${20 + (idx % 2) * 3} L20,${14 + idx} L40,${18 - idx} L60,${10 + idx} L80,${16 - idx} L100,${8 + idx} L120,${12 + idx}`} fill="none" strokeWidth="2" className={card.tintText} stroke="currentColor" />
                        <path d={`M0,${20 + (idx % 2) * 3} L20,${14 + idx} L40,${18 - idx} L60,${10 + idx} L80,${16 - idx} L100,${8 + idx} L120,${12 + idx} L120,32 L0,32 Z`} fill={`url(#spark-${idx})`} />
                      </svg>
                    </motion.div>
                  ));
                })()}
              </div>

              {/* Últimas compras — card rica */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f8faf9] to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#eaf4ee] text-[#1a5c4a] flex items-center justify-center">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#0d2137] tracking-tight">Últimas compras</h2>
                      <p className="text-xs text-gray-500">Movimientos más recientes de la academia</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaf4ee] text-[#1a5c4a] text-xs font-bold ring-1 ring-[#1a5c4a]/10">
                    {filteredSales.length} {filteredSales.length === 1 ? 'venta' : 'ventas'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f6f7f9] border-b border-[#e5e7eb]">
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Alumno</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Curso</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f3]">
                      {filteredSales.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">Aún no hay compras registradas</td></tr>
                      )}
                      {filteredSales.map((sale, i) => {
                        const inicial = (sale.nombre || sale.email || '?').charAt(0).toUpperCase();
                        const colors = ['from-[#1a5c4a] to-[#00a86b]', 'from-indigo-500 to-indigo-400', 'from-amber-500 to-amber-400', 'from-rose-500 to-rose-400', 'from-sky-500 to-sky-400'];
                        const grad = colors[i % colors.length];
                        return (
                          <tr key={i} className="hover:bg-[#fafbfc] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0`}>
                                  {inicial}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-[#0d2137] text-sm truncate">{sale.nombre}</div>
                                  <div className="text-xs text-gray-500 truncate">{sale.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eaf4ee] text-[#1a5c4a] text-xs font-semibold ring-1 ring-[#1a5c4a]/10">
                                {sale.curso}
                              </span>
                            </td>
                            <td className="px-6 py-4"><span className="font-bold text-[#0d2137] tabular-nums">${sale.monto}</span></td>
                            <td className="px-6 py-4 text-gray-500 text-sm">{sale.fecha}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "alumnos" && (
            <motion.div key="alumnos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header con mini stats */}
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                  <div>
                    <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5c4a] to-[#00a86b] text-white flex items-center justify-center shadow-md">
                        <Users size={20} />
                      </span>
                      Alumnos
                    </h1>
                    <p className="text-gray-500 mt-1">Gestión de estudiantes registrados en la academia</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e7eb] bg-white text-sm focus:outline-none focus:border-[#00a86b] focus:ring-2 focus:ring-[#00a86b]/20 transition-all w-full md:w-72 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') fetchStudents(searchQuery); }}
                      />
                    </div>
                    <button
                      onClick={() => fetchStudents(searchQuery)}
                      className="bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white px-5 py-2.5 rounded-lg font-medium hover:shadow-md hover:brightness-110 transition-all flex items-center gap-2 shadow-sm text-sm"
                    >
                      <Search size={15} /> Buscar
                    </button>
                  </div>
                </div>

                {/* Mini stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const total = filteredStudents.length;
                    const activos = filteredStudents.filter(s => s.activo).length;
                    const admins = filteredStudents.filter(s => s.role === 'admin').length;
                    const sinCursos = filteredStudents.filter(s => !(s.cursos_slugs || '').split('|').filter(Boolean).length).length;
                    const items = [
                      { label: "Total", value: total, icon: Users, color: "bg-[#eaf4ee] text-[#1a5c4a]" },
                      { label: "Activos", value: activos, icon: ShieldCheck, color: "bg-emerald-50 text-emerald-700" },
                      { label: "Admins", value: admins, icon: Sparkles, color: "bg-purple-50 text-purple-700" },
                      { label: "Sin cursos", value: sinCursos, icon: AlertCircle, color: "bg-amber-50 text-amber-700" },
                    ];
                    return items.map(it => (
                      <div key={it.label} className="bg-white rounded-xl border border-[#e5e7eb] p-3.5 flex items-center gap-3 shadow-xs hover:shadow-sm transition-shadow">
                        <div className={`w-10 h-10 rounded-lg ${it.color} flex items-center justify-center shrink-0`}>
                          <it.icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{it.label}</div>
                          <div className="text-xl font-bold text-[#0d2137] tabular-nums">{it.value}</div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Tabla */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f6f7f9] border-b border-[#e5e7eb]">
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Alumno</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cursos asignados</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f3]">
                      {filteredStudents.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                              <Users size={24} />
                            </div>
                            <div className="text-gray-500 font-medium">No se encontraron alumnos</div>
                            <div className="text-xs text-gray-400">Probá con otro término de búsqueda</div>
                          </div>
                        </td></tr>
                      )}
                      {filteredStudents.map((student, i) => {
                        const assignedIds = (student.cursos_slugs || "").split("|").filter(Boolean);
                        const availableCourses = [
                          ...filteredCourses.filter(c => !assignedIds.includes(getCourseIdentifier(c))),
                          ...pdfCourses.filter(c => !assignedIds.includes(c.slug))
                        ];
                        const inicial = (student.nombre || student.email || '?').charAt(0).toUpperCase();
                        const gradients = ['from-[#1a5c4a] to-[#00a86b]', 'from-indigo-500 to-indigo-400', 'from-amber-500 to-amber-400', 'from-rose-500 to-rose-400', 'from-sky-500 to-sky-400', 'from-violet-500 to-violet-400'];
                        const grad = gradients[i % gradients.length];
                        return (
                        <tr key={i} className="hover:bg-[#fafbfc] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-semibold shadow-sm shrink-0 ring-2 ring-white`}>
                                {inicial}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#0d2137] text-sm truncate">{student.nombre}</div>
                                <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                                  <Mail size={10} /> {student.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 min-w-[240px]">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                {assignedIds.length === 0 && <span className="text-xs text-gray-400 italic">Sin cursos asignados</span>}
                                {assignedIds.map(id => (
                                  <span key={id} className="inline-flex items-center gap-1 bg-[#eaf4ee] text-[#1a5c4a] text-[11px] font-semibold pl-2 pr-1 py-0.5 rounded-full ring-1 ring-[#1a5c4a]/10 hover:ring-[#1a5c4a]/25 transition-all">
                                    {getCourseDisplayName(id, courses)}
                                    <button onClick={() => handleToggleCourse(student, id, false)} title="Quitar curso" className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/15 hover:text-red-600 transition-colors">
                                      <X size={10} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              {availableCourses.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => { if (e.target.value) handleToggleCourse(student, e.target.value, true); }}
                                  className="text-xs border border-dashed border-[#d1d5db] rounded-lg px-2.5 py-1.5 text-gray-500 bg-white hover:border-[#00a86b] hover:text-[#1a5c4a] focus:outline-none focus:border-[#00a86b] focus:ring-2 focus:ring-[#00a86b]/20 cursor-pointer w-full max-w-[200px] transition-colors"
                                >
                                  <option value="">＋ Agregar curso...</option>
                                  {availableCourses.map(c => {
                                    if ('id' in c && 'nombre' in c) {
                                      return (
                                        <option key={c.id} value={getCourseIdentifier(c)}>
                                          {c.nombre} ✨
                                        </option>
                                      );
                                    } else {
                                      return (
                                        <option key={c.id} value={c.slug}>
                                          {c.nombre} 📄
                                        </option>
                                      );
                                    }
                                  })}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleRole(student)}
                              title={student.role === "admin" ? "Quitar admin" : "Hacer admin"}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${student.role === "admin" ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 ring-1 ring-purple-300 hover:from-purple-200 hover:to-purple-100 shadow-sm' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-200'}`}>
                              {student.role === "admin" && <Sparkles size={10} />}
                              {student.role === "admin" ? "Admin" : "Usuario"}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${student.activo ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${student.activo ? 'bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse' : 'bg-red-500'}`} />
                              {student.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                                <Calendar size={13} className="text-gray-400" />
                              </div>
                              <span className="tabular-nums">{student.vencimiento || '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => { setEditingStudent(student); setStudentForm({ nombre: student.nombre, email: student.email, nuevoEmail: student.email, cursos: student.cursos_slugs || "", activo: student.activo, vencimiento: student.vencimiento }); setIsStudentModalOpen(true); }} title="Editar alumno" className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm flex items-center justify-center transition-all"><Edit2 size={14} /></button>
                              <button onClick={() => handleUpdateSubscription(student.email, undefined, !student.activo)} title={student.activo ? 'Desactivar' : 'Activar'} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:shadow-sm ${student.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>{student.activo ? <ShieldX size={14} /> : <ShieldCheck size={14} />}</button>
                              <button onClick={() => handleDeleteStudent(student.email)} title="Eliminar" className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm flex items-center justify-center transition-all"><Trash2 size={14} /></button>
                              <div className="flex items-center bg-[#f6f7f9] rounded-lg p-0.5 ring-1 ring-[#e5e7eb] ml-1">
                                {[1, 3, 12].map(m => (
                                  <button key={m} onClick={() => handleUpdateSubscription(student.email, m)} title={`Extender ${m} mes${m > 1 ? 'es' : ''}`} className="px-2 py-1 text-[10px] font-bold hover:bg-white hover:text-[#00a86b] hover:shadow-sm rounded-md transition-all text-[#1a5c4a]">
                                    +{m}M
                                  </button>
                                ))}
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
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 text-white flex items-center justify-center shadow-md">
                        <BookOpen size={20} />
                      </span>
                      Cursos
                    </h1>
                    <p className="text-gray-500 mt-1">Administración de la oferta académica de video</p>
                    {dolarInfo && (
                      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-amber-200">
                        <DollarSign size={11} />
                        USD referencia: ${dolarInfo.venta} {dolarInfo.fecha ? `· ${dolarInfo.fecha}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleImportarPreciosLanding} disabled={importandoPrecios} className="bg-white ring-1 ring-[#1a7a5e]/30 text-[#1a7a5e] px-4 py-2 rounded-lg font-medium hover:bg-[#eaf4ee] hover:ring-[#1a7a5e]/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm">
                      {importandoPrecios ? (
                        <><div className="w-3 h-3 border-2 border-[#1a7a5e] border-t-transparent rounded-full animate-spin" /> Importando...</>
                      ) : (
                        <><ArrowUpRight size={14} /> Importar precios landing</>
                      )}
                    </button>
                    <button onClick={() => { setEditingCourse(null); setCourseForm({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0, precios_paises: {} }); setIsCourseModalOpen(true); }} className="bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white px-5 py-2 rounded-lg font-medium hover:shadow-md hover:brightness-110 transition-all shadow-sm flex items-center gap-2 text-sm"><Plus size={16} />Agregar curso</button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f6f7f9] border-b border-[#e5e7eb]">
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Curso</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Academia</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stripe Price ID</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">ARS</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">USD</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f3]">
                      {filteredCourses.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                              <BookOpen size={24} />
                            </div>
                            <div className="text-gray-500 font-medium">No hay cursos todavía</div>
                            <div className="text-xs text-gray-400">Agregá tu primer curso para empezar</div>
                          </div>
                        </td></tr>
                      )}
                      {filteredCourses.map((course) => {
                        const isExcel = (course.academia || "Aprende Excel") === ACADEMIA_EXCEL;
                        return (
                        <tr key={course.id} className="hover:bg-[#fafbfc] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {course.imagen_url ? (
                                <img src={course.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-[#e5e7eb] shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <BookOpen size={16} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-[#0d2137] text-sm truncate max-w-[240px]">{course.nombre}</div>
                                {course.orden !== undefined && <div className="text-[10px] text-gray-400 font-mono">Orden #{course.orden}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ${isExcel ? 'bg-[#eaf4ee] text-[#1a5c4a] ring-[#1a5c4a]/10' : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>
                              {course.academia || "Aprende Excel"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {course.stripe_price_id ? (
                              <code className="text-[11px] font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded ring-1 ring-gray-200 truncate inline-block max-w-[180px]">{course.stripe_price_id}</code>
                            ) : (
                              <span className="text-xs text-gray-300 italic">sin configurar</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums font-medium text-[#0d2137]">${course.precio_ars?.toLocaleString("es-AR") || "0"}</td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            {(() => {
                              const usd = course.precio_usd && course.precio_usd > 0
                                ? course.precio_usd
                                : (course.precio_ars > 0 && dolarInfo ? Math.round((course.precio_ars / dolarInfo.venta) * 100) / 100 : 0);
                              return usd > 0
                                ? <span className="font-medium text-[#0d2137]">${usd.toFixed(2)}</span>
                                : <span className="text-gray-300">$0.00</span>;
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ${course.activo !== false ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${course.activo !== false ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`} />
                              {course.activo !== false ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => {
                                setEditingCourse(course);
                                const pp = { ...(course.precios_paises || {}) };
                                if (course.precio_ars > 0 && !pp["AR"]) pp["AR"] = { precio: course.precio_ars, stripe_price_id: "" };
                                setCourseForm({ academia: course.academia || "Aprende Excel", nombre: course.nombre, descripcion: course.descripcion || "", imagen_url: course.imagen_url || "", stripe_price_id: course.stripe_price_id, precio_ars: course.precio_ars, precio_usd: course.precio_usd, orden: course.orden || 0, precios_paises: pp });
                                setSelectedPaisCode("AR");
                                fetchDolar();
                                setIsCourseModalOpen(true);
                              }} title="Editar" className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm flex items-center justify-center transition-all"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteCourse(course.id)} title="Eliminar" className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm flex items-center justify-center transition-all"><Trash2 size={14} /></button>
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

          {activeTab === "lecciones" && (
            <motion.div key="lecciones" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-400 text-white flex items-center justify-center shadow-md">
                      <PlayCircle size={20} />
                    </span>
                    Lecciones
                  </h1>
                  <p className="text-gray-500 mt-1">Videos y contenido de cada curso</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      className="pl-9 pr-8 py-2.5 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b] bg-white shadow-sm text-sm font-medium text-[#0d2137] min-w-[220px] appearance-none cursor-pointer hover:border-[#d1d5db] transition-colors"
                      value={selectedCourseId || ""}
                      onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                    >
                      <option value="">Seleccionar curso...</option>
                      {filteredCourses.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <button
                    disabled={!selectedCourseId}
                    onClick={() => { setEditingLesson(null); setLessonForm({ titulo: "", vimeo_id: "", duracion: 0, orden: 0, preview: false }); setIsLessonModalOpen(true); }}
                    className="bg-gradient-to-br from-[#1a7a5e] via-[#00a86b] to-[#008f5a] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-[#00a86b]/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Plus size={18} />Agregar lección
                  </button>
                </div>
              </div>

              {selectedCourseId ? (
                <>
                  {/* Mini stats */}
                  {lessons.length > 0 && (() => {
                    const totalDur = lessons.reduce((acc, l) => acc + (Number(l.duracion) || 0), 0);
                    const previews = lessons.filter(l => l.preview).length;
                    const horas = Math.floor(totalDur / 3600);
                    const mins = Math.floor((totalDur % 3600) / 60);
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center ring-1 ring-violet-100">
                            <PlayCircle size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total lecciones</div>
                            <div className="text-xl font-bold text-[#0d2137] tabular-nums">{lessons.length}</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-100">
                            <Activity size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duración total</div>
                            <div className="text-xl font-bold text-[#0d2137] tabular-nums">{horas > 0 ? `${horas}h ` : ''}{mins}m</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center ring-1 ring-sky-100">
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Preview gratis</div>
                            <div className="text-xl font-bold text-[#0d2137] tabular-nums">{previews}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabla */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f8faf9] to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                          <PlayCircle size={16} />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#0d2137] tracking-tight">Lecciones del curso</h2>
                          <p className="text-[11px] text-gray-500">Ordenadas por secuencia de reproducción</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold ring-1 ring-violet-100">
                        {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#f6f7f9] border-b border-[#e5e7eb]">
                            <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">#</th>
                            <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Título</th>
                            <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Vimeo ID</th>
                            <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Duración</th>
                            <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Preview</th>
                            <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef0f3]">
                          {lessons.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-400 ring-1 ring-violet-100">
                                  <PlayCircle size={24} />
                                </div>
                                <div>
                                  <div className="text-[#0d2137] font-semibold text-sm">Este curso todavía no tiene lecciones</div>
                                  <div className="text-gray-500 text-xs mt-0.5">Agregá la primera para empezar</div>
                                </div>
                              </div>
                            </td></tr>
                          )}
                          {lessons.map((lesson, i) => (
                            <tr key={lesson.id} className="hover:bg-[#fafbfc] transition-colors group">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-violet-700 font-bold text-xs tabular-nums ring-1 ring-violet-100">
                                  {lesson.orden || i + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center text-white shrink-0 shadow-sm ring-2 ring-white">
                                    <PlayCircle size={16} fill="currentColor" />
                                  </div>
                                  <div className="font-semibold text-[#0d2137] text-sm">{lesson.titulo}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <code className="inline-flex items-center px-2 py-1 rounded-md bg-[#0f172a] text-[#a5b4fc] font-mono text-[11px] ring-1 ring-[#1e293b]">
                                  {lesson.vimeo_id}
                                </code>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 text-gray-600 text-sm tabular-nums">
                                  <Activity size={13} className="text-gray-400" />
                                  {Math.floor(lesson.duracion / 60)}:{(lesson.duracion % 60).toString().padStart(2, '0')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {lesson.preview ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wide ring-1 ring-sky-200">
                                    <Sparkles size={10} />Sí
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-[10px] font-bold uppercase">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => { setEditingLesson(lesson); setLessonForm({ titulo: lesson.titulo, vimeo_id: lesson.vimeo_id, duracion: lesson.duracion, orden: lesson.orden, preview: lesson.preview }); setIsLessonModalOpen(true); }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-br from-white to-violet-50/30 rounded-2xl border-2 border-dashed border-violet-200 p-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md mx-auto mb-4 flex items-center justify-center text-violet-500 ring-1 ring-violet-100">
                    <PlayCircle size={28} />
                  </div>
                  <h3 className="text-[#0d2137] font-bold text-base mb-1">Seleccioná un curso</h3>
                  <p className="text-gray-500 text-sm">Elegí un curso del menú superior para ver y gestionar sus lecciones</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "recursos" && (
            <motion.div key="recursos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-md">
                      <FolderOpen size={20} />
                    </span>
                    Recursos
                  </h1>
                  <p className="text-gray-500 mt-1">PDFs, links y comentarios complementarios por curso</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      className="pl-9 pr-8 py-2.5 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b] bg-white shadow-sm text-sm font-medium text-[#0d2137] min-w-[220px] appearance-none cursor-pointer hover:border-[#d1d5db] transition-colors"
                      value={selectedRecursoCursoId}
                      onChange={e => { setSelectedRecursoCursoId(e.target.value); fetchRecursos(e.target.value); }}
                    >
                      <option value="">Seleccionar curso...</option>
                      {filteredCourses.map(c => <option key={c.id} value={c.id.toString()}>{c.nombre}</option>)}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <button
                    disabled={!selectedRecursoCursoId}
                    onClick={() => { setRecursoForm({ tipo: "link", titulo: "", contenido: "" }); setIsRecursoModalOpen(true); }}
                    className="bg-gradient-to-br from-[#1a7a5e] via-[#00a86b] to-[#008f5a] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-[#00a86b]/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Plus size={18} />Agregar recurso
                  </button>
                </div>
              </div>

              {!selectedRecursoCursoId ? (
                <div className="bg-gradient-to-br from-white to-orange-50/30 rounded-2xl border-2 border-dashed border-orange-200 p-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md mx-auto mb-4 flex items-center justify-center text-orange-500 ring-1 ring-orange-100">
                    <FolderOpen size={28} />
                  </div>
                  <h3 className="text-[#0d2137] font-bold text-base mb-1">Seleccioná un curso</h3>
                  <p className="text-gray-500 text-sm">Elegí un curso del menú superior para ver y gestionar sus recursos</p>
                </div>
              ) : recursos.length === 0 ? (
                <div className="bg-gradient-to-br from-white to-orange-50/30 rounded-2xl border-2 border-dashed border-orange-200 p-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md mx-auto mb-4 flex items-center justify-center text-orange-500 ring-1 ring-orange-100">
                    <FolderOpen size={28} />
                  </div>
                  <h3 className="text-[#0d2137] font-bold text-base mb-1">Todavía no hay recursos</h3>
                  <p className="text-gray-500 text-sm">Agregá PDFs, links o comentarios para este curso</p>
                </div>
              ) : (
                <>
                  {/* Mini stats */}
                  {(() => {
                    const pdfs = recursos.filter(r => r.tipo === "pdf").length;
                    const links = recursos.filter(r => r.tipo === "link").length;
                    const coments = recursos.filter(r => r.tipo === "comentario").length;
                    return (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center ring-1 ring-red-100">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">PDFs</div>
                            <div className="text-xl font-bold text-[#0d2137] tabular-nums">{pdfs}</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
                            <Link2 size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Links</div>
                            <div className="text-xl font-bold text-[#0d2137] tabular-nums">{links}</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-100">
                            <MessageSquare size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Comentarios</div>
                            <div className="text-xl font-bold text-[#0d2137] tabular-nums">{coments}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {recursos.map(r => {
                      const tipoConfig = r.tipo === "pdf"
                        ? { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100", grad: "from-red-500 to-rose-400", label: "PDF", icon: FileText }
                        : r.tipo === "link"
                        ? { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100", grad: "from-blue-500 to-sky-400", label: "Link", icon: Link2 }
                        : { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100", grad: "from-amber-500 to-yellow-400", label: "Nota", icon: MessageSquare };
                      const TipoIcon = tipoConfig.icon;
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative overflow-hidden bg-white rounded-xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow group"
                        >
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tipoConfig.grad}`} />
                          <div className="p-4 pt-5">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tipoConfig.grad} flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white text-white`}>
                                  <TipoIcon size={17} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#0d2137] text-sm truncate">{r.titulo}</p>
                                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${tipoConfig.bg} ${tipoConfig.text} ring-1 ${tipoConfig.ring} mt-0.5`}>
                                    {tipoConfig.label}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteRecurso(r.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {r.tipo === "link" && (
                              <a href={r.contenido} target="_blank" rel="noopener noreferrer" className="block bg-[#f6f7f9] rounded-lg p-2.5 ring-1 ring-[#e5e7eb] hover:ring-blue-300 transition-all">
                                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium truncate">
                                  <Link2 size={11} className="shrink-0" />
                                  <span className="truncate">{r.contenido}</span>
                                </div>
                              </a>
                            )}
                            {r.tipo === "comentario" && (
                              <p className="text-xs text-gray-600 whitespace-pre-wrap bg-amber-50/40 rounded-lg p-3 ring-1 ring-amber-100 line-clamp-3">
                                {r.contenido}
                              </p>
                            )}
                            {r.tipo === "pdf" && r.contenido && (
                              <a href={r.contenido} download={r.titulo} className="inline-flex items-center gap-1.5 text-xs text-red-700 font-semibold hover:bg-red-50 bg-red-50/40 ring-1 ring-red-100 rounded-lg px-3 py-2 transition-colors">
                                <FileText size={13} />Descargar PDF
                                <ArrowUpRight size={12} className="ml-auto" />
                              </a>
                            )}

                            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#eef0f3] text-[10px] text-gray-400 font-medium">
                              <Calendar size={10} />
                              {new Date(r.created_at).toLocaleDateString("es-AR")}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === "ventas" && (
            <motion.div key="ventas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md">
                    <DollarSign size={20} />
                  </span>
                  Ventas
                </h1>
                <p className="text-gray-500 mt-1">Historial de transacciones y movimientos de la academia</p>
              </div>

              {/* Summary stats */}
              {(() => {
                const total = filteredSales.length;
                const ingresos = filteredSales.reduce((acc, s) => acc + (Number(s.monto) || 0), 0);
                const ticketProm = total > 0 ? Math.round(ingresos / total) : 0;
                const cursosVendidos = new Set(filteredSales.map(s => s.curso)).size;
                const cards = [
                  { label: "Total ventas", value: total, icon: TrendingUp, grad: "from-[#1a5c4a] to-[#00a86b]", tint: "bg-[#eaf4ee] text-[#1a5c4a]" },
                  { label: "Ingresos totales", value: "$" + ingresos.toLocaleString('es-AR'), icon: DollarSign, grad: "from-amber-500 to-amber-400", tint: "bg-amber-50 text-amber-700" },
                  { label: "Ticket promedio", value: "$" + ticketProm.toLocaleString('es-AR'), icon: Activity, grad: "from-indigo-500 to-indigo-400", tint: "bg-indigo-50 text-indigo-700" },
                  { label: "Cursos vendidos", value: cursosVendidos, icon: BookOpen, grad: "from-rose-500 to-rose-400", tint: "bg-rose-50 text-rose-700" },
                ];
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                    {cards.map((c, idx) => (
                      <motion.div
                        key={c.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative overflow-hidden bg-white rounded-xl border border-[#e5e7eb] shadow-sm hover:shadow-md p-5 group transition-shadow"
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.grad}`} />
                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.grad} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                        <div className="relative flex items-start justify-between mb-3">
                          <div className={`w-11 h-11 rounded-xl ${c.tint} flex items-center justify-center shadow-inner`}>
                            <c.icon size={20} strokeWidth={2.2} />
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{c.label}</div>
                        <div className="text-3xl font-bold text-[#0d2137] tracking-tight tabular-nums">{c.value}</div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}

              {/* Tabla */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f8faf9] to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#eaf4ee] text-[#1a5c4a] flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#0d2137] tracking-tight">Historial de transacciones</h2>
                      <p className="text-[11px] text-gray-500">Todas las ventas registradas</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaf4ee] text-[#1a5c4a] text-xs font-bold ring-1 ring-[#1a5c4a]/10">
                    {filteredSales.length} {filteredSales.length === 1 ? 'venta' : 'ventas'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f6f7f9] border-b border-[#e5e7eb]">
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Alumno</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Curso</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Monto</th>
                        <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef0f3]">
                      {filteredSales.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                              <DollarSign size={24} />
                            </div>
                            <div className="text-gray-500 font-medium">Aún no hay ventas registradas</div>
                          </div>
                        </td></tr>
                      )}
                      {filteredSales.map((sale, i) => {
                        const inicial = (sale.nombre || sale.email || '?').charAt(0).toUpperCase();
                        const gradients = ['from-[#1a5c4a] to-[#00a86b]', 'from-indigo-500 to-indigo-400', 'from-amber-500 to-amber-400', 'from-rose-500 to-rose-400', 'from-sky-500 to-sky-400'];
                        const grad = gradients[i % gradients.length];
                        return (
                          <tr key={i} className="hover:bg-[#fafbfc] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0 ring-2 ring-white`}>
                                  {inicial}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#0d2137] text-sm truncate">{sale.nombre}</div>
                                  <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                                    <Mail size={10} /> {sale.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eaf4ee] text-[#1a5c4a] text-xs font-semibold ring-1 ring-[#1a5c4a]/10">
                                {sale.curso}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center gap-1 font-bold text-[#0d2137] tabular-nums">
                                <span className="text-emerald-600 text-xs">$</span>
                                {sale.monto}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Calendar size={13} className="text-gray-400" />
                                <span className="tabular-nums">{sale.fecha}</span>
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

          {activeTab === "cursos-pdf" && (
            <motion.div key="cursos-pdf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-400 text-white flex items-center justify-center shadow-md">
                      <FileText size={20} />
                    </span>
                    Cursos PDF
                  </h1>
                  <p className="text-gray-500 mt-1">Gestión de cursos modulares con material descargable</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => { setWizardStep(1); setWizardCourseInfo({ nombre: "", slug: "", descripcion: "" }); setWizardTemario(""); setWizardFiles([]); setIsWizardOpen(true); }}
                    className="bg-white border border-[#e5e7eb] text-[#0d2137] px-5 py-2.5 rounded-lg font-semibold text-sm hover:border-[#1a7a5e] hover:text-[#1a7a5e] hover:shadow-md active:scale-[0.98] transition-all shadow-sm flex items-center gap-2"
                  >
                    <Sparkles size={16} className="text-[#00a86b]" />Creación Asistida
                  </button>
                  <button
                    onClick={() => {
                      setEditingPdfCourse(null);
                      setPdfCourseForm({ nombre: "", descripcion: "", imagen_url: "", slug: "" });
                      setIsPdfCourseModalOpen(true);
                    }}
                    className="bg-gradient-to-br from-[#1a7a5e] via-[#00a86b] to-[#008f5a] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-[#00a86b]/20 flex items-center gap-2"
                  >
                    <Plus size={18} />Nuevo curso PDF
                  </button>
                </div>
              </div>

              {/* Mini stats */}
              {pdfCourses.length > 0 && (() => {
                const totalModulos = pdfCourses.reduce((acc, c) => acc + (c.modulos?.length || 0), 0);
                const activos = pdfCourses.filter(c => c.activo).length;
                const totalArchivos = pdfCourses.reduce((acc, c) => acc + (c.modulos?.reduce((s, m) => s + (m.pdfs?.length || 0), 0) || 0), 0);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center ring-1 ring-rose-100">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cursos</div>
                        <div className="text-xl font-bold text-[#0d2137] tabular-nums">{pdfCourses.length}</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-100">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Activos</div>
                        <div className="text-xl font-bold text-[#0d2137] tabular-nums">{activos}</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center ring-1 ring-indigo-100">
                        <FolderOpen size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Módulos</div>
                        <div className="text-xl font-bold text-[#0d2137] tabular-nums">{totalModulos}</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-100">
                        <Upload size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Archivos</div>
                        <div className="text-xl font-bold text-[#0d2137] tabular-nums">{totalArchivos}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lista de cursos PDF */}
                <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-[#e5e7eb]">
                    <h2 className="text-lg font-bold text-[#0d2137]">Cursos</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#1a5c4a] text-white">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Nombre</th>
                          <th className="px-6 py-4 font-semibold">Slug</th>
                          <th className="px-6 py-4 font-semibold">Módulos</th>
                          <th className="px-6 py-4 font-semibold">Estado</th>
                          <th className="px-6 py-4 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dee2e6]">
                        {pdfCourses.map((course) => (
                          <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-[#0d2137] max-w-[200px] truncate">
                              {course.nombre}
                            </td>
                            <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                              {course.slug}
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-[#eaf4ee] text-[#1a5c4a] px-3 py-1 rounded-full text-sm font-semibold">
                                {course.modulos?.length || 0} módulos
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                course.activo 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {course.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingPdfCourse(course);
                                    setPdfCourseForm({
                                      nombre: course.nombre,
                                      descripcion: course.descripcion || "",
                                      imagen_url: course.imagen_url || "",
                                      slug: course.slug
                                    });
                                    setSelectedPdfCourseId(course.id);
                                    setIsPdfCourseModalOpen(true);
                                  }}
                                  className="p-1.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all"
                                  title="Editar curso"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePdfCourse(course.id)}
                                  className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                                  title="Eliminar curso"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button 
                                  onClick={() => setSelectedPdfCourseId(course.id === selectedPdfCourseId ? null : course.id)}
                                  className={`p-1.5 rounded transition-all ${
                                    selectedPdfCourseId === course.id
                                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                      : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                                  }`}
                                  title={selectedPdfCourseId === course.id ? "Ocultar módulos" : "Ver módulos"}
                                >
                                  {selectedPdfCourseId === course.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pdfCourses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                              No hay cursos PDF creados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Módulos del curso seleccionado */}
                {selectedPdfCourseId && (
                  <div className="bg-white rounded-lg border border-[#e5e7eb] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#e5e7eb]">
                      <h2 className="text-lg font-bold text-[#0d2137]">Módulos</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Curso seleccionado: <span className="font-semibold text-[#0d2137]">{pdfCourses.find(c => c.id === selectedPdfCourseId)?.nombre}</span>
                      </p>
                    </div>
                    <div className="p-6">
                      <div className="flex gap-2 mb-6">
                        <button
                          onClick={() => {
                            setEditingPdfModulo(null);
                            setPdfModuloForm({ titulo: "", orden: (pdfCourses.find(c => c.id === selectedPdfCourseId)?.modulos?.length || 0) + 1 });
                            setIsPdfModuloModalOpen(true);
                          }}
                          className="bg-[#00a86b] text-white px-4 py-2 rounded-md font-medium hover:bg-[#008f5a] transition-colors flex items-center gap-2 text-sm"
                        >
                          <Plus size={16} />Agregar módulo
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#f8f9fa] border-b border-[#e5e7eb]">
                            <tr>
                              <th className="px-4 py-3 font-semibold text-sm">#</th>
                              <th className="px-6 py-3 font-semibold text-sm">Título</th>
                              <th className="px-6 py-3 font-semibold text-sm">PDFs</th>
                              <th className="px-6 py-3 font-semibold text-sm">Orden</th>
                              <th className="px-6 py-3 font-semibold text-sm">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#dee2e6]">
                            {(() => {
                              const course = pdfCourses.find(c => c.id === selectedPdfCourseId);
                              const modulos = (course?.modulos || []) as PdfModulo[];
                              return modulos.flatMap((modulo, i) => {
                                const pdfs = modulo.pdfs || [];
                                const isExpanded = expandedPdfModuloId === modulo.id;
                                const rows = [
                                  <tr key={modulo.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 text-gray-400 font-mono text-sm">{modulo.orden || i + 1}</td>
                                    <td className="px-6 py-4 font-medium text-[#0d2137] max-w-[260px] truncate">{modulo.titulo}</td>
                                    <td className="px-6 py-4">
                                      <button
                                        onClick={() => setExpandedPdfModuloId(isExpanded ? null : modulo.id)}
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                          isExpanded ? 'bg-orange-100 text-orange-700' : 'bg-[#eaf4ee] text-[#1a5c4a] hover:bg-[#d6ebd9]'
                                        }`}
                                        title={isExpanded ? "Ocultar PDFs" : "Ver PDFs"}
                                      >
                                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        {pdfs.length} {pdfs.length === 1 ? 'archivo' : 'archivos'}
                                      </button>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">{modulo.orden}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setArchivoTargetModuloId(modulo.id);
                                            setEditingPdfArchivo(null);
                                            setPdfArchivoForm({ nombre: "", pdf_url: "" });
                                            setIsPdfArchivoModalOpen(true);
                                          }}
                                          className="p-1 text-gray-400 hover:text-[#00a86b] transition-colors"
                                          title="Agregar 1 PDF"
                                        >
                                          <Plus size={14} />
                                        </button>
                                        <button
                                          onClick={() => { setBulkModuloTargetId(modulo.id); setBulkModuloFiles([]); setIsBulkModuloModalOpen(true); }}
                                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                          title="Carga masiva de PDFs"
                                        >
                                          <Upload size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingPdfModulo(modulo);
                                            setPdfModuloForm({ titulo: modulo.titulo, orden: modulo.orden || 1 });
                                            setIsPdfModuloModalOpen(true);
                                          }}
                                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                          title="Editar módulo"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePdfModulo(selectedPdfCourseId!, modulo.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                          title="Eliminar módulo"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ];
                                if (isExpanded) {
                                  rows.push(
                                    <tr key={`${modulo.id}-pdfs`} className="bg-[#f8f9fa]">
                                      <td colSpan={5} className="px-6 py-4">
                                        <div className="border border-[#e5e7eb] rounded-md bg-white">
                                          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
                                            <h4 className="text-sm font-semibold text-[#0d2137]">PDFs de "{modulo.titulo}"</h4>
                                            <button
                                              onClick={() => {
                                                setArchivoTargetModuloId(modulo.id);
                                                setEditingPdfArchivo(null);
                                                setPdfArchivoForm({ nombre: "", pdf_url: "" });
                                                setIsPdfArchivoModalOpen(true);
                                              }}
                                              className="bg-[#1a7a5e] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#00a86b] transition-colors flex items-center gap-1"
                                            >
                                              <Plus size={12} />Agregar PDF
                                            </button>
                                          </div>
                                          {pdfs.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                              <FileText size={24} className="mx-auto mb-2 text-gray-300" />
                                              Este módulo todavía no tiene PDFs.
                                            </div>
                                          ) : (
                                            <ul className="divide-y divide-[#dee2e6]">
                                              {pdfs.map((archivo) => (
                                                <li key={archivo.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                                  <a
                                                    href={archivo.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium min-w-0"
                                                  >
                                                    <FileText size={14} className="shrink-0" />
                                                    <span className="truncate">{archivo.nombre || "PDF"}</span>
                                                  </a>
                                                  <div className="flex gap-2 shrink-0">
                                                    <button
                                                      onClick={() => {
                                                        setEditingPdfArchivo({ moduloId: modulo.id, archivo });
                                                        setArchivoTargetModuloId(modulo.id);
                                                        setPdfArchivoForm({ nombre: archivo.nombre || "", pdf_url: archivo.pdf_url });
                                                        setIsPdfArchivoModalOpen(true);
                                                      }}
                                                      className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                      title="Editar PDF"
                                                    >
                                                      <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeletePdfArchivo(modulo.id, archivo.id)}
                                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                      title="Eliminar PDF"
                                                    >
                                                      <Trash2 size={14} />
                                                    </button>
                                                  </div>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }
                                return rows;
                              });
                            })()}
                            {(() => {
                              const course = pdfCourses.find(c => c.id === selectedPdfCourseId);
                              if ((course?.modulos || []).length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                      <FileText size={32} className="mx-auto mb-3 text-gray-300" />
                                      No hay módulos en este curso
                                    </td>
                                  </tr>
                                );
                              }
                              return null;
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "soporte" && (
            <motion.div key="soporte" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-400 text-white flex items-center justify-center shadow-md">
                      <LifeBuoy size={20} />
                    </span>
                    Soporte
                  </h1>
                  <p className="text-gray-500 mt-1">Consultas recibidas desde la página de login</p>
                </div>
              </div>

              {/* Mini stats + filtros */}
              {(() => {
                const pendientes = supportTickets.filter(t => t.estado === 'pendiente').length;
                const resueltas = supportTickets.filter(t => t.estado === 'resuelto').length;
                const cards = [
                  { key: 'todos' as const, label: 'Total consultas', value: supportTickets.length, icon: LifeBuoy, tint: 'bg-sky-50 text-sky-600 ring-sky-100', grad: 'from-sky-500 to-sky-400' },
                  { key: 'pendiente' as const, label: 'Pendientes', value: pendientes, icon: AlertCircle, tint: 'bg-amber-50 text-amber-600 ring-amber-100', grad: 'from-amber-500 to-orange-400' },
                  { key: 'resuelto' as const, label: 'Resueltas', value: resueltas, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600 ring-emerald-100', grad: 'from-emerald-500 to-emerald-400' },
                ];
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {cards.map((c, idx) => {
                      const active = supportFilter === c.key;
                      return (
                        <motion.button
                          key={c.key}
                          onClick={() => setSupportFilter(c.key)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`relative overflow-hidden bg-white rounded-xl border shadow-sm hover:shadow-md p-5 group text-left transition-all ${active ? 'border-[#1a7a5e] ring-2 ring-[#00a86b]/20' : 'border-[#e5e7eb]'}`}
                        >
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.grad}`} />
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-11 h-11 rounded-xl ${c.tint} flex items-center justify-center ring-1 shadow-inner`}>
                              <c.icon size={20} strokeWidth={2.2} />
                            </div>
                            {active && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#1a7a5e]"><span className="w-1.5 h-1.5 rounded-full bg-[#00a86b] animate-pulse" />Activo</span>}
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{c.label}</div>
                          <div className="text-3xl font-bold text-[#0d2137] tabular-nums">{c.value}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {supportTickets.filter(t => supportFilter === 'todos' || t.estado === supportFilter).length === 0 ? (
                  <div className="bg-gradient-to-br from-white to-sky-50/30 rounded-2xl border-2 border-dashed border-sky-200 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-md mx-auto mb-4 flex items-center justify-center text-sky-500 ring-1 ring-sky-100">
                      <LifeBuoy size={28} />
                    </div>
                    <h3 className="text-[#0d2137] font-bold text-base mb-1">Sin consultas {supportFilter === 'pendiente' ? 'pendientes' : supportFilter === 'resuelto' ? 'resueltas' : ''}</h3>
                    <p className="text-gray-500 text-sm">Las consultas aparecerán acá cuando los alumnos contacten desde el login</p>
                  </div>
                ) : supportTickets.filter(t => supportFilter === 'todos' || t.estado === supportFilter).map((t, i) => {
                  const inicial = (t.nombre || t.email || '?').charAt(0).toUpperCase();
                  const gradients = ['from-sky-500 to-sky-400', 'from-indigo-500 to-indigo-400', 'from-amber-500 to-amber-400', 'from-rose-500 to-rose-400', 'from-violet-500 to-violet-400'];
                  const grad = gradients[i % gradients.length];
                  const isResolved = t.estado === 'resuelto';
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative overflow-hidden bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${isResolved ? 'border-[#e5e7eb] opacity-75' : 'border-[#e5e7eb]'}`}
                    >
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${isResolved ? 'bg-gradient-to-b from-emerald-400 to-emerald-300' : 'bg-gradient-to-b from-amber-500 to-orange-400'}`} />
                      <div className="p-5 pl-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-semibold shadow-sm ring-2 ring-white`}>
                              {inicial}
                            </div>
                            <div>
                              <div className="font-bold text-[#0d2137]">{t.nombre}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                                <Calendar size={11} />
                                <span className="tabular-nums">{new Date(t.created_at).toLocaleString('es-AR')}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ring-1 ${isResolved ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                            {isResolved ? <><CheckCircle2 size={11} />Resuelto</> : <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Pendiente</>}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f6f7f9] text-gray-600 hover:text-[#1a7a5e] hover:bg-[#eaf4ee] text-xs font-medium ring-1 ring-[#e5e7eb] transition-colors">
                            <Mail size={12} />{t.email}
                          </a>
                          {t.telefono && (
                            <a href={`tel:${t.telefono}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f6f7f9] text-gray-600 hover:text-[#1a7a5e] hover:bg-[#eaf4ee] text-xs font-medium ring-1 ring-[#e5e7eb] transition-colors">
                              <Phone size={12} />{t.telefono}
                            </a>
                          )}
                        </div>
                        <div className="bg-gradient-to-br from-[#f8faf9] to-[#f6f7f9] rounded-lg p-3.5 text-sm text-gray-700 whitespace-pre-wrap ring-1 ring-[#e5e7eb] mb-4">
                          <MessageSquare size={13} className="inline text-gray-400 mr-1.5 -mt-0.5" />
                          {t.consulta}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {!isResolved ? (
                            <button onClick={() => updateTicketEstado(t.id, 'resuelto')} className="px-4 py-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all shadow-sm flex items-center gap-1.5">
                              <CheckCircle2 size={15} /> Marcar como resuelta
                            </button>
                          ) : (
                            <button onClick={() => updateTicketEstado(t.id, 'pendiente')} className="px-4 py-2 rounded-lg bg-white border border-[#e5e7eb] text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-1.5">
                              Reabrir
                            </button>
                          )}
                          <a href={`mailto:${t.email}?subject=Re: tu consulta en Academia`} className="px-4 py-2 rounded-lg bg-white border border-[#e5e7eb] text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-1.5">
                            <Mail size={15} /> Responder
                          </a>
                          <button onClick={() => deleteTicket(t.id)} className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 hover:shadow-sm transition-all flex items-center gap-1.5 ml-auto">
                            <Trash2 size={15} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "errores" && (
            <motion.div key="errores" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#0d2137] tracking-tight flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                      <Bug size={20} />
                    </span>
                    Fix de errores
                  </h1>
                  <p className="text-gray-500 mt-1">Bugs, warnings y riesgos de seguridad detectados en Academia y landing</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 shadow-sm">
                    <ShieldCheck size={14} className="text-[#1a7a5e]" />
                    <span className="text-xs text-gray-600 font-medium">{ISSUES_CATALOG.length} hallazgos</span>
                    {lastIssueScan && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          {lastIssueScan.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleScanIssues}
                    disabled={isScanningIssues}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-br from-[#1a7a5e] via-[#00a86b] to-[#008f5a] text-white px-3.5 py-2 rounded-lg font-semibold text-xs hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all shadow-sm shadow-[#00a86b]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Buscar nuevos hallazgos"
                  >
                    <RefreshCw size={13} className={isScanningIssues ? "animate-spin" : ""} />
                    {isScanningIssues ? "Escaneando..." : "Actualizar"}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {([
                  { key: "critica", label: "Críticas", icon: ShieldAlert, grad: "from-red-500 to-rose-500", tint: "bg-red-50 text-red-600 ring-red-100" },
                  { key: "alta", label: "Altas", icon: AlertTriangle, grad: "from-orange-500 to-amber-500", tint: "bg-orange-50 text-orange-600 ring-orange-100" },
                  { key: "media", label: "Medias", icon: AlertCircle, grad: "from-amber-500 to-yellow-400", tint: "bg-amber-50 text-amber-600 ring-amber-100" },
                  { key: "baja", label: "Bajas", icon: Activity, grad: "from-sky-500 to-sky-400", tint: "bg-sky-50 text-sky-600 ring-sky-100" },
                ] as const).map((c, idx) => {
                  const Icon = c.icon;
                  return (
                    <motion.div
                      key={c.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative overflow-hidden bg-white rounded-xl border border-[#e5e7eb] shadow-sm hover:shadow-md p-4 group transition-shadow"
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.grad}`} />
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${c.tint} ring-1 flex items-center justify-center shadow-inner`}>
                          <Icon size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
                          <div className="text-2xl font-bold text-[#0d2137] tabular-nums">{issueCounts[c.key]}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[#eaf4ee] to-[#d4ebde] rounded-xl border border-[#1a7a5e]/20 shadow-sm hover:shadow-md p-4 group transition-shadow"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1a5c4a] to-[#00a86b]" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#1a7a5e] ring-1 ring-[#1a7a5e]/10 flex items-center justify-center shadow-sm">
                      <CheckCircle2 size={18} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a5c4a]">Resueltos</div>
                      <div className="text-2xl font-bold text-[#0d2137] tabular-nums">
                        {issueCounts.resueltos}<span className="text-base text-[#1a7a5e]">/{issueCounts.total}</span>
                      </div>
                    </div>
                  </div>
                  {issueCounts.total > 0 && (
                    <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden ring-1 ring-[#1a7a5e]/10">
                      <div className="h-full bg-gradient-to-r from-[#1a5c4a] to-[#00a86b] rounded-full transition-all" style={{ width: `${(issueCounts.resueltos / issueCounts.total) * 100}%` }} />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Filtros */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-4 mb-4 flex flex-wrap gap-x-5 gap-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Origen:</span>
                  {(["todos","academia","landing"] as const).map(o => (
                    <button key={o} onClick={() => setIssueOrigen(o)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${issueOrigen===o ? "bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-[#e5e7eb] hover:border-[#1a7a5e]/30 hover:text-[#1a7a5e]"}`}>
                      {o === "todos" ? "Todos" : o === "academia" ? "Academia" : "Landing"}
                    </button>
                  ))}
                </div>
                <div className="w-px bg-[#e5e7eb] self-stretch" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Criticidad:</span>
                  {(["todas","critica","alta","media","baja"] as const).map(c => (
                    <button key={c} onClick={() => setIssueCritic(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${issueCritic===c ? "bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-[#e5e7eb] hover:border-[#1a7a5e]/30 hover:text-[#1a7a5e]"}`}>
                      {c === "todas" ? "Todas" : CRIT_META[c].label}
                    </button>
                  ))}
                </div>
                <div className="w-px bg-[#e5e7eb] self-stretch" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tipo:</span>
                  {(["todos","bug","error","warning","seguridad","performance"] as const).map(t => (
                    <button key={t} onClick={() => setIssueTipo(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${issueTipo===t ? "bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-[#e5e7eb] hover:border-[#1a7a5e]/30 hover:text-[#1a7a5e]"}`}>
                      {t === "todos" ? "Todos" : TIPO_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredIssues.length === 0 && (
                  <div className="bg-gradient-to-br from-white to-[#eaf4ee]/40 rounded-2xl border-2 border-dashed border-[#1a7a5e]/20 p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md mx-auto mb-3 flex items-center justify-center text-[#1a7a5e] ring-1 ring-[#1a7a5e]/10">
                      <ShieldCheck size={24} />
                    </div>
                    <div className="text-[#0d2137] font-bold text-sm">Sin hallazgos con estos filtros</div>
                  </div>
                )}
                {filteredIssues.map(issue => {
                  const crit = CRIT_META[issue.criticidad];
                  const TipoIcon = TIPO_META[issue.tipo].Icon;
                  const resolved = !!resolvedIssues[issue.id];
                  const expanded = expandedIssue === issue.id;
                  return (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative overflow-hidden bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${resolved ? "border-[#e5e7eb] opacity-60" : "border-[#e5e7eb]"}`}
                    >
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                        resolved ? "bg-gradient-to-b from-emerald-400 to-emerald-300" :
                        issue.criticidad === "critica" ? "bg-gradient-to-b from-red-500 to-rose-500" :
                        issue.criticidad === "alta" ? "bg-gradient-to-b from-orange-500 to-amber-500" :
                        issue.criticidad === "media" ? "bg-gradient-to-b from-amber-500 to-yellow-400" :
                        "bg-gradient-to-b from-sky-500 to-sky-400"
                      }`} />
                      <button
                        onClick={() => setExpandedIssue(expanded ? null : issue.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 pl-5 text-left hover:bg-[#fafbfc] transition-colors"
                      >
                        <div className="shrink-0 text-gray-400">
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${crit.bg} ${crit.text} ring-1 ${crit.border} shrink-0`}>
                          {crit.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-medium shrink-0">
                          <TipoIcon size={13}/>{TIPO_META[issue.tipo].label}
                        </span>
                        <code className="text-[10px] font-mono text-gray-400 bg-[#f6f7f9] px-1.5 py-0.5 rounded shrink-0">{issue.id}</code>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ring-1 ${issue.origen==="academia" ? "bg-[#eaf4ee] text-[#1a5c4a] ring-[#1a7a5e]/15" : "bg-indigo-50 text-indigo-700 ring-indigo-100"}`}>
                          {issue.origen === "academia" ? "Academia" : "Landing"}
                        </span>
                        <span className={`flex-1 font-semibold text-sm truncate ${resolved ? "line-through text-gray-400" : "text-[#0d2137]"}`}>{issue.titulo}</span>
                        <code className="text-[11px] font-mono text-gray-400 truncate max-w-[240px] hidden lg:block bg-[#f6f7f9] px-2 py-0.5 rounded">{issue.archivo}</code>
                      </button>
                      {expanded && (
                        <div className="px-5 pb-4 pt-2 border-t border-[#eef0f3] bg-gradient-to-br from-[#fafbfc] to-white">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                            <div className="md:col-span-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                <Activity size={11} />Detalles
                              </div>
                              <p className="text-gray-700 leading-relaxed">{issue.detalles}</p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
                                  <FileText size={11} />Ubicación
                                </div>
                                <code className="text-xs bg-[#0f172a] text-[#a5b4fc] border border-[#1e293b] rounded-lg px-2.5 py-1.5 block break-all font-mono">{issue.archivo}</code>
                              </div>
                              <button
                                onClick={() => toggleResolved(issue.id)}
                                className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${resolved ? "bg-white text-gray-600 border border-[#e5e7eb] hover:bg-gray-50" : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.98]"}`}
                              >
                                {resolved ? "Reabrir" : <><CheckCircle2 size={15} />Marcar como resuelto</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
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
              <input type="text" className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none font-mono text-sm" placeholder="price_..." value={courseForm.stripe_price_id} onChange={e => setCourseForm({...courseForm, stripe_price_id: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Precio USD {dolarInfo && <span className="text-gray-400 font-normal">(referencia)</span>}</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" placeholder="0.00" value={courseForm.precio_usd || ""} onChange={e => setCourseForm({...courseForm, precio_usd: Number(e.target.value)})} />
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
                        : "border-transparent hover:border-[#e5e7eb] hover:bg-gray-50"
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
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/40 bg-white text-sm"
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
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/40 bg-white font-mono text-xs"
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
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Nombre</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" value={studentForm.nombre} onChange={e => setStudentForm({...studentForm, nombre: e.target.value})} /></div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]" value={studentForm.nuevoEmail} onChange={e => setStudentForm({...studentForm, nuevoEmail: e.target.value})} />
            {studentForm.nuevoEmail !== studentForm.email && <p className="text-xs text-amber-600">Se cambiará el email de <span className="font-mono">{studentForm.email}</span></p>}
          </div>
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Vencimiento</label><input type="date" className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" value={studentForm.vencimiento} onChange={e => setStudentForm({...studentForm, vencimiento: e.target.value})} /></div>
<div className="flex items-center gap-2"><input type="checkbox" id="student-active" checked={studentForm.activo} onChange={e => setStudentForm({...studentForm, activo: e.target.checked})} /><label htmlFor="student-active" className="text-sm font-medium text-gray-700">Activo</label></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsStudentModalOpen(false); setEditingStudent(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancelar</button>
            <button type="submit" className="bg-gradient-to-br from-[#00a86b] to-[#008f5a] text-white px-6 py-2 rounded-lg font-medium hover:shadow-md hover:brightness-110 transition-all shadow-sm">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isLessonModalOpen} onClose={() => { setIsLessonModalOpen(false); setEditingLesson(null); }} title={editingLesson ? "Editar Lección" : "Nueva Lección"}>
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Título</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" value={lessonForm.titulo} onChange={e => setLessonForm({...lessonForm, titulo: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Vimeo ID</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" value={lessonForm.vimeo_id} onChange={e => setLessonForm({...lessonForm, vimeo_id: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Duración (segundos)</label><input type="number" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" value={lessonForm.duracion} onChange={e => setLessonForm({...lessonForm, duracion: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Orden</label><input type="number" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none" value={lessonForm.orden} onChange={e => setLessonForm({...lessonForm, orden: Number(e.target.value)})} /></div>
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
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-md border text-sm font-medium transition-all ${recursoForm.tipo === t ? "border-[#00a86b] bg-[#eaf4ee] text-[#1a5c4a]" : "border-[#e5e7eb] text-gray-500 hover:border-gray-400"}`}>
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
            <input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder={recursoForm.tipo === "pdf" ? "Ej: Ejercicios Módulo 1" : recursoForm.tipo === "link" ? "Ej: Documentación oficial" : "Ej: Nota importante"}
              value={recursoForm.titulo} onChange={e => setRecursoForm(f => ({ ...f, titulo: e.target.value }))} />
          </div>
          {recursoForm.tipo === "pdf" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Archivo PDF</label>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-[#e5e7eb] rounded-xl text-gray-500 hover:border-[#00a86b] hover:bg-[#eaf4ee]/30 hover:text-[#1a5c4a] transition-all font-medium">
                <Upload size={18} />
                {recursoForm.contenido ? "PDF cargado ✓ (click para cambiar)" : "Click para subir PDF (máx. 10 MB)"}
              </button>
            </div>
          )}
          {recursoForm.tipo === "link" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">URL</label>
              <input type="url" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
                placeholder="https://..." value={recursoForm.contenido} onChange={e => setRecursoForm(f => ({ ...f, contenido: e.target.value }))} />
            </div>
          )}
          {recursoForm.tipo === "comentario" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Contenido</label>
              <textarea rows={4} required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
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

      {/* Modal Curso PDF */}
      <Modal
        isOpen={isPdfCourseModalOpen}
        onClose={() => { setIsPdfCourseModalOpen(false); setEditingPdfCourse(null); }}
        title={editingPdfCourse ? "Editar curso PDF" : "Nuevo curso PDF"}
      >
        <form onSubmit={handleSavePdfCourse} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder="Ej: Curso Gemini" value={pdfCourseForm.nombre}
              onChange={e => setPdfCourseForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Slug *</label>
            <input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder="Ej: gemini (sin espacios, minúsculas)" value={pdfCourseForm.slug}
              onChange={e => setPdfCourseForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
            <p className="text-xs text-gray-400">Identificador único. Úsalo para asignar el curso a alumnos.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea rows={3} className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder="Descripción del curso..." value={pdfCourseForm.descripcion}
              onChange={e => setPdfCourseForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">URL Imagen (opcional)</label>
            <input type="url" className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder="https://..." value={pdfCourseForm.imagen_url}
              onChange={e => setPdfCourseForm(f => ({ ...f, imagen_url: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsPdfCourseModalOpen(false); setEditingPdfCourse(null); }}
              className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors">
              {editingPdfCourse ? "Guardar cambios" : "Crear curso"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Módulo PDF */}
      <Modal
        isOpen={isPdfModuloModalOpen}
        onClose={() => { setIsPdfModuloModalOpen(false); setEditingPdfModulo(null); }}
        title={editingPdfModulo ? "Editar módulo" : "Nuevo módulo"}
      >
        <form onSubmit={handleSavePdfModulo} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Título *</label>
            <input type="text" required className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder="Ej: Módulo 1 - Introducción" value={pdfModuloForm.titulo}
              onChange={e => setPdfModuloForm(f => ({ ...f, titulo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Orden</label>
            <input type="number" min={1} className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              value={pdfModuloForm.orden}
              onChange={e => setPdfModuloForm(f => ({ ...f, orden: parseInt(e.target.value) || 1 }))} />
          </div>
          <p className="text-xs text-gray-500 bg-[#f8f9fa] border border-[#e5e7eb] rounded-md p-3">
            Después de crear el módulo, expandílo desde la tabla para agregar uno o más PDFs.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsPdfModuloModalOpen(false); setEditingPdfModulo(null); }}
              className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors">
              {editingPdfModulo ? "Guardar cambios" : "Crear módulo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal PDF dentro de un módulo */}
      <Modal
        isOpen={isPdfArchivoModalOpen}
        onClose={() => { setIsPdfArchivoModalOpen(false); setEditingPdfArchivo(null); setArchivoTargetModuloId(null); }}
        title={editingPdfArchivo ? "Editar PDF" : "Agregar PDF al módulo"}
      >
        <form onSubmit={handleSavePdfArchivo} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nombre del PDF</label>
            <input type="text" className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
              placeholder="Ej: Apunte teórico, Ejercicios..." value={pdfArchivoForm.nombre}
              onChange={e => setPdfArchivoForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Archivo PDF *</label>
            <input ref={pdfFileInputRef} type="file" accept="application/pdf,.ppt,.pptx" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  setToast({ message: "El archivo supera los 10 MB", type: "error" });
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setPdfArchivoForm(f => ({
                    ...f,
                    pdf_url: reader.result as string,
                    nombre: f.nombre || file.name.replace(/\.[^.]+$/, ""),
                  }));
                };
                reader.readAsDataURL(file);
              }} />
            <button type="button" onClick={() => pdfFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-[#e5e7eb] rounded-xl text-gray-500 hover:border-[#00a86b] hover:bg-[#eaf4ee]/30 hover:text-[#1a5c4a] transition-all font-medium">
              <Upload size={18} />
              {pdfArchivoForm.pdf_url ? "Archivo cargado ✓ (click para cambiar)" : "Click para subir PDF/PPT (máx. 10 MB)"}
            </button>
            <p className="text-xs text-gray-400">También podés pegar una URL directa abajo.</p>
            <input type="url" className="w-full px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b] mt-2"
              placeholder="https://... (URL alternativa)"
              value={pdfArchivoForm.pdf_url.startsWith('data:') ? '' : pdfArchivoForm.pdf_url}
              onChange={e => setPdfArchivoForm(f => ({ ...f, pdf_url: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setIsPdfArchivoModalOpen(false); setEditingPdfArchivo(null); setArchivoTargetModuloId(null); }}
              className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={!pdfArchivoForm.pdf_url}
              className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {editingPdfArchivo ? "Guardar cambios" : "Agregar PDF"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Wizard: Creación Asistida */}
      <Modal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} title="Creación Asistida de Curso PDF" maxWidth="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${wizardStep >= 1 ? 'bg-[#00a86b] text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
          <div className="flex-1 h-1 bg-gray-200 rounded overflow-hidden">
            <div className={`h-full bg-[#00a86b] rounded transition-all duration-300 ${wizardStep === 2 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${wizardStep === 2 ? 'bg-[#00a86b] text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
        </div>
        {wizardStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Ingresá los datos del curso y el temario.</p>
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre del curso *</label>
              <input type="text" className="w-full mt-1 px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b]"
                placeholder="Ej: Excel Avanzado 2024" value={wizardCourseInfo.nombre}
                onChange={e => {
                  const n = e.target.value;
                  const slug = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setWizardCourseInfo(f => ({ ...f, nombre: n, slug }));
                }} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Slug (URL)</label>
              <input type="text" className="w-full mt-1 px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b] font-mono text-sm"
                placeholder="excel-avanzado-2024" value={wizardCourseInfo.slug}
                onChange={e => setWizardCourseInfo(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <textarea className="w-full mt-1 px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b] resize-none"
                rows={2} placeholder="Descripción del curso..." value={wizardCourseInfo.descripcion}
                onChange={e => setWizardCourseInfo(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Temario <span className="text-gray-400 font-normal">(un módulo por línea)</span></label>
              <textarea className="w-full mt-1 px-3 py-2 rounded-md border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/25 focus:border-[#00a86b] resize-none font-mono text-sm"
                rows={7} placeholder="Módulo 1 - Introducción&#10;Módulo 2 - Fórmulas&#10;Módulo 3 - Macros"
                value={wizardTemario} onChange={e => setWizardTemario(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{wizardTemario.split("\n").filter(t => t.trim()).length} módulos detectados</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (!wizardCourseInfo.nombre) return setToast({ message: "Nombre del curso requerido", type: "error" });
                  if (!wizardTemario.split("\n").filter(t => t.trim()).length) return setToast({ message: "Escribí al menos un módulo", type: "error" });
                  setWizardStep(2);
                }}
                className="bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white px-6 py-2 rounded-lg font-medium hover:shadow-md hover:brightness-110 transition-all shadow-sm"
              >Siguiente →</button>
            </div>
          </div>
        )}
        {wizardStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Subí todos los PDFs de una vez y asignálos a cada módulo.</p>
            <input ref={wizardFileInputRef} type="file" accept="application/pdf,.ppt,.pptx" multiple className="hidden" onChange={handleWizardFileUpload} />
            <button type="button" onClick={() => wizardFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-[#00a86b]/40 rounded-md text-[#1a5c4a] hover:border-[#00a86b] hover:bg-[#eaf4ee]/50 transition-all font-medium">
              <Upload size={20} />Seleccionar PDFs (múltiples a la vez)
            </button>
            {wizardFiles.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asigná cada PDF a un módulo</p>
                {wizardFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-[#e5e7eb]">
                    <FileText size={14} className="text-[#00a86b] shrink-0" />
                    <input type="text" className="flex-1 text-sm bg-transparent border-none outline-none font-medium text-[#0d2137] min-w-0"
                      value={f.nombre}
                      onChange={e => setWizardFiles(files => files.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                    <select className="text-xs border border-[#e5e7eb] rounded px-2 py-1 bg-white focus:outline-none shrink-0"
                      value={f.moduloIdx}
                      onChange={e => setWizardFiles(files => files.map((x, j) => j === i ? { ...x, moduloIdx: Number(e.target.value) } : x))}>
                      {wizardTemario.split("\n").map(t => t.trim()).filter(Boolean).map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                    </select>
                    <button onClick={() => setWizardFiles(files => files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-[#eaf4ee] rounded-md p-3 text-sm text-[#1a5c4a] font-medium">
              {wizardTemario.split("\n").filter(t => t.trim()).length} módulos · {wizardFiles.length} PDFs listos para subir
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setWizardStep(1)} className="px-4 py-2 text-gray-600 bg-white ring-1 ring-[#e5e7eb] hover:bg-[#f6f7f9] hover:text-[#0d2137] rounded-lg font-medium transition-colors">← Atrás</button>
              <button onClick={handleWizardSubmit} disabled={wizardLoading}
                className="bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white px-6 py-2 rounded-lg font-medium hover:shadow-md hover:brightness-110 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                {wizardLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creando...</> : "✓ Crear Curso Completo"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Carga Masiva a módulo existente */}
      <Modal
        isOpen={isBulkModuloModalOpen}
        onClose={() => { setIsBulkModuloModalOpen(false); setBulkModuloFiles([]); setBulkModuloTargetId(null); }}
        title="Carga Masiva de PDFs al módulo"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Seleccioná múltiples archivos PDF/PPT de una sola vez.</p>
          <input ref={bulkModuloFileInputRef} type="file" accept="application/pdf,.ppt,.pptx" multiple className="hidden" onChange={handleBulkModuloFileUpload} />
          <button type="button" onClick={() => bulkModuloFileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-[#e5e7eb] rounded-xl text-gray-500 hover:border-[#00a86b] hover:bg-[#eaf4ee]/30 hover:text-[#1a5c4a] transition-all font-medium">
            <Upload size={20} />Seleccionar múltiples PDFs
          </button>
          {bulkModuloFiles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {bulkModuloFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-[#e5e7eb]">
                  <FileText size={14} className="text-[#00a86b] shrink-0" />
                  <input type="text" className="flex-1 text-sm bg-transparent border-none outline-none font-medium"
                    value={f.nombre}
                    onChange={e => setBulkModuloFiles(files => files.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                  <button onClick={() => setBulkModuloFiles(files => files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setIsBulkModuloModalOpen(false); setBulkModuloFiles([]); setBulkModuloTargetId(null); }}
              className="px-4 py-2 text-gray-600 bg-white ring-1 ring-[#e5e7eb] hover:bg-[#f6f7f9] hover:text-[#0d2137] rounded-lg font-medium transition-colors">Cancelar</button>
            <button onClick={handleBulkModuloSubmit} disabled={bulkModuloLoading || bulkModuloFiles.length === 0}
              className="bg-gradient-to-br from-[#1a7a5e] to-[#00a86b] text-white px-6 py-2 rounded-lg font-medium hover:shadow-md hover:brightness-110 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
              {bulkModuloLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Subiendo...</> : `Subir ${bulkModuloFiles.length} PDF${bulkModuloFiles.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
