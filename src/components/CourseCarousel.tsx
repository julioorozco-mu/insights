"use client";

import { useState, useEffect } from "react";
import { Course } from "@/types/course";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface CourseCarouselProps {
  courses: Course[];
  autoPlayInterval?: number; // en milisegundos
}

export function CourseCarousel({ courses, autoPlayInterval = 5000 }: CourseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play del carrusel
  useEffect(() => {
    if (courses.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % courses.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [courses.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + courses.length) % courses.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % courses.length);
  };

  if (courses.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
        <div className="text-center text-white p-8">
          <h3 className="text-2xl font-bold mb-2">Próximamente</h3>
          <p className="text-white/80">Nuevos cursos estarán disponibles pronto</p>
        </div>
      </div>
    );
  }

  const currentCourse = courses[currentIndex];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Imagen actual */}
      <div className="absolute inset-0 transition-opacity duration-500 ease-in-out">
        {currentCourse.coverImageUrl ? (
          <img
            src={currentCourse.coverImageUrl}
            alt={currentCourse.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600" />
        )}
        {/* Overlay oscuro para mejor legibilidad */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Contenido del curso */}
        <div className="absolute inset-0 flex flex-col justify-center items-start p-8 md:p-12 text-white">
          <div className="max-w-2xl">
            {currentCourse.title && (
              <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">
                {currentCourse.title}
              </h2>
            )}
            {currentCourse.tags && currentCourse.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentCourse.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controles de navegación */}
      {courses.length > 1 && (
        <>
          {/* Botón anterior */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-all"
            aria-label="Slide anterior"
          >
            <IconChevronLeft size={24} />
          </button>

          {/* Botón siguiente */}
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-all"
            aria-label="Slide siguiente"
          >
            <IconChevronRight size={24} />
          </button>

          {/* Indicadores de puntos */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {courses.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white w-8"
                    : "bg-white/50 w-2 hover:bg-white/70"
                }`}
                aria-label={`Ir al slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

