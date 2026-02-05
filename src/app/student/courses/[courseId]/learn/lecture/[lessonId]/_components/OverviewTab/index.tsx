'use client';

import { memo } from 'react';
import { IconPaperclip, IconDownload, IconLoader2 } from '@tabler/icons-react';

// ===== TYPES =====
interface Resource {
    id: string;
    fileName: string;
    fileType: string;
    url: string;
    sizeKb?: number;
    category: string;
}

interface Lesson {
    id: string;
    title: string;
    description?: string;
}

interface OverviewTabProps {
    lesson: Lesson | null;
    resources: Resource[];
    loadingResources: boolean;
}

// ===== HELPERS =====
function formatFileSize(kb?: number): string {
    if (!kb) return '';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return '📄';
    if (type.includes('doc') || type.includes('word')) return '📝';
    if (type.includes('xls') || type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('ppt') || type.includes('presentation')) return '📽️';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '📦';
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) return '🖼️';
    if (type.includes('video') || type.includes('mp4') || type.includes('mov')) return '🎬';
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return '🎵';
    return '📎';
}

// ===== COMPONENT =====
/**
 * Tab de Descripción General (Overview)
 * Muestra título, descripción y recursos de la lección
 * Lazy loaded via next/dynamic
 */
function OverviewTab({ lesson, resources, loadingResources }: OverviewTabProps) {
    if (!lesson) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                <p>No hay información disponible</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{lesson.title}</h1>

            {lesson.description && (
                <div className="prose prose-sm max-w-none text-gray-700 mb-8">
                    <p>{lesson.description}</p>
                </div>
            )}

            {/* Resources Section */}
            {resources.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <IconPaperclip size={20} />
                        Recursos de la lección
                    </h3>
                    <div className="grid gap-3">
                        {resources.map((resource) => (
                            <a
                                key={resource.id}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
                            >
                                <span className="text-2xl">{getFileIcon(resource.fileType)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate group-hover:text-purple-600">
                                        {resource.fileName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatFileSize(resource.sizeKb)}
                                    </p>
                                </div>
                                <IconDownload size={20} className="text-gray-400 group-hover:text-purple-600" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {loadingResources && (
                <div className="flex items-center gap-2 text-gray-500 mt-4">
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando recursos...</span>
                </div>
            )}

            {!loadingResources && resources.length === 0 && !lesson.description && (
                <div className="text-center py-8 text-gray-500">
                    <p>No hay recursos adicionales para esta lección.</p>
                </div>
            )}
        </div>
    );
}

export default memo(OverviewTab);
