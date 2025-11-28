import React from 'react';
import { IconUser, IconBook, IconUserCheck, IconCalendar, IconWritingSign } from '@tabler/icons-react';

interface Props {
  onAddVariable: (key: 'studentName' | 'courseTitle' | 'instructorName' | 'completionDate' | 'signatureUrl') => void;
  onAddText: () => void;
}

const VARIABLE_KEYS = [
  { label: 'Nombre del estudiante', key: 'studentName' as const, icon: IconUser },
  { label: 'Título del curso', key: 'courseTitle' as const, icon: IconBook },
  { label: 'Nombre del instructor', key: 'instructorName' as const, icon: IconUserCheck },
  { label: 'Fecha de finalización', key: 'completionDate' as const, icon: IconCalendar },
  { label: 'Firma', key: 'signatureUrl' as const, icon: IconWritingSign },
];

export default function VariablePanel({ onAddVariable, onAddText }: Props) {
  return (
    <div className="w-72 bg-base-200 p-4 rounded-lg h-[650px] overflow-auto">
      <h3 className="font-bold mb-4 text-lg">Variables Dinámicas</h3>
      
      <div className="mb-6">
        <button
          onClick={onAddText}
          className="btn btn-sm btn-primary text-white w-full mb-2"
        >
          + Texto Fijo
        </button>
      </div>

      <div className="divider">Variables</div>

      <div className="space-y-2">
        {VARIABLE_KEYS.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.key}
              onClick={() => onAddVariable(v.key)}
              className="btn btn-sm btn-outline w-full justify-start gap-2"
            >
              <Icon size={16} />
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="divider">Ayuda</div>
      
      <div className="text-xs text-base-content/70 space-y-2">
        <p>• Arrastra los elementos en el canvas</p>
        <p>• Usa el grid para alinear</p>
        <p>• Haz clic para editar propiedades</p>
        <p>• Las variables se reemplazan automáticamente</p>
      </div>
    </div>
  );
}
