"use client";

import { useState, useRef, useEffect } from "react";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  setYear,
  setMonth,
  getYear,
  getMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function DatePicker({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  maxDate,
  minDate,
  disabled = false,
  error = false,
  className = "",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTypingNew, setIsTypingNew] = useState(false);

  // Sincronizar valor externo con el input (solo si no está escribiendo)
  useEffect(() => {
    if (isTypingNew) return;
    
    if (value) {
      const date = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(date)) {
        setInputValue(format(date, "dd/MM/yyyy"));
        setCurrentMonth(date);
      }
    } else {
      setInputValue("");
    }
  }, [value, isTypingNew]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowYearSelector(false);
        setShowMonthSelector(false);
        setIsTypingNew(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Manejar entrada manual
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const currentDigits = inputValue.replace(/[^\d]/g, "");
    const newDigits = rawInput.replace(/[^\d]/g, "");
    
    // Detectar si el usuario está empezando a escribir una fecha nueva
    // (cuando la longitud de dígitos nuevos es menor o igual que los actuales 
    // pero el input cambió, significa que está borrando o reemplazando)
    let val = newDigits;
    
    // Si hay una fecha completa y el usuario escribe un nuevo dígito,
    // interpretar como inicio de nueva fecha
    if (currentDigits.length === 8 && newDigits.length === 9) {
      // El usuario añadió un dígito a una fecha completa - empezar de nuevo
      val = newDigits.slice(-1); // Tomar solo el último dígito
      setIsTypingNew(true);
    } else if (newDigits.length < currentDigits.length) {
      // El usuario está borrando
      val = newDigits;
    }
    
    // Auto-formatear mientras escribe
    let formatted = val;
    if (val.length >= 2) {
      formatted = val.slice(0, 2) + "/" + val.slice(2);
    }
    if (val.length >= 4) {
      formatted = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4, 8);
    }
    
    setInputValue(formatted);

    // Validar fecha completa (8 dígitos = DD MM YYYY)
    if (val.length === 8) {
      const dateStr = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4, 8);
      const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        const isWithinRange = 
          (!maxDate || !isAfter(parsed, maxDate)) &&
          (!minDate || !isBefore(parsed, minDate));
        
        if (isWithinRange) {
          onChange(format(parsed, "yyyy-MM-dd"));
          setCurrentMonth(parsed);
          setIsTypingNew(false);
        }
      }
    }
  };
  
  // Limpiar el input cuando el usuario hace focus para escribir manualmente
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si presiona un número y hay una fecha completa, limpiar para empezar de nuevo
    if (/^\d$/.test(e.key) && inputValue.length === 10) {
      setInputValue("");
      setIsTypingNew(true);
    }
  };

  // Seleccionar fecha del calendario
  const handleDateSelect = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setInputValue(format(date, "dd/MM/yyyy"));
    setIsOpen(false);
  };

  // Generar días del calendario
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (maxDate && isAfter(date, maxDate)) return true;
    if (minDate && isBefore(date, minDate)) return true;
    return false;
  };

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : null;

  // Generar años para el selector (100 años hacia atrás desde maxDate o fecha actual)
  const generateYears = () => {
    const endYear = maxDate ? getYear(maxDate) : getYear(new Date());
    const startYear = endYear - 100;
    const years: number[] = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearSelector(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
    setShowMonthSelector(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`input input-bordered w-full pr-10 ${error ? "input-error" : ""}`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
          disabled={disabled}
        >
          <IconCalendar size={20} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-base-100 border border-base-300 rounded-xl shadow-xl p-4 w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header del calendario */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <IconChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowMonthSelector(!showMonthSelector);
                  setShowYearSelector(false);
                }}
                className="btn btn-ghost btn-sm font-semibold"
              >
                {MONTHS[getMonth(currentMonth)]}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowYearSelector(!showYearSelector);
                  setShowMonthSelector(false);
                }}
                className="btn btn-ghost btn-sm font-semibold"
              >
                {getYear(currentMonth)}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <IconChevronRight size={18} />
            </button>
          </div>

          {/* Selector de año */}
          {showYearSelector && (
            <div className="absolute inset-x-4 top-14 bottom-4 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-y-auto z-10">
              <div className="grid grid-cols-4 gap-1 p-2">
                {generateYears().map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleYearSelect(year)}
                    className={`btn btn-sm ${
                      getYear(currentMonth) === year
                        ? "btn-primary"
                        : "btn-ghost"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selector de mes */}
          {showMonthSelector && (
            <div className="absolute inset-x-4 top-14 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10">
              <div className="grid grid-cols-3 gap-1 p-2">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => handleMonthSelect(index)}
                    className={`btn btn-sm ${
                      getMonth(currentMonth) === index
                        ? "btn-primary"
                        : "btn-ghost"
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-base-content/60 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {generateCalendarDays().map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isDisabled = isDateDisabled(day);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`
                    w-9 h-9 rounded-lg text-sm font-medium transition-all
                    ${!isCurrentMonth ? "text-base-content/30" : ""}
                    ${isSelected ? "bg-primary text-primary-content" : ""}
                    ${isToday && !isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-base-200"}
                    ${!isSelected && isCurrentMonth && !isDisabled ? "text-base-content" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Acciones rápidas */}
          <div className="flex justify-between mt-4 pt-3 border-t border-base-300">
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                onChange("");
                setIsOpen(false);
              }}
              className="btn btn-ghost btn-sm text-error"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

