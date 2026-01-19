/**
 * Crear Nueva Microcredencial - Panel Admin
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import { Course } from '@/types/course';
import { IconArrowLeft, IconAward, IconUpload, IconCheck } from '@tabler/icons-react';
import Link from 'next/link';

export default function NewMicrocredentialPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [badgeImageUrl, setBadgeImageUrl] = useState('');
    const [badgeColor, setBadgeColor] = useState('#192170');
    const [courseLevel1Id, setCourseLevel1Id] = useState('');
    const [courseLevel2Id, setCourseLevel2Id] = useState('');
    const [isFree, setIsFree] = useState(true);
    const [price, setPrice] = useState(0);
    const [isPublished, setIsPublished] = useState(false);
    const [featured, setFeatured] = useState(false);

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

        const loadCourses = async () => {
            try {
                const res = await fetch('/api/admin/getCourses');
                if (res.ok) {
                    const data = await res.json();
                    setCourses(data.courses || []);
                }
            } catch (error) {
                console.error('Error loading courses:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCourses();
    }, [isAdmin, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validaciones
        if (!title.trim()) {
            setError('El título es requerido');
            return;
        }
        if (!badgeImageUrl.trim()) {
            setError('La imagen de la insignia es requerida');
            return;
        }
        if (!courseLevel1Id) {
            setError('Selecciona el curso de Nivel 1');
            return;
        }
        if (!courseLevel2Id) {
            setError('Selecciona el curso de Nivel 2');
            return;
        }
        if (courseLevel1Id === courseLevel2Id) {
            setError('Nivel 1 y Nivel 2 deben ser cursos diferentes');
            return;
        }

        setSaving(true);

        try {
            const res = await fetch('/api/microcredentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    shortDescription,
                    badgeImageUrl,
                    badgeColor,
                    courseLevel1Id,
                    courseLevel2Id,
                    isFree,
                    price: isFree ? 0 : price,
                    isPublished,
                    featured,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al crear microcredencial');
            }

            alert('¡Microcredencial creada exitosamente!');
            router.push('/dashboard/microcredentials');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="container mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/microcredentials"
                    className="btn btn-ghost btn-sm gap-2 mb-4"
                >
                    <IconArrowLeft size={18} />
                    Volver
                </Link>
                <div className="flex items-center gap-3">
                    <IconAward size={32} className="text-primary" />
                    <h1 className="text-3xl font-bold">Nueva Microcredencial</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Error */}
                {error && (
                    <div className="alert alert-error mb-6">
                        <span>{error}</span>
                    </div>
                )}

                {/* Datos básicos */}
                <div className="card bg-base-100 shadow-xl mb-6">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Información Básica</h2>

                        <div className="form-control mb-4">
                            <label className="label">
                                <span className="label-text font-medium">Título *</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Cultura de la Democracia"
                                className="input input-bordered"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-control mb-4">
                            <label className="label">
                                <span className="label-text font-medium">Descripción Corta</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Breve descripción para las tarjetas"
                                className="input input-bordered"
                                value={shortDescription}
                                onChange={(e) => setShortDescription(e.target.value)}
                                maxLength={500}
                            />
                        </div>

                        <div className="form-control mb-4">
                            <label className="label">
                                <span className="label-text font-medium">Descripción Completa</span>
                            </label>
                            <textarea
                                placeholder="Descripción detallada de la microcredencial"
                                className="textarea textarea-bordered h-24"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Insignia */}
                <div className="card bg-base-100 shadow-xl mb-6">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Insignia</h2>

                        <div className="form-control mb-4">
                            <label className="label">
                                <span className="label-text font-medium">URL de Imagen *</span>
                            </label>
                            <input
                                type="url"
                                placeholder="https://ejemplo.com/insignia.png"
                                className="input input-bordered"
                                value={badgeImageUrl}
                                onChange={(e) => setBadgeImageUrl(e.target.value)}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Imagen cuadrada recomendada (mínimo 256x256px)
                                </span>
                            </label>
                        </div>

                        {badgeImageUrl && (
                            <div className="flex justify-center mb-4">
                                <div
                                    className="w-32 h-32 rounded-full p-1 shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}80)`,
                                    }}
                                >
                                    <div className="w-full h-full rounded-full overflow-hidden bg-white">
                                        <img
                                            src={badgeImageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-contain p-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Color Temático</span>
                            </label>
                            <input
                                type="color"
                                className="w-20 h-10 cursor-pointer"
                                value={badgeColor}
                                onChange={(e) => setBadgeColor(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Cursos */}
                <div className="card bg-base-100 shadow-xl mb-6">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Cursos Asociados</h2>

                        <div className="form-control mb-4">
                            <label className="label">
                                <span className="label-text font-medium">Nivel 1 (Curso Base) *</span>
                            </label>
                            <select
                                className="select select-bordered"
                                value={courseLevel1Id}
                                onChange={(e) => setCourseLevel1Id(e.target.value)}
                                required
                            >
                                <option value="">Selecciona un curso</option>
                                {courses.map((course) => (
                                    <option
                                        key={course.id}
                                        value={course.id}
                                        disabled={course.id === courseLevel2Id}
                                    >
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Nivel 2 (Curso Avanzado) *</span>
                            </label>
                            <select
                                className="select select-bordered"
                                value={courseLevel2Id}
                                onChange={(e) => setCourseLevel2Id(e.target.value)}
                                required
                            >
                                <option value="">Selecciona un curso</option>
                                {courses.map((course) => (
                                    <option
                                        key={course.id}
                                        value={course.id}
                                        disabled={course.id === courseLevel1Id}
                                    >
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                            <label className="label">
                                <span className="label-text-alt">
                                    El estudiante debe completar Nivel 1 antes de acceder a Nivel 2
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Precio */}
                <div className="card bg-base-100 shadow-xl mb-6">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Precio</h2>

                        <div className="form-control mb-4">
                            <label className="label cursor-pointer justify-start gap-4">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-success"
                                    checked={isFree}
                                    onChange={(e) => setIsFree(e.target.checked)}
                                />
                                <span className="label-text">Microcredencial Gratuita</span>
                            </label>
                        </div>

                        {!isFree && (
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">Precio (MXN)</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input input-bordered w-48"
                                    value={price}
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Publicación */}
                <div className="card bg-base-100 shadow-xl mb-6">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Publicación</h2>

                        <div className="form-control mb-4">
                            <label className="label cursor-pointer justify-start gap-4">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                />
                                <span className="label-text">Publicar inmediatamente</span>
                            </label>
                        </div>

                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-4">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-warning"
                                    checked={featured}
                                    onChange={(e) => setFeatured(e.target.checked)}
                                />
                                <span className="label-text">Marcar como destacada</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-4">
                    <Link href="/dashboard/microcredentials" className="btn btn-ghost">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        className="btn btn-primary gap-2"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <IconCheck size={18} />
                                Crear Microcredencial
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
