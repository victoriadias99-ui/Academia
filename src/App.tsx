/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, ArrowRight, BookOpen, User, Lock, LogOut, Play, CheckCircle, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import AdminDashboard from './AdminDashboard';

// --- Types ---
interface Lesson {
  id: number;
  titulo: string;
  vimeo_id: string;
  duracion: number;
  completada: boolean;
}

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  imagen_url: string;
  progreso: number;
  total_lecciones: number;
  lecciones_completadas: number;
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
    return <AdminDashboard onLogout={handleLogout} />;
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

// --- Player View Component ---
interface Recurso { id: number; tipo: "pdf" | "link" | "comentario"; titulo: string; contenido: string; }

function PlayerView({ courseId, onBack }: { courseId: number, onBack: () => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [recursos, setRecursos] = useState<Recurso[]>([]);

  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true);
      try {
        const [courseRes, recursosRes] = await Promise.all([
          authFetch(`/api/cursos/${courseId}`),
          authFetch(`/api/cursos/${courseId}/recursos`),
        ]);
        if (courseRes.ok) {
          const data = await courseRes.json();
          setCourse(data.curso);
          setLessons(data.lecciones);
          const firstIncomplete = data.lecciones.findIndex((l: Lesson) => !l.completada);
          setCurrentLessonIndex(firstIncomplete !== -1 ? firstIncomplete : 0);
        }
        if (recursosRes.ok) {
          const rData = await recursosRes.json();
          setRecursos(rData.recursos || []);
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
        body: JSON.stringify({ completada: true, porcentaje_visto: 100, courseId })
      });

      if (res.ok) {
        const updatedLessons = [...lessons];
        updatedLessons[currentLessonIndex].completada = true;
        setLessons(updatedLessons);
      } else {
        console.error("Failed to mark lesson as completed", res.status);
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
                  <p className="text-[10px] text-white/25 mt-0.5">{formatDuracion(lesson.duracion)}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Video Area */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 relative">
            <iframe
              src={`https://player.vimeo.com/video/${currentLesson.vimeo_id}?autoplay=1`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            ></iframe>
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
              {recursos.length > 0 ? (
                <div className="space-y-2">
                  {recursos.map(r => (
                    r.tipo === "link" ? (
                      <a key={r.id} href={r.contenido} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-dee2e6 rounded-lg hover:bg-[#f0faf5] hover:border-verde-brillante transition-all group">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-azul-marino truncate">{r.titulo}</p>
                          <p className="text-xs text-texto-gris mt-0.5">Link externo</p>
                        </div>
                        <ChevronRight size={14} className="text-texto-gris group-hover:text-verde-brillante shrink-0" />
                      </a>
                    ) : r.tipo === "pdf" ? (
                      <a key={r.id} href={r.contenido} download={r.titulo}
                        className="flex items-center gap-3 p-3 border border-dee2e6 rounded-lg hover:bg-[#f0faf5] hover:border-verde-brillante transition-all group">
                        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-azul-marino truncate">{r.titulo}</p>
                          <p className="text-xs text-texto-gris mt-0.5">PDF · Descargar</p>
                        </div>
                        <ChevronRight size={14} className="text-texto-gris group-hover:text-verde-brillante shrink-0" />
                      </a>
                    ) : (
                      <div key={r.id} className="p-3 border border-dee2e6 rounded-lg bg-yellow-50">
                        <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Nota</p>
                        <p className="text-sm text-azul-marino whitespace-pre-wrap">{r.titulo}</p>
                        {r.contenido && <p className="text-xs text-texto-gris mt-1 whitespace-pre-wrap">{r.contenido}</p>}
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 bg-[#f5f6f8] rounded-full flex items-center justify-center mb-3">
                    <BookOpen size={20} className="text-texto-gris" />
                  </div>
                  <p className="text-sm font-medium text-azul-marino mb-1">Sin materiales por ahora</p>
                  <p className="text-xs text-texto-gris">Los recursos de este curso se agregarán pronto</p>
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
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({ nombre: '', email: '', telefono: '', consulta: '' });
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportMessage, setSupportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isIdiomas = typeof window !== 'undefined' && window.location.hostname === 'academia-idiomas.up.railway.app';
  const ctaGradient = isIdiomas
    ? 'linear-gradient(135deg, #ec4899 0%, #3b82f6 100%)'
    : 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)';
  const ctaTextColor = isIdiomas ? '#ffffff' : '#0e2318';

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nombre, email, telefono, consulta } = supportForm;
    if (!nombre.trim() || !email.trim() || !consulta.trim()) {
      setSupportMessage({ type: 'error', text: 'Nombre, email y consulta son obligatorios.' });
      return;
    }
    setSupportLoading(true);
    setSupportMessage(null);
    try {
      const res = await authFetch('/api/soporte', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim(), consulta: consulta.trim() }),
      });
      if (res.ok) {
        setSupportMessage({ type: 'success', text: 'Recibimos tu consulta. Te vamos a responder pronto.' });
        setSupportForm({ nombre: '', email: '', telefono: '', consulta: '' });
      } else {
        const data = await res.json().catch(() => ({}));
        setSupportMessage({ type: 'error', text: data.error || 'No se pudo enviar la consulta.' });
      }
    } catch {
      setSupportMessage({ type: 'error', text: 'Error de conexión. Intentá más tarde.' });
    } finally {
      setSupportLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = (forgotEmail || '').trim();
    if (!target) {
      setForgotMessage({ type: 'error', text: 'Ingresa tu email.' });
      return;
    }
    setForgotLoading(true);
    setForgotMessage(null);
    // Timeout duro de 25s para que el boton no quede tildado si el server se cuelga.
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await authFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: target }),
        signal: ctrl.signal,
      });
      if (res.ok) {
        setForgotMessage({
          type: 'success',
          text: 'Si el email esta registrado, te enviamos una nueva contrasena a tu casilla. Revisa tambien spam/promociones.',
        });
      } else {
        // Si el body no es JSON (ej. un HTML de error de proxy) leemos como texto
        // para poder mostrar algo util al usuario y loguear el detalle en consola.
        const raw = await res.text().catch(() => '');
        let errMsg = '';
        try {
          errMsg = raw ? (JSON.parse(raw).error || '') : '';
        } catch { /* no era JSON */ }
        console.error('reset-password fallo:', res.status, raw);
        setForgotMessage({
          type: 'error',
          text: errMsg || `Error del servidor (HTTP ${res.status}). Intenta mas tarde o contacta a soporte.`,
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setForgotMessage({ type: 'error', text: 'El servidor tardo demasiado en responder. Intenta de nuevo.' });
      } else {
        setForgotMessage({ type: 'error', text: 'Error de conexion con el servidor.' });
      }
    } finally {
      clearTimeout(timeoutId);
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap';
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

  const openForgotModal = () => {
    setForgotEmail(email);
    setForgotMessage(null);
    setShowForgotModal(true);
  };

  return (
    <>
      <style>{`
        .login-root { font-family: 'Poppins', system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; color: #fff; position: relative; overflow: hidden;
          background: radial-gradient(circle at 15% 20%, rgba(34,197,94,0.10), transparent 55%), radial-gradient(circle at 85% 80%, rgba(74,222,128,0.08), transparent 50%), linear-gradient(135deg, #0a1f14 0%, #0e2318 50%, #14352a 100%); }
        .login-root * { box-sizing: border-box; }
        .login-bubble { position: absolute; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(74,222,128,0.10), transparent 70%); filter: blur(20px); }
        .login-b1 { width: 380px; height: 380px; top: -120px; left: -120px; }
        .login-b2 { width: 420px; height: 420px; bottom: -150px; right: -150px; }
        .login-b3 { width: 200px; height: 200px; top: 40%; left: 50%; opacity: .5; }
        .login-header { padding: 28px 48px 28px calc(50vw + 48px); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; position: relative; z-index: 5; }
        .login-logo-text { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; line-height: 1.15; }
        .login-logo-text .sub { display: block; color: rgba(255,255,255,0.45); font-size: 9px; font-weight: 500; letter-spacing: 0.22em; margin-top: 2px; }
        .login-header-help { font-size: 12px; color: rgba(255,255,255,0.5); }
        .login-header-help a { color: rgba(255,255,255,0.85); text-decoration: none; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 1px; transition: border-color .2s; }
        .login-header-help a:hover { border-color: #4ade80; color: #4ade80; }
        .support-link { background: none; border: none; padding: 0 0 1px 0; font-family: inherit; font-size: inherit; cursor: pointer; color: rgba(255,255,255,0.85); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.2); transition: border-color .2s, color .2s; }
        .support-link:hover { border-color: #4ade80; color: #4ade80; }
        .login-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px 80px 40px calc(50vw + 60px); position: relative; z-index: 2; width: 100%; }
        .art-side { position: fixed; top: 0; left: 0; bottom: 0; width: 50vw; height: 100vh; overflow: hidden; z-index: 1; }
        .art-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .art-frost { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.2) 75%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
        .rings { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .ring { position: absolute; border-radius: 50%; border: 1px solid rgba(74,222,128,0.12); animation: pulseRing 6s ease-in-out infinite; }
        .ring.r1 { width: 100%; height: 100%; }
        .ring.r2 { width: 80%; height: 80%; animation-delay: -2s; border-color: rgba(74,222,128,0.16); }
        .ring.r3 { width: 60%; height: 60%; animation-delay: -4s; border-color: rgba(74,222,128,0.22); }
        @keyframes pulseRing { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: .55; } }
        .art-glow { position: absolute; inset: 15%; border-radius: 50%; background: radial-gradient(circle, rgba(74,222,128,0.28) 0%, rgba(34,197,94,0.10) 40%, transparent 70%); filter: blur(35px); animation: glowPulse 4s ease-in-out infinite; }
        @keyframes glowPulse { 0%,100% { opacity: .85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        .floating-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 12px #22c55e; animation: floatDot 8s ease-in-out infinite; z-index: 4; }
        .fd1 { top: 8%; left: 15%; } .fd2 { top: 12%; right: 10%; animation-delay: -2s; background: #86efac; } .fd3 { bottom: 15%; left: 8%; animation-delay: -4s; } .fd4 { bottom: 10%; right: 18%; animation-delay: -6s; background: #86efac; }
        @keyframes floatDot { 0%,100% { transform: translate(0,0); } 33% { transform: translate(15px,-12px); } 66% { transform: translate(-10px,8px); } }
        .scenes { position: absolute; inset: 6%; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .scene { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transform: scale(.88); animation: cycle 24s infinite; }
        .scene:nth-child(1) { animation-delay: 0s; } .scene:nth-child(2) { animation-delay: 6s; } .scene:nth-child(3) { animation-delay: 12s; } .scene:nth-child(4) { animation-delay: 18s; }
        @keyframes cycle { 0%, 22% { opacity: 1; transform: scale(1); } 25%, 100% { opacity: 0; transform: scale(.88); } }
        .scene svg { width: 95%; max-width: 440px; height: auto; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.35)); animation: floatSvg 5s ease-in-out infinite; }
        @keyframes floatSvg { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .scene-label { position: absolute; bottom: -24px; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(255,255,255,0.85); padding: 8px 22px; border: 1px solid rgba(74,222,128,0.35); border-radius: 30px; background: rgba(34,197,94,0.15); backdrop-filter: blur(10px); white-space: nowrap; }
        .scene-label .accent { color: #4ade80; margin-right: 6px; }
        .scene-indicator { position: absolute; bottom: -70px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; }
        .scene-indicator span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); animation: dotActive 24s infinite; }
        .scene-indicator span:nth-child(1) { animation-delay: 0s; } .scene-indicator span:nth-child(2) { animation-delay: 6s; } .scene-indicator span:nth-child(3) { animation-delay: 12s; } .scene-indicator span:nth-child(4) { animation-delay: 18s; }
        @keyframes dotActive { 0%, 22% { background: #4ade80; transform: scale(1.3); box-shadow: 0 0 10px #22c55e; width: 24px; border-radius: 4px; } 25%, 100% { background: rgba(255,255,255,0.2); transform: scale(1); } }
        .cap-sway { animation: sway 4s ease-in-out infinite; transform-origin: 200px 120px; }
        .tassel { animation: tassel 2.5s ease-in-out infinite; transform-origin: 200px 140px; }
        .medal-pulse { animation: medalPulse 2s ease-in-out infinite; transform-origin: 200px 290px; }
        .star-tw-1 { animation: twinkle 2.4s ease-in-out infinite; transform-origin: center; }
        .star-tw-2 { animation: twinkle 2.4s ease-in-out .8s infinite; transform-origin: center; }
        .star-tw-3 { animation: twinkle 2.4s ease-in-out 1.6s infinite; transform-origin: center; }
        .rocket-fly { animation: rocketFly 3.5s ease-in-out infinite; }
        @keyframes sway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes tassel { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(12deg); } }
        @keyframes medalPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); filter: drop-shadow(0 0 8px #4ade80); } }
        @keyframes twinkle { 0%,100% { opacity: 0.3; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes rocketFly { 0%,100% { transform: translate(0,0) rotate(-15deg); } 50% { transform: translate(8px,-10px) rotate(-8deg); } }
        .globe-rotate { animation: globeRotate 14s linear infinite; transform-origin: 220px 220px; }
        .bubble-float-1 { animation: bubbleFloat 3s ease-in-out infinite; transform-origin: center; }
        .bubble-float-2 { animation: bubbleFloat 3.4s ease-in-out .4s infinite; transform-origin: center; }
        .bubble-float-3 { animation: bubbleFloat 3.2s ease-in-out .8s infinite; transform-origin: center; }
        .bubble-float-4 { animation: bubbleFloat 3.6s ease-in-out 1.2s infinite; transform-origin: center; }
        .bubble-float-5 { animation: bubbleFloat 3.1s ease-in-out 1.6s infinite; transform-origin: center; }
        .bubble-float-6 { animation: bubbleFloat 3.5s ease-in-out 2s infinite; transform-origin: center; }
        .orbit-dot { animation: orbitFade 2s ease-in-out infinite; }
        @keyframes globeRotate { to { transform: rotate(360deg); } }
        @keyframes bubbleFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.05); } }
        @keyframes orbitFade { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        .laptop-float { animation: laptopFloat 4s ease-in-out infinite; transform-origin: center; }
        .bar-grow-1 { animation: barGrow 3s ease-in-out infinite; transform-origin: bottom; }
        .bar-grow-2 { animation: barGrow 3s ease-in-out .3s infinite; transform-origin: bottom; }
        .bar-grow-3 { animation: barGrow 3s ease-in-out .6s infinite; transform-origin: bottom; }
        .bar-grow-4 { animation: barGrow 3s ease-in-out .9s infinite; transform-origin: bottom; }
        .arrow-slide { animation: arrowSlide 2.8s ease-in-out infinite; }
        .check-pop-1 { animation: checkPop 2.5s ease-in-out infinite; transform-origin: center; }
        .check-pop-2 { animation: checkPop 2.5s ease-in-out 1s infinite; transform-origin: center; }
        .cell-float-1 { animation: cellFloat 3.4s ease-in-out infinite; }
        .cell-float-2 { animation: cellFloat 3.4s ease-in-out .7s infinite; }
        .cell-float-3 { animation: cellFloat 3.4s ease-in-out 1.4s infinite; }
        .cell-float-4 { animation: cellFloat 3.4s ease-in-out 2.1s infinite; }
        @keyframes laptopFloat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(-1deg); } }
        @keyframes barGrow { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.25); } }
        @keyframes arrowSlide { 0%,100% { transform: translate(0,0); opacity: 1; } 50% { transform: translate(8px,-8px); opacity: .7; } }
        @keyframes checkPop { 0%,100% { transform: scale(0.8); opacity: 0.6; } 20% { transform: scale(1.2); opacity: 1; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes cellFloat { 0%,100% { transform: translateY(0); opacity: .9; } 50% { transform: translateY(-6px); opacity: 1; } }
        .chip-glow { animation: chipGlow 2s ease-in-out infinite; transform-origin: center; }
        .circuit-line { stroke-dasharray: 4 3; animation: dashFlow 1.2s linear infinite; }
        .circuit-line-2 { stroke-dasharray: 6 4; animation: dashFlow 1.5s linear infinite reverse; }
        .data-point { animation: dataPointPulse 1.8s ease-in-out infinite; }
        .data-point-1 { animation-delay: 0s; } .data-point-2 { animation-delay: .3s; } .data-point-3 { animation-delay: .6s; } .data-point-4 { animation-delay: .9s; } .data-point-5 { animation-delay: 1.2s; } .data-point-6 { animation-delay: 1.5s; }
        .binary-rise-1 { animation: binaryRise 4s ease-in-out infinite; }
        .binary-rise-2 { animation: binaryRise 4s ease-in-out 1.3s infinite; }
        .binary-rise-3 { animation: binaryRise 4s ease-in-out 2.6s infinite; }
        .brain-pulse { animation: brainPulse 2.2s ease-in-out infinite; transform-origin: center; }
        @keyframes chipGlow { 0%,100% { filter: drop-shadow(0 0 6px #22c55e); transform: scale(1); } 50% { filter: drop-shadow(0 0 16px #4ade80); transform: scale(1.05); } }
        @keyframes dashFlow { to { stroke-dashoffset: -40; } }
        @keyframes dataPointPulse { 0%,100% { opacity: 0.3; r: 2; } 50% { opacity: 1; r: 4; } }
        @keyframes binaryRise { 0% { transform: translateY(20px); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        @keyframes brainPulse { 0%,100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
        .form-side { max-width: 380px; width: 100%; margin: 0 auto; }
        .welcome-tag { display: inline-block; font-size: 11px; font-weight: 600; color: #4ade80; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px; }
        .welcome-tag::before { content: ""; display: inline-block; width: 24px; height: 1px; background: #4ade80; margin-right: 10px; vertical-align: middle; }
        .form-side h1 { font-size: 44px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05; margin-bottom: 12px; }
        .form-side .lead { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 28px; line-height: 1.55; }
        .login-alert { padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 18px; }
        .login-alert.err { background: rgba(220,38,38,0.12); color: #fca5a5; border: 1px solid rgba(220,38,38,0.3); }
        .login-alert.ok { background: rgba(34,197,94,0.12); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
        .field { margin-bottom: 22px; }
        .field label { display: block; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.5); letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 10px; }
        .input-wrap { position: relative; border-bottom: 1.5px solid rgba(255,255,255,0.15); transition: border-color .25s ease; }
        .input-wrap:focus-within { border-color: #4ade80; }
        .input-wrap input { width: 100%; padding: 8px 0 12px 0; background: transparent; border: none; color: #fff; font-size: 15px; outline: none; font-family: inherit; font-weight: 400; }
        .input-wrap input::placeholder { color: rgba(255,255,255,0.3); }
        .toggle-pwd { position: absolute; right: 0; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4); padding: 4px; display: flex; }
        .toggle-pwd:hover { color: #4ade80; }
        .forgot { text-align: right; margin: -10px 0 26px; }
        .forgot button { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12px; color: rgba(255,255,255,0.55); transition: color .2s; }
        .forgot button:hover { color: #4ade80; }
        .btn-login { width: 100%; padding: 16px; border: none; border-radius: 100px; background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%); color: #0e2318; font-family: inherit; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all .3s ease; position: relative; overflow: hidden; box-shadow: 0 12px 30px -10px rgba(34,197,94,0.55); display: flex; align-items: center; justify-content: center; gap: 10px; }
        .btn-login:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 18px 40px -12px rgba(34,197,94,0.7); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-login::before { content: ""; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); transform: translateX(-100%); transition: transform .8s ease; }
        .btn-login:hover:not(:disabled)::before { transform: translateX(100%); }
        .login-footer { padding: 20px 48px 20px calc(50vw + 48px); display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.35); flex-shrink: 0; position: relative; z-index: 5; }
        .theme-idiomas.login-root { background: radial-gradient(circle at 15% 20%, rgba(236,72,153,0.10), transparent 55%), radial-gradient(circle at 85% 80%, rgba(59,130,246,0.08), transparent 50%), linear-gradient(135deg, #ffffff 0%, #fafbff 50%, #ffffff 100%); color: #1a0a1f; }
        .theme-idiomas .login-bubble { background: radial-gradient(circle, rgba(236,72,153,0.12), transparent 70%); }
        .theme-idiomas .login-header-help { color: rgba(26,10,31,0.55); }
        .theme-idiomas .login-header-help a,
        .theme-idiomas .support-link { color: rgba(26,10,31,0.85); border-bottom-color: rgba(26,10,31,0.2); }
        .theme-idiomas .form-side h1 { color: #1a0a1f; }
        .theme-idiomas .form-side .lead { color: rgba(26,10,31,0.6); }
        .theme-idiomas .field label { color: rgba(26,10,31,0.55); }
        .theme-idiomas .input-wrap { border-bottom-color: rgba(26,10,31,0.15); }
        .theme-idiomas .input-wrap input { color: #1a0a1f; }
        .theme-idiomas .input-wrap input::placeholder { color: rgba(26,10,31,0.3); }
        .theme-idiomas .toggle-pwd { color: rgba(26,10,31,0.4); }
        .theme-idiomas .forgot button { color: rgba(26,10,31,0.55); }
        .theme-idiomas .login-footer { color: rgba(26,10,31,0.4); }
        .theme-idiomas .art-frost { background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.25) 100%); }
        .theme-idiomas .art-img { object-position: center 40%; }
        .theme-idiomas .login-header-help a:hover,
        .theme-idiomas .support-link:hover,
        .theme-idiomas .toggle-pwd:hover,
        .theme-idiomas .forgot button:hover { color: #ec4899; border-color: #ec4899; }
        .theme-idiomas .ring { border-color: rgba(236,72,153,0.14); }
        .theme-idiomas .ring.r2 { border-color: rgba(236,72,153,0.18); }
        .theme-idiomas .ring.r3 { border-color: rgba(59,130,246,0.24); }
        .theme-idiomas .art-glow { background: radial-gradient(circle, rgba(236,72,153,0.28) 0%, rgba(59,130,246,0.12) 40%, transparent 70%); }
        .theme-idiomas .floating-dot { background: #ec4899; box-shadow: 0 0 12px #ec4899; }
        .theme-idiomas .fd2 { background: #f9a8d4; }
        .theme-idiomas .fd4 { background: #93c5fd; }
        .theme-idiomas .scene-label { border-color: rgba(236,72,153,0.35); background: rgba(236,72,153,0.15); }
        .theme-idiomas .scene-label .accent { color: #ec4899; }
        .theme-idiomas .welcome-tag { color: #ec4899; }
        .theme-idiomas .welcome-tag::before { background: #ec4899; }
        .theme-idiomas .input-wrap:focus-within { border-color: #ec4899; }
        .theme-idiomas .btn-login { background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%); color: #fff; box-shadow: 0 12px 30px -10px rgba(236,72,153,0.55); }
        .theme-idiomas .btn-login:hover:not(:disabled) { box-shadow: 0 18px 40px -12px rgba(236,72,153,0.7); }

        @media (max-width: 880px) {
          .login-header { padding: 20px 24px; }
          .login-footer { padding: 16px 24px; flex-direction: column; gap: 6px; align-items: center; text-align: center; }
          .login-main { padding: 20px 28px 40px; }
          .art-side { position: absolute; width: 100%; height: 100%; opacity: 0.25; }
          .form-side h1 { font-size: 34px; }
          .login-header-help { display: none; }
        }
      `}</style>

      <div className={isIdiomas ? 'login-root theme-idiomas' : 'login-root'}>
        <span className="login-bubble login-b1"></span>
        <span className="login-bubble login-b2"></span>
        <span className="login-bubble login-b3"></span>

        <header className="login-header">
          <div className="login-logo-text">
            ACADEMIA
            <span className="sub">CAMPUS VIRTUAL</span>
          </div>
          <div className="login-header-help">
            ¿Necesitás ayuda? <button type="button" className="support-link" onClick={() => { setShowSupportModal(true); setSupportMessage(null); }}>Contactá soporte</button>
          </div>
        </header>

        <main className="login-main">
          <div className="art-side">
            <img className="art-img" src={isIdiomas ? '/login-bg-1.png' : '/login-bg.png'} alt="" />
            <div className="art-frost"></div>
          </div>

          <div className="form-side">
            <span className="welcome-tag">Bienvenido de nuevo</span>
            <h1>Iniciá sesión<br/>en tu cuenta</h1>
            <p className="lead">Ingresá con el usuario y contraseña que recibiste por mail.</p>

            {error && <div className="login-alert err">{error}</div>}
            {success && <div className="login-alert ok">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
              </div>
              <div className="field">
                <label>Contraseña</label>
                <div className="input-wrap">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar contraseña">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
              <div className="forgot">
                <button type="button" onClick={openForgotModal}>¿Olvidaste tu contraseña?</button>
              </div>
              <button type="submit" disabled={isLoading} className="btn-login">
                {isLoading ? 'Ingresando...' : (<>Ingresar <ArrowRight size={14} /></>)}
              </button>
            </form>
          </div>
        </main>

        <footer className="login-footer">
          <span>© {new Date().getFullYear()} Academia · Campus Virtual</span>
          <span>Términos y servicios</span>
        </footer>

        {showForgotModal && (
          <div
            onClick={() => { if (!forgotLoading) { setShowForgotModal(false); setForgotMessage(null); } }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,14,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#0e2318', border: '1px solid rgba(74,222,128,0.25)', color: '#fff', width: '100%', maxWidth: 420, borderRadius: 16, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                  Recuperar contraseña
                </h3>
                <button
                  type="button"
                  onClick={() => { if (!forgotLoading) { setShowForgotModal(false); setForgotMessage(null); } }}
                  style={{ background: 'none', border: 'none', fontSize: 22, color: 'rgba(255,255,255,.5)', cursor: 'pointer', lineHeight: 1, padding: 0 }}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Ingresá tu email y te enviaremos una nueva contraseña provisoria. Podrás cambiarla desde tu perfil al ingresar.
              </p>

              {forgotMessage && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 12,
                  background: forgotMessage.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(220,38,38,0.12)',
                  color:      forgotMessage.type === 'success' ? '#86efac' : '#fca5a5',
                  border:     forgotMessage.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(220,38,38,0.3)',
                }}>
                  {forgotMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotPassword}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoFocus
                  required
                  disabled={forgotLoading}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14, outline: 'none', background: 'rgba(0,0,0,0.2)', color: '#fff', fontFamily: 'inherit' }}
                />

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setForgotMessage(null); }}
                    disabled={forgotLoading}
                    style={{ flex: 1, padding: '12px', background: 'transparent', color: 'rgba(255,255,255,.7)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 30, fontSize: 12, fontWeight: 600, cursor: forgotLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{ flex: 1, padding: '12px', background: ctaGradient, color: ctaTextColor, border: 'none', borderRadius: 30, fontSize: 12, fontWeight: 700, cursor: forgotLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: forgotLoading ? 0.7 : 1 }}
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSupportModal && (
          <div
            onClick={() => { if (!supportLoading) { setShowSupportModal(false); setSupportMessage(null); } }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,14,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#0e2318', border: '1px solid rgba(74,222,128,0.25)', color: '#fff', width: '100%', maxWidth: 460, borderRadius: 16, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Contactá soporte</h3>
                <button type="button" onClick={() => { if (!supportLoading) { setShowSupportModal(false); setSupportMessage(null); } }}
                  style={{ background: 'none', border: 'none', fontSize: 22, color: 'rgba(255,255,255,.5)', cursor: 'pointer', lineHeight: 1, padding: 0 }} aria-label="Cerrar">×</button>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Contanos tu consulta y te vamos a responder a la brevedad.
              </p>
              {supportMessage && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 12,
                  background: supportMessage.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(220,38,38,0.12)',
                  color:      supportMessage.type === 'success' ? '#86efac' : '#fca5a5',
                  border:     supportMessage.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(220,38,38,0.3)',
                }}>{supportMessage.text}</div>
              )}
              <form onSubmit={handleSupportSubmit}>
                {([
                  { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Tu nombre', required: true },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com', required: true },
                  { key: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+54 9 11 1234-5678', required: false },
                ] as const).map((f) => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.18em' }}>{f.label}{f.required ? ' *' : ''}</label>
                    <input type={f.type} value={(supportForm as any)[f.key]}
                      onChange={(e) => setSupportForm({ ...supportForm, [f.key]: e.target.value })}
                      placeholder={f.placeholder} required={f.required} disabled={supportLoading}
                      style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14, outline: 'none', background: 'rgba(0,0,0,0.2)', color: '#fff', fontFamily: 'inherit' }} />
                  </div>
                ))}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Consulta *</label>
                  <textarea value={supportForm.consulta}
                    onChange={(e) => setSupportForm({ ...supportForm, consulta: e.target.value })}
                    placeholder="Contanos en qué podemos ayudarte..." required disabled={supportLoading} rows={4}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, fontSize: 14, outline: 'none', background: 'rgba(0,0,0,0.2)', color: '#fff', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" onClick={() => { setShowSupportModal(false); setSupportMessage(null); }} disabled={supportLoading}
                    style={{ flex: 1, padding: '12px', background: 'transparent', color: 'rgba(255,255,255,.7)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 30, fontSize: 12, fontWeight: 600, cursor: supportLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cancelar</button>
                  <button type="submit" disabled={supportLoading}
                    style={{ flex: 1, padding: '12px', background: ctaGradient, color: ctaTextColor, border: 'none', borderRadius: 30, fontSize: 12, fontWeight: 700, cursor: supportLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: supportLoading ? 0.7 : 1 }}>
                    {supportLoading ? 'Enviando...' : 'Enviar consulta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
