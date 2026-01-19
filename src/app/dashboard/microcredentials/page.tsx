/**
 * Gestión de Microcredenciales - Panel Admin
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import { MicrocredentialWithCourses } from '@/types/microcredential';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconEye,
    IconEyeOff,
    IconAward,
    IconSearch,
} from '@tabler/icons-react';
import Link from 'next/link';

export default function AdminMicrocredentialsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [microcredentials, setMicrocredentials] = useState<MicrocredentialWithCourses[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Verificar si es admin
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        // Esperar a que cargue la autenticación
        if (authLoading) return;

        // Si no es admin, redirigir
        if (!isAdmin) {
            router.push('/dashboard');
            return;
        }

        const loadData = async () => {
            try {
                const res = await fetch('/api/microcredentials?all=true');
                if (res.ok) {
                    const data = await res.json();
                    setMicrocredentials(data.microcredentials || []);
                }
            } catch (error) {
                console.error('Error loading microcredentials:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isAdmin, authLoading, router]);

    const handleTogglePublish = async (mc: MicrocredentialWithCourses) => {
        setActionLoading(mc.id);
        try {
            const res = await fetch(`/api/microcredentials/${mc.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !mc.isPublished }),
            });

            if (res.ok) {
                setMicrocredentials(prev =>
                    prev.map(m =>
                        m.id === mc.id ? { ...m, isPublished: !m.isPublished } : m
                    )
                );
            }
        } catch (error) {
            console.error('Error toggling publish:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (mc: MicrocredentialWithCourses) => {
        if (!confirm(`¿Estás seguro de desactivar "${mc.title}"?`)) return;

        setActionLoading(mc.id);
        try {
            const res = await fetch(`/api/microcredentials/${mc.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setMicrocredentials(prev => prev.filter(m => m.id !== mc.id));
            }
        } catch (error) {
            console.error('Error deleting:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredMicrocredentials = microcredentials.filter(mc =>
        mc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="container mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <IconAward size={32} className="text-primary" />
                        <h1 className="text-3xl font-bold">Gestión de Microcredenciales</h1>
                    </div>
                    <p className="text-base-content/70">
                        Administra las microcredenciales de la plataforma
                    </p>
                </div>
                <Link
                    href="/dashboard/microcredentials/new"
                    className="btn btn-primary gap-2"
                >
                    <IconPlus size={20} />
                    Nueva Microcredencial
                </Link>
            </div>

            {/* Búsqueda */}
            <div className="form-control mb-6">
                <div className="input-group">
                    <span className="bg-base-200">
                        <IconSearch size={20} />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por título..."
                        className="input input-bordered w-full max-w-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="stats shadow mb-6">
                <div className="stat">
                    <div className="stat-title">Total</div>
                    <div className="stat-value text-primary">{microcredentials.length}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Publicadas</div>
                    <div className="stat-value text-success">
                        {microcredentials.filter(m => m.isPublished).length}
                    </div>
                </div>
                <div className="stat">
                    <div className="stat-title">Borradores</div>
                    <div className="stat-value text-warning">
                        {microcredentials.filter(m => !m.isPublished).length}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card bg-base-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Insignia</th>
                                <th>Título</th>
                                <th>Cursos</th>
                                <th>Precio</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMicrocredentials.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8">
                                        <IconAward size={48} className="mx-auto text-base-content/30 mb-2" />
                                        <p className="text-base-content/60">
                                            {searchTerm
                                                ? 'No se encontraron resultados'
                                                : 'No hay microcredenciales creadas'}
                                        </p>
                                        {!searchTerm && (
                                            <Link
                                                href="/dashboard/microcredentials/new"
                                                className="btn btn-primary btn-sm mt-4"
                                            >
                                                Crear primera microcredencial
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredMicrocredentials.map((mc) => (
                                    <tr key={mc.id} className="hover">
                                        <td>
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
                                                {mc.badgeImageUrl ? (
                                                    <img
                                                        src={mc.badgeImageUrl}
                                                        alt={mc.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <IconAward size={24} className="text-primary" />
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <p className="font-medium">{mc.title}</p>
                                                <p className="text-xs text-base-content/60">/{mc.slug}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                <p className="truncate max-w-[200px]">
                                                    N1: {mc.courseLevel1?.title || 'No asignado'}
                                                </p>
                                                <p className="truncate max-w-[200px] text-base-content/60">
                                                    N2: {mc.courseLevel2?.title || 'No asignado'}
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            {mc.isFree ? (
                                                <span className="badge badge-success">Gratis</span>
                                            ) : (
                                                <span className="font-medium">${mc.price}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${mc.isPublished ? 'badge-success' : 'badge-warning'
                                                    }`}
                                            >
                                                {mc.isPublished ? 'Publicada' : 'Borrador'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleTogglePublish(mc)}
                                                    className="btn btn-ghost btn-sm"
                                                    disabled={actionLoading === mc.id}
                                                    title={mc.isPublished ? 'Despublicar' : 'Publicar'}
                                                >
                                                    {mc.isPublished ? (
                                                        <IconEyeOff size={18} />
                                                    ) : (
                                                        <IconEye size={18} />
                                                    )}
                                                </button>
                                                <Link
                                                    href={`/dashboard/microcredentials/${mc.id}/edit`}
                                                    className="btn btn-ghost btn-sm"
                                                    title="Editar"
                                                >
                                                    <IconEdit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(mc)}
                                                    className="btn btn-ghost btn-sm text-error"
                                                    disabled={actionLoading === mc.id}
                                                    title="Eliminar"
                                                >
                                                    <IconTrash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
