"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { userRepository } from "@/lib/repositories/userRepository";
import { supabaseClient } from "@/lib/supabase";
import { MunicipalitySelector } from "@/components/MunicipalitySelector";
import {
  IconUser,
  IconPhoto,
  IconBook,
  IconBriefcase,
  IconLink,
  IconUpload,
  IconX,
  IconPlus,
  IconTrash,
  IconLock,
  IconEye,
  IconEyeOff,
  IconMail,
  IconExternalLink,
} from "@tabler/icons-react";
import { ScheduledEmailsManager } from "@/components/ScheduledEmailsManager";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Estados del formulario
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bio, setBio] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [favoriteBooks, setFavoriteBooks] = useState<string[]>([]);
  const [publishedBooks, setPublishedBooks] = useState<{ title: string; url?: string; year?: string }[]>([]);
  const [externalCourses, setExternalCourses] = useState<{ title: string; url: string; platform?: string }[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({ linkedin: "", twitter: "", website: "" });

  // Estados para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Estados para prueba de correos (solo admin)
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState(false);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  // Cargar datos del usuario
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLastName((user as any).lastName || "");
      setEmail(user.email || "");
      setPhone((user as any).phone || "");
      setDateOfBirth((user as any).dateOfBirth || "");
      setGender((user as any).gender || "");
      setState((user as any).state || "");
      setMunicipality((user as any).municipality || "");
      setAvatarUrl(user.avatarUrl || "");
      setCoverImageUrl((user as any).coverImageUrl || "");
      setBio(user.bio || "");
      setAboutMe((user as any).aboutMe || "");
      setFavoriteBooks((user as any).favoriteBooks || []);
      setPublishedBooks((user as any).publishedBooks || []);
      setExternalCourses((user as any).externalCourses || []);
      setServices((user as any).services || []);
      setAchievements((user as any).achievements || []);
      setSocialLinks({
        linkedin: user.socialLinks?.linkedin || "",
        twitter: user.socialLinks?.twitter || "",
        website: user.socialLinks?.website || ""
      });
    }
  }, [user]);

  // Subir imagen de avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);
      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}_${file.name}`;
      
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(urlData.publicUrl);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setError("Error al subir la imagen de perfil");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Subir imagen de portada
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingCover(true);
      const timestamp = Date.now();
      const filePath = `teachers/${user.id}/${timestamp}_${file.name}`;
      
      const { error: uploadError } = await supabaseClient.storage
        .from('covers')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient.storage
        .from('covers')
        .getPublicUrl(filePath);
      
      setCoverImageUrl(urlData.publicUrl);
    } catch (err) {
      console.error("Error uploading cover:", err);
      setError("Error al subir la imagen de portada");
    } finally {
      setUploadingCover(false);
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await userRepository.update(user.id, {
        name,
        lastName,
        phone,
        dateOfBirth,
        gender: gender as "male" | "female" | "other" | undefined,
        state,
        municipality,
        avatarUrl,
        bio,
        socialLinks,
        coverImageUrl,
        aboutMe,
        favoriteBooks,
        publishedBooks,
        externalCourses,
        services,
        achievements,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el perfil");
    } finally {
      setLoading(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    if (!user) return;

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Por favor completa todos los campos");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      // Actualizar contraseña con Supabase Auth
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Limpiar campos y mostrar éxito
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      console.error("Error changing password:", err);
      setPasswordError(err.message || "Error al cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Enviar correo de prueba
  const handleSendTestEmail = async () => {
    if (!testEmail || !user) return;

    try {
      setSendingTestEmail(true);
      setTestEmailError(null);
      setTestEmailSuccess(false);

      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: testEmail,
          name: user.name || "Usuario",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el correo");
      }

      setTestEmailSuccess(true);
      setTimeout(() => setTestEmailSuccess(false), 5000);
    } catch (err) {
      setTestEmailError(err instanceof Error ? err.message : "Error al enviar el correo de prueba");
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Previsualizar correo en nueva pestaña
  const handlePreviewEmail = () => {
    if (!user) return;
    const previewUrl = `/api/preview-email?name=${encodeURIComponent(user.name || "Usuario")}&email=${encodeURIComponent(user.email || "")}`;
    window.open(previewUrl, "_blank");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Configuración del Perfil</h1>
          <p className="text-base-content/70">Administra tu perfil público y preferencias</p>
        </div>
      
      </div>

      {success && (
        <div className="alert alert-success mb-6 text-white">
          <span>✓ Perfil actualizado correctamente</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Sección: Información Básica */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconUser size={24} />
            Información Básica
          </h2>

          {/* Avatar y botón de cambiar imagen */}
          <div className="flex flex-col items-center mb-6">
            <div className="avatar placeholder mb-4">
              <div className="bg-primary text-white rounded-full w-32">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" />
                ) : (
                  <span className="text-4xl font-bold">
                    {name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploadingAvatar}
            />
            <button
              onClick={() => document.getElementById('avatar-upload')?.click()}
              className="btn btn-outline btn-primary gap-2"
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Subiendo...
                </>
              ) : (
                <>
                  <IconPhoto size={20} />
                  Cambiar Imagen
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Nombre *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered"
                placeholder="Tu nombre"
                autoComplete="off"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Apellido</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input input-bordered"
                placeholder="Tu apellido"
                autoComplete="off"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Email</span>
              </label>
              <input
                type="email"
                value={email}
                className="input input-bordered bg-base-200"
                disabled
                readOnly
                autoComplete="off"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  El email no se puede modificar
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Teléfono</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input input-bordered"
                placeholder="+52 123 456 7890"
                autoComplete="off"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Fecha de Nacimiento</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input input-bordered"
                autoComplete="off"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Género</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="select select-bordered"
              >
                <option value="">Selecciona...</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Estado</span>
              </label>
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setMunicipality(""); // Limpiar municipio al cambiar estado
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
            </div>

            <MunicipalitySelector
              state={state}
              value={municipality}
              onChange={setMunicipality}
            />
          </div>

          <div className="divider"></div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Bio Corta</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="textarea textarea-bordered h-20"
              placeholder="Una breve descripción sobre ti (aparece debajo de tu nombre)"
              autoComplete="off"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Acerca de / Semblanza</span>
            </label>
            <textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              className="textarea textarea-bordered h-32"
              placeholder="Escribe una semblanza detallada sobre ti, tu experiencia, logros, etc."
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* Sección: Seguridad - Cambiar Contraseña */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconLock size={24} />
            Seguridad
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Cambia tu contraseña para mantener tu cuenta segura
          </p>

          {passwordSuccess && (
            <div className="alert alert-success mb-4 text-white">
              <IconLock size={20} />
              <span>✓ Contraseña actualizada correctamente</span>
            </div>
          )}

          {passwordError && (
            <div className="alert alert-error mb-4 text-white">
              <span>{passwordError}</span>
            </div>
          )}

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Contraseña Actual *</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input input-bordered w-full pr-12"
                placeholder="Ingresa tu contraseña actual"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
              >
                {showCurrentPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Nueva Contraseña *</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input input-bordered w-full pr-12"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
              >
                {showNewPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                Debe tener al menos 6 caracteres
              </span>
            </label>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Confirmar Nueva Contraseña *</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full pr-12"
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
              >
                {showConfirmPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            className="btn btn-primary text-white gap-2"
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? (
              <>
                <span className="loading loading-spinner"></span>
                Cambiando Contraseña...
              </>
            ) : (
              <>
                <IconLock size={20} />
                Cambiar Contraseña
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sección: Enlaces Sociales */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconLink size={24} />
            Enlaces Sociales
          </h2>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">LinkedIn</span>
            </label>
            <input
              type="url"
              value={socialLinks.linkedin}
              onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
              className="input input-bordered"
              placeholder="https://linkedin.com/in/tu-perfil"
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Twitter / X</span>
            </label>
            <input
              type="url"
              value={socialLinks.twitter}
              onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
              className="input input-bordered"
              placeholder="https://twitter.com/tu-usuario"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Sitio Web</span>
            </label>
            <input
              type="url"
              value={socialLinks.website}
              onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
              className="input input-bordered"
              placeholder="https://tu-sitio.com"
            />
          </div>
        </div>
      </div>

      {/* Sección: Libros Favoritos */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconBook size={24} />
            Libros Favoritos
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Recomienda libros que te hayan inspirado o que consideres valiosos
          </p>

          <div className="space-y-3 mb-4">
            {favoriteBooks.map((book, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={book}
                  onChange={(e) => {
                    const newBooks = [...favoriteBooks];
                    newBooks[index] = e.target.value;
                    setFavoriteBooks(newBooks);
                  }}
                  className="input input-bordered flex-1"
                  placeholder="Título del libro"
                />
                <button
                  onClick={() => setFavoriteBooks(favoriteBooks.filter((_, i) => i !== index))}
                  className="btn btn-error btn-square text-white"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setFavoriteBooks([...favoriteBooks, ""])}
            className="btn btn-outline btn-primary gap-2 hover:bg-error hover:border-error hover:!text-white"
          >
            <IconPlus size={20} />
            Agregar Libro
          </button>
        </div>
      </div>

      {/* Sección: Libros Publicados */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconBook size={24} />
            Libros Publicados
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Promociona tus libros publicados con portada, título, descripción y enlace
          </p>

          <div className="space-y-6 mb-4">
            {publishedBooks.map((book, index) => (
              <div key={index} className="border border-base-300 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">Libro {index + 1}</h3>
                  <button
                    onClick={() => setPublishedBooks(publishedBooks.filter((_, i) => i !== index))}
                    className="btn btn-error btn-sm btn-square text-white"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Título</span>
                  </label>
                  <input
                    type="text"
                    value={book.title}
                    onChange={(e) => {
                      const newBooks = [...publishedBooks];
                      newBooks[index].title = e.target.value;
                      setPublishedBooks(newBooks);
                    }}
                    className="input input-bordered input-sm"
                    placeholder="Título del libro"
                  />
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Año de Publicación</span>
                  </label>
                  <input
                    type="text"
                    value={book.year || ""}
                    onChange={(e) => {
                      const newBooks = [...publishedBooks];
                      newBooks[index].year = e.target.value;
                      setPublishedBooks(newBooks);
                    }}
                    className="input input-bordered input-sm"
                    placeholder="2024"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Enlace (Amazon, etc.)</span>
                  </label>
                  <input
                    type="url"
                    value={book.url || ""}
                    onChange={(e) => {
                      const newBooks = [...publishedBooks];
                      newBooks[index].url = e.target.value;
                      setPublishedBooks(newBooks);
                    }}
                    className="input input-bordered input-sm"
                    placeholder="https://amazon.com/..."
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPublishedBooks([...publishedBooks, { title: "", url: "", year: "" }])}
            className="btn btn-outline btn-primary gap-2 hover:bg-error hover:border-error hover:!text-white"
          >
            <IconPlus size={20} />
            Agregar Libro Publicado
          </button>
        </div>
      </div>

      {/* Sección: Cursos Externos */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconBriefcase size={24} />
            Cursos en Otras Plataformas
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Enlaces a tus cursos en Udemy, Coursera, YouTube, etc.
          </p>

          <div className="space-y-4 mb-4">
            {externalCourses.map((course, index) => (
              <div key={index} className="border border-base-300 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">Curso {index + 1}</h3>
                  <button
                    onClick={() => setExternalCourses(externalCourses.filter((_, i) => i !== index))}
                    className="btn btn-error btn-sm btn-square text-white"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Título del Curso</span>
                  </label>
                  <input
                    type="text"
                    value={course.title}
                    onChange={(e) => {
                      const newCourses = [...externalCourses];
                      newCourses[index].title = e.target.value;
                      setExternalCourses(newCourses);
                    }}
                    className="input input-bordered input-sm"
                    placeholder="Nombre del curso"
                  />
                </div>

                <div className="form-control mb-3">
                  <label className="label">
                    <span className="label-text">Plataforma</span>
                  </label>
                  <input
                    type="text"
                    value={course.platform || ""}
                    onChange={(e) => {
                      const newCourses = [...externalCourses];
                      newCourses[index].platform = e.target.value;
                      setExternalCourses(newCourses);
                    }}
                    className="input input-bordered input-sm"
                    placeholder="Udemy, Coursera, YouTube, etc."
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Enlace</span>
                  </label>
                  <input
                    type="url"
                    value={course.url}
                    onChange={(e) => {
                      const newCourses = [...externalCourses];
                      newCourses[index].url = e.target.value;
                      setExternalCourses(newCourses);
                    }}
                    className="input input-bordered input-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setExternalCourses([...externalCourses, { title: "", url: "", platform: "" }])}
            className="btn btn-outline btn-primary gap-2 hover:bg-error hover:border-error hover:!text-white"
          >
            <IconPlus size={20} />
            Agregar Curso Externo
          </button>
        </div>
      </div>

      {/* Sección: Servicios */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconBriefcase size={24} />
            Servicios que Ofreces
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Describe los servicios profesionales que ofreces (consultoría, conferencias, etc.)
          </p>

          <div className="space-y-3 mb-4">
            {services.map((service, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={service}
                  onChange={(e) => {
                    const newServices = [...services];
                    newServices[index] = e.target.value;
                    setServices(newServices);
                  }}
                  className="input input-bordered flex-1"
                  placeholder="Ej: Consultoría empresarial, Conferencias, etc."
                />
                <button
                  onClick={() => setServices(services.filter((_, i) => i !== index))}
                  className="btn btn-error btn-square text-white"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setServices([...services, ""])}
            className="btn btn-outline btn-primary gap-2 hover:bg-error hover:border-error hover:!text-white"
          >
            <IconPlus size={20} />
            Agregar Servicio
          </button>
        </div>
      </div>

      {/* Sección: Logros y Reconocimientos */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4 flex items-center gap-2">
            <IconBriefcase size={24} />
            Logros y Reconocimientos
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Premios, certificaciones, reconocimientos destacados, entrevistas, etc.
          </p>

          <div className="space-y-3 mb-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex gap-2">
                <textarea
                  value={achievement}
                  onChange={(e) => {
                    const newAchievements = [...achievements];
                    newAchievements[index] = e.target.value;
                    setAchievements(newAchievements);
                  }}
                  className="textarea textarea-bordered flex-1 h-20"
                  placeholder="Ej: Entrevista en CNN sobre política internacional (2023) - https://..."
                />
                <button
                  onClick={() => setAchievements(achievements.filter((_, i) => i !== index))}
                  className="btn btn-error btn-square text-white"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setAchievements([...achievements, ""])}
            className="btn btn-outline btn-primary gap-2 hover:bg-error hover:border-error hover:!text-white"
          >
            <IconPlus size={20} />
            Agregar Logro
          </button>
        </div>
      </div>

      {/* Sección: Prueba de Correos (Solo Admin) */}
      {user?.role === "admin" && (
        <div className="card bg-base-100 shadow-xl mb-6 border-2 border-primary">
          <div className="card-body">
            <h2 className="card-title mb-4 flex items-center gap-2 text-primary">
              <IconMail size={24} />
              Prueba de Correo de Bienvenida
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Previsualiza y prueba el diseño del correo de bienvenida que se envía automáticamente al registrarse.
            </p>

            {testEmailSuccess && (
              <div className="alert alert-success mb-4 text-white">
                <IconMail size={20} />
                <span>✓ Correo de prueba enviado exitosamente</span>
              </div>
            )}

            {testEmailError && (
              <div className="alert alert-error mb-4 text-white">
                <span>{testEmailError}</span>
              </div>
            )}

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Correo de Destino *</span>
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="input input-bordered"
                placeholder="correo@ejemplo.com"
                autoComplete="off"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  El correo se enviará con tu nombre de usuario actual
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePreviewEmail}
                className="btn btn-outline btn-primary gap-2"
              >
                <IconExternalLink size={20} />
                Previsualizar en Navegador
              </button>

              <button
                onClick={handleSendTestEmail}
                className="btn btn-primary text-white gap-2"
                disabled={sendingTestEmail || !testEmail}
              >
                {sendingTestEmail ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <IconMail size={20} />
                    Enviar Correo de Prueba
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sección: Gestión de Correos Programados (Solo Admin) */}
      {user?.role === "admin" && user?.id && (
        <div className="mb-6">
          <ScheduledEmailsManager userId={user.id} />
        </div>
      )}

      {/* Botón Guardar Flotante */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={handleSave}
          className="btn btn-error text-white btn-lg shadow-2xl gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading loading-spinner"></span>
              Guardando...
            </>
          ) : (
            <>
              <IconUpload size={24} />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
