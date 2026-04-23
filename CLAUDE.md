@AGENTS.md

# Claude Project Rules - Next.js Migration

## Tech Stack
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Database/ORM: Prisma
- Auth: JWT / NextAuth

## Coding Standards
- Use Functional Components and Hooks.
- Favor Server Components for data fetching.
- Use 'use client' only when strictly necessary for interactivity.
- Follow a modular structure in `src/components`.

## Context & Constraints
- We are migrating a project from Base44. 
- Avoid using complex external libraries if a custom Tailwind component suffices.
- Maintain clean, readable code with comments in Spanish.