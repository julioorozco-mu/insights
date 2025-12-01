"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, CreateUserInput } from "@/lib/validators/userSchema";
import { MunicipalitySelector } from "@/components/MunicipalitySelector";
import { APP_NAME } from "@/utils/constants";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: "", color: "" });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: "student",
    },
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const dateOfBirth = watch("dateOfBirth");

  // Calcular edad automáticamente
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      setAge(calculatedAge);
    }
  }, [dateOfBirth]);

  // Evaluar fortaleza de contraseña
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: "", color: "" });
      return;
    }

    let score = 0;
    
    // Longitud
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Mayúsculas
    if (/[A-Z]/.test(password)) score++;
    
    // Minúsculas
    if (/[a-z]/.test(password)) score++;
    
    // Números
    if (/[0-9]/.test(password)) score++;
    
    // Caracteres especiales
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let label = "";
    let color = "";

    if (score <= 2) {
      label = "Débil";
      color = "error";
    } else if (score <= 4) {
      label = "Media";
      color = "warning";
    } else {
      label = "Fuerte";
      color = "success";
    }

    setPasswordStrength({ score, label, color });
  }, [password]);

  const onSubmit = async (data: CreateUserInput) => {
    try {
      setLoading(true);
      setError(null);
      await signUp(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12">
      <div className="card w-full max-w-3xl bg-base-100 shadow-2xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
              <p className="text-sm text-base-content/60">Plataforma de Microcredenciales</p>
            </div>
            <p className="text-base-content/70">Crea tu cuenta para acceder a los cursos</p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Nombre y Apellidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nombre(s) *</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="input input-bordered"
                  placeholder="Juan"
                  autoComplete="off"
                />
                {errors.name && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.name.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Apellidos *</span>
                </label>
                <input
                  type="text"
                  {...register("lastName")}
                  className="input input-bordered"
                  placeholder="Pérez García"
                  autoComplete="off"
                />
                {errors.lastName && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.lastName.message}</span>
                  </label>
                )}
              </div>
            </div>

            {/* Fecha de Nacimiento y Edad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Fecha de Nacimiento *</span>
                </label>
                <input
                  type="date"
                  {...register("dateOfBirth")}
                  className="input input-bordered"
                  max={new Date().toISOString().split('T')[0]}
                  autoComplete="off"
                />
                {errors.dateOfBirth && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.dateOfBirth.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Edad</span>
                </label>
                <input
                  type="text"
                  value={age !== null ? `${age} años` : ""}
                  className="input input-bordered bg-base-200"
                  disabled
                  placeholder="Se calculará automáticamente"
                />
              </div>
            </div>

            {/* Email y Teléfono */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Correo Electrónico *</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className="input input-bordered"
                  placeholder="tu@email.com"
                  autoComplete="off"
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Teléfono *</span>
                </label>
                <input
                  type="tel"
                  {...register("phone")}
                  className="input input-bordered"
                  placeholder="5512345678"
                  autoComplete="off"
                />
                {errors.phone && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.phone.message}</span>
                  </label>
                )}
              </div>
            </div>

            {/* Nombre de Usuario y Género */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nombre de Usuario *</span>
                </label>
                <input
                  type="text"
                  {...register("username")}
                  className="input input-bordered"
                  placeholder="juanperez"
                  autoComplete="off"
                />
                {errors.username && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.username.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Género *</span>
                </label>
                <select {...register("gender")} className="select select-bordered">
                  <option value="">Selecciona...</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
                {errors.gender && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.gender.message}</span>
                  </label>
                )}
              </div>
            </div>

            {/* Estado y Municipio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Estado *</span>
                </label>
                <select 
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedMunicipality("");
                    setValue("state", e.target.value);
                  }}
                  className="select select-bordered"
                >
                  <option value="">Selecciona un estado...</option>
                  <option value="Estado de México">Estado de México</option>
                  <option value="Ciudad de México">Ciudad de México</option>
                  <option disabled>──────────</option>
                  <option value="Aguascalientes">Aguascalientes</option>
                  <option value="Baja California">Baja California</option>
                  <option value="Baja California Sur">Baja California Sur</option>
                  <option value="Campeche">Campeche</option>
                  <option value="Chiapas">Chiapas</option>
                  <option value="Chihuahua">Chihuahua</option>
                  <option value="Coahuila">Coahuila</option>
                  <option value="Colima">Colima</option>
                  <option value="Durango">Durango</option>
                  <option value="Guanajuato">Guanajuato</option>
                  <option value="Guerrero">Guerrero</option>
                  <option value="Hidalgo">Hidalgo</option>
                  <option value="Jalisco">Jalisco</option>
                  <option value="Michoacán">Michoacán</option>
                  <option value="Morelos">Morelos</option>
                  <option value="Nayarit">Nayarit</option>
                  <option value="Nuevo León">Nuevo León</option>
                  <option value="Oaxaca">Oaxaca</option>
                  <option value="Puebla">Puebla</option>
                  <option value="Querétaro">Querétaro</option>
                  <option value="Quintana Roo">Quintana Roo</option>
                  <option value="San Luis Potosí">San Luis Potosí</option>
                  <option value="Sinaloa">Sinaloa</option>
                  <option value="Sonora">Sonora</option>
                  <option value="Tabasco">Tabasco</option>
                  <option value="Tamaulipas">Tamaulipas</option>
                  <option value="Tlaxcala">Tlaxcala</option>
                  <option value="Veracruz">Veracruz</option>
                  <option value="Yucatán">Yucatán</option>
                  <option value="Zacatecas">Zacatecas</option>
                </select>
                {errors.state && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.state.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <MunicipalitySelector
                  state={selectedState}
                  value={selectedMunicipality}
                  onChange={(municipality) => {
                    setSelectedMunicipality(municipality);
                    setValue("municipality" as any, municipality);
                  }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Contraseña *</span>
              </label>
              <input
                type="password"
                {...register("password")}
                className="input input-bordered"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {password && passwordStrength.label && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <progress 
                      className={`progress progress-${passwordStrength.color} w-full`} 
                      value={passwordStrength.score} 
                      max="6"
                    ></progress>
                    <span className={`text-sm font-semibold text-${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-base-content/60 mt-1">
                    Usa mayúsculas, minúsculas, números y caracteres especiales
                  </p>
                </div>
              )}
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.password.message}</span>
                </label>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Confirmar Contraseña *</span>
              </label>
              <input
                type="password"
                {...register("confirmPassword")}
                className="input input-bordered"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {confirmPassword && password && (
                <div className="mt-2">
                  {password === confirmPassword ? (
                    <p className="text-sm text-success flex items-center gap-1">
                      <span>✓</span> Las contraseñas coinciden
                    </p>
                  ) : (
                    <p className="text-sm text-error flex items-center gap-1">
                      <span>✗</span> Las contraseñas no coinciden
                    </p>
                  )}
                </div>
              )}
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
                </label>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full btn-lg text-white" 
              disabled={loading}
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <div className="divider">O</div>

          <p className="text-center">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="link link-primary font-semibold">
              Inicia sesión aquí
            </Link>
          </p>

          <p className="text-center mt-4">
            <Link href="/" className="link link-hover text-sm">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
