/**
 * Catálogo de Microcredenciales - Vista Estudiante
 * Diseño renovado con stats, búsqueda y drawer lateral
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import { MicrocredentialCard, MicrocredentialDetailDrawer } from '@/components/microcredential';
import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconAward, IconSearch, IconFilter } from '@tabler/icons-react';

export default function MicrocredentialsCatalogPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [microcredentials, setMicrocredentials] = useState<MicrocredentialWithCourses[]>([]);
    const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [hasAutoOpened, setHasAutoOpened] = useState(false);

    // Estado para el drawer de detalles
    const [selectedMicrocredential, setSelectedMicrocredential] = useState<MicrocredentialWithCourses | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar microcredenciales publicadas
                const res = await fetch('/api/microcredentials');
                if (res.ok) {
                    const data = await res.json();
                    setMicrocredentials(data.microcredentials || []);
                }

                // Cargar inscripciones del estudiante
                if (user) {
                    const enrollRes = await fetch('/api/student/my-credentials');
                    if (enrollRes.ok) {
                        const enrollData = await enrollRes.json();
                        const ids = new Set<string>(
                            (enrollData.enrollments || []).map((e: any) => e.microcredentialId)
                        );
                        setEnrolledIds(ids);
                    }
                }
            } catch (error) {
                console.error('Error loading microcredentials:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    // Efecto para abrir automáticamente el drawer si viene el parámetro openMc
    useEffect(() => {
        if (hasAutoOpened || loading || microcredentials.length === 0) return;

        const openMcParam = searchParams.get('openMc');
        if (openMcParam) {
            // Buscar por slug o por id
            const mcToOpen = microcredentials.find(
                mc => mc.slug === openMcParam || mc.id === openMcParam
            );

            if (mcToOpen) {
                setSelectedMicrocredential(mcToOpen);
                setIsDrawerOpen(true);
                setHasAutoOpened(true);

                // Limpiar el parámetro de la URL sin recargar la página
                const url = new URL(window.location.href);
                url.searchParams.delete('openMc');
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, [searchParams, microcredentials, loading, hasAutoOpened]);

    // Filtrar microcredenciales
    const filteredMicrocredentials = microcredentials.filter(mc => {
        // Filtro de búsqueda
        const matchesSearch = mc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mc.description?.toLowerCase().includes(searchTerm.toLowerCase());

        // Filtro de precio
        const matchesFilter =
            filter === 'all' ||
            (filter === 'free' && mc.isFree) ||
            (filter === 'paid' && !mc.isFree);

        return matchesSearch && matchesFilter;
    });

    // Stats
    const totalAvailable = microcredentials.length;
    const freeCount = microcredentials.filter(m => m.isFree).length;
    const enrolledCount = enrolledIds.size;

    // Manejar click en tarjeta
    const handleCardClick = (mc: MicrocredentialWithCourses) => {
        setSelectedMicrocredential(mc);
        setIsDrawerOpen(true);
    };

    // Cerrar drawer
    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        // Pequeño delay para la animación antes de limpiar
        setTimeout(() => setSelectedMicrocredential(null), 300);
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <IconAward size={28} className="text-gray-800" stroke={2} />
                        <h1 className="text-2xl font-bold text-gray-900">Microcredenciales</h1>
                    </div>
                    <p className="text-gray-600 text-sm">
                        Programas de formación que combinan dos cursos para una certificación completa
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {/* Total Disponibles */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 font-medium mb-1">Total Disponibles</p>
                        <p className="text-3xl font-bold text-gray-900">{totalAvailable}</p>
                    </div>

                    {/* Gratuitas */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 font-medium mb-1">Gratuitas</p>
                        <p className="text-3xl font-bold text-teal-600">{freeCount}</p>
                    </div>

                    {/* Mis Inscripciones */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 font-medium mb-1">Mis Inscripciones</p>
                        <p className="text-3xl font-bold text-teal-600">{enrolledCount}</p>
                    </div>
                </div>

                {/* Búsqueda y Filtros */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {/* Campo de búsqueda */}
                    <div className="flex-1 relative">
                        <IconSearch
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Buscar microcredenciales..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filtro dropdown */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-500">
                            <IconFilter size={18} />
                            <span className="text-sm font-medium">Filtro</span>
                        </div>
                        <select
                            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer min-w-[120px]"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as 'all' | 'free' | 'paid')}
                        >
                            <option value="all">Todas</option>
                            <option value="free">Gratuitas</option>
                            <option value="paid">De Pago</option>
                        </select>
                    </div>
                </div>

                {/* Grid de Microcredenciales */}
                {filteredMicrocredentials.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-center py-16 px-6">
                            <div className="text-teal-600 mb-4 flex justify-center">
                                <IconAward size={64} stroke={1.5} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                {searchTerm || filter !== 'all'
                                    ? 'No se encontraron microcredenciales'
                                    : 'Próximamente'}
                            </h2>
                            <p className="text-gray-500">
                                {searchTerm || filter !== 'all'
                                    ? 'Intenta con otros términos de búsqueda o filtros'
                                    : 'Estamos preparando nuevas microcredenciales para ti'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMicrocredentials.map((mc) => (
                            <MicrocredentialCard
                                key={mc.id}
                                microcredential={mc}
                                isEnrolled={enrolledIds.has(mc.id)}
                                onClick={() => handleCardClick(mc)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Drawer de Detalles */}
            <MicrocredentialDetailDrawer
                microcredential={selectedMicrocredential}
                isEnrolled={selectedMicrocredential ? enrolledIds.has(selectedMicrocredential.id) : false}
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
            />
        </div>
    );
}
