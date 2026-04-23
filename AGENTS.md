<!-- BEGIN:nextjs-agent-rules -->
# Agent Context: Base44 Migration Project

## Project Overview
Este proyecto es la reconstrucción local de una aplicación diseñada originalmente en Base44. El objetivo es ganar autonomía técnica, integrar una base de datos propia mediante Prisma y gestionar el despliegue en Vercel.

## Current Status
- [x] Initial Next.js scaffold (App Router).
- [ ] Folder structure organization (Moving to `src/` if needed).
- [ ] UI Migration: Copying components from Base44 preview/editor.
- [ ] Database setup with Prisma.

## Key Instructions for Agents
1. **Refactoring:** Al recibir código extraído de Base44, ayuda a limpiarlo, tiparlo con TypeScript y adaptarlo a la estructura de App Router.
2. **Prisma Integration:** Ayuda a definir el `schema.prisma` basado en la lógica de datos que tenía la app original.
3. **Styling:** Asegurar que las clases de Tailwind coincidan con el diseño visual de la preview de Base44.
4. Considerar que se duplicó el layout por formato de escritura, pero deseo que sólo quede uno.
5. El manejo de integraciones las voy a hacer desde un archivo .env

<!-- END:nextjs-agent-rules -->
