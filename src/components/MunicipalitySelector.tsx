"use client";

import { useState, useEffect, useRef } from "react";
import { loadMunicipalities, filterMunicipalities } from "@/data/municipalities";

interface MunicipalitySelectorProps {
  state: string;
  value: string;
  onChange: (municipality: string) => void;
  disabled?: boolean;
}

export function MunicipalitySelector({ state, value, onChange, disabled }: MunicipalitySelectorProps) {
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<string[]>([]);
  const [displayedMunicipalities, setDisplayedMunicipalities] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cargar municipios cuando cambia el estado
  useEffect(() => {
    if (!state) {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
      setDisplayedMunicipalities([]);
      onChange("");
      return;
    }

    setLoading(true);
    loadMunicipalities(state)
      .then((data) => {
        setMunicipalities(data);
        setFilteredMunicipalities(data);
        setDisplayedMunicipalities(data.slice(0, 20));
        setDisplayCount(20);
      })
      .finally(() => setLoading(false));
  }, [state]);

  // Filtrar municipios cuando cambia el término de búsqueda
  useEffect(() => {
    const filtered = filterMunicipalities(municipalities, searchTerm);
    setFilteredMunicipalities(filtered);
    setDisplayedMunicipalities(filtered.slice(0, 20));
    setDisplayCount(20);
  }, [searchTerm, municipalities]);

  // Cargar más municipios al hacer scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (isNearBottom && displayCount < filteredMunicipalities.length) {
      const newCount = Math.min(displayCount + 20, filteredMunicipalities.length);
      setDisplayedMunicipalities(filteredMunicipalities.slice(0, newCount));
      setDisplayCount(newCount);
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (municipality: string) => {
    onChange(municipality);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="form-control" ref={dropdownRef}>
      <label className="label">
        <span className="label-text font-semibold">Municipio</span>
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          className="input input-bordered w-full"
          placeholder={state ? "Buscar municipio..." : "Selecciona primero un estado"}
          disabled={disabled || !state || loading}
          autoComplete="off"
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        )}

        {isOpen && !loading && municipalities.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-60 overflow-hidden">
            <div 
              ref={listRef}
              className="overflow-y-auto max-h-60"
              onScroll={handleScroll}
            >
              {displayedMunicipalities.length > 0 ? (
                displayedMunicipalities.map((municipality, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelect(municipality)}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors"
                  >
                    {municipality}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-base-content/60">
                  No se encontraron municipios
                </div>
              )}
              
              {displayCount < filteredMunicipalities.length && (
                <div className="px-4 py-2 text-center text-sm text-base-content/60">
                  Mostrando {displayCount} de {filteredMunicipalities.length}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {!state && (
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Selecciona un estado primero
          </span>
        </label>
      )}
    </div>
  );
}
