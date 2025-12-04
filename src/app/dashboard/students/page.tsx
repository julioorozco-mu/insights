"use client";

import { useEffect, useState } from "react";
import { Loader } from "@/components/common/Loader";
import { 
  IconSchool, 
  IconMail, 
  IconCalendar, 
  IconBook, 
  IconCertificate,
  IconEye,
  IconTrophy,
  IconX
} from "@tabler/icons-react";
import { formatDate } from "@/utils/formatDate";

interface Student {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  state?: string;
  avatarUrl?: string;
  username?: string;
  enrollmentDate?: string;
  completedCourses?: string[];
  certificates?: string[];
  createdAt: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        // Usar API del servidor para evitar problemas de RLS y timeouts
        const res = await fetch('/api/admin/getStudents');
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Error loading students:", errorData);
          setStudents([]);
          return;
        }
        
        const data = await res.json();
        setStudents(data.students || []);
      } catch (error) {
        console.error("Error loading students:", error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.name} ${student.lastName || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || student.email.toLowerCase().includes(search);
  });

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Estudiantes</h1>
          <p className="text-base-content/70">Consulta la información y progreso de los estudiantes</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered w-full max-w-md"
        />
      </div>

      {/* Estadísticas */}
      <div className="stats shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <IconSchool size={32} />
          </div>
          <div className="stat-title">Total Estudiantes</div>
          <div className="stat-value text-primary">{students.length}</div>
          <div className="stat-desc">Registrados en la plataforma</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <IconBook size={32} />
          </div>
          <div className="stat-title">Cursos Completados</div>
          <div className="stat-value text-secondary">
            {students.reduce((acc, s) => acc + (s.completedCourses?.length || 0), 0)}
          </div>
          <div className="stat-desc">En total</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <IconCertificate size={32} />
          </div>
          <div className="stat-title">Certificados Emitidos</div>
          <div className="stat-value text-accent">
            {students.reduce((acc, s) => acc + (s.certificates?.length || 0), 0)}
          </div>
          <div className="stat-desc">Total generados</div>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconSchool size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {searchTerm ? "No se encontraron estudiantes" : "No hay estudiantes registrados"}
            </h2>
            <p className="text-base-content/70 mb-4">
              {searchTerm 
                ? "Intenta con otro término de búsqueda" 
                : "Los estudiantes aparecerán aquí cuando se registren"}
            </p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Contacto</th>
                  <th>Información</th>
                  <th>Progreso</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-white rounded-full w-12">
                          {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt={student.name} />
                          ) : (
                            <span className="text-lg font-bold">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">
                          {student.name} {student.lastName || ''}
                        </div>
                        {student.username && (
                          <div className="text-sm opacity-50">@{student.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-sm">
                        <IconMail size={14} />
                        {student.email}
                      </div>
                      {student.phone && (
                        <div className="text-sm opacity-70">{student.phone}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 text-sm">
                      {student.gender && (
                        <div>
                          <span className="font-semibold">Género:</span>{' '}
                          {student.gender === 'male' ? 'M' : student.gender === 'female' ? 'F' : 'Otro'}
                        </div>
                      )}
                      {student.state && (
                        <div>
                          <span className="font-semibold">Estado:</span> {student.state}
                        </div>
                      )}
                      {student.dateOfBirth && (
                        <div className="flex items-center gap-1">
                          <IconCalendar size={14} />
                          {new Date(student.dateOfBirth).toLocaleDateString('es-MX')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <div className="badge badge-neutral text-white gap-1 whitespace-nowrap">
                        <IconBook size={14} />
                        {student.completedCourses?.length || 0} cursos
                      </div>
                      <div className="badge badge-success text-white gap-1 whitespace-nowrap">
                        <IconCertificate size={14} />
                        {student.certificates?.length || 0} certificados
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">
                      {formatDate(student.createdAt)}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-primary text-white whitespace-nowrap"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowProfileModal(true);
                      }}
                    >
                      Ver Perfil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Paginación (placeholder) */}
      {filteredStudents.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="join">
            <button className="join-item btn btn-sm">«</button>
            <button className="join-item btn btn-sm btn-active">1</button>
            <button className="join-item btn btn-sm">»</button>
          </div>
        </div>
      )}

      {/* Modal Ver Perfil del Estudiante */}
      {showProfileModal && selectedStudent && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            {/* Header con Avatar */}
            <div className="flex items-start gap-4 mb-6">
              <div className="avatar placeholder">
                <div className="bg-primary text-white rounded-full w-20">
                  {selectedStudent.avatarUrl ? (
                    <img src={selectedStudent.avatarUrl} alt={selectedStudent.name} />
                  ) : (
                    <span className="text-3xl font-bold">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-2xl mb-1">
                  {selectedStudent.name} {selectedStudent.lastName || ''}
                </h3>
                {selectedStudent.username && (
                  <p className="text-base-content/70">@{selectedStudent.username}</p>
                )}
                <div className="badge badge-primary text-white mt-2">Estudiante</div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="card bg-base-200 mb-4">
              <div className="card-body">
                <h4 className="font-semibold text-lg mb-3">Información de Contacto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <IconMail size={18} className="text-primary" />
                    <div>
                      <p className="text-xs text-base-content/60">Email</p>
                      <a href={`mailto:${selectedStudent.email}`} className="link link-hover">
                        {selectedStudent.email}
                      </a>
                    </div>
                  </div>

                  {selectedStudent.phone && (
                    <div className="flex items-center gap-2">
                      <IconCalendar size={18} className="text-primary" />
                      <div>
                        <p className="text-xs text-base-content/60">Teléfono</p>
                        <p>{selectedStudent.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedStudent.dateOfBirth && (
                    <div className="flex items-center gap-2">
                      <IconCalendar size={18} className="text-primary" />
                      <div>
                        <p className="text-xs text-base-content/60">Fecha de Nacimiento</p>
                        <p>{new Date(selectedStudent.dateOfBirth).toLocaleDateString('es-MX')}</p>
                      </div>
                    </div>
                  )}

                  {selectedStudent.gender && (
                    <div>
                      <p className="text-xs text-base-content/60">Género</p>
                      <p>{selectedStudent.gender === 'male' ? 'Masculino' : selectedStudent.gender === 'female' ? 'Femenino' : 'Otro'}</p>
                    </div>
                  )}

                  {selectedStudent.state && (
                    <div>
                      <p className="text-xs text-base-content/60">Estado</p>
                      <p>{selectedStudent.state}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-base-content/60">Fecha de Registro</p>
                    <p>{formatDate(selectedStudent.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progreso Académico */}
            <div className="card bg-base-200 mb-4">
              <div className="card-body">
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <IconTrophy size={20} className="text-warning" />
                  Progreso Académico
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cursos Completados */}
                  <div className="stat bg-base-100 rounded-lg p-4">
                    <div className="stat-figure text-primary">
                      <IconBook size={32} />
                    </div>
                    <div className="stat-title">Cursos Completados</div>
                    <div className="stat-value text-primary">
                      {selectedStudent.completedCourses?.length || 0}
                    </div>
                    <div className="stat-desc">Total de cursos finalizados</div>
                  </div>

                  {/* Certificados */}
                  <div className="stat bg-base-100 rounded-lg p-4">
                    <div className="stat-figure text-success">
                      <IconCertificate size={32} />
                    </div>
                    <div className="stat-title">Certificados</div>
                    <div className="stat-value text-success">
                      {selectedStudent.certificates?.length || 0}
                    </div>
                    <div className="stat-desc">Certificados obtenidos</div>
                  </div>
                </div>

                {/* Lista de Cursos Completados */}
                {selectedStudent.completedCourses && selectedStudent.completedCourses.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold mb-2">Cursos Completados:</h5>
                    <div className="space-y-2">
                      {selectedStudent.completedCourses.map((courseId, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                          <IconBook size={16} className="text-primary" />
                          <span className="text-sm">Curso ID: {courseId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de Certificados */}
                {selectedStudent.certificates && selectedStudent.certificates.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold mb-2">Certificados Obtenidos:</h5>
                    <div className="space-y-2">
                      {selectedStudent.certificates.map((certId, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                          <IconCertificate size={16} className="text-success" />
                          <span className="text-sm">Certificado ID: {certId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!selectedStudent.completedCourses || selectedStudent.completedCourses.length === 0) && 
                 (!selectedStudent.certificates || selectedStudent.certificates.length === 0) && (
                  <div className="alert alert-info mt-4 text-white">
                    <IconSchool size={20} />
                    <span>Este estudiante aún no ha completado ningún curso.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nota informativa */}
            <div className="alert alert-warning text-white">
              <IconSchool size={20} />
              <div>
                <h4 className="font-semibold">Nota:</h4>
                <p className="text-sm">Los estudiantes deben actualizar su información desde su perfil personal. Los administradores solo pueden consultar esta información.</p>
              </div>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowProfileModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
