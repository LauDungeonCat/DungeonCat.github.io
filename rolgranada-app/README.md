# Prácticas de React

## Introducción

Para aprender React, dediqué un día a investigar la mejor forma de aprenderlo. Un día dedicado a hacer las cosas bien es mejor que 3 meses haciendo las cosas mal.
*“Si tuviera seis horas para talar un árbol, pasaría las cuatro primeras afilando el hacha” - Desconocido*

Esto me ayudó mucho ya que mi primer impulso fue buscar un curso para tener un título en mi curriculum.
Pero todo el mundo decía lo mismo: 

- Es mejor la documentación oficial.
- No necesitas un título, necesitas demostrar que sabes React.
- Es mejor tener un buen portfolio de proyectos

No es lo mismo ver una plantilla de Canva que ponga "sé de React" que ver una página web bien diseñada como curriculum.

Los primeros pasos fue ir paso por paso navegando la documentación oficial hasta que tenía suficiente base para empezar a hacer proyectos.
Se aprende más haciendo proyectos igualmente, ya iría aprendiendo cosas específicas conforme me hicieran falta.

## Proyectos

Tenía muchas ideas para proyectos futuros, pero quería ir subiendo la dificultad poco a poco hasta acabar con una aplicación completa.
Dado mi interés en los juegos de rol y el querer como gran projecto hacer una web para gestionarlos, empecé con una herramienta de apoyo.

### Generador de Encuentros

Para empezar quería hacer la app "pensando en React", pero antes del desarrollo, va el **Diseño.**
Así que abrí Figma y empecé a "componer" una idea limpia y bonita para una interfaz.

Boceto en Figma:

![1790234382460](image/README/1790234382460.png)

Ahora sí podía empezar con la programación. Primero, tenía que implementar la web estática, sin estilos ni nada, simplemente estructura.

![1790234501416](image/README/1790234501416.png)

Luego aplicar los estilos para replicar el boceto de Figma y finalmente añadir toda la funcionalidad mediante hooks.

![1790234577218](image/README/1790234577218.png)

Esto marca el fin del primer proyecto. Lo siguiente es crear una forma de acceder a todos los que vaya haciendo, lo más apropiado y que quería saber era hacer una cabecera común con el estilo de la comunidad de rol.

### Cabecera

## Rol Granada y Supabase

El cliente usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde `rolgranada-app/.env.local`. En GitHub Pages, configura esas variables en el entorno de build; la aplicación usa la base `/rolgranada/` para el callback OAuth.

Después de crear las tablas `profiles`, `partidas` (incluyendo `notas_dm`), `partida_participantes`, `disponibilidades` y `sesiones` con el esquema acordado, ejecuta `supabase/rls.sql` en el SQL Editor de Supabase. El script configura RLS, crea perfiles para usuarios OAuth nuevos y existentes, define los RPC públicos/privados y solicita recargar el caché de esquema PostgREST. Si el panel conserva un error de RPC, vuelve a cargar la página tras ejecutar el script.

La navegación y consulta del catálogo son anónimas. Google OAuth solo se solicita al crear/unirse a una campaña o al guardar disponibilidad; la vista de agendamiento se descarga al abrirla como DM.

En Authentication, habilita Google y permite estas URLs de redirección:

- `http://localhost:5173/rolgranada/`
- `https://dungeoncat.site/rolgranada/`

Configura en Google el URI de callback que indica el panel de Supabase. Para asignar `admin`, cambia `profiles.role` desde el SQL Editor; la aplicación no permite que cada usuario eleve su propio rol.

## Rol Granada en Supabase

Rol Granada lee el proyecto, los perfiles y la disponibilidad desde Supabase. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `rolgranada-app/.env.local` para desarrollo; en GitHub Pages, define las mismas variables durante el build.

Antes de iniciar sesión, ejecuta `supabase/rls.sql` en el SQL Editor del proyecto Supabase, después de crear las cuatro tablas indicadas por la aplicación. El script activa RLS, crea/perfila usuarios de Auth y añade los RPC que validan inscripciones y ocultan la ubicación exacta a quien no tenga permiso.

En Supabase Authentication, habilita Google y añade estas URLs a la lista de redirecciones permitidas:

- `http://localhost:5173/rolgranada/`
- `https://dungeoncat.site/rolgranada/`

Configura también el URI de callback de Supabase que muestra el panel del proveedor Google. Para conceder administración, actualiza `profiles.role` a `admin` para el UUID correspondiente desde el SQL Editor; los usuarios no pueden cambiar su propio rol desde la aplicación.
