# 📚 Exam Test App - Guía de Instalación y Despliegue

Esta guía te llevará paso a paso para configurar Supabase y desplegar la aplicación en Netlify.

---

## 📋 Requisitos previos

- Node.js 18+ instalado
- Cuenta en Supabase (gratis): https://supabase.com
- Cuenta en Netlify (gratis): https://netlify.com

---

## 🚀 PARTE 1: Configurar Supabase

### Paso 1: Crear proyecto en Supabase

1. Ve a https://supabase.com y haz login (o crea cuenta)
2. Click en "New Project"
3. Completa:
   - **Project name**: `exam-test-app` (o el nombre que quieras)
   - **Database Password**: Genera una contraseña segura (guárdala, la necesitarás)
   - **Region**: Elige la más cercana a ti (Europa: `eu-west-1`)
4. Click en "Create new project"
5. Espera 2-3 minutos mientras se crea el proyecto

### Paso 2: Ejecutar el SQL Schema

1. En el panel izquierdo de Supabase, ve a **SQL Editor** (icono de tabla)
2. Click en "New query"
3. Abre el archivo `supabase/schema.sql` de este proyecto
4. Copia TODO el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Click en "Run" (botón abajo a la derecha)
7. Deberías ver: "Success. No rows returned"

✅ **Verificación**: Ve a **Database** → **Tables** en el menú lateral. Deberías ver las tablas:
- exam_blocks
- questions
- question_corrections
- exam_attempts
- user_answers
- daily_stats

### Paso 3: Obtener credenciales de API

1. En el panel izquierdo, ve a **Project Settings** (icono engranaje abajo)
2. Click en **API** en el menú lateral
3. Copia estos dos valores (los necesitarás pronto):
   - **Project URL** (ejemplo: `https://abcdefgh.supabase.co`)
   - **anon public** key (es una cadena larga que empieza con `eyJ...`)

### Paso 4: Configurar autenticación por email

1. Ve a **Authentication** → **Providers** en el menú lateral
2. Asegúrate de que **Email** esté habilitado (viene por defecto)
3. Scroll down hasta **Email Settings**
4. Desactiva "Confirm email" si quieres que los usuarios NO tengan que confirmar email (recomendado para testing)
   - O déjalo activo si quieres confirmación por email

✅ **Supabase está listo!**

---

## 💻 PARTE 2: Configurar el Frontend Local

### Paso 1: Instalar dependencias

```bash
cd exam-app
npm install
```

### Paso 2: Configurar variables de entorno

1. Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Edita el archivo `.env` y completa con tus credenciales de Supabase:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Probar localmente

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:3000`

**Prueba:**
1. Crea una cuenta (email + password)
2. Verifica que puedas hacer login
3. Intenta importar el JSON de preguntas que te pasé

✅ **Frontend local funcionando!**

---

## 🌐 PARTE 3: Desplegar en Netlify

### Opción A: Despliegue desde ZIP (más rápido)

#### Paso 1: Construir la aplicación

```bash
npm run build
```

Esto genera una carpeta `dist/` con los archivos estáticos.

#### Paso 2: Crear archivo de configuración de Netlify

Crea el archivo `netlify.toml` en la raíz del proyecto:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Paso 3: Subir a Netlify

1. Ve a https://app.netlify.com
2. Arrastra la carpeta `dist/` a la zona de "Drop your site folder here"
3. Espera a que se despliegue (1-2 minutos)
4. Tu app estará en una URL tipo: `https://random-name-12345.netlify.app`

#### Paso 4: Configurar variables de entorno en Netlify

⚠️ **IMPORTANTE**: Netlify NO lee el archivo `.env`, debes configurar las variables manualmente:

1. En tu sitio de Netlify, ve a **Site settings** → **Environment variables**
2. Click en "Add a variable"
3. Añade estas dos variables:
   - Key: `VITE_SUPABASE_URL` → Value: `https://tu-proyecto.supabase.co`
   - Key: `VITE_SUPABASE_ANON_KEY` → Value: `eyJhbGc...` (tu key)
4. Click en "Save"

#### Paso 5: Re-desplegar con las variables

1. Ve a **Deploys**
2. Click en "Trigger deploy" → "Clear cache and deploy site"
3. Espera 1-2 minutos

✅ **App desplegada en Netlify!**

---

### Opción B: Despliegue desde Git (recomendado para producción)

#### Paso 1: Subir código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/exam-app.git
git push -u origin main
```

#### Paso 2: Conectar Netlify con GitHub

1. En Netlify, click en "Add new site" → "Import an existing project"
2. Selecciona "GitHub"
3. Autoriza Netlify a acceder a tu cuenta
4. Busca tu repositorio `exam-app`
5. Configura:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click en "Show advanced" → "Add environment variable"
7. Añade las dos variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Click en "Deploy site"

✅ **Ahora cada push a GitHub desplegará automáticamente!**

---

## 📝 PARTE 4: Usar la aplicación

### Importar preguntas (JSON)

El formato del JSON debe ser:

```json
[
  {
    "id": 1,
    "question": "Texto de la pregunta",
    "options": {
      "A": "Opción A",
      "B": "Opción B",
      "C": "Opción C"
    },
    "correct_answer": "B"
  }
]
```

**Pasos:**
1. Login en la app
2. Ve a "Bloques"
3. Click en "Importar JSON"
4. Selecciona tu archivo `.json`
5. Pon un nombre al bloque (ej: "Salesforce Agentforce - Bloque 1")
6. ¡Listo! Ya puedes hacer tests

### Flujo de trabajo

1. **Dashboard**: Ver estadísticas y bloques disponibles
2. **Bloques**: Gestionar tus conjuntos de preguntas
3. **Hacer test**: Click en un bloque → "Iniciar nuevo test"
4. **Durante el test**:
   - Seleccionas respuesta → feedback inmediato (verde/rojo)
   - Puedes pausar y retomar después
5. **Resultados**: Ver todas tus respuestas, corregir respuestas incorrectas

---

## 🔧 Comandos útiles

```bash
# Desarrollo local
npm run dev

# Construir para producción
npm run build

# Vista previa de build
npm run preview
```

---

## 🐛 Solución de problemas

### Error: "Missing Supabase environment variables"

- Verifica que `.env` existe y tiene las variables correctas
- En Netlify, verifica que las variables estén configuradas en Settings

### No puedo hacer login

- Ve a Supabase → Authentication → Providers
- Verifica que Email esté habilitado
- Revisa la consola del navegador (F12) para ver errores

### Las preguntas no se importan

- Verifica el formato JSON
- Abre la consola del navegador (F12) y mira los errores
- Verifica que las tablas se crearon en Supabase (Database → Tables)

### Error 404 al recargar página en Netlify

- Asegúrate de tener el archivo `netlify.toml` con los redirects
- Re-despliega el sitio

---

## 📊 Estructura de la base de datos

```
exam_blocks (bloques de exámenes)
  └─ questions (preguntas)
       └─ user_answers (respuestas de usuario)
            └─ exam_attempts (intentos de examen)

question_corrections (correcciones de usuario)
daily_stats (estadísticas diarias)
```

---

## 🔒 Seguridad

- Row Level Security (RLS) está activado: cada usuario solo ve sus propios datos
- Las contraseñas se hashean automáticamente con bcrypt
- La anon key es pública (no es un problema, RLS protege los datos)

---

## 🎯 Próximos pasos opcionales

- Configurar dominio personalizado en Netlify
- Añadir Google OAuth para login más fácil
- Configurar emails transaccionales en Supabase
- Añadir modo oscuro
- Exportar resultados a PDF

---

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Ve a Supabase → Logs para ver errores de backend
3. Netlify → Deploys → Deploy log para ver errores de build

---

¡Listo! Tu aplicación de test está funcionando. 🎉
