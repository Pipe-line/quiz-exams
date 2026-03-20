# 🚀 Guía Rápida - Exam Test App

## ⚡ Pasos para poner en marcha (30 minutos)

### 1️⃣ SUPABASE (10 min)

1. Ve a [https://supabase.com](https://supabase.com) → Sign up / Login
2. "New Project" → Nombre: `exam-test-app` → Región: Europa → Contraseña (guarda)
3. Espera 2-3 min
4. Ve a **SQL Editor** → New query
5. Pega TODO el contenido de `supabase/schema.sql`
6. Click "Run" → Debe decir "Success"
7. Ve a **Settings** → **API**
8. Copia:
  - Project URL: `https://xxxxx.supabase.co`
  - anon public key: `eyJ....`

✅ **Supabase listo**

---

### 2️⃣ FRONTEND LOCAL (5 min)

```bash
# 1. Descomprimir el ZIP
unzip exam-app.zip
cd exam-app

# 2. Instalar
npm install

# 3. Configurar variables
cp .env.example .env
# Editar .env y poner:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ....

# 4. Ejecutar
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

✅ **Prueba local funcionando**

---

### 3️⃣ NETLIFY (15 min)

#### Opción A: Deploy rápido (ZIP)

```bash
# Construir
npm run build
```

1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. Arrastra la carpeta `dist/`
3. En tu sitio → **Site settings** → **Environment variables**
4. Añade:
  - `VITE_SUPABASE_URL` = tu URL
  - `VITE_SUPABASE_ANON_KEY` = tu key
5. **Deploys** → "Trigger deploy" → "Clear cache and deploy site"

✅ **App online!**

---

#### Opción B: Deploy desde Git (recomendado)

```bash
# Subir a GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/exam-app.git
git push -u origin main
```

1. Netlify → "Add new site" → "Import from Git"
2. Conecta GitHub → Selecciona repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. **Environment variables**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
6. Deploy

✅ **Auto-deploy en cada push!**

---

## 📝 Usar la app

1. **Crear cuenta**: Email + password
2. **Importar JSON**: Bloques → "Importar JSON" → Sube `example-questions.json`
3. **Hacer test**: Click en bloque → "Iniciar nuevo test"
4. **Responder**: Click opción → Feedback verde/rojo inmediato
5. **Ver resultados**: Historial completo + estadísticas

---

## 🔧 Troubleshooting

**No puedo hacer login**
→ Supabase → Authentication → Providers → Email debe estar ON

**"Missing environment variables"**
→ Verifica `.env` localmente o variables en Netlify

**Error 404 al recargar**
→ Asegúrate de tener `netlify.toml` en la raíz

**JSON no se importa**
→ Verifica formato en `example-questions.json`

---

## 📂 Archivos importantes

```
exam-app/
├── supabase/schema.sql          ← SQL para crear tablas
├── .env.example                 ← Template de variables
├── example-questions.json       ← JSON de ejemplo
├── INSTRUCCIONES.md            ← Guía completa
├── src/                        ← Código fuente
└── netlify.toml                ← Config de Netlify
```

---

## 💡 Tips

- **Pausar test**: Botón "Pausar" arriba derecha durante el test
- **Corregir respuesta**: En resultados → botón ✏️ en preguntas incorrectas
- **Ver stats**: Dashboard muestra gráfico de actividad últimos 30 días
- **Multidispositivo**: Login desde móvil/PC, todo sincronizado

---

¡Listo! 🎉