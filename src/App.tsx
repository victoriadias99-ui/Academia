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
    return <LoginView onLoginSuccess={async (role) => { 
      await fetchProfile();
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
      className="bg-white border border-dee2e6 rounded-lg overflow-hidden hover:border-verde-brillante transition-all group flex flex-col cursor-pointer"
    >
      <div className="h-[180px] bg-verde-navbar relative overflow-hidden">
        {course.imagen_url ? (
          <img 
            src={course.imagen_url} 
            alt={course.nombre} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📊</div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h4 className="font-bold text-azul-marino mb-1 line-clamp-1">{course.nombre}</h4>
        <p className="text-texto-gris text-[13px] mb-4 line-clamp-2 h-10">
          {course.descripcion}
        </p>

        <div className="mt-auto">
          <div className="flex justify-between text-[11px] text-texto-gris mb-1.5">
            <span>{course.lecciones_completadas} de {course.total_lecciones} lecciones</span>
            <span className="font-bold text-verde-brillante">{course.progreso}%</span>
          </div>
          <div className="w-full h-1.5 bg-dee2e6 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-verde-brillante transition-all duration-500" 
              style={{ width: `${course.progreso}%` }}
            ></div>
          </div>

          <button 
            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              isCompleted 
                ? 'bg-[#d4edda] text-verde-boton cursor-default' 
                : 'bg-verde-boton hover:bg-verde-brillante text-white'
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
function PlayerView({ courseId, onBack }: { courseId: number, onBack: () => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
          <h2 className="font-semibold text-azul-marino truncate max-w-[200px] md:max-w-[400px]">
            {course.nombre}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-verde-brillante">{progressPercent}% completado</span>
            <div className="w-[120px] h-1.5 bg-dee2e6 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-verde-brillante" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-[280px] bg-verde-navbar shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-bold text-sm mb-1">{course.nombre}</h3>
            <p className="text-white/60 text-xs">{lessons.length} lecciones</p>
          </div>
          <div className="flex-1">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => setCurrentLessonIndex(index)}
                className={`w-full flex items-center gap-3 p-4 border-b border-white/5 transition-colors text-left relative ${
                  index === currentLessonIndex 
                    ? 'bg-verde-brillante/20 border-l-[3px] border-l-verde-brillante' 
                    : 'hover:bg-white/5'
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${
                  lesson.completada ? 'bg-verde-brillante text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {lesson.completada ? <Check size={14} /> : index + 1}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm truncate ${index === currentLessonIndex ? 'text-white font-medium' : 'text-white/80'}`}>
                    {lesson.titulo}
                  </p>
                  <p className="text-[11px] text-white/60">{formatDuracion(lesson.duracion)}</p>
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

          {/* Info Bar */}
          <div className="h-[72px] bg-white border-t border-dee2e6 flex items-center justify-between px-6 shrink-0">
            <div className="overflow-hidden">
              <h3 className="font-bold text-azul-marino truncate">{currentLesson.titulo}</h3>
              <p className="text-texto-gris text-xs">Lección {currentLessonIndex + 1} de {lessons.length}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleComplete}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  currentLesson.completada
                    ? 'bg-[#d4edda] text-verde-boton cursor-default'
                    : 'bg-verde-boton hover:bg-verde-brillante text-white'
                }`}
              >
                <Check size={16} />
                {currentLesson.completada ? 'Completada' : 'Marcar como completada'}
              </button>
              
              {currentLessonIndex < lessons.length - 1 && (
                <button
                  onClick={nextLesson}
                  className="px-4 py-2 bg-fondo-gris border border-dee2e6 text-azul-marino rounded-lg font-bold text-sm hover:border-verde-brillante transition-all flex items-center gap-1"
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
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
function LoginView({ onLoginSuccess }: { onLoginSuccess: (role: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
          setSuccess('Registro exitoso. Ahora podés iniciar sesión.');
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
          onLoginSuccess(data.role);
        } else {
          const data = await response.json();
          setError(data.error || 'Error al iniciar sesión. Inténtalo de nuevo.');
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans overflow-hidden">
      {/* Sidebar Izquierda - Oculta en mobile */}
      <aside className="hidden md:flex flex-col w-[300px] bg-verde-navbar p-8 text-white shrink-0 relative">
        <div className="mb-8">
          <img 
            src="/logo-aprende-excel.png" 
            onError={(e) => { e.currentTarget.src = "https://www.aprende-excel.com/wp-content/uploads/2023/03/logo-aprende-excel-horizontal.png"; }}
            alt="Aprende Excel" 
            className="h-12 w-auto"
            referrerPolicy="no-referrer"
          />
          <p className="text-white/60 text-sm font-medium mt-2">Academia Online</p>
        </div>

        <div className="h-px bg-white/20 w-full mb-8"></div>

        <ul className="space-y-6 flex-1">
          {[
            'Cursos cortos con amplia salida laboral',
            'Domina las herramientas más demandadas',
            'Cursos paso a paso desde cero',
            'Más de 270 empresas capacitadas',
          ].map((benefit, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
              <Check className="text-verde-brillante shrink-0 mt-0.5" size={18} />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <footer className="mt-auto pt-8">
          <p className="text-white/40 text-xs">© 2024 Aprende Excel</p>
        </footer>
      </aside>

      {/* Panel Derecho - Formulario */}
      <main className="flex-1 bg-white flex items-center justify-center p-6 md:p-12 animate-fade-in">
        <div className="w-full max-w-[400px]">
          <div className="md:hidden flex flex-col items-center mb-8">
            <img 
              src="/logo-aprende-excel.png" 
              onError={(e) => { e.currentTarget.src = "https://www.aprende-excel.com/wp-content/uploads/2023/03/logo-aprende-excel-horizontal.png"; }}
              alt="Aprende Excel" 
              className="h-12 w-auto"
              referrerPolicy="no-referrer"
            />
            <p className="text-texto-gris text-xs mt-1">Academia Online</p>
          </div>

          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-azul-marino leading-tight mb-2">
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="text-texto-gris">
              {isRegistering ? 'Registrate para empezar a aprender' : 'Ingresá tus datos para acceder a tus cursos'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#f8d7da] border border-[#f5c6cb] text-[#721c24] px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-[#d4edda] border border-[#c3e6cb] text-[#155724] px-4 py-3 rounded-md text-sm">
                {success}
              </div>
            )}

            {isRegistering && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-azul-marino">Nombre</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-azul-marino">Apellido</label>
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-dee2e6 focus:border-verde-brillante outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-azul-marino" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-lg border border-dee2e6 focus:border-verde-brillante focus:ring-4 focus:ring-verde-brillante/10 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-azul-marino" htmlFor="password">
                  Contraseña
                </label>
                {!isRegistering && (
                  <a href="#" className="text-xs font-medium text-verde-brillante hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-dee2e6 focus:border-verde-brillante focus:ring-4 focus:ring-verde-brillante/10 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-gris hover:text-azul-marino transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-verde-boton hover:bg-verde-brillante text-white font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (isRegistering ? 'Registrando...' : 'Iniciando sesión...') : (
                <>
                  {isRegistering ? 'Crear cuenta' : 'Ingresar'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-verde-brillante font-medium hover:underline"
            >
              {isRegistering ? '¿Ya tenés cuenta? Iniciar sesión' : '¿No tenés cuenta? Registrate'}
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-dee2e6 text-center">
            <p className="text-texto-gris text-xs">
              ¿Problemas? <a href="mailto:soporte@aprende-excel.com" className="text-verde-brillante hover:underline">soporte@aprende-excel.com</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
