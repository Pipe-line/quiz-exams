# 📚 Exam Test App

Aplicación web para realizar tests de exámenes con seguimiento de progreso y estadísticas.

## ✨ Características

- ✅ **Importación de preguntas desde JSON** - Sube tus propios bloques de examen
- ✅ **Feedback inmediato** - Sabe al instante si acertaste o fallaste
- ✅ **Pausar y retomar** - Continúa tu test cuando quieras
- ✅ **Historial completo** - Todos tus intentos se guardan, nunca se borran
- ✅ **Estadísticas diarias** - Gráfico de preguntas respondidas por día
- ✅ **Corrección de respuestas** - Marca respuestas incorrectas en la base de datos
- ✅ **Multidispositivo** - Sincronización automática entre PC y móvil
- ✅ **Sin costes** - 100% gratis con Netlify + Supabase

## 🚀 Stack Tecnológico

**Frontend:**
- React 18
- React Router
- TailwindCSS
- Recharts (gráficos)
- Vite

**Backend:**
- Supabase (PostgreSQL + Auth + API REST automática)

**Hosting:**
- Netlify (frontend)
- Supabase (backend/database)

## 📦 Instalación y Despliegue

Lee el archivo **[INSTRUCCIONES.md](./INSTRUCCIONES.md)** para la guía completa paso a paso.

### Resumen rápido:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 3. Crear base de datos en Supabase
# Ejecutar el SQL de supabase/schema.sql en Supabase SQL Editor

# 4. Ejecutar localmente
npm run dev

# 5. Construir para producción
npm run build

# 6. Desplegar en Netlify
# Arrastra la carpeta dist/ o conecta con GitHub
```

## 📝 Formato de JSON para preguntas

```json
[
  {
    "id": 1,
    "question": "¿Cuál es la capital de España?",
    "options": {
      "A": "Barcelona",
      "B": "Madrid",
      "C": "Sevilla"
    },
    "correct_answer": "B"
  }
]
```

## 🎯 Uso

1. **Registrarse** - Crea una cuenta con email/password
2. **Importar bloque** - Sube un JSON con tus preguntas
3. **Hacer test** - Inicia un nuevo test desde cualquier bloque
4. **Ver resultados** - Revisa tus respuestas y corrige si es necesario
5. **Seguir progreso** - Dashboard con estadísticas y gráficos

## 📊 Base de datos

La aplicación usa estas tablas en PostgreSQL (Supabase):

- `exam_blocks` - Bloques de exámenes
- `questions` - Preguntas de cada bloque
- `exam_attempts` - Intentos de test (historial)
- `user_answers` - Respuestas individuales
- `daily_stats` - Estadísticas diarias agregadas
- `question_corrections` - Correcciones de respuestas

## 🔒 Seguridad

- Row Level Security (RLS) activado: cada usuario solo ve sus datos
- Autenticación gestionada por Supabase Auth
- Contraseñas hasheadas automáticamente

## 🛠️ Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

## 📄 Licencia

MIT

## 👨‍💻 Autor

Creado por ti con React + Supabase
