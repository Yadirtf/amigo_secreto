# Amigo secreto — Ficha de proyecto

Nov 26, 2026 · @Ing. Yadir

App para organizar el amigo secreto de diciembre sin papelitos ni enredos: sorteo justo, lista de deseos, pistas anónimas y revelación final. Meta: publicada en 2–3 semanas, antes de la segunda semana de diciembre.

## Concepto y problema

- **Problema:** el sorteo en papel falla (alguien se saca a sí mismo, se pierde el papel, nadie sabe qué regalar) y organizar por WhatsApp es un caos.
- **Solución:** un grupo con código de invitación, sorteo automático con reglas, lista de deseos por persona y mensajes anónimos.
- **Usuarios:** trabajos, familias, salones de clase, grupos de amigos. Edad: 12 a 70 años.
- **Diferencial:** pensada para la costumbre colombiana: amigo secreto con "dulce abrigo" (detallitos diarios), presupuesto en pesos, revelación animada para la fiesta.

## Funciones

**Versión 1 (MVP)**

1. Crear grupo: nombre, fecha de entrega, presupuesto, foto.
2. Invitar por enlace o código (WhatsApp).
3. Sorteo automático con exclusiones (parejas, personas de la misma casa).
4. Cada quien ve solo a quién le tocó.
5. Lista de deseos con ideas, tallas y enlaces.
6. Chat anónimo: hacer preguntas a tu amigo secreto sin revelar quién eres.
7. Recordatorios: cuenta regresiva y aviso de fecha de entrega.

**Versión 2**

- Modo dulce abrigo: calendario de detallitos diarios con recordatorio.
- Pistas programadas ("Tu amigo secreto usa gafas").
- Revelación final animada para proyectar en la fiesta.
- Ideas de regalo por presupuesto y gustos.
- Grupos recurrentes ("Amigo secreto de la oficina 2027" reutiliza los miembros).

## Ciclo de uso y viralidad

1. Un organizador crea el grupo.
2. Comparte el enlace y cada miembro debe instalar la app para participar.
3. Durante el mes todos vuelven a ver pistas, mensajes y la lista de deseos.
4. En la fiesta, la revelación se proyecta: los invitados de otros grupos la ven y la quieren para el suyo.

Cada organizador trae entre 10 y 30 instalaciones.

## Modelo de negocio

| Fuente | Detalle |
| --- | --- |
| Gratis | Grupos de hasta 10 personas con todas las funciones básicas |
| Grupo Premium (pago único por grupo) | Más de 10 personas, revelación animada, temas visuales, dulce abrigo |
| Enlaces de afiliado (v2) | Ideas de regalo enlazadas a tiendas en línea con programa de afiliados |
| Anuncios | No en v1; como máximo un recompensado opcional para desbloquear un tema |

El precio del Premium se define probando; la referencia es un valor menor que el de un regalo pequeño.

## Pantallas principales

- Bienvenida e inicio de sesión (Google o número de teléfono)
- Mis grupos
- Crear grupo / Unirse con código
- Detalle del grupo (miembros, fecha, presupuesto, estado del sorteo)
- Mi amigo secreto (su lista de deseos + chat anónimo)
- Mi lista de deseos
- Revelación

## Datos (entidades)

- **Usuario:** id, nombre, foto, teléfono o correo
- **Grupo:** id, nombre, organizador, fecha, presupuesto, código, estado, premium
- **Miembro:** grupo, usuario, exclusiones
- **Asignación:** grupo, quien regala, quien recibe (visible solo al que regala)
- **Deseo:** usuario, grupo, texto, enlace, talla
- **Mensaje anónimo:** asignación, dirección, texto, fecha

## Base técnica

- Necesita internet (es social), pero con bajo consumo de datos: texto, imágenes pequeñas.
- Backend: Firebase (Auth, Firestore, Cloud Messaging, Cloud Functions para el sorteo, así nadie puede ver ni manipular las asignaciones).
- Enlaces de invitación con App Links hacia la ficha de Play Store.

## Riesgos

- **Temporada corta:** si no sale antes de la segunda semana de diciembre, se pierde el año.
- **Privacidad del sorteo:** el organizador no debe poder ver las asignaciones; el sorteo corre en el servidor.
- **Testers de Play Console:** si la cuenta es personal, la prueba cerrada obligatoria puede retrasar la salida; iniciar la prueba cuanto antes.

## Métricas

- Miembros promedio por grupo
- Porcentaje de invitados que sí instalan
- Grupos que compran Premium
- Organizadores que crean un segundo grupo

## Plan

| Semana | Entregable |
| --- | --- |
| 1 | Autenticación, crear y unirse a grupos, invitación por enlace |
| 2 | Sorteo con exclusiones, lista de deseos, chat anónimo, notificaciones |
| 3 | Pulido visual, ficha de Play Store, prueba cerrada y publicación |
