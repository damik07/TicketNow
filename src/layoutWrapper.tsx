'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPageUrl } from "@/utils";
import Image from 'next/image';

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Ticket,
  LogOut,
  LayoutDashboard,
  CalendarPlus,
  Users,
  ChevronDown,
  Zap,
  Landmark,
  Utensils,
  UserCog,
  Package,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";

const PUBLIC_PAGES = ["Home", "Nosotros", "FAQ", "Contacto"] as const;
const LANDING_LABELS = {
  Home: "Eventos",
  Nosotros: "Nosotros",
  FAQ: "FAQ",
  Contacto: "Contacto"
};

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // 👈 2. Obtenés la ruta actual (ej: "/MisEntradas")
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 👈 3. Mapeás el pathname actual con tus PUBLIC_PAGES
  // Si estás en "/MisEntradas", tu variable "currentPageName" pasará a ser "MisEntradas"
  const currentPageName = pathname.replace(/^\//, "") || "Home";

  const isProducer = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isPlainUser = user?.role === "USER";

  return (

    // CONTENEDOR PRINCIPAL: flex-col y min-h-screen aseguran que el footer se vaya abajo
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-white">

      {/* Navbar - Fixed no ocupa espacio en el flujo */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50 shadow-2xl" : "bg-transparent"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo en Navbar */}
            <Link href="/" className="flex items-center group">
              <Image
                src="/logo-ticketnow-para-web.png" // Cambia esta ruta si lo guardaste en public/images/logo-ticketnow-para-web.svg
                alt={APP_NAME}
                width={180}
                height={48}
                priority // Carga inmediata sin delay al ser el elemento principal arriba
                className="h-8 md:h-9 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {isAuthenticated && isPlainUser && (
                <Link
                  href={createPageUrl("SerOrganizador")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-violet-400 hover:text-violet-300 hover:bg-violet-500/5"
                >
                  Ser Organizador
                </Link>
              )}
              {PUBLIC_PAGES.map((page) => (
                <Link
                  key={page}
                  href={createPageUrl(page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPageName === page
                    ? "text-white bg-white/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  {LANDING_LABELS[page]}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <>
                      <Link href="/admin">
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 gap-2">
                          <Users className="w-4 h-4" />
                          Admin
                        </Button>
                      </Link>
                      <Link href="/AdminPacks">
                        <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 gap-2">
                          <Package className="w-4 h-4" />
                          Packs
                        </Button>
                      </Link>
                    </>
                  )}
                  {isProducer && (
                    <>
                      <Link href={createPageUrl("CrearEvento")}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
                          <CalendarPlus className="w-4 h-4" />
                          Crear Evento
                        </Button>
                      </Link>
                      <Link href={createPageUrl("DashboardVentas")}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link href={createPageUrl("GestionStaff")}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
                          <UserCog className="w-4 h-4" />
                          Staff
                        </Button>
                      </Link>
                    </>
                  )}
                  <Link href={createPageUrl("MisEntradas")}>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
                      <Ticket className="w-4 h-4" />
                      Mis Entradas
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-slate-300">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          {user.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <span className="max-w-[100px] truncate">{user.full_name || "Usuario"}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-white">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href={createPageUrl("MisCuentas")} className="gap-2 cursor-pointer">
                          <Landmark className="w-4 h-4" /> Mis Cuentas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={createPageUrl("MisConsumiciones")} className="gap-2 cursor-pointer">
                          <Utensils className="w-4 h-4" /> Mis Consumiciones
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-800" />
                      <DropdownMenuItem onClick={() => logout()} className="gap-2 text-red-400 cursor-pointer">
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <Link href="/Login">Ingresar</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Toggle */}
            <button className="lg:hidden p-2 text-slate-400" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-slate-950 border-t border-slate-800">
            <div className="p-4 space-y-1">
              {isAuthenticated && isPlainUser && (
                <Link
                  href={createPageUrl("SerOrganizador")}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-violet-400 font-medium"
                >
                  Ser Organizador
                </Link>
              )}
              {PUBLIC_PAGES.map((page) => (
                <Link
                  key={page}
                  href={createPageUrl(page)}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-slate-400"
                >
                  {LANDING_LABELS[page]}
                </Link>
              ))}
              {isAuthenticated && user ? (
                <div className="mt-3 space-y-1 border-t border-slate-800 pt-3">
                  {isAdmin && (
                    <>
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-red-400 font-medium">
                        <Users className="w-4 h-4 shrink-0" /> Panel Admin
                      </Link>
                      <Link href="/AdminPacks" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-amber-400 font-medium">
                        <Package className="w-4 h-4 shrink-0" /> Admin Packs
                      </Link>
                    </>
                  )}
                  {isProducer && (
                    <>
                      <Link href={createPageUrl("CrearEvento")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-300">
                        <CalendarPlus className="w-4 h-4 shrink-0" /> Crear Evento
                      </Link>
                      <Link href={createPageUrl("DashboardVentas")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-300">
                        <LayoutDashboard className="w-4 h-4 shrink-0" /> Dashboard
                      </Link>
                      <Link href={createPageUrl("GestionStaff")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-300">
                        <UserCog className="w-4 h-4 shrink-0" /> Gestión Staff
                      </Link>
                    </>
                  )}
                  <Link href={createPageUrl("MisEntradas")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-300">
                    <Ticket className="w-4 h-4 shrink-0" /> Mis Entradas
                  </Link>
                  <Link href={createPageUrl("MisCuentas")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-300">
                    <Landmark className="w-4 h-4 shrink-0" /> Mis Cuentas
                  </Link>
                  <Link href={createPageUrl("MisConsumiciones")} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-slate-300">
                    <Utensils className="w-4 h-4 shrink-0" /> Mis Consumiciones
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-red-400"
                  >
                    <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="mt-3 border-t border-slate-800 pt-3 px-4">
                  <Button asChild variant="outline" className="w-full border-slate-700 text-slate-300">
                    <Link href="/Login" onClick={() => setMobileOpen(false)}>Ingresar</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* MAIN: flex-1 hace que ocupe todo el espacio sobrante */}
      <main className="flex-1 pt-16 lg:pt-20">
        {children}
      </main>

      {/* FOOTER: Siempre al final gracias al flex-col del padre */}
      <footer className="w-full border-t border-slate-800/50 bg-slate-950 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              {/* Logo en Footer */}
              <div className="flex items-center mb-4">
                <Image
                  src="/logo-ticketnow-para-web.png"
                  alt={APP_NAME}
                  width={160}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-slate-500">
                La plataforma para los mejores eventos.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Navegación</h4>
              <div className="space-y-2">
                {PUBLIC_PAGES.map((page) => (
                  <Link key={page} href={createPageUrl(page)}
                    className="block text-sm text-slate-500 hover:text-violet-400 transition-colors">
                    {LANDING_LABELS[page]}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Para Organizadores</h4>
              <div className="space-y-2">
                <Link href={createPageUrl("SerOrganizador")} className="block text-sm text-slate-500 hover:text-violet-400 transition-colors">Ser Organizador</Link>
                <Link href={createPageUrl("CrearEvento")} className="block text-sm text-slate-500 hover:text-violet-400 transition-colors">Crear Evento</Link>
                <Link href={createPageUrl("DashboardVentas")} className="block text-sm text-slate-500 hover:text-violet-400 transition-colors">Dashboard</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Soporte</h4>
              <div className="space-y-2">
                <Link href={createPageUrl("FAQ")} className="block text-sm text-slate-500 hover:text-violet-400 transition-colors">Preguntas Frecuentes</Link>
                <Link href={createPageUrl("Contacto")} className="block text-sm text-slate-500 hover:text-violet-400 transition-colors">Contacto</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800/50 mt-10 pt-8 text-center">
            <p className="text-xs text-slate-600">© 2026 {APP_NAME}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}