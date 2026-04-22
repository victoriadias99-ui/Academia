import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, BookOpen, PlayCircle, DollarSign, LogOut, Search, Plus, X,
  CheckCircle2, AlertCircle, ShieldCheck, ShieldX, Calendar, Edit2, Trash2, FileText
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

interface AdminStats { totalAlumnos: number; totalVentas: number; ingresosUSD: number; cursosActivos: number; }
interface Sale { email: string; nombre: string; curso: string; monto: number; fecha: string; }
interface Student { email: string; nombre: string; academia: string; cursos: number; cursos_slugs?: string; registro: string; ultimo_login: string; activo: boolean; vencimiento: string; }

// Mapeo de Vimeo ID → slug (para cursos que tienen slug en el backend)
const VIMEO_TO_SLUG: Record<number, string> = {
  12286845: "excel",
  12286854: "excel_intermedio",
  12052707: "excel_avanzado",
  12305404: "excel_promo",
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
interface Course { id: number; nombre: string; academia: string; stripe_price_id: string; precio_ars: number; precio_usd: number; activo: boolean; descripcion?: string; imagen_url?: string; orden?: number; slug?: string; tipo?: string; }
interface Lesson { id: number; titulo: string; vimeo_id: string; duracion: number; preview: boolean; orden: number; }
interface PdfModulo { id: string; titulo: string; pdf_url: string; orden: number; }
interface PdfCourse { id: number; slug: string; nombre: string; descripcion: string; imagen_url: string; tipo: string; activo: boolean; modulos: PdfModulo[]; }

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

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#dee2e6]">
          <h2 className="text-xl font-bold text-[#0d2137]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [addCourseDropdownEmail, setAddCourseDropdownEmail] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0 });
  const [lessonForm, setLessonForm] = useState({ titulo: "", vimeo_id: "", duracion: 0, orden: 0, preview: false });
  const [studentForm, setStudentForm] = useState({ nombre: "", email: "", cursos: "", activo: true, vencimiento: "" });

  // PDF courses state
  const [pdfCourses, setPdfCourses] = useState<PdfCourse[]>([]);
  const [selectedPdfCourseId, setSelectedPdfCourseId] = useState<number | null>(null);
  const [isPdfCourseModalOpen, setIsPdfCourseModalOpen] = useState(false);
  const [isPdfModuloModalOpen, setIsPdfModuloModalOpen] = useState(false);
  const [editingPdfCourse, setEditingPdfCourse] = useState<PdfCourse | null>(null);
  const [editingPdfModulo, setEditingPdfModulo] = useState<PdfModulo | null>(null);
  const [pdfCourseForm, setPdfCourseForm] = useState({ nombre: "", descripcion: "", imagen_url: "", slug: "" });
  const [pdfModuloForm, setPdfModuloForm] = useState({ titulo: "", pdf_url: "", orden: 1 });

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
    if (activeTab === "alumnos") fetchStudents();
    if (activeTab === "cursos") fetchCourses();
    if (activeTab === "lecciones") { fetchCourses(); if (selectedCourseId) fetchLessons(selectedCourseId); }
    if (activeTab === "cursos-pdf") fetchPdfCourses();
  }, [activeTab, selectedCourseId]);

  const checkAuth = async () => {
    try {
      const res = await authFetch('/api/auth/perfil');
      if (res.status === 401) return;
      const data = await res.json();
      if (data.usuario?.role !== "admin") return;
      setUser(data.usuario);
    } catch (err) { console.error("Auth check failed", err); }
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
      const res = await authFetch(`/api/admin/usuarios/${editingStudent.email}`, { method: 'PUT', body: JSON.stringify(studentForm) });
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
      const url = editingCourse ? `/api/admin/cursos/${editingCourse.id}` : '/api/admin/cursos';
      const res = await authFetch(url, { method: editingCourse ? 'PUT' : 'POST', body: JSON.stringify(courseForm) });
      if (res.ok) {
        setToast({ message: editingCourse ? "✓ Actualizado" : "✓ Guardado", type: 'success' });
        setIsCourseModalOpen(false); setEditingCourse(null); fetchCourses();
        setCourseForm({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0 });
      } else setToast({ message: "Error al guardar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
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
        setPdfModuloForm({ titulo: "", pdf_url: "", orden: 1 });
        fetchPdfCourses();
      } else setToast({ message: "Error al guardar módulo", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const handleDeletePdfModulo = async (courseId: number, moduloId: string) => {
    if (!confirm("¿Eliminar este módulo?")) return;
    try {
      const res = await authFetch(`/api/admin/cursos-pdf/${courseId}/modulos/${moduloId}`, { method: 'DELETE' });
      if (res.ok) { setToast({ message: "✓ Módulo eliminado", type: 'success' }); fetchPdfCourses(); }
      else setToast({ message: "Error al eliminar", type: 'error' });
    } catch { setToast({ message: "Error de conexión", type: 'error' }); }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "alumnos", label: "Alumnos", icon: Users },
    { id: "cursos", label: "Cursos", icon: BookOpen },
    { id: "lecciones", label: "Lecciones", icon: PlayCircle },
    { id: "cursos-pdf", label: "Cursos PDF", icon: FileText },
    { id: "ventas", label: "Ventas", icon: DollarSign },
  ];

  return (
    <div className="flex h-screen bg-[#f4f5f7] font-sans overflow-hidden">
      <aside className="w-[240px] bg-[#1a5c4a] flex flex-col flex-shrink-0">
        <div className="p-6">
          <div className="flex flex-col mb-1">
            <img src="/logo-aprende-excel.png" onError={(e) => { e.currentTarget.src = "https://www.aprende-excel.com/wp-content/uploads/2023/03/logo-aprende-excel-horizontal.png"; }} alt="Aprende Excel" className="h-10 w-auto" referrerPolicy="no-referrer" />
            <span className="text-[#00a86b] text-[10px] font-bold uppercase tracking-wider mt-1">Admin</span>
          </div>
        </div>
        <div className="h-[1px] bg-white/15 mx-6 mb-6"></div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Total Alumnos", value: stats?.totalAlumnos, icon: Users },
                  { label: "Total Ventas", value: stats?.totalVentas, icon: DollarSign },
                  { label: "Ingresos USD", value: stats ? `$${stats.ingresosUSD.toLocaleString()}` : '-', icon: DollarSign },
                  { label: "Cursos Activos", value: stats?.cursosActivos, icon: BookOpen },
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
                      {recentSales.map((sale, i) => (
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
                      <tr><th className="px-6 py-4 font-semibold">Email</th><th className="px-6 py-4 font-semibold">Nombre</th><th className="px-6 py-4 font-semibold">Cursos asignados</th><th className="px-6 py-4 font-semibold">Estado</th><th className="px-6 py-4 font-semibold">Vencimiento</th><th className="px-6 py-4 font-semibold">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6]">
                      {students.map((student, i) => {
                        const assignedIds = (student.cursos_slugs || "").split("|").filter(Boolean);
                        const availableCourses = courses.filter(c => !assignedIds.includes(getCourseIdentifier(c)));
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
                                    <option key={c.id} value={getCourseIdentifier(c)}>{c.nombre}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${student.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.activo ? 'Activo' : 'Inactivo'}</span></td>
                          <td className="px-6 py-4"><div className="flex items-center gap-2 text-gray-500 text-sm"><Calendar size={14} className="text-gray-400" />{student.vencimiento || '-'}</div></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => { setEditingStudent(student); setStudentForm({ nombre: student.nombre, email: student.email, cursos: student.cursos_slugs || "", activo: student.activo, vencimiento: student.vencimiento }); setIsStudentModalOpen(true); }} className="p-1.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all"><Edit2 size={16} /></button>
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
                <button onClick={() => { setEditingCourse(null); setCourseForm({ academia: "Aprende Excel", nombre: "", descripcion: "", imagen_url: "", stripe_price_id: "", precio_ars: 0, precio_usd: 0, orden: 0 }); setIsCourseModalOpen(true); }} className="bg-[#1a7a5e] text-white px-6 py-2 rounded-md font-medium hover:bg-[#00a86b] transition-colors flex items-center gap-2"><Plus size={20} />Agregar curso</button>
              </header>
              <div className="bg-white rounded-lg border border-[#dee2e6] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#1a5c4a] text-white">
                      <tr><th className="px-6 py-4 font-semibold">Nombre</th><th className="px-6 py-4 font-semibold">Academia</th><th className="px-6 py-4 font-semibold">Stripe Price ID</th><th className="px-6 py-4 font-semibold">Precio ARS</th><th className="px-6 py-4 font-semibold">Precio USD</th><th className="px-6 py-4 font-semibold">Activo</th><th className="px-6 py-4 font-semibold">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#dee2e6]">
                      {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-[#0d2137]">{course.nombre}</td>
                          <td className="px-6 py-4 text-gray-600">{course.academia || "Aprende Excel"}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">{course.stripe_price_id || "price_..."}</td>
                          <td className="px-6 py-4 text-gray-600">${course.precio_ars || "0"}</td>
                          <td className="px-6 py-4 text-gray-600">${course.precio_usd || "0"}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${course.activo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{course.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingCourse(course); setCourseForm({ academia: course.academia || "Aprende Excel", nombre: course.nombre, descripcion: course.descripcion || "", imagen_url: course.imagen_url || "", stripe_price_id: course.stripe_price_id, precio_ars: course.precio_ars, precio_usd: course.precio_usd, orden: course.orden || 0 }); setIsCourseModalOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
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
                    {courses.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
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

          {activeTab === "cursos-pdf" && (
            <motion.div key="cursos-pdf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8">
              <div className="flex gap-6">
                {/* Lista de cursos PDF */}
                <div className="flex-1 min-w-0">
                  <header className="flex items-center justify-between mb-6">
                    <div><h1 className="text-3xl font-bold text-[#0d2137]">Cursos PDF</h1><p className="text-gray-500">Cursos basados en módulos PDF</p></div>
                    <button onClick={() => { setEditingPdfCourse(null); setPdfCourseForm({ nombre: "", descripcion: "", imagen_url: "", slug: "" }); setIsPdfCourseModalOpen(true); }} className="bg-[#1a7a5e] text-white px-5 py-2 rounded-md font-medium hover:bg-[#00a86b] transition-colors flex items-center gap-2"><Plus size={18} />Nuevo curso PDF</button>
                  </header>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pdfCourses.length === 0 && (
                      <div className="col-span-2 bg-white rounded-lg border border-dashed border-[#dee2e6] p-12 text-center">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No hay cursos PDF. Creá el primero.</p>
                      </div>
                    )}
                    {pdfCourses.map(pc => (
                      <div key={pc.id} onClick={() => setSelectedPdfCourseId(selectedPdfCourseId === pc.id ? null : pc.id)}
                        className={`bg-white rounded-lg border transition-all cursor-pointer ${selectedPdfCourseId === pc.id ? 'border-[#00a86b] shadow-md' : 'border-[#dee2e6] hover:shadow-sm'}`}>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText size={16} className="text-[#00a86b] shrink-0" />
                                <h3 className="font-bold text-[#0d2137] truncate">{pc.nombre}</h3>
                              </div>
                              <p className="text-xs text-gray-500 font-mono mb-2">slug: {pc.slug}</p>
                              <p className="text-sm text-gray-500 line-clamp-2">{pc.descripcion}</p>
                              <p className="text-xs text-[#00a86b] font-semibold mt-2">{pc.modulos.length} módulo{pc.modulos.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setEditingPdfCourse(pc); setPdfCourseForm({ nombre: pc.nombre, descripcion: pc.descripcion, imagen_url: pc.imagen_url, slug: pc.slug }); setIsPdfCourseModalOpen(true); }} className="p-1.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all"><Edit2 size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeletePdfCourse(pc.id); }} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                        {selectedPdfCourseId === pc.id && (
                          <div className="border-t border-[#dee2e6] p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-[#0d2137] text-sm">Módulos</h4>
                              <button onClick={(e) => { e.stopPropagation(); setEditingPdfModulo(null); setPdfModuloForm({ titulo: "", pdf_url: "", orden: pc.modulos.length + 1 }); setIsPdfModuloModalOpen(true); }} className="text-xs bg-[#00a86b] text-white px-3 py-1.5 rounded-md hover:bg-[#008f5a] transition-colors flex items-center gap-1"><Plus size={12} />Agregar módulo</button>
                            </div>
                            {pc.modulos.length === 0 ? (
                              <p className="text-xs text-gray-400 italic text-center py-3">Sin módulos aún</p>
                            ) : (
                              <div className="space-y-2">
                                {pc.modulos.map((m, idx) => (
                                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-[#f8fdf9] rounded-lg border border-[#e8f5e9]">
                                    <div className="w-6 h-6 rounded-full bg-[#00a86b]/15 text-[#00a86b] text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#0d2137] truncate">{m.titulo}</p>
                                      <p className="text-[10px] text-gray-400 truncate">{m.pdf_url}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button onClick={(e) => { e.stopPropagation(); setEditingPdfModulo(m); setPdfModuloForm({ titulo: m.titulo, pdf_url: m.pdf_url, orden: m.orden }); setIsPdfModuloModalOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 size={13} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeletePdfModulo(pc.id, m.id); }} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                      {recentSales.map((sale, i) => (
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
        </AnimatePresence>
      </main>

      <Modal isOpen={isCourseModalOpen} onClose={() => { setIsCourseModalOpen(false); setEditingCourse(null); }} title={editingCourse ? "Editar Curso" : "Nuevo Curso"}>
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Academia</label><select className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50" value={courseForm.academia} onChange={e => setCourseForm({...courseForm, academia: e.target.value})}><option value="Aprende Excel">Aprende Excel</option><option value="Otra">Otra</option></select></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Nombre</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={courseForm.nombre} onChange={e => setCourseForm({...courseForm, nombre: e.target.value})} /></div>
          </div>
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Descripción</label><textarea rows={3} className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={courseForm.descripcion} onChange={e => setCourseForm({...courseForm, descripcion: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">URL Imagen</label><input type="url" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={courseForm.imagen_url} onChange={e => setCourseForm({...courseForm, imagen_url: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Stripe Price ID</label><input type="text" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={courseForm.stripe_price_id} onChange={e => setCourseForm({...courseForm, stripe_price_id: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Precio ARS</label><input type="number" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={courseForm.precio_ars} onChange={e => setCourseForm({...courseForm, precio_ars: Number(e.target.value)})} /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Precio USD</label><input type="number" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={courseForm.precio_usd} onChange={e => setCourseForm({...courseForm, precio_usd: Number(e.target.value)})} /></div>
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
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Email</label><input type="email" disabled className="w-full px-3 py-2 rounded-md border border-[#dee2e6] bg-gray-50" value={studentForm.email} /></div>
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

      <Modal isOpen={isPdfCourseModalOpen} onClose={() => { setIsPdfCourseModalOpen(false); setEditingPdfCourse(null); }} title={editingPdfCourse ? "Editar Curso PDF" : "Nuevo Curso PDF"}>
        <form onSubmit={handleSavePdfCourse} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Nombre</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/50" value={pdfCourseForm.nombre} onChange={e => setPdfCourseForm({...pdfCourseForm, nombre: e.target.value})} /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Slug <span className="text-gray-400 text-xs">(único, ej: pdf_excel)</span></label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none font-mono" value={pdfCourseForm.slug} onChange={e => setPdfCourseForm({...pdfCourseForm, slug: e.target.value.replace(/\s/g, '_')})} /></div>
          </div>
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Descripción</label><textarea rows={3} className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={pdfCourseForm.descripcion} onChange={e => setPdfCourseForm({...pdfCourseForm, descripcion: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">URL Imagen de portada</label><input type="url" className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={pdfCourseForm.imagen_url} onChange={e => setPdfCourseForm({...pdfCourseForm, imagen_url: e.target.value})} /></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsPdfCourseModalOpen(false)} className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPdfModuloModalOpen} onClose={() => { setIsPdfModuloModalOpen(false); setEditingPdfModulo(null); }} title={editingPdfModulo ? "Editar Módulo" : "Nuevo Módulo"}>
        <form onSubmit={handleSavePdfModulo} className="space-y-4">
          <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Título del módulo</label><input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={pdfModuloForm.titulo} onChange={e => setPdfModuloForm({...pdfModuloForm, titulo: e.target.value})} /></div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">URL del PDF</label>
            <p className="text-xs text-gray-400">Podés usar Google Drive (vista previa), Dropbox o cualquier URL pública de PDF</p>
            <input type="text" required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none font-mono text-sm" placeholder="https://drive.google.com/file/d/ID/preview" value={pdfModuloForm.pdf_url} onChange={e => setPdfModuloForm({...pdfModuloForm, pdf_url: e.target.value})} />
          </div>
          <div className="space-y-1 w-32"><label className="text-sm font-medium text-gray-700">Orden</label><input type="number" min={1} required className="w-full px-3 py-2 rounded-md border border-[#dee2e6] focus:outline-none" value={pdfModuloForm.orden} onChange={e => setPdfModuloForm({...pdfModuloForm, orden: Number(e.target.value)})} /></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsPdfModuloModalOpen(false)} className="px-6 py-2 rounded-md font-medium text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 rounded-md font-medium bg-[#1a7a5e] text-white hover:bg-[#00a86b] transition-colors">Guardar</button>
          </div>
        </form>
      </Modal>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
