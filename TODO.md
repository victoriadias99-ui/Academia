# ✅ FIX: Cursos asignados no aparecen en perfil usuario

## 📋 Estado: [EN PROGRESO]

### ✅ 1. Crear TODO.md [COMpletado]

### ⏳ 2. Editar api/index.ts
- [ ] Fix `/api/auth/perfil` → fetch DB cursos frescos

### ⏳ 3. Editar src/App.tsx  
- [ ] Botón refresh en header cursos
- [ ] Auto-refresh 30s en dashboard (opcional: **SÍ**)

### ⏳ 4. Test completo
```
1. Admin asigna curso a usuario X
2. Usuario X refresca → ✅ Nuevo curso en perfil
3. Usuario X "Mis Cursos" → ✅ Listado actualizado
4. DB verify: SELECT email,cursos FROM academia_usuarios
```

### ⏳ 5. Deploy & Validar
```
vercel --prod
railway deploy (si aplica)
```

**Próximo**: Editar `api/index.ts`
