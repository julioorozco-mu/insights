'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import { v4 as uuid } from 'uuid';
import { CertificateElement } from '@/types/certificate';
import VariablePanel from './VariablePanel';
import { IconTrash, IconEdit } from '@tabler/icons-react';

interface Props {
  backgroundUrl: string;
  initialElements?: CertificateElement[];
  onSave: (elements: CertificateElement[]) => void;
  onCancel: () => void;
  designWidth?: number;
  designHeight?: number;
}

export default function CertificateEditor({ backgroundUrl, initialElements = [], onSave, onCancel, designWidth = 900, designHeight = 600 }: Props) {
  const [elements, setElements] = useState<CertificateElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgImage] = useImage(backgroundUrl);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // Snapping Grid (10px)
  const gridSize = 10;
  const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize;

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleDragEnd = (id: string, e: any) => {
    const { x, y } = e.target.position();
    setElements((prev) =>
      prev.map((el) =>
        el.id === id
          ? { ...el, x: snapToGrid(x), y: snapToGrid(y) }
          : el
      )
    );
  };

  const handleTransformEnd = (id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    setElements((prev) =>
      prev.map((el) =>
        el.id === id
          ? {
              ...el,
              x: snapToGrid(node.x()),
              y: snapToGrid(node.y()),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(5, node.height() * scaleY),
            }
          : el
      )
    );

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);
  };

  const addVariable = (variableKey: CertificateElement['variableKey']) => {
    const newElement: CertificateElement = {
      id: uuid(),
      type: 'variable',
      variableKey,
      x: 100,
      y: 100,
      width: 300,
      height: 40,
      style: { fontSize: 24, color: '#000000', fontFamily: 'Helvetica', align: 'center' },
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  const addText = () => {
    const newElement: CertificateElement = {
      id: uuid(),
      type: 'text',
      value: 'Texto de ejemplo',
      x: 100,
      y: 100,
      width: 200,
      height: 30,
      style: { fontSize: 18, color: '#000000', fontFamily: 'Helvetica' },
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const updateSelectedElement = (updates: Partial<CertificateElement>) => {
    if (selectedId) {
      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedId ? { ...el, ...updates } : el
        )
      );
    }
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  const getDisplayText = (el: CertificateElement) => {
    if (el.type === 'variable' && el.variableKey) {
      return `{{${el.variableKey}}}`;
    }
    return el.value || 'Texto';
  };

  return (
    <div className="flex gap-4">
      {/* Panel lateral */}
      <VariablePanel onAddVariable={addVariable} onAddText={addText} />

      {/* Canvas */}
      <div className="flex-1">
        <div className="border-2 border-base-300 rounded-lg overflow-hidden bg-white">
          <Stage
            width={designWidth}
            height={designHeight}
            ref={stageRef}
            onMouseDown={(e) => {
              // Deseleccionar si se hace clic en el fondo
              const clickedOnEmpty = e.target === e.target.getStage();
              if (clickedOnEmpty) {
                setSelectedId(null);
              }
            }}
          >
            <Layer>
              {/* Fondo */}
              {bgImage && <KonvaImage image={bgImage} width={designWidth} height={designHeight} />}

              {/* Grid visual */}
              {(() => {
                const cols = Math.ceil(designWidth / gridSize);
                const rows = Math.ceil(designHeight / gridSize);
                const cells = rows * cols;
                return Array.from({ length: cells }).map((_, i) => (
                  <Rect
                    key={`grid-${i}`}
                    x={(i % cols) * gridSize}
                    y={Math.floor(i / cols) * gridSize}
                    width={gridSize}
                    height={gridSize}
                    stroke="#e0e0e0"
                    strokeWidth={0.2}
                  />
                ));
              })()}

              {/* Elementos */}
              {elements.map((el) => (
                <Text
                  key={el.id}
                  id={el.id}
                  text={getDisplayText(el)}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  fontSize={el.style?.fontSize || 18}
                  fontFamily={el.style?.fontFamily || 'Helvetica'}
                  fill={el.style?.color || '#000000'}
                  align={el.style?.align || 'left'}
                  fontStyle={el.style?.bold ? 'bold' : el.style?.italic ? 'italic' : 'normal'}
                  draggable
                  onClick={() => setSelectedId(el.id)}
                  onTap={() => setSelectedId(el.id)}
                  onDragEnd={(e) => handleDragEnd(el.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(el.id, e)}
                />
              ))}

              {/* Transformer para redimensionar */}
              <Transformer ref={transformerRef} />
            </Layer>
          </Stage>
        </div>

        {/* Panel de propiedades */}
        {selectedElement && (
          <div className="mt-4 card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">
                  <IconEdit size={20} className="inline mr-2" />
                  Propiedades del elemento
                </h3>
                <button
                  onClick={deleteSelected}
                  className="btn btn-sm btn-error text-white gap-2"
                >
                  <IconTrash size={16} />
                  Eliminar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Texto/Valor */}
                {selectedElement.type === 'text' && (
                  <div className="form-control col-span-2">
                    <label className="label">
                      <span className="label-text">Texto</span>
                    </label>
                    <input
                      type="text"
                      value={selectedElement.value || ''}
                      onChange={(e) => updateSelectedElement({ value: e.target.value })}
                      className="input input-bordered"
                    />
                  </div>
                )}

                {/* Tamaño de fuente */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Tamaño</span>
                  </label>
                  <input
                    type="number"
                    value={selectedElement.style?.fontSize || 18}
                    onChange={(e) =>
                      updateSelectedElement({
                        style: { ...selectedElement.style, fontSize: parseInt(e.target.value) },
                      })
                    }
                    className="input input-bordered"
                  />
                </div>

                {/* Color */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Color</span>
                  </label>
                  <input
                    type="color"
                    value={selectedElement.style?.color || '#000000'}
                    onChange={(e) =>
                      updateSelectedElement({
                        style: { ...selectedElement.style, color: e.target.value },
                      })
                    }
                    className="input input-bordered h-12"
                  />
                </div>

                {/* Fuente */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Fuente</span>
                  </label>
                  <select
                    value={selectedElement.style?.fontFamily || 'Helvetica'}
                    onChange={(e) =>
                      updateSelectedElement({
                        style: { ...selectedElement.style, fontFamily: e.target.value },
                      })
                    }
                    className="select select-bordered"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Helvetica-Bold">Helvetica Bold</option>
                    <option value="Times-Roman">Times Roman</option>
                    <option value="Times-Bold">Times Bold</option>
                    <option value="Courier">Courier</option>
                    <option value="Courier-Bold">Courier Bold</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>

                {/* Alineación */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Alineación</span>
                  </label>
                  <select
                    value={selectedElement.style?.align || 'left'}
                    onChange={(e) =>
                      updateSelectedElement({
                        style: { ...selectedElement.style, align: e.target.value as any },
                      })
                    }
                    className="select select-bordered"
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>
                </div>

                {/* Posición */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">X</span>
                  </label>
                  <input
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) })}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Y</span>
                  </label>
                  <input
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) })}
                    className="input input-bordered"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-4 mt-4">
          <button onClick={onCancel} className="btn btn-ghost flex-1">
            Cancelar
          </button>
          <button onClick={() => onSave(elements)} className="btn btn-primary text-white flex-1">
            Guardar Plantilla
          </button>
        </div>
      </div>
    </div>
  );
}
