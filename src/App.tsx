/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, ArrowRight, BookOpen, User, Lock, LogOut, Play, CheckCircle, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import AdminDashboard from './AdminDashboard';

// --- Types ---
interface Lesson {
  id: number | string;
  titulo: string;
  vimeo_id: string;
  duracion: number;
  completada: boolean;
  pdf_url?: string;
  tipo?: string;
}

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  imagen_url: string;
  progreso: number;
  total_lecciones: number;
  lecciones_completadas: number;
  tipo?: string;
  slug?: string;
}

interface UserData {
  nombre: string;
  email: string;
  inicial: string;
  role: string;
  foto_url?: string | null;
}

// --- Utils ---
const formatDuracion = (segundos: number) => {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};


// --- JWT Auth Helpers ---
const getToken = () => localStorage.getItem('token');
const setToken = (t: string) => localStorage.setItem('token', t);
const removeToken = () => localStorage.removeItem('token');

const authFetch = (url: string, options: RequestInit = {}) =>
  fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });

// --- Components ---

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-10 h-10 border-4 border-verde-brillante border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'player' | 'admin'>('login');
  const [activeTab, setActiveTab] = useState<'cursos' | 'perfil' | 'password'>('cursos');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const fetchProfile = async () => {
    if (!getToken()) return null;
    try {
      const res = await authFetch('/api/auth/perfil');
      if (res.ok) {
        const data = await res.json();
        setUser(data.usuario);
        return data.usuario;
      } else {
        removeToken();
      }
    } catch (err) {
      console.error("Auth check failed", err);
    }
    return null;
  };

  // Check auth on mount
  useEffect(() => {
    const init = async () => {
      const userData = await fetchProfile();
      if (userData) {
        if (userData.role === 'admin') {
          setView('admin');
          return;
        }

        // Check URL for course ID
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
          setSelectedCourseId(parseInt(id));
          setView('player');
        } else {
          setView('dashboard');
          fetchCourses();
        }
      }
    };
    init();
  }, []);

  const fetchCourses = async () => {
    setIsDataLoading(true);
    try {
      const res = await authFetch('/api/cursos/mis-cursos');
      if (res.ok) {
        const data = await res.json();
        setCourses(data.cursos);
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setView('login');
    setUser(null);
  };

  const navigateToPlayer = (id: number) => {
    setSelectedCourseId(id);
    setView('player');
    window.history.pushState({}, '', `?id=${id}`);
  };

  const navigateToDashboard = () => {
    setView('dashboard');
    setSelectedCourseId(null);
    window.history.pushState({}, '', '/');
    fetchCourses();
  };

  if (view === 'login') {
    return <LoginView onLoginSuccess={(role, usuario) => {
      setUser(usuario);
      if (role === 'admin') {
        setView('admin');
      } else {
        setView('dashboard');
        fetchCourses();
      }
    }} />;
  }

  if (view === 'admin') {
    return <AdminDashboard />;
  }

  if (view === 'player' && selectedCourseId) {
    return <PlayerView courseId={selectedCourseId} onBack={navigateToDashboard} />;
  }

  return (
    <div className="flex h-screen bg-fondo-gris font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] bg-verde-navbar flex flex-col shrink-0">
        <div className="p-3">
          <img 
            src="/logo-1.png" 
            onError={(e) => { e.currentTarget.src = "https://www.aprende-excel.com/wp-content/uploads/2023/03/logo-aprende-excel-horizontal.png"; }}
            alt="Aprende Excel" 
            className="h-24 w-auto"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="h-px bg-white/15 w-full"></div>

        {/* User Info */}
        {user && (
          <div 
            onClick={() => setActiveTab('perfil')}
            className="p-5 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-verde-brillante flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
              {user.foto_url ? (
                <img src={user.foto_url} alt={user.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user.inicial
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm truncate">{user.nombre}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
            </div>
          </div>
        )}

        <div className="h-px bg-white/15 w-full"></div>

        {/* Navigation */}
        <nav className="mt-4 flex-1">
          <button 
            onClick={() => setActiveTab('cursos')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'cursos' 
                ? 'text-white bg-verde-brillante/25 border-l-4 border-verde-brillante' 
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <BookOpen size={18} />
            Mis Cursos
          </button>
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'perfil' 
                ? 'text-white bg-verde-brillante/25 border-l-4 border-verde-brillante' 
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <User size={18} />
            Mi Perfil
          </button>
          <button 
            onClick={() => setActiveTab('password')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === 'password' 
                ? 'text-white bg-verde-brillante/25 border-l-4 border-verde-brillante' 
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Lock size={18} />
            Cambiar contraseña
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-red-400 text-sm font-medium transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-dee2e6 px-8 py-5 shrink-0">
          <h1 className="text-[22px] font-bold text-azul-marino">
            {activeTab === 'cursos' ? 'Mis Cursos' : activeTab === 'perfil' ? 'Mi Perfil' : 'Cambiar Contraseña'}
          </h1>
          <p className="text-texto-gris text-sm">
            {activeTab === 'cursos' ? 'Accedé a tus cursos disponibles' : activeTab === 'perfil' ? 'Actualizá tus datos personales' : 'Mantené tu cuenta segura'}
          </p>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'cursos' ? (
            isDataLoading ? (
              <LoadingSpinner />
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} onClick={() => navigateToPlayer(course.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-azul-marino mb-2">Todavía no tenés cursos</h3>
                <p className="text-texto-gris mb-6">Comprá tu primer curso y empezá hoy</p>
                <a 
                  href="https://www.aprende-excel.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-verde-boton hover:bg-verde-brillante text-white font-bold px-6 py-2.5 rounded-lg transition-all"
                >
                  Explorar Cursos
                </a>
              </div>
            )
          ) : activeTab === 'perfil' ? (
            <ProfileView user={user} onUpdate={(updatedUser) => setUser(updatedUser)} />
          ) : (
            <ChangePasswordView />
          )}
        </div>
      </main>
    </div>
  );
}

const CourseCard: React.FC<{ course: Course, onClick: () => void }> = ({ course, onClick }) => {
  const isCompleted = course.progreso === 100;
  const isStarted = course.progreso > 0 && course.progreso < 100;

  return (
    <div 
      onClick={onClick}
      className="bg-white border border-dee2e6 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="h-[180px] bg-verde-navbar relative overflow-hidden">
        {course.imagen_url ? (
          <img 
            src={course.imagen_url} 
            alt={course.nombre} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-verde-navbar">
            <BookOpen size={48} className="text-white/30" />
          </div>
        )}
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Badge estado */}
        <div className="absolute top-3 right-3">
          {isCompleted ? (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Completado</span>
          ) : isStarted ? (
            <span className="bg-verde-brillante text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">En curso</span>
          ) : (
            <span className="bg-black/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide backdrop-blur-sm">Sin iniciar</span>
          )}
        </div>
        {/* Nombre del curso sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h4 className="font-bold text-white text-sm line-clamp-1 drop-shadow">{course.nombre}</h4>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <p className="text-texto-gris text-[13px] mb-4 line-clamp-2 h-10">
          {course.descripcion}
        </p>

        <div className="mt-auto">
          {/* Progreso */}
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-texto-gris">{course.lecciones_completadas} de {course.total_lecciones} lecciones</span>
              <span className="font-bold text-verde-brillante">{course.progreso}%</span>
            </div>
            <div className="w-full h-2 bg-[#e8f5e9] rounded-full overflow-hidden">
              <div 
                className="h-full bg-verde-brillante rounded-full transition-all duration-700" 
                style={{ width: `${course.progreso}%` }}
              />
            </div>
          </div>

          <button 
            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              isCompleted 
                ? 'bg-[#d4edda] text-verde-boton cursor-default' 
                : 'bg-verde-boton hover:bg-verde-brillante text-white shadow-sm hover:shadow-md'
            }`}
          >
            {isCompleted ? (
              <><CheckCircle size={16} /> Completado</>
            ) : isStarted ? (
              <><Play size={16} fill="currentColor" /> Continuar</>
            ) : (
              <><Play size={16} fill="currentColor" /> Comenzar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Mock PDF resources per course ---
const COURSE_RESOURCES: Record<number, { nombre: string; url: string; size: string }[]> = {
  12286845: [
    { nombre: 'Modulo 1 - Estructuras basicas.pdf', url: '#', size: '1.2 MB' },
    { nombre: 'Ejercicios practicos clase 3.pdf', url: '#', size: '840 KB' },
    { nombre: 'Resumen formulas esenciales.pdf', url: '#', size: '560 KB' },
  ],
  12286854: [
    { nombre: 'Guia tablas dinamicas.pdf', url: '#', size: '1.4 MB' },
    { nombre: 'Ejercicios funciones avanzadas.pdf', url: '#', size: '920 KB' },
  ],
};

// --- Player View Component ---
function PlayerView({ courseId, onBack }: { courseId: number, onBack: () => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(`/api/cursos/${courseId}`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data.curso);
          setLessons(data.lecciones);
          
          // Find first incomplete lesson
          const firstIncomplete = data.lecciones.findIndex((l: Lesson) => !l.completada);
          setCurrentLessonIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
        }
      } catch (err) {
        console.error("Failed to fetch course details", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourseData();
  }, [courseId]);

  const handleComplete = async () => {
    const lesson = lessons[currentLessonIndex];
    if (lesson.completada) return;

    try {
      const res = await authFetch(`/api/cursos/progreso/${lesson.id}`, {
        method: 'POST',
        body: JSON.stringify({ completada: true, porcentaje_visto: 100 })
      });

      if (res.ok) {
        const updatedLessons = [...lessons];
        updatedLessons[currentLessonIndex].completada = true;
        setLessons(updatedLessons);
      }
    } catch (err) {
      console.error("Failed to mark lesson as completed", err);
    }
  };

  const nextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  if (isLoading) return <div className="h-screen bg-white"><LoadingSpinner /></div>;
  if (!course || lessons.length === 0) return <div>Error al cargar el curso</div>;

  const currentLesson = lessons[currentLessonIndex];
  const completedCount = lessons.filter(l => l.completada).length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      {/* Topbar */}
      <header className="h-[56px] border-b border-dee2e6 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-verde-navbar hover:text-verde-brillante font-medium transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="hidden sm:inline">Mis cursos</span>
          </button>
          <div className="h-6 w-px bg-dee2e6 hidden sm:block"></div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-texto-gris uppercase tracking-wide font-medium">{course.nombre}</span>
            <span className="text-sm font-semibold text-azul-marino truncate max-w-[300px]">{currentLesson.titulo}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-verde-brillante">{progressPercent}% completado</span>
            <div className="w-[120px] h-1.5 bg-dee2e6 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-verde-brillante" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${panelOpen ? 'bg-verde-boton text-white border-verde-boton' : 'text-verde-navbar border-dee2e6 hover:border-verde-brillante'}`}
          >
            <BookOpen size={15} />
            <span className="hidden sm:inline">Recursos</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar mejorado */}
        <aside className="hidden md:flex flex-col w-[280px] bg-[#1a3a2a] shrink-0 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-bold text-sm mb-3">{course.nombre}</h3>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-verde-brillante rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-white/40 text-[10px]">
              <span className="text-verde-brillante font-semibold">{lessons.filter(l => l.completada).length}</span> de {lessons.length} lecciones completadas
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => setCurrentLessonIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left relative ${
                  index === currentLessonIndex
                    ? 'bg-verde-brillante/15 border-l-2 border-verde-brillante'
                    : 'hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  lesson.completada
                    ? 'bg-verde-brillante text-white'
                    : index === currentLessonIndex
                    ? 'bg-verde-brillante text-white'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {lesson.completada ? <Check size={12} /> : index + 1}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className={`text-[12px] truncate ${
                    lesson.completada ? 'text-white/35 line-through' :
                    index === currentLessonIndex ? 'text-white font-semibold' : 'text-white/65'
                  }`}>
                    {lesson.titulo}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5">{lesson.pdf_url ? 'Módulo PDF' : formatDuracion(lesson.duracion)}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Video / PDF Area */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 relative">
            {currentLesson.pdf_url ? (
              <iframe
                src={currentLesson.pdf_url}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
              />
            ) : (
              <iframe
                src={`https://player.vimeo.com/video/${currentLesson.vimeo_id}?autoplay=1`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              ></iframe>
            )}
          </div>

          {/* Info Bar mejorado */}
          <div className="bg-white border-t border-dee2e6 flex items-center justify-between px-6 py-3 shrink-0">
            <div className="overflow-hidden">
              <h3 className="font-bold text-azul-marino truncate text-sm">{currentLesson.titulo}</h3>
              <p className="text-texto-gris text-[11px] mt-0.5">Leccion {currentLessonIndex + 1} de {lessons.length} &middot; {course.nombre}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={handleComplete}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  currentLesson.completada
                    ? 'bg-[#d4edda] text-verde-boton cursor-default'
                    : 'bg-verde-boton hover:bg-verde-brillante text-white shadow-sm'
                }`}
              >
                <Check size={15} />
                {currentLesson.completada ? 'Completada' : 'Marcar como completada'}
              </button>
              {currentLessonIndex < lessons.length - 1 && (
                <button
                  onClick={nextLesson}
                  className="px-4 py-2 bg-fondo-gris border border-dee2e6 text-azul-marino rounded-lg font-bold text-sm hover:border-verde-brillante hover:text-verde-brillante transition-all flex items-center gap-1.5"
                >
                  Siguiente
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panel lateral de recursos */}
        {panelOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-white border-l border-dee2e6 flex flex-col z-10 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-dee2e6">
              <div>
                <h3 className="font-bold text-azul-marino text-sm">Recursos del curso</h3>
                <p className="text-texto-gris text-xs mt-0.5">Materiales descargables</p>
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-texto-gris hover:text-azul-marino transition-colors p-1">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(COURSE_RESOURCES[courseId] || []).length > 0 ? (
                <div className="space-y-2">
                  {(COURSE_RESOURCES[courseId] || []).map((pdf, i) => (
                    <a
                      key={i}
                      href={pdf.url}
                      className="flex items-center gap-3 p-3 border border-dee2e6 rounded-lg hover:bg-[#f0faf5] hover:border-verde-brillante transition-all group"
                    >
                      <div className="w-9 h-9 bg-[#eaf4ee] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-verde-brillante/20 transition-colors">
                        <BookOpen size={16} className="text-verde-boton" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-azul-marino truncate">{pdf.nombre}</p>
                        <p className="text-xs text-texto-gris mt-0.5">{pdf.size}</p>
                      </div>
                      <ChevronRight size={14} className="text-texto-gris group-hover:text-verde-brillante transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 bg-[#f5f6f8] rounded-full flex items-center justify-center mb-3">
                    <BookOpen size={20} className="text-texto-gris" />
                  </div>
                  <p className="text-sm font-medium text-azul-marino mb-1">Sin materiales por ahora</p>
                  <p className="text-xs text-texto-gris">Los PDFs de este curso se agregaran pronto</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Profile View Component ---
function ProfileView({ user, onUpdate }: { user: UserData | null, onUpdate: (u: UserData) => void }) {
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fotoUrl, setFotoUrl] = useState(user?.foto_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sync state when user data is loaded or updated
  useEffect(() => {
    if (user) {
      setNombre(user.nombre);
      setEmail(user.email);
      setFotoUrl(user.foto_url || '');
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, foto_url: fotoUrl })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.token) setToken(data.token);
        onUpdate(data.usuario);
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al actualizar perfil' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white p-8 rounded-xl border border-dee2e6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-8">
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Header with Photo */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-dee2e6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-verde-navbar flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-4 border-white shadow-md">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                user?.inicial
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-verde-brillante text-white p-2 rounded-full cursor-pointer hover:bg-verde-boton transition-colors shadow-lg">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-azul-marino">{nombre || 'Tu nombre'}</h3>
            <p className="text-texto-gris">{email || 'tu@email.com'}</p>
            <p className="text-xs text-verde-brillante font-medium mt-1 uppercase tracking-wider">Alumno Registrado</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-azul-marino">Nombre completo</label>
            <input 
              type="text" 
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-azul-marino">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-verde-boton hover:bg-verde-brillante text-white font-bold px-8 py-3 rounded-lg transition-all disabled:opacity-50 shadow-md"
          >
            {isLoading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Change Password View Component ---
function ChangePasswordView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Error al cambiar contraseña' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md bg-white p-6 rounded-xl border border-dee2e6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-azul-marino">Contraseña actual</label>
          <input 
            type="password" 
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-azul-marino">Nueva contraseña</label>
          <input 
            type="password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-azul-marino">Confirmar nueva contraseña</label>
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
            required
          />
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="bg-verde-boton hover:bg-verde-brillante text-white font-bold px-6 py-2.5 rounded-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}

// --- Login View Component ---
function LoginView({ onLoginSuccess }: { onLoginSuccess: (role: string, usuario: UserData) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !nombre)) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      if (isRegistering) {
        const response = await authFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, nombre, apellido }),
        });
        const data = await response.json();
        if (response.ok) {
          setSuccess('Registro exitoso. Ahora podes iniciar sesion.');
          setIsRegistering(false);
        } else {
          setError(data.error || 'Error al registrarse.');
        }
      } else {
        const response = await authFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
          onLoginSuccess(data.role, data.usuario);
        } else {
          const data = await response.json();
          setError(data.error || 'Error al iniciar sesion.');
        }
      }
    } catch (err) {
      setError('Error de conexion con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const RobotoStyle = { fontFamily: "'Roboto', Arial, sans-serif" };

  return (
    <div className="flex min-h-screen overflow-hidden" style={RobotoStyle}>
      {/* Sidebar izquierda */}
      <aside className="hidden md:flex flex-col w-[300px] shrink-0 justify-between" style={{ ...RobotoStyle, background: '#0e2318', padding: '40px 36px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
          Aprende<span style={{ color: '#22c55e' }}>Excel</span>
        </div>
        <div>
          <h2 style={{ fontSize: 27, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: 8 }}>
            Tu carrera,<br /><span style={{ color: '#22c55e' }}>en tus manos</span>
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.55, fontWeight: 300 }}>
            Excel, Power BI y SQL para el mercado laboral.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          {[{ num: '+270', label: 'Empresas' }, { num: '4.9★', label: 'Valoracion' }, { num: '100%', label: 'Online' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{s.num}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Formulario derecha */}
      <main className="flex-1 flex items-center justify-center" style={{ background: '#fff', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 300, ...RobotoStyle }}>
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0e2318' }}>Aprende<span style={{ color: '#22c55e' }}>Excel</span></span>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0e1a13', marginBottom: 3, letterSpacing: '-0.3px' }}>
            {isRegistering ? 'Crear cuenta' : 'Bienvenido'}
          </h3>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 24, fontWeight: 300 }}>
            {isRegistering ? 'Completa tus datos para empezar' : 'Ingresa para acceder a tus cursos'}
          </p>

          {error && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 7, fontSize: 13, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 7, fontSize: 13, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegistering && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#aaa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nombre</label>
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ebebeb', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fafafa', fontFamily: 'Roboto, Arial, sans-serif' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#aaa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Apellido</label>
                  <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ebebeb', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fafafa', fontFamily: 'Roboto, Arial, sans-serif' }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#aaa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #ebebeb', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fafafa', fontFamily: 'Roboto, Arial, sans-serif' }} required />
            </div>

            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Contrasena</label>
                {!isRegistering && <a href="#" style={{ fontSize: 11, color: '#1a6e3c', fontWeight: 600, textDecoration: 'none' }}>Olvidaste?</a>}
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 36px 10px 12px', border: '1.5px solid #ebebeb', borderRadius: 7, fontSize: 13, outline: 'none', background: '#fafafa', fontFamily: 'Roboto, Arial, sans-serif' }} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              style={{ width: '100%', padding: '12px', background: '#0e2318', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 18, fontFamily: 'Roboto, Arial, sans-serif', letterSpacing: '0.01em' }}>
              {isLoading ? 'Cargando...' : isRegistering ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <button onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#aaa', fontFamily: 'Roboto, Arial, sans-serif' }}>
              {isRegistering ? 'Ya tenes cuenta? ' : 'Sin cuenta? '}
              <span style={{ color: '#1a6e3c', fontWeight: 700 }}>{isRegistering ? 'Inicia sesion' : 'Registrate'}</span>
            </button>
            <a href="mailto:soporte@aprende-excel.com" style={{ fontSize: 11, color: '#d1d5db', textDecoration: 'none' }}>Soporte</a>
          </div>
        </div>
      </main>
    </div>
  );
}
