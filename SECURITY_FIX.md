# Fix de Seguridad: Validación de Contraseña para Admin

## 🔴 Bug Encontrado

En el endpoint `/api/auth/login` del `server_jwt.ts`, **no se validaba la contraseña para usuarios admin**. Esto permitía acceso no autorizado.

### Código Vulnerable (ANTES):
```typescript
if (ADMIN_EMAILS.includes(email)) {
  const user = { id: 0, nombre: "Administrador", email, inicial: "A", role: "admin", foto_url: null, cursos: "" };
  return res.json({ status: "ok", role: "admin", token: signToken(user), usuario: user });
}
```

**Problema:** Cualquiera que conozca el email del admin podría acceder sin contraseña.

---

## ✅ Solución Implementada

### Cambios:
1. **Validación de contraseña centralizada**: Todos los usuarios (admin y regulares) ahora deben validar su contraseña
2. **Rol determinado por ADMIN_EMAILS**: El rol se asigna después de validar credenciales
3. **Usuario admin en base de datos**: El admin ahora es un usuario normal en `usuarios.json` con credenciales verificadas

### Código Corregido (DESPUÉS):
```typescript
app.post("/api/auth/login", async (req, res) => {
  // ... validaciones iniciales ...

  try {
    const users = await getUsers();
    const user = users.find((u: any) => u.email === email);

    if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });
    if (!user.activo) return res.status(403).json({ error: "Cuenta desactivada. Contactá al administrador." });

    // ✅ VALIDAR CONTRASEÑA PARA TODOS (antes era omitido para admin)
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Credenciales incorrectas" });

    // ✅ Determinar rol después de validar credenciales
    const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";

    // ... resto del código ...
  }
});
```

---

## 📝 Credenciales del Admin

**Email:** `victoria.pdias99@gmail.com`
**Contraseña:** `Admin123!` *(cambiar en producción)*

⚠️ **IMPORTANTE:** Esta contraseña debe cambiarse inmediatamente en producción.

---

## 🔒 Mejoras de Seguridad Recomendadas

1. **Variables de entorno**: Mover ADMIN_EMAILS a `.env`
2. **Gestión de contraseñas**: Implementar un sistema de cambio de contraseña seguro para admin
3. **Logs de auditoría**: Registrar todos los accesos a rutas admin
4. **Autenticación en dos factores (2FA)**: Para cuentas admin
5. **Rate limiting**: Limitar intentos de login para prevenir fuerza bruta

---

## 🧪 Pruebas

Para verificar que el fix funciona:

1. Intentar login con email admin pero contraseña incorrecta → Debe rechazar ✅
2. Intentar login con email admin y contraseña correcta → Debe permitir acceso a admin ✅
3. Usuarios regulares funcionan como antes ✅
