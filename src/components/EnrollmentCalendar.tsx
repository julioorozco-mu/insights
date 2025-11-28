"use client";

import { useState, useEffect } from "react";

interface EnrollmentCalendarProps {
  courseStartDate: string; // Fecha de inicio del curso en formato YYYY-MM-DD
  onRangeChange: (startDate: string, endDate: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function EnrollmentCalendar({
  courseStartDate,
  onRangeChange,
  initialStartDate,
  initialEndDate,
}: EnrollmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(
    initialStartDate ? new Date(initialStartDate) : null
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(
    initialEndDate ? new Date(initialEndDate) : null
  );
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  const courseDate = new Date(courseStartDate);
  courseDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Inicializar con valores por defecto si no hay selección
  useEffect(() => {
    if (!selectedStartDate && !selectedEndDate && courseStartDate) {
      // Por defecto: desde 30 días antes hasta el día del curso
      const defaultStart = new Date(courseDate);
      defaultStart.setDate(defaultStart.getDate() - 30);
      
      const defaultEnd = new Date(courseDate); // Hasta el día del curso (antes del inicio)
      
      setSelectedStartDate(defaultStart);
      setSelectedEndDate(defaultEnd);
      onRangeChange(
        defaultStart.toISOString().split('T')[0],
        defaultEnd.toISOString().split('T')[0]
      );
    }
  }, [courseStartDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    clickedDate.setHours(0, 0, 0, 0);

    // No permitir seleccionar fechas después del curso o antes de hoy
    // Permitir el día del curso porque "antes del inicio" incluye ese día
    if (clickedDate > courseDate || clickedDate < today) {
      return;
    }

    if (!isSelectingRange || !selectedStartDate) {
      // Primera selección
      setSelectedStartDate(clickedDate);
      setSelectedEndDate(null);
      setIsSelectingRange(true);
    } else {
      // Segunda selección
      if (clickedDate < selectedStartDate) {
        // Si selecciona una fecha anterior, invertir
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(clickedDate);
        onRangeChange(
          clickedDate.toISOString().split('T')[0],
          selectedStartDate.toISOString().split('T')[0]
        );
      } else {
        setSelectedEndDate(clickedDate);
        onRangeChange(
          selectedStartDate.toISOString().split('T')[0],
          clickedDate.toISOString().split('T')[0]
        );
      }
      setIsSelectingRange(false);
    }
  };

  const isDateInRange = (day: number) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const isDateSelected = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    
    return (
      (selectedStartDate && date.getTime() === selectedStartDate.getTime()) ||
      (selectedEndDate && date.getTime() === selectedEndDate.getTime())
    );
  };

  const isToday = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    
    return date.getTime() === today.getTime();
  };

  const isCourseDate = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    
    return date.getTime() === courseDate.getTime();
  };

  const isDisabled = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    
    // Permitir el día del curso, solo deshabilitar después del curso
    return date > courseDate || date < today;
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const resetSelection = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setIsSelectingRange(false);
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <div className="mb-4">
        <p className="text-sm font-medium mb-2">
          Selecciona el rango de fechas para inscripciones:
        </p>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Rango seleccionado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-info"></div>
            <span>Hoy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>Inicio del curso</span>
          </div>
        </div>
      </div>

      {/* Información del rango seleccionado */}
      {selectedStartDate && selectedEndDate && (
        <div className="mb-4 p-3 bg-base-100 rounded-lg">
          <p className="text-sm font-medium mb-1">Periodo de inscripciones:</p>
          <p className="text-sm">
            <span className="font-semibold">Desde:</span>{" "}
            {selectedStartDate.toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Hasta:</span>{" "}
            {selectedEndDate.toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <button
            type="button"
            onClick={resetSelection}
            className="btn btn-xs btn-ghost mt-2"
          >
            Limpiar selección
          </button>
        </div>
      )}

      {/* Calendario */}
      <div className="bg-base-100 rounded-lg p-4">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={previousMonth}
            className="btn btn-sm btn-ghost"
          >
            ←
          </button>
          <h3 className="font-semibold">
            {monthNames[month]} {year}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="btn btn-sm btn-ghost"
          >
            →
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-base-content/60 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const disabled = isDisabled(day);
            const selected = isDateSelected(day);
            const inRange = isDateInRange(day);
            const todayDate = isToday(day);
            const courseDay = isCourseDate(day);

            // Construir clases de forma más explícita
            let bgClass = "";
            let textClass = "";
            let ringClass = "";
            
            // Fondo y texto
            if (selected) {
              bgClass = "bg-primary";
              textClass = "text-primary-content font-bold";
            } else if (courseDay) {
              bgClass = "bg-success";
              textClass = "text-success-content";
            } else if (inRange) {
              bgClass = "bg-primary/30";
            }
            
            // Anillos (rings) - siempre visibles
            if (courseDay) {
              ringClass = "ring-4 ring-success ring-offset-2";
            } else if (todayDate) {
              ringClass = "ring-4 ring-info ring-offset-2";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => !disabled && handleDateClick(day)}
                disabled={disabled}
                className={`
                  aspect-square p-1 rounded-lg text-sm font-medium
                  transition-all duration-200 relative
                  ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-base-200 cursor-pointer"}
                  ${bgClass}
                  ${textClass}
                  ${ringClass}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 text-xs text-base-content/60">
        <p>
          • Las inscripciones pueden estar abiertas <strong>hasta el día del curso</strong> (antes del inicio)
        </p>
        <p>
          • No se pueden seleccionar fechas anteriores a hoy
        </p>
      </div>
    </div>
  );
}
