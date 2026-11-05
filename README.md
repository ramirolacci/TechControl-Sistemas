<div align="center">

  <h1>💻 TechControl</h1>
  <h3>Sistema Integral de Gestión y Control de Activos IT</h3>

  <p>
    Una solución web de última generación diseñada para centralizar, auditar y optimizar el ciclo de vida de la infraestructura tecnológica empresarial.
  </p>

  <p>
    <a href="#-módulos-principales"><img src="https://img.shields.io/badge/Estado-Activo-emerald?style=for-the-badge" alt="Estado"></a>
    <a href="#-stack-tecnológico"><img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React"></a>
    <a href="#-stack-tecnológico"><img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="#-stack-tecnológico"><img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
    <a href="#-stack-tecnológico"><img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"></a>
  </p>

</div>

---

## 🌟 Visión General

**TechControl** es una plataforma avanzada de gestión IT que simplifica la administración operativa y la toma de decisiones estratégicas. Permite a los equipos de infraestructura y soporte técnico llevar un control riguroso sobre equipos informáticos, consumibles de impresión, dispositivos de cartelería digital, registros de guardias y presupuestos de compras desde una interfaz unificada, intuitiva y de alto rendimiento.

---

## ✨ Módulos Principales

| Módulo | Descripción |
| :--- | :--- |
| 📊 **Dashboard Ejecutivo** | Métricas e indicadores clave en tiempo real sobre el estado de stock, alertas operativas y consumibles en nivel crítico. |
| 💻 **Equipamiento IT** | Registro detallado de notebooks y estaciones de trabajo, seguimiento de asignaciones, estado funcional y trazabilidad por usuario. |
| 🖨️ **Centro de Impresión** | Monitoreo proactivo de niveles de tóner, unidades de imagen y alertas automáticas de mantenimiento por sucursal. |
| 📺 **DataliveTV (Cartelería Digital)** | Módulo para la organización de credenciales, IDs de dispositivos y accesos universales para pantallas corporativas. |
| 🛡️ **Guardias IT & Tareas Especiales** | Registro operacional de turnos de guardia, tareas extraordinarias, coberturas y cronogramas del personal técnico. |
| 🛒 **Gestión de Pedidos & Compras** | Workflow para la generación, seguimiento y priorización de solicitudes de compra de hardware y suministros. |
| 📈 **Histórico & Auditoría** | Trazabilidad completa de ingresos, egresos y movimientos de activos con reportes exportables para control interno. |

---

## 🎨 Arquitectura Visual & Experiencia de Usuario

TechControl se destaca por un diseño de interfaz nítido y moderno enfocado en la usabilidad profesional:

- 💎 **Diseño Neomórfico & Glassmorphism**: Acabados visuales elegantes con jerarquía cromática optimizada mediante el espacio de color **OKLCH**.
- 🌓 **Soporte Tema Claro / Oscuro**: Adaptación dinámica para maximizar el confort visual en extensas jornadas de trabajo.
- ⚡ **Respuesta Instantánea**: Interacciones fluidas impulsadas por componentes Radix UI accesibles y animaciones optimizadas.

---

## 🚀 Instalación y Puesta en Marcha

Sigue estos pasos para clonar, configurar y ejecutar el proyecto localmente en tu entorno de desarrollo.

### 📋 Requisitos Previos

- **Node.js**: v18.0.0 o superior (recomendado v20+).
- **pnpm**: Gestor de paquetes recomendado (`npm install -g pnpm`).
- **Git**: Para el control de versiones.

---

### ⚙️ Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/TechControl-Sistemas.git
   cd TechControl-Sistemas
   ```

2. **Instalar dependencias con `pnpm`:**
   ```bash
   pnpm install
   ```

3. **Configurar las variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Abre `.env` y completa las credenciales de tu proyecto de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm run dev
   ```
   La aplicación se iniciará en `http://localhost:5173/` (o en la ruta base configurada).

---

### 📦 Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `pnpm run dev` | Inicia el servidor de desarrollo con recarga rápida (HMR). |
| `pnpm run build` | Valida tipos con TypeScript y compila el bundle de producción en `/dist`. |
| `pnpm run typecheck` | Ejecuta la comprobación estática de tipos (`tsc --noEmit`). |
| `pnpm run preview` | Previsualiza localmente la compilación de producción generada en `/dist`. |

---

## 🖼️ Galería de la Interfaz

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_1.png" alt="Dashboard Principal" width="100%" />
        <br />
        <sub><b>01. Dashboard Principal & Métricas Generales</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_2.png" alt="Gestión de Equipamiento" width="100%" />
        <br />
        <sub><b>02. Control de Inventario de Notebooks & PCs</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_3.png" alt="Centro de Impresión" width="100%" />
        <br />
        <sub><b>03. Monitoreo de Impresoras & Tóner</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_4.png" alt="DataliveTV" width="100%" />
        <br />
        <sub><b>04. Módulo de Cartelería Digital (DataliveTV)</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_5.png" alt="Pedidos a Compras" width="100%" />
        <br />
        <sub><b>05. Gestión & Seguimiento de Solicitudes de Compra</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_6.png" alt="Histórico de Movimientos" width="100%" />
        <br />
        <sub><b>06. Auditoría & Registro de Movimientos</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_7.png" alt="Gestión de Personal" width="100%" />
        <br />
        <sub><b>07. Administración de Personal & Asignaciones</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_8.png" alt="Módulo de Guardias IT" width="100%" />
        <br />
        <sub><b>08. Programación & Registro de Guardias IT</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_9.png" alt="Tareas Especiales" width="100%" />
        <br />
        <sub><b>09. Control de Tareas Especiales & Mantenimiento</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_10.png" alt="Gestión de Precios" width="100%" />
        <br />
        <sub><b>10. Cotizaciones & Lista de Precios IT</b></sub>
      </td>
    </tr>
    <tr>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_11.png" alt="Catálogo & Bases de Datos" width="100%" />
        <br />
        <sub><b>11. Catálogo de Productos & Base de Datos</b></sub>
      </td>
      <td width="50%" align="center">
        <img src="./public/screenshots/Screenshot_12.png" alt="Reportes & Analítica" width="100%" />
        <br />
        <sub><b>12. Módulo de Reportes & Exportación</b></sub>
      </td>
    </tr>
  </table>
</div>

---

<div align="center">

  <sub>© 2026 TechControl IT Solutions. Todos los derechos reservados.</sub>

</div>
