import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // JSON Database Path
  const DB_PATH = path.join(process.cwd(), "usuarios.json");

  // Helper to read users
  const getUsers = (): any[] => {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  };

  // Helper to save users
  const saveUsers = (users: any[]) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
  };

  // Course Mapping
  const COURSE_MAPPING: Record<string, string> = {
    "excel": "12286845",
    "excel_intermedio": "12286854",
    "excel_avanzado": "12052707",
    "excel_promo": "12305404"
  };

  // Mock Data
  const mockUser = {
    id: 1,
    nombre: "Victoria Dias",
    email: "victoria.pdias99@gmail.com",
    inicial: "V",
    role: "user",
    foto_url: null as string | null,
    cursos: "excel|excel_intermedio"
  };

  const adminUser = {
    id: 0,
    nombre: "Administrador",
    email: "victoria.pdias99@gmail.com",
    inicial: "V",
    role: "admin",
    foto_url: null as string | null,
    cursos: ""
  };

  let currentUser: any = adminUser;

  // Vimeo Integration
  const VIMEO_TOKEN = "713ab24da995946cc8ebeaabd1a90880";
  const FOLDER_IDS = ["12286845", "12286854", "12052707", "12305404", "13018504", "12107061", "12305086"];
  
  let vimeoCourses: any[] = [];
  let vimeoLessons: Record<number, any[]> = {};

async function fetchVideosFromFolder(folderId: string) {
  let videos: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `https://api.vimeo.com/me/projects/${folderId}/videos?per_page=100&page=${page}&sort=date&direction=asc`,
      { headers: { Authorization: `Bearer ${VIMEO_TOKEN}` } }
    );
    const data: any = await res.json();
    if (!res.ok) break;
    videos = [...videos, ...(data.data || [])];
    hasMore = data.paging?.next != null;
    page++;
  }
  return videos;
}
  async function preloadVimeoData() {
    console.log("Precargando datos de Vimeo...");
    const courses = [];
    const lessonsMap: Record<number, any[]> = {};

    for (const folderId of FOLDER_IDS) {
      try {
        const folderRes = await fetch(`https://api.vimeo.com/me/projects/${folderId}`, {
          headers: { Authorization: `Bearer ${VIMEO_TOKEN}` }
        });
        const folderData: any = await folderRes.json();
        
        if (!folderRes.ok) {
          console.error(`Error al obtener carpeta ${folderId}:`, folderData);
          continue;
        }

        const courseId = parseInt(folderId);
        
        const videos = await fetchVideosFromFolder(folderId);
        videos.sort((a: any, b: any) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.name.match(/\d+/)?.[0] || "0");
          return numA - numB;
        });

        const lessons = videos.map((video: any) => {
          const vimeo_id = video.uri.split("/").pop();
          return {
            id: vimeo_id,
            titulo: video.name,
            vimeo_id: vimeo_id,
            duracion: video.duration,
            completada: false
          };
        });

        const course = {
          id: courseId,
          nombre: folderData.name,
          descripcion: folderData.description || `Curso completo de ${folderData.name}`,
          imagen_url: videos?.[0]?.pictures?.base_link || `https://picsum.photos/seed/${folderId}/400/250`,
          progreso: 0,
          total_lecciones: lessons.length,
          lecciones_completadas: 0
        };

        courses.push(course);
        lessonsMap[courseId] = lessons;
      } catch (error) {
        console.error(`Error cargando curso ${folderId}:`, error);
      }
    }

    vimeoCourses = courses;
    vimeoLessons = lessonsMap;
    console.log(`Carga de Vimeo completada. ${vimeoCourses.length} cursos cargados.`);
  }

  // Iniciar precarga
  await preloadVimeoData();

  const mockStudents = [
    { email: "juan@example.com", nombre: "Juan Pérez", academia: "Aprende Excel", cursos: 2, registro: "2024-01-15", ultimo_login: "2024-03-08", activo: true, vencimiento: "2027-12-31" },
    { email: "maria@example.com", nombre: "Maria Garcia", academia: "Aprende Excel", cursos: 1, registro: "2024-02-10", ultimo_login: "2024-03-09", activo: true, vencimiento: "2027-06-10" },
    { email: "pedro@example.com", nombre: "Pedro Lopez", academia: "Aprende Excel", cursos: 3, registro: "2023-12-05", ultimo_login: "2024-03-01", activo: false, vencimiento: "2024-01-01" },
  ];

  const mockSales = [
    { email: "juan@example.com", nombre: "Juan Pérez", curso: "Excel Nivel Inicial", monto: 25.00, fecha: "2024-03-08" },
    { email: "maria@example.com", nombre: "Maria Garcia", curso: "Excel Nivel Intermedio", monto: 35.00, fecha: "2024-03-07" },
    { email: "ana@example.com", nombre: "Ana Martinez", curso: "Power BI Inicial", monto: 45.00, fecha: "2024-03-06" },
  ];

  const mockCourses = [
    {
      id: 1,
      nombre: "Excel Nivel Inicial",
      descripcion: "Aprendé desde cero las herramientas fundamentales de Excel para el mundo laboral.",
      imagen_url: "https://picsum.photos/seed/excel1/400/250",
      progreso: 45,
      total_lecciones: 10,
      lecciones_completadas: 4
    },
    {
      id: 2,
      nombre: "Excel Nivel Intermedio",
      descripcion: "Dominá funciones avanzadas, tablas dinámicas y análisis de datos eficientes.",
      imagen_url: "https://picsum.photos/seed/excel2/400/250",
      progreso: 0,
      total_lecciones: 12,
      lecciones_completadas: 0
    },
    {
      id: 3,
      nombre: "Power BI Inicial",
      descripcion: "Convertí tus datos en tableros interactivos y visualizaciones impactantes.",
      imagen_url: "https://picsum.photos/seed/pbi/400/250",
      progreso: 100,
      total_lecciones: 8,
      lecciones_completadas: 8
    }
  ];

  const mockLessons: Record<number, any[]> = {
    1: [
      { id: 101, titulo: "Introducción a la interfaz", vimeo_id: "76979871", duracion: 320, completada: true },
      { id: 102, titulo: "Celdas, filas y columnas", vimeo_id: "76979871", duracion: 450, completada: true },
      { id: 103, titulo: "Formatos básicos", vimeo_id: "76979871", duracion: 280, completada: true },
      { id: 104, titulo: "Primeras fórmulas", vimeo_id: "76979871", duracion: 600, completada: true },
      { id: 105, titulo: "Suma y Promedio", vimeo_id: "76979871", duracion: 420, completada: false },
      { id: 106, titulo: "Uso de filtros", vimeo_id: "76979871", duracion: 350, completada: false },
      { id: 107, titulo: "Ordenar datos", vimeo_id: "76979871", duracion: 310, completada: false },
      { id: 108, titulo: "Gráficos circulares", vimeo_id: "76979871", duracion: 500, completada: false },
      { id: 109, titulo: "Gráficos de barras", vimeo_id: "76979871", duracion: 480, completada: false },
      { id: 110, titulo: "Impresión de documentos", vimeo_id: "76979871", duracion: 200, completada: false },
    ],
    2: Array.from({ length: 12 }, (_, i) => ({
      id: 201 + i,
      titulo: `Lección Intermedia ${i + 1}`,
      vimeo_id: "76979871",
      duracion: 400 + i * 10,
      completada: false
    })),
    3: Array.from({ length: 8 }, (_, i) => ({
      id: 301 + i,
      titulo: `Lección Power BI ${i + 1}`,
      vimeo_id: "76979871",
      duracion: 500 + i * 5,
      completada: true
    }))
  };

  // API Routes
  app.post("/api/auth/login", async (req, res) => {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.toLowerCase();
    
    console.log(`Intento de login: ${email}`);

    // Login Admin
    if (email === "victoria.pdias99@gmail.com" || email === "admin@gmail.com") {
      currentUser = adminUser;
      console.log("Login exitoso: Admin");
      return res.json({ status: "ok", role: "admin" });
    } 
    
    // Hardcoded Test Users
    const testUsers: Record<string, any> = {
      "juan@example.com": { id: 2, nombre: "Juan Pérez", email: "juan@example.com", inicial: "J", role: "user", foto_url: null, cursos: "excel" },
      "maria@example.com": { id: 3, nombre: "Maria Garcia", email: "maria@example.com", inicial: "M", role: "user", foto_url: null, cursos: "excel_intermedio" },
      "pedro@example.com": { id: 4, nombre: "Pedro Lopez", email: "pedro@example.com", inicial: "P", role: "user", foto_url: null, cursos: "excel_avanzado" }
    };

    if (testUsers[email]) {
      currentUser = testUsers[email];
      console.log(`Login exitoso: Test User ${currentUser.nombre}`);
      return res.json({ status: "ok", role: "user" });
    }

    if (email && password) {
      try {
        const users = getUsers();
        const user = users.find(u => u.email === email);

        if (user) {
          if (!user.activo) {
            console.log(`Login fallido: Cuenta desactivada para ${email}`);
            return res.status(403).json({ error: "Tu cuenta está desactivada. Contacta al administrador." });
          }

          const match = await bcrypt.compare(password, user.password);
          if (match) {
            currentUser = {
              id: user.id,
              nombre: `${user.nombre} ${user.apellido}`,
              email: user.email,
              inicial: user.nombre.charAt(0).toUpperCase(),
              role: "user",
              foto_url: null,
              cursos: user.cursos || ""
            };
            console.log(`Login exitoso: JSON User ${currentUser.nombre}`);
            return res.json({ status: "ok", role: "user" });
          } else {
            console.log(`Login fallido: Contraseña incorrecta para ${email}`);
            return res.status(401).json({ error: "Credenciales incorrectas" });
          }
        } else {
          console.log(`Login fallido: Usuario no encontrado ${email}`);
          return res.status(401).json({ error: "Credenciales incorrectas" });
        }
      } catch (error) {
        console.error("Error en login JSON:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
    } else {
      res.status(400).json({ error: "Email y contraseña requeridos" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, nombre, apellido, cursos } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    try {
      const users = getUsers();
      if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: Date.now(),
        email,
        password: hashedPassword,
        nombre,
        apellido: apellido || "",
        cursos: cursos || "",
        activo: 1,
        fecha_creacion: new Date().toISOString().split('T')[0]
      };

      users.push(newUser);
      saveUsers(users);

      res.json({ status: "ok", message: "Usuario creado correctamente" });
    } catch (error) {
      console.error("Error en registro JSON:", error);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });

  app.get("/api/auth/perfil", (req, res) => {
    res.json({ usuario: currentUser });
  });

  // Admin Routes
  app.get("/api/admin/dashboard", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    res.json({
      stats: {
        totalAlumnos: 1250,
        totalVentas: 850,
        ingresosUSD: 12450.50,
        cursosActivos: mockCourses.length
      },
      ultimasCompras: mockSales
    });
  });

  app.get("/api/admin/usuarios", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const { buscar } = req.query;
    let filtered = [...mockStudents];
    if (buscar) {
      const q = (buscar as string).toLowerCase();
      filtered = filtered.filter(s => s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    res.json({ usuarios: filtered });
  });

  app.post("/api/admin/usuarios/suscripcion", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const { email, meses, activo } = req.body;
    const studentIndex = mockStudents.findIndex(s => s.email === email);
    
    if (studentIndex === -1) return res.status(404).json({ error: "Usuario no encontrado" });

    if (meses !== undefined) {
      const now = new Date();
      now.setMonth(now.getMonth() + parseInt(meses));
      mockStudents[studentIndex].vencimiento = now.toISOString().split('T')[0];
      mockStudents[studentIndex].activo = true;
    }

    if (activo !== undefined) {
      mockStudents[studentIndex].activo = activo;
    }

    res.json({ status: "ok", usuario: mockStudents[studentIndex] });
  });

  app.put("/api/admin/usuarios/:email", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const email = req.params.email;
    const index = mockStudents.findIndex(s => s.email === email);
    if (index !== -1) {
      mockStudents[index] = { ...mockStudents[index], ...req.body, email };
      res.json({ status: "ok", usuario: mockStudents[index] });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });

  app.delete("/api/admin/usuarios/:email", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const email = req.params.email;
    const index = mockStudents.findIndex(s => s.email === email);
    if (index !== -1) {
      mockStudents.splice(index, 1);
      res.json({ status: "ok" });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });

  app.post("/api/admin/cursos", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const nuevoCurso = {
      id: mockCourses.length + 1,
      ...req.body,
      progreso: 0,
      total_lecciones: 0,
      lecciones_completadas: 0
    };
    mockCourses.push(nuevoCurso);
    res.json({ status: "ok", curso: nuevoCurso });
  });

  app.put("/api/admin/cursos/:id", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const id = parseInt(req.params.id);
    const index = mockCourses.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCourses[index] = { ...mockCourses[index], ...req.body, id };
      res.json({ status: "ok", curso: mockCourses[index] });
    } else {
      res.status(404).json({ error: "Curso no encontrado" });
    }
  });

  app.delete("/api/admin/cursos/:id", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const id = parseInt(req.params.id);
    const index = mockCourses.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCourses.splice(index, 1);
      delete mockLessons[id];
      res.json({ status: "ok" });
    } else {
      res.status(404).json({ error: "Curso no encontrado" });
    }
  });

  app.post("/api/admin/lecciones", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const { cursoId, ...leccionData } = req.body;
    if (!mockLessons[cursoId]) mockLessons[cursoId] = [];
    const nuevaLeccion = {
      id: Date.now(),
      ...leccionData,
      completada: false
    };
    mockLessons[cursoId].push(nuevaLeccion);
    res.json({ status: "ok", leccion: nuevaLeccion });
  });

  app.put("/api/admin/lecciones/:id", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const id = parseInt(req.params.id);
    const { cursoId, ...leccionData } = req.body;
    if (!cursoId || !mockLessons[cursoId]) return res.status(404).json({ error: "Curso no encontrado" });
    
    const index = mockLessons[cursoId].findIndex(l => l.id === id);
    if (index !== -1) {
      mockLessons[cursoId][index] = { ...mockLessons[cursoId][index], ...leccionData, id };
      res.json({ status: "ok", leccion: mockLessons[cursoId][index] });
    } else {
      res.status(404).json({ error: "Lección no encontrada" });
    }
  });

  app.delete("/api/admin/lecciones/:id", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    const id = parseInt(req.params.id);
    // We need to find which course this lesson belongs to
    let found = false;
    for (const cursoId in mockLessons) {
      const index = mockLessons[cursoId].findIndex(l => l.id === id);
      if (index !== -1) {
        mockLessons[cursoId].splice(index, 1);
        found = true;
        break;
      }
    }
    if (found) {
      res.json({ status: "ok" });
    } else {
      res.status(404).json({ error: "Lección no encontrada" });
    }
  });

  app.get("/api/admin/ventas", (req, res) => {
    if (currentUser.role !== "admin") return res.status(403).json({ error: "No autorizado" });
    res.json({ ventas: mockSales });
  });

  app.get("/api/cursos/mis-cursos", (req, res) => {
    if (currentUser.role === "admin") {
      return res.json({ cursos: vimeoCourses });
    }

    const userCourseSlugs = (currentUser.cursos || "").split("|").filter(Boolean);
    const userFolderIds = userCourseSlugs.map((slug: string) => COURSE_MAPPING[slug]).filter(Boolean);
    
    const filteredCursos = vimeoCourses.filter(curso => 
      userFolderIds.includes(curso.id.toString())
    );

    res.json({ cursos: filteredCursos });
  });

  app.get("/api/cursos/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const curso = vimeoCourses.find(c => c.id === id);
    const lecciones = vimeoLessons[id] || [];
    if (curso) {
      res.json({ curso, lecciones });
    } else {
      res.status(404).json({ error: "Curso no encontrado" });
    }
  });

  app.post("/api/cursos/progreso/:leccionId", (req, res) => {
    const leccionId = parseInt(req.params.leccionId);
    // In a real app, we'd update the DB
    res.json({ status: "ok", leccionId });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { email } = req.body;
    if (email) {
      // Mock success
      res.json({ status: "ok" });
    } else {
      res.status(400).json({ error: "Email es requerido" });
    }
  });

  app.post("/api/auth/update-profile", (req, res) => {
    const { nombre, email, foto_url } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ error: "Nombre y email son requeridos" });
    }
    
    // Update current user
    currentUser.nombre = nombre;
    currentUser.email = email;
    currentUser.inicial = nombre.charAt(0).toUpperCase();
    if (foto_url !== undefined) {
      currentUser.foto_url = foto_url;
    }
    
    res.json({ status: "ok", usuario: currentUser });
  });

  app.post("/api/auth/change-password", (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }
    // Mock success
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
