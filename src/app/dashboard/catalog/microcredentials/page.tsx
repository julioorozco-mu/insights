/**
 * Catálogo de Microcredenciales - Vista Estudiante
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import { MicrocredentialCard } from '@/components/microcredential';
import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconAward, IconSearch, IconFilter, IconSparkles } from '@tabler/icons-react';

export default function MicrocredentialsCatalogPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [microcredentials, setMicrocredentials] = useState<MicrocredentialWithCourses[]>([]);
    const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');

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

    // Separar destacadas
    const featuredMicrocredentials = filteredMicrocredentials.filter(mc => mc.featured);
    const regularMicrocredentials = filteredMicrocredentials.filter(mc => !mc.featured);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="container mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <IconAward size={32} className="text-primary" />
                    <h1 className="text-3xl font-bold">Microcredenciales</h1>
                </div>
                <p className="text-base-content/70">
                    Programas de formación que combinan dos cursos para una certificación completa
                </p>
            </div>

            {/* Filtros y búsqueda */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Búsqueda */}
                <div className="form-control flex-1">
                    <div className="input-group">
                        <span className="bg-base-200">
                            <IconSearch size={20} />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar microcredenciales..."
                            className="input input-bordered w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filtro de precio */}
                <div className="flex items-center gap-2">
                    <IconFilter size={20} className="text-base-content/60" />
                    <select
                        className="select select-bordered"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'all' | 'free' | 'paid')}
                    >
                        <option value="all">Todas</option>
                        <option value="free">Gratuitas</option>
                        <option value="paid">De Pago</option>
                    </select>
                </div>
            </div>

            {/* Destacadas */}
            {featuredMicrocredentials.length > 0 && (
                <section className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <IconSparkles size={24} className="text-warning" />
                        <h2 className="text-xl font-bold">Destacadas</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredMicrocredentials.map((mc) => (
                            <MicrocredentialCard
                                key={mc.id}
                                microcredential={mc}
                                isEnrolled={enrolledIds.has(mc.id)}
                                onClick={() => router.push(`/dashboard/catalog/microcredentials/${mc.slug}`)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Todas las microcredenciales */}
            <section>
                {featuredMicrocredentials.length > 0 && regularMicrocredentials.length > 0 && (
                    <h2 className="text-xl font-bold mb-4">Todas las Microcredenciales</h2>
                )}

                {regularMicrocredentials.length === 0 && featuredMicrocredentials.length === 0 ? (
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body text-center py-16">
                            <div className="text-primary mb-4 flex justify-center">
                                <IconAward size={64} stroke={1.5} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">
                                {searchTerm || filter !== 'all'
                                    ? 'No se encontraron microcredenciales'
                                    : 'Próximamente'}
                            </h2>
                            <p className="text-base-content/70">
                                {searchTerm || filter !== 'all'
                                    ? 'Intenta con otros términos de búsqueda o filtros'
                                    : 'Estamos preparando nuevas microcredenciales para ti'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {regularMicrocredentials.map((mc) => (
                            <MicrocredentialCard
                                key={mc.id}
                                microcredential={mc}
                                isEnrolled={enrolledIds.has(mc.id)}
                                onClick={() => router.push(`/dashboard/catalog/microcredentials/${mc.slug}`)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Stats */}
            {microcredentials.length > 0 && (
                <div className="mt-8 stats shadow w-full">
                    <div className="stat">
                        <div className="stat-title">Total Disponibles</div>
                        <div className="stat-value text-primary">{microcredentials.length}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Gratuitas</div>
                        <div className="stat-value text-success">
                            {microcredentials.filter(m => m.isFree).length}
                        </div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Mis Inscripciones</div>
                        <div className="stat-value text-info">{enrolledIds.size}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
