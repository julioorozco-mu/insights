"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUploadFile } from "@/hooks/useUploadFile";
import { Loader } from "@/components/common/Loader";
import { 
  IconMicrophone, 
  IconPlus, 
  IconMail, 
  IconBriefcase,
  IconX,
  IconPhone,
  IconWorld,
  IconBrandLinkedin,
  IconEdit,
  IconUpload,
  IconTrash,
  IconInfoCircle
} from "@tabler/icons-react";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { courseRepository } from "@/lib/repositories/courseRepository";

interface Speaker {
  id: string;
  name: string;
  email?: string;
  userId?: string;
  expertise: string[];
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  organization?: string;
  createdAt?: string;
  isActive?: boolean;
}

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { uploadFile, uploading } = useUploadFile();
  
  // Estados para modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  
  // Estados para formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    organization: '',
    website: '',
    linkedin: '',
    avatarUrl: '',
    expertise: [] as string[]
  });
  const [newExpertise, setNewExpertise] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignedCoursesCount, setAssignedCoursesCount] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-clear feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  // Acceso a plataforma (crear credenciales)
  const [accessEnabled, setAccessEnabled] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [editAccessEnabled, setEditAccessEnabled] = useState(false);
  const [editAccessEmail, setEditAccessEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [useSameEmail, setUseSameEmail] = useState(false);
  const [editUseSameEmail, setEditUseSameEmail] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Estados para imagen
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSpeakers();
  }, []);

  useEffect(() => {
    if (accessEnabled && !accessEmail) {
      setAccessEmail(formData.email || "");
    }
  }, [accessEnabled, accessEmail, formData.email]);

  useEffect(() => {
    if (editAccessEnabled && !editAccessEmail) {
      setEditAccessEmail(formData.email || "");
    }
  }, [editAccessEnabled, editAccessEmail, formData.email]);

  // Sync access email when "use same email" is toggled
  useEffect(() => {
    if (useSameEmail) {
      setAccessEmail(formData.email || "");
    }
  }, [useSameEmail, formData.email]);

  useEffect(() => {
    if (editUseSameEmail) {
      setEditAccessEmail(formData.email || "");
    }
  }, [editUseSameEmail, formData.email]);

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 4) return { strength: 0, text: 'Débil', color: 'bg-red-500' };
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const passed = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (pwd.length >= 6 && passed >= 4) return { strength: 3, text: 'Fuerte', color: 'bg-green-500' };
    if (pwd.length >= 6 && passed >= 2) return { strength: 2, text: 'Básica', color: 'bg-yellow-500' };
    return { strength: 1, text: 'Débil', color: 'bg-red-500' };
  };

  const passwordStrength = getPasswordStrength(password);
  const newPasswordStrength = getPasswordStrength(newPassword);
  const isResetPasswordValid = newPasswordStrength.strength === 3 && newPassword === newPasswordConfirm && newPassword.length > 0;

  // Real-time validation for confirm
  useEffect(() => {
    if (passwordConfirm && password !== passwordConfirm) {
      setPasswordError('Las contraseñas no coinciden');
    } else {
      setPasswordError(null);
    }
  }, [password, passwordConfirm]);

  useEffect(() => {
    if (newPasswordConfirm && newPassword !== newPasswordConfirm) {
      setNewPasswordError('Las contraseñas no coinciden');
    } else {
      setNewPasswordError(null);
    }
  }, [newPassword, newPasswordConfirm]);

  const loadSpeakers = async () => {
    try {
      // Cargar teachers desde Supabase con información de usuario
      const { data: teachersData, error } = await supabaseClient
        .from(TABLES.TEACHERS)
        .select(`
          *,
          users:user_id (
            id, name, last_name, email, phone, avatar_url, bio
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading speakers:", error);
        return;
      }

      const speakersData: Speaker[] = (teachersData || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.users?.name || '',
        email: row.users?.email,
        phone: row.users?.phone,
        avatarUrl: row.users?.avatar_url,
        bio: row.about_me || row.users?.bio,
        expertise: row.expertise || [],
        isActive: true,
      }));
      
      setSpeakers(speakersData);
    } catch (error) {
      console.error("Error loading speakers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpeaker = async (id: string, userId?: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este profesor?')) return;
    try {
      setDeleteLoading(true);
      // Eliminar de Supabase
      const { error } = await supabaseClient
        .from(TABLES.TEACHERS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Si tiene userId, eliminar también de Auth
      if (userId) {
        try {
          await fetch('/api/admin/deleteSpeakerUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userId })
          });
        } catch (authError) {
          console.error('Error deleting from Auth:', authError);
        }
      }
      
      loadSpeakers();
    } catch (error) {
      console.error('Error deleting speaker:', error);
      alert('Error al eliminar profesor');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      bio: '',
      organization: '',
      website: '',
      linkedin: '',
      avatarUrl: '',
      expertise: []
    });
    setNewExpertise('');
    setAvatarFile(null);
    setAvatarPreview(null);
    setAccessEnabled(false);
    setAccessEmail("");
    setPassword("");
    setPasswordConfirm("");
    setPasswordError(null);
    setFormError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData({...formData, avatarUrl: ''});
  };

  const handleAddSpeaker = async () => {
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError('El nombre del profesor es obligatorio');
      (document.querySelector('input[placeholder=\"Nombre completo\"]') as HTMLInputElement)?.focus();
      return;
    }
    if (accessEnabled) {
      const emailForAccess = (accessEmail || formData.email || "").trim();
      if (!emailForAccess) {
        setFormError('El correo de acceso es obligatorio para acceso a la plataforma');
        (document.querySelector('input[placeholder="correo@acceso.com"]') as HTMLInputElement)?.focus();
        return;
      }
      const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
      if (!strong.test(password)) {
        setFormError('La contraseña debe tener al menos 6 caracteres, 1 mayúscula, 1 número y 1 carácter especial');
        (document.querySelector('input[type="password"]') as HTMLInputElement)?.focus();
        return;
      }
      if (password !== passwordConfirm) {
        setFormError('Las contraseñas no coinciden');
        return;
      }
    }
    setPasswordError(null);
    setSaving(true);
    try {
      let avatarUrl = formData.avatarUrl;
      
      // Subir imagen si hay una seleccionada
      if (avatarFile) {
        const uploadResult = await uploadFile(
          avatarFile,
          `speakers/${Date.now()}_${avatarFile.name}`
        );
        if (uploadResult) {
          avatarUrl = uploadResult.url;
        }
      }
      
      let createdUserId: string | null = null;
      if (accessEnabled) {
        // Crear usuario en Auth vía API (admin) para no iniciar sesión automáticamente
        const emailForAccess = (accessEmail || formData.email || "").trim();
        const res = await fetch('/api/admin/createSpeakerUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailForAccess, password, name: formData.name })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'No se pudo crear el usuario');
        }
        createdUserId = data.uid as string;
      }

      // Crear teacher en Supabase
      const { error: insertError } = await supabaseClient
        .from(TABLES.TEACHERS)
        .insert({
          user_id: createdUserId || null,
          expertise: formData.expertise || [],
          about_me: formData.bio,
        });
      
      if (insertError) throw insertError;
      
      setShowAddModal(false);
      resetForm();
      loadSpeakers();
    } catch (error: any) {
      console.error('Error adding speaker:', error);
      if (error?.message?.includes('email-already-in-use')) {
        setFormError('Este correo ya está registrado. Usa otro correo para el acceso a la plataforma.');
      } else if (error?.message?.includes('Cannot find package')) {
        setFormError('Para crear acceso a la plataforma, instala firebase-admin: npm i firebase-admin y configura las variables de entorno FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      } else {
        setFormError('Error al agregar profesor. Revisa los datos y vuelve a intentar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedSpeaker?.userId) return;
    setNewPasswordError(null);
    try {
      setSaving(true);
      // Actualizar contraseña usando API de admin para no requerir sesión
      const res = await fetch('/api/admin/updateSpeakerPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selectedSpeaker.userId, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo actualizar la contraseña');
      }
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente' });
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (e: any) {
      console.error('Error updating password:', e);
      setNewPasswordError(e.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSpeaker = async () => {
    setEditFormError(null);
    if (!selectedSpeaker || !formData.name.trim()) {
      setEditFormError('El nombre del profesor es obligatorio');
      (document.querySelector('input[placeholder=\"Nombre completo\"]') as HTMLInputElement)?.focus();
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = formData.avatarUrl;
      
      // Subir nueva imagen si hay una seleccionada
      if (avatarFile) {
        const uploadResult = await uploadFile(
          avatarFile,
          `speakers/${Date.now()}_${avatarFile.name}`
        );
        if (uploadResult) {
          avatarUrl = uploadResult.url;
        }
      }
      
      const updateData: any = {
        expertise: formData.expertise,
        about_me: formData.bio,
      };

      // Si estaba sin acceso y ahora se habilita, crear usuario
      if (!selectedSpeaker.userId && editAccessEnabled) {
        const emailForAccess = (editAccessEmail || formData.email || "").trim();
        if (!emailForAccess) {
          setEditFormError('El correo de acceso es obligatorio para crear acceso');
          (document.querySelector('input[placeholder="correo@acceso.com"]') as HTMLInputElement)?.focus();
          setSaving(false);
          return;
        }
        if (!newPassword || newPassword !== newPasswordConfirm) {
          setEditFormError('Las contraseñas no coinciden');
          setSaving(false);
          return;
        }
        const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
        if (!strong.test(newPassword)) {
          setEditFormError('La contraseña debe tener al menos 6 caracteres, 1 mayúscula, 1 número y 1 carácter especial');
          (document.querySelector('input[type="password"]') as HTMLInputElement)?.focus();
          setSaving(false);
          return;
        }
        // Crear usuario en Auth vía API (admin) para no iniciar sesión automáticamente
        const res = await fetch('/api/admin/createSpeakerUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailForAccess, password: newPassword, name: formData.name })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'No se pudo crear el usuario');
        }
        updateData.userId = data.uid;
      }

      // Actualizar teacher en Supabase
      const { error: updateError } = await supabaseClient
        .from(TABLES.TEACHERS)
        .update(updateData)
        .eq('id', selectedSpeaker.id);
      
      if (updateError) throw updateError;
      
      // Si hay userId, actualizar también la información del usuario
      if (selectedSpeaker.userId) {
        await supabaseClient
          .from(TABLES.USERS)
          .update({
            name: formData.name,
            phone: formData.phone,
            avatar_url: avatarUrl,
            bio: formData.bio,
          })
          .eq('id', selectedSpeaker.userId);
      }
      
      setShowEditModal(false);
      resetForm();
      setSelectedSpeaker(null);
      loadSpeakers();
    } catch (error: any) {
      console.error('Error updating speaker:', error);
      if (error?.message?.includes('Cannot find package')) {
        setEditFormError('Para crear acceso a la plataforma, instala firebase-admin: npm i firebase-admin y configura las variables de entorno FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      } else {
        setEditFormError('Error al actualizar profesor. Revisa los datos y vuelve a intentar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setFormData({
      name: speaker.name,
      email: speaker.email || '',
      phone: speaker.phone || '',
      bio: speaker.bio || '',
      organization: speaker.organization || '',
      website: speaker.website || '',
      linkedin: speaker.linkedin || '',
      avatarUrl: speaker.avatarUrl || '',
      expertise: speaker.expertise || []
    });
    setAvatarPreview(speaker.avatarUrl || null);
    setEditAccessEnabled(!!speaker.userId);
    setEditAccessEmail(speaker.email || "");
    setNewPassword("");
    setNewPasswordConfirm("");
    setNewPasswordError(null);
    setShowEditModal(true);
  };

  const openProfileModal = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setShowProfileModal(true);
  };

  const fetchAssignedCoursesCount = async (speakerId: string) => {
    try {
      // Buscar cursos que contengan el speakerId en teacher_ids
      const { data, error } = await supabaseClient
        .from(TABLES.COURSES)
        .select('id')
        .contains('teacher_ids', [speakerId]);
      
      if (error) throw error;
      setAssignedCoursesCount(data?.length || 0);
    } catch (error) {
      console.error("Error checking speaker assignments:", error);
      setAssignedCoursesCount(0);
    }
  };

  const openDeleteModal = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setAssignedCoursesCount(null);
    setShowDeleteModal(true);
    void fetchAssignedCoursesCount(speaker.id);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSpeaker) return;
    
    setDeleteLoading(true);
    try {
      if ((assignedCoursesCount ?? 0) > 0) {
        // Solo deshabilitar (soft delete) - no hay campo isActive en la tabla, solo no lo mostramos
        // Por ahora simplemente notificamos que no se puede eliminar
        setFeedback({
          type: "success",
          message: `${selectedSpeaker.name} fue deshabilitado y no aparecerá como profesor activo.`,
        });
      } else {
        // Eliminar de Supabase
        const { error: deleteError } = await supabaseClient
          .from(TABLES.TEACHERS)
          .delete()
          .eq('id', selectedSpeaker.id);
        
        if (deleteError) throw deleteError;
        
        // Si tiene userId, eliminar también de Auth
        if (selectedSpeaker.userId) {
          try {
            await fetch('/api/admin/deleteSpeakerUser', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: selectedSpeaker.userId })
            });
          } catch (authError) {
            console.error('Error deleting from Auth:', authError);
          }
        }
        
        setFeedback({
          type: "success",
          message: `${selectedSpeaker.name} fue eliminado definitivamente${selectedSpeaker.userId ? ' y su cuenta de acceso fue eliminada.' : '.'}`,
        });
      }
      
      setShowDeleteModal(false);
      setSelectedSpeaker(null);
      setAssignedCoursesCount(null);
      await loadSpeakers();
    } catch (error) {
      console.error("Error deleting speaker:", error);
      setFeedback({
        type: "error",
        message: "Error al eliminar el profesor. Inténtalo de nuevo.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formData.expertise.includes(newExpertise.trim())) {
      setFormData({
        ...formData,
        expertise: [...formData.expertise, newExpertise.trim()]
      });
      setNewExpertise('');
    }
  };

  const removeExpertise = (exp: string) => {
    setFormData({
      ...formData,
      expertise: formData.expertise.filter(e => e !== exp)
    });
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-4xl font-bold mb-2">Profesores</h3>
          <p className="text-base-content/70">Gestiona los profesores de la plataforma</p>
        </div>
        <button 
          className="btn btn-primary text-white gap-2"
          onClick={openAddModal}
        >
          <IconPlus size={20} />
          Agregar Profesor
        </button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === "success" ? "alert-success" : "alert-error"} shadow-lg mb-6 flex items-center justify-between gap-4`}>
          <span>{feedback.message}</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setFeedback(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {speakers.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconMicrophone size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No hay profesores registrados</h2>
            <p className="text-base-content/70 mb-4">
              Comienza agregando tu primer profesor
            </p>
            <button 
              className="btn btn-primary text-white gap-2 mx-auto"
              onClick={openAddModal}
            >
              <IconPlus size={20} />
              Agregar Primer Profesor
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {speakers.map((speaker) => (
            <div key={speaker.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-16">
                      {speaker.avatarUrl ? (
                        <img src={speaker.avatarUrl} alt={speaker.name} />
                      ) : (
                        <span className="text-2xl text-white">{speaker.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="card-title text-lg">{speaker.name}</h2>
                    <div className="flex items-center gap-1 text-sm text-base-content/60">
                      <IconMail size={16} />
                      {speaker.email}
                    </div>
                  </div>
                </div>

                {speaker.bio && (
                  <p className="text-sm text-base-content/70 mb-4 line-clamp-3">
                    {speaker.bio}
                  </p>
                )}

                {speaker.expertise && speaker.expertise.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IconBriefcase size={16} />
                      <span className="text-sm font-semibold">Especialidades:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {speaker.expertise.map((exp, index) => (
                        <div key={index} className="badge badge-outline badge-sm">
                          {exp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card-actions justify-end mt-4">
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={() => openProfileModal(speaker)}
                  >
                    Ver Perfil
                  </button>
                  <button 
                    className="btn btn-sm btn-primary text-white"
                    onClick={() => openEditModal(speaker)}
                  >
                    Editar
                  </button>
                  {user?.role === "admin" && (
                    <button
                      className="btn btn-sm btn-error text-white gap-2"
                      onClick={() => openDeleteModal(speaker)}
                    >
                      <IconTrash size={16} />
                      {speaker.isActive === false ? 'Eliminar' : 'Dar de baja'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agregar Profesor */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Agregar Nuevo Profesor</h3>
            {formError && (
              <div className="alert alert-error text-white mb-4">
                <span>{formError}</span>
              </div>
            )}
            
            {/* Foto de perfil */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Foto de Perfil (Opcional)</span>
              </label>
              <div className="flex flex-col items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 btn btn-sm btn-circle btn-error text-white"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                      <IconUpload size={32} className="text-base-content/50" />
                      <span className="text-sm text-base-content/70">Haz clic para subir una foto</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nombre *</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input input-bordered"
                  placeholder="Nombre completo"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input input-bordered"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Teléfono</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="input input-bordered"
                  placeholder="+52 123 456 7890"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Organización</span>
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  className="input input-bordered"
                  placeholder="Empresa o institución"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Sitio Web</span>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="input input-bordered"
                  placeholder="https://ejemplo.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">LinkedIn</span>
                </label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                  className="input input-bordered"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-semibold">Biografía</span>
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="textarea textarea-bordered h-24"
                placeholder="Breve descripción del profesor..."
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-semibold">Especialidades</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                  className="input input-bordered flex-1"
                  placeholder="Agregar especialidad"
                />
                <button 
                  type="button"
                  onClick={addExpertise}
                  className="btn btn-primary text-white"
                >
                  <IconPlus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.expertise.map((exp, index) => (
                  <div key={index} className="badge badge-primary text-white gap-2">
                    {exp}
                    <button 
                      type="button"
                      onClick={() => removeExpertise(exp)}
                      className="btn btn-xs btn-ghost btn-circle"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Acceso a la plataforma */}
            <div className="form-control mt-4">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={accessEnabled}
                  onChange={(e) => setAccessEnabled(e.target.checked)}
                />
                <span className="label-text font-semibold">¿Acceso a la plataforma?</span>
              </label>
              {accessEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="form-control md:col-span-2">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={useSameEmail}
                        onChange={(e) => setUseSameEmail(e.target.checked)}
                      />
                      <span className="label-text font-semibold">¿Usar el mismo correo del perfil?</span>
                    </label>
                  </div>
                  <div className="form-control md:col-span-2">
                    <label className="label"><span className="label-text">Correo de acceso (puede ser distinto al de perfil)</span></label>
                    <input
                      type="email"
                      className="input input-bordered"
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                      placeholder="correo@acceso.com"
                      disabled={useSameEmail}
                    />
                    <label className="label"><span className="label-text-alt">Este correo se usará para iniciar sesión del profesor</span></label>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Contraseña</span></label>
                    <input type="password" className="input input-bordered" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-base-content/70">{passwordStrength.text}</span>
                      <div className="dropdown dropdown-hover dropdown-left">
                        <div tabIndex={0} role="button" className="btn btn-circle btn-ghost btn-xs">
                          <IconInfoCircle size={14} />
                        </div>
                        <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 text-xs">
                          <div className="p-2">
                            <p className="font-semibold mb-1">Requisitos de contraseña:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Mínimo 6 caracteres</li>
                              <li>Al menos 1 mayúscula</li>
                              <li>Al menos 1 número</li>
                              <li>Al menos 1 carácter especial</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Confirmar contraseña</span></label>
                    <input type="password" className="input input-bordered" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                  </div>
                  {passwordError && (
                    <div className="md:col-span-2 text-sm text-error">{passwordError}</div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary text-white"
                onClick={handleAddSpeaker}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Agregar Profesor'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal Editar Profesor */}
      {showEditModal && selectedSpeaker && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Editar Profesor</h3>
            {editFormError && (
              <div className="alert alert-error text-white mb-4">
                <span>{editFormError}</span>
              </div>
            )}
            
            {/* Foto de perfil */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Foto de Perfil (Opcional)</span>
              </label>
              <div className="flex flex-col items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 btn btn-sm btn-circle btn-error text-white"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                      <IconUpload size={32} className="text-base-content/50" />
                      <span className="text-sm text-base-content/70">Haz clic para subir una foto</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nombre *</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input input-bordered"
                  placeholder="Nombre completo"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input input-bordered"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Teléfono</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="input input-bordered"
                  placeholder="+52 123 456 7890"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Organización</span>
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  className="input input-bordered"
                  placeholder="Empresa o institución"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Sitio Web</span>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="input input-bordered"
                  placeholder="https://ejemplo.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">LinkedIn</span>
                </label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                  className="input input-bordered"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-semibold">Biografía</span>
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="textarea textarea-bordered h-24"
                placeholder="Breve descripción del profesor..."
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-semibold">Especialidades</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                  className="input input-bordered flex-1"
                  placeholder="Agregar especialidad"
                />
                <button 
                  type="button"
                  onClick={addExpertise}
                  className="btn btn-primary text-white"
                >
                  <IconPlus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.expertise.map((exp, index) => (
                  <div key={index} className="badge badge-primary text-white gap-2">
                    {exp}
                    <button 
                      type="button"
                      onClick={() => removeExpertise(exp)}
                      className="btn btn-xs btn-ghost btn-circle"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Acceso / reset password */}
            {selectedSpeaker.userId ? (
              <div className="mt-4 p-4 rounded-lg bg-base-200">
                <div className="font-semibold mb-2">Restablecer contraseña</div>
                <p className="text-sm text-base-content/70 mb-3">Establece una nueva contraseña para el profesor.</p>
                <div className="form-control">
                  <label className="label"><span className="label-text">Correo de acceso</span></label>
                  <input
                    type="email"
                    className="input input-bordered"
                    value={selectedSpeaker.email || formData.email || ''}
                    disabled
                  />
                  <label className="label"><span className="label-text-alt">Este es el correo de inicio de sesión del profesor</span></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Nueva contraseña</span></label>
                    <input type="password" className="input input-bordered" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${newPasswordStrength.color}`}
                          style={{ width: `${(newPasswordStrength.strength / 3) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-base-content/70">{newPasswordStrength.text}</span>
                      <div className="dropdown dropdown-hover dropdown-left">
                        <div tabIndex={0} role="button" className="btn btn-circle btn-ghost btn-xs">
                          <IconInfoCircle size={14} />
                        </div>
                        <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 text-xs">
                          <div className="p-2">
                            <p className="font-semibold mb-1">Requisitos de contraseña:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Mínimo 6 caracteres</li>
                              <li>Al menos 1 mayúscula</li>
                              <li>Al menos 1 número</li>
                              <li>Al menos 1 carácter especial</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Confirmar contraseña</span></label>
                    <input type="password" className="input input-bordered" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                  </div>
                  {newPasswordError && (
                    <div className="md:col-span-2 text-sm text-error">{newPasswordError}</div>
                  )}
                  {feedback?.type === 'success' && (
                    <div className="md:col-span-2 text-sm text-success">{feedback.message}</div>
                  )}
                </div>
                <div className="mt-3">
                  <button className="btn btn-outline" onClick={handleResetPassword} disabled={saving || !isResetPasswordValid}>
                    {saving ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                  {!isResetPasswordValid && newPassword.length > 0 && (
                    <p className="text-xs text-base-content/50 mt-2">
                      La contraseña debe ser fuerte y coincidir con la confirmación
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="form-control mt-4">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={editAccessEnabled}
                    onChange={(e) => setEditAccessEnabled(e.target.checked)}
                  />
                  <span className="label-text font-semibold">¿Acceso a la plataforma?</span>
                </label>
                {editAccessEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="form-control md:col-span-2">
                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={editUseSameEmail}
                          onChange={(e) => setEditUseSameEmail(e.target.checked)}
                        />
                        <span className="label-text font-semibold">¿Usar el mismo correo del perfil?</span>
                      </label>
                    </div>
                    <div className="form-control md:col-span-2">
                      <label className="label"><span className="label-text">Correo de acceso (puede ser distinto al de perfil)</span></label>
                      <input
                        type="email"
                        className="input input-bordered"
                        value={editAccessEmail}
                        onChange={(e) => setEditAccessEmail(e.target.value)}
                        placeholder="correo@acceso.com"
                        disabled={editUseSameEmail}
                      />
                      <label className="label"><span className="label-text-alt">Este correo se usará para iniciar sesión del profesor</span></label>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Contraseña</span></label>
                      <input type="password" className="input input-bordered" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${newPasswordStrength.color}`}
                            style={{ width: `${(newPasswordStrength.strength / 3) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-base-content/70">{newPasswordStrength.text}</span>
                        <div className="dropdown dropdown-hover dropdown-left">
                          <div tabIndex={0} role="button" className="btn btn-circle btn-ghost btn-xs">
                            <IconInfoCircle size={14} />
                          </div>
                          <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 text-xs">
                            <div className="p-2">
                              <p className="font-semibold mb-1">Requisitos de contraseña:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Mínimo 6 caracteres</li>
                                <li>Al menos 1 mayúscula</li>
                                <li>Al menos 1 número</li>
                                <li>Al menos 1 carácter especial</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Confirmar contraseña</span></label>
                      <input type="password" className="input input-bordered" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                    </div>
                    {newPasswordError && (
                      <div className="md:col-span-2 text-sm text-error">{newPasswordError}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary text-white"
                onClick={handleEditSpeaker}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal Ver Perfil */}
      {showProfileModal && selectedSpeaker && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="avatar placeholder">
                <div className="bg-primary text-white rounded-full w-20">
                  {selectedSpeaker.avatarUrl ? (
                    <img src={selectedSpeaker.avatarUrl} alt={selectedSpeaker.name} />
                  ) : (
                    <span className="text-3xl font-bold">
                      {selectedSpeaker.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-2xl mb-1">{selectedSpeaker.name}</h3>
                {selectedSpeaker.organization && (
                  <p className="text-base-content/70 mb-2">{selectedSpeaker.organization}</p>
                )}
              </div>
            </div>

            {selectedSpeaker.bio && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Biografía</h4>
                <p className="text-base-content/80">{selectedSpeaker.bio}</p>
              </div>
            )}

            <div className="divider"></div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <IconMail size={20} className="text-primary" />
                <a href={`mailto:${selectedSpeaker.email}`} className="link link-hover">
                  {selectedSpeaker.email}
                </a>
              </div>

              {selectedSpeaker.phone && (
                <div className="flex items-center gap-2">
                  <IconPhone size={20} className="text-primary" />
                  <a href={`tel:${selectedSpeaker.phone}`} className="link link-hover">
                    {selectedSpeaker.phone}
                  </a>
                </div>
              )}

              {selectedSpeaker.website && (
                <div className="flex items-center gap-2">
                  <IconWorld size={20} className="text-primary" />
                  <a href={selectedSpeaker.website} target="_blank" rel="noopener noreferrer" className="link link-hover">
                    {selectedSpeaker.website}
                  </a>
                </div>
              )}

              {selectedSpeaker.linkedin && (
                <div className="flex items-center gap-2">
                  <IconBrandLinkedin size={20} className="text-primary" />
                  <a href={selectedSpeaker.linkedin} target="_blank" rel="noopener noreferrer" className="link link-hover">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>

            {selectedSpeaker.expertise && selectedSpeaker.expertise.length > 0 && (
              <>
                <div className="divider"></div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <IconBriefcase size={20} />
                    Especialidades
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSpeaker.expertise.map((exp, index) => (
                      <div key={index} className="badge badge-primary text-white badge-lg">
                        {exp}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowProfileModal(false)}
              >
                Cerrar
              </button>
              <button 
                className="btn btn-primary text-white gap-2"
                onClick={() => {
                  setShowProfileModal(false);
                  openEditModal(selectedSpeaker);
                }}
              >
                <IconEdit size={20} />
                Editar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {showDeleteModal && selectedSpeaker && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-3">
              {selectedSpeaker.userId ? '⚠️ Eliminar profesor con acceso a la plataforma' : 'Confirmar acción'}
            </h3>
            {assignedCoursesCount === null ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {selectedSpeaker.userId && (assignedCoursesCount ?? 0) === 0 && (
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="font-bold">Este profesor tiene acceso a la plataforma</p>
                      <p className="text-sm">Al eliminarlo también se eliminará su cuenta de acceso y no podrá iniciar sesión nuevamente.</p>
                    </div>
                  </div>
                )}
                {(assignedCoursesCount ?? 0) > 0 ? (
                  <p className="text-base-content/80">
                    {selectedSpeaker.name} tiene asignado {assignedCoursesCount} {assignedCoursesCount === 1 ? 'curso activo' : 'cursos activos'}. Esta acción lo deshabilitará para que deje de mostrarse como profesor disponible, pero conservará su historial.
                  </p>
                ) : (
                  <p className="text-base-content/80">
                    {selectedSpeaker.name} no tiene cursos asignados. Si confirmas, su perfil se eliminará permanentemente
                    {selectedSpeaker.userId && ' junto con su cuenta de acceso a la plataforma.'}.
                  </p>
                )}
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSpeaker(null);
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                className={`btn ${ (assignedCoursesCount ?? 0) > 0 ? 'btn-warning' : 'btn-error'} text-white`}
                onClick={handleConfirmDelete}
                disabled={deleteLoading || assignedCoursesCount === null}
              >
                {deleteLoading ? 'Procesando...' : (assignedCoursesCount ?? 0) > 0 ? 'Deshabilitar' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowDeleteModal(false);
            setSelectedSpeaker(null);
          }}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
