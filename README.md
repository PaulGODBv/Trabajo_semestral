# The Gordo — Sistema de Reservas

Aplicación web para la gestión de reservas de mesas en el restaurante **Comidas Rápidas The Gordo**. Desarrollada con React + Vite y Supabase como backend.

## Integrantes

- **Paul Mateo Contreras Arias** — 01220371027
- **William Felipe Melgarejo Vega** — 01220371001

## Estructura del proyecto

```
Proyecto_semestral/
├── .env                     # Variables de entorno (Supabase)
├── .gitignore
├── index.html               # Entry point HTML
├── package.json             # Dependencias y scripts
├── vite.config.js           # Configuración de Vite
├── eslint.config.js         # Reglas de ESLint
├── public/                  # Archivos públicos estáticos
│   ├── favicon.svg
│   ├── icons.svg
│   └── the-gordo-logo.png
└── src/
    ├── main.jsx             # Punto de entrada de React
    ├── App.jsx              # Componente principal con rutas
    ├── App.css              # Estilos globales de la app
    ├── index.css            # Estilos base / reset
    ├── assets/              # Imágenes y recursos
    │   └── hero.png
    ├── components/          # Componentes de React
    │   ├── AdminHorarios.jsx
    │   ├── AdminLoginModal.jsx
    │   ├── AdminPanel.jsx
    │   ├── AdminReservas.jsx
    │   ├── ConfirmDialog.jsx
    │   ├── ConfirmationModal.jsx
    │   ├── CreateMesaModal.jsx
    │   ├── EditMesaModal.jsx
    │   ├── MesaForm.jsx
    │   ├── MesaModal.jsx
    │   ├── MesasList.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── ReasignarMesaModal.jsx
    │   ├── ReservaConfirmada.jsx
    │   ├── ReservaForm.jsx
    │   ├── SalonMap.jsx
    │   └── Toast.jsx
    ├── context/             # Contextos de React
    │   ├── AuthContext.jsx
    │   └── ToastContext.jsx
    ├── services/            # Servicios de conexión con Supabase
    │   ├── supabaseClient.js
    │   ├── mesasService.js
    │   ├── reservasService.js
    │   └── horariosService.js
    └── utils/               # Utilidades
        └── horarios.js
```

## Instalación

1. **Clonar el repositorio**

   ```bash
   git clone <url-del-repositorio>
   cd Proyecto_semestral
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   Crear un archivo `.env` en la raíz con las credenciales de Supabase:

   ```env
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

4. **Iniciar en modo desarrollo**

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:5173`.

## Credenciales de administrador

| Campo    | Valor               |
|----------|---------------------|
| Email    | admin@thegordo.com  |
| Contraseña | Contrasena12*     |

## Base de datos (Supabase)

El proyecto utiliza **Supabase** (PostgreSQL) con las siguientes tablas:

### `mesas`

| Columna    | Tipo         | Descripción                     |
|------------|--------------|---------------------------------|
| id         | int8 (PK)    | Identificador único             |
| numero     | int4         | Número de mesa                  |
| ubicacion  | text         | Ubicación en el salón           |
| capacidad  | int4         | Capacidad de personas           |
| estado     | text         | `disponible`, `ocupada`, etc.   |

### `reservas`

| Columna    | Tipo         | Descripción                           |
|------------|--------------|---------------------------------------|
| id         | int8 (PK)    | Identificador único                   |
| mesa_id    | int8 (FK)    | Referencia a `mesas.id`               |
| fecha      | date         | Fecha de la reserva                   |
| hora       | time         | Hora de la reserva                    |
| estado     | text         | `activa`, `cancelada`, etc.           |
| cliente    | text         | Nombre del cliente                    |
| telefono   | text         | Teléfono de contacto                  |

### `horarios`

| Columna     | Tipo         | Descripción                     |
|-------------|--------------|---------------------------------|
| id          | int8 (PK)    | Identificador único             |
| dia_semana  | int4         | Día de la semana (0-6)          |
| hora_inicio | time         | Hora de apertura                |
| hora_fin    | time         | Hora de cierre                  |
| activo      | boolean      | Si el horario está vigente      |

> **Nota:** Las tablas deben crearse en el proyecto de Supabase con las columnas mencionadas. Las relaciones (FK) entre `reservas.mesa_id` → `mesas.id` y las políticas de seguridad (RLS) deben configurarse según las necesidades del negocio.

## Scripts disponibles

| Comando           | Descripción                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Inicia el servidor de desarrollo (Vite)  |
| `npm run build`   | Compila la aplicación para producción    |
| `npm run preview` | Previsualiza la compilación de producción|
| `npm run lint`    | Ejecuta el linter (ESLint)               |
