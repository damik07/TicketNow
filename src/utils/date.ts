// utils/date.ts

/**
 * 1. USAR EN FORMULARIOS
 * Convierte el string plano de un <input type="datetime-local"> 
 * a un objeto Date interpretado como hora local.
 */
export const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // Tu lógica original que resuelve el guardado del formulario
  return dateStr.endsWith('Z') ? new Date(dateStr) : new Date(`${dateStr}Z`);
};

/**
 * 2. USAR EN RENDERIZADO / VISUALIZACIÓN (Slider, Cards, Detalles)
 * Toma el string ISO con 'Z' que devuelve Prisma/API y evita que 
 * el navegador reste las 3 horas de Argentina al mostrarlo.
 */
export const displayLocalDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Le quitamos la 'Z' para que el navegador no intente convertir husos horarios
  const cleanStr = dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr;
  const dateObj = new Date(cleanStr);
  
  return isNaN(dateObj.getTime()) ? null : dateObj;
};