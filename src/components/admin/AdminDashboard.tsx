'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Package, 
  UserCheck, 
  Settings,
  ArrowRight 
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activePacks: number;
  staffMembers: number;
  activeEvents: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activePacks: 0,
    staffMembers: 0,
    activeEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const adminModules = [
    {
      title: 'Gestión de Usuarios',
      description: 'Administra usuarios y roles de la plataforma',
      icon: Users,
      path: '/admin/users',
      color: 'from-blue-500 to-blue-600',
      features: ['Crear usuarios', 'Asignar roles', 'Gestionar permisos']
    },
    {
      title: 'Admin Packs',
      description: 'Gestiona los packs de eventos y servicios',
      icon: Package,
      path: '/AdminPacks',
      color: 'from-violet-500 to-purple-600',
      features: ['Crear packs', 'Editar precios', 'Gestionar servicios']
    },
    {
      title: 'Gestión Staff',
      description: 'Administra el personal y equipos de trabajo',
      icon: UserCheck,
      path: '/GestionStaff',
      color: 'from-emerald-500 to-teal-600',
      features: ['Gestionar staff', 'Asignar roles', 'Control de acceso']
    },
    {
      title: 'Configuración',
      description: 'Configuración general de la plataforma',
      icon: Settings,
      path: '/admin/settings',
      color: 'from-slate-500 to-slate-600',
      features: ['Configuración general', 'Integraciones', 'Preferencias']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
          <p className="text-slate-400">Gestiona todos los aspectos de la plataforma TicketNow</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Usuarios Totales</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? '...' : stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Packs Activos</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? '...' : stats.activePacks.toLocaleString()}
                </p>
              </div>
              <Package className="w-8 h-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Staff Members</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? '...' : stats.staffMembers.toLocaleString()}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Eventos Activos</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? '...' : stats.activeEvents.toLocaleString()}
                </p>
              </div>
              <Settings className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {adminModules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card 
              key={module.title}
              className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer group"
              onClick={() => router.push(module.path)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-white group-hover:text-violet-400 transition-colors">
                  {module.title}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-300">Características:</p>
                  <ul className="space-y-1">
                    {module.features.map((feature, index) => (
                      <li key={index} className="text-sm text-slate-400 flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(module.path);
                  }}
                >
                  Acceder a {module.title}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Acciones Rápidas</CardTitle>
          <CardDescription className="text-slate-400">
            Accesos directos a las tareas más comunes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              onClick={() => router.push('/admin/users?action=create')}
            >
              <Users className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
            <Button 
              variant="outline" 
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              onClick={() => router.push('/AdminPacks?action=create')}
            >
              <Package className="w-4 h-4 mr-2" />
              Nuevo Pack
            </Button>
            <Button 
              variant="outline" 
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              onClick={() => router.push('/GestionStaff?action=create')}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Nuevo Staff
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
