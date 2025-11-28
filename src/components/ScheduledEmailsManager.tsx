"use client";

import { useState, useEffect } from "react";
import {
  IconMail,
  IconClock,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconTrash,
  IconCalendar,
} from "@tabler/icons-react";

interface ScheduledEmail {
  id: string;
  type: 'lesson' | 'course';
  lessonTitle: string;
  courseTitle?: string;
  scheduledDate: string;
  recipients: string[];
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
  sentAt?: string;
  cancelledAt?: string;
}

interface ScheduledEmailsManagerProps {
  userId: string;
}

export function ScheduledEmailsManager({ userId }: ScheduledEmailsManagerProps) {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'cancelled'>('all');
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledEmails();
  }, [filter]);

  const loadScheduledEmails = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`/api/scheduled-emails${statusParam}`);
      const data = await response.json();
      
      if (response.ok) {
        setScheduledEmails(data.scheduledEmails);
      }
    } catch (error) {
      console.error("Error cargando correos programados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (emailId: string) => {
    if (!confirm("¿Deseas cancelar este correo programado?")) {
      return;
    }

    setCancelling(emailId);
    try {
      const response = await fetch("/api/scheduled-emails", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: emailId,
          cancelledBy: userId,
        }),
      });

      if (response.ok) {
        await loadScheduledEmails(); // Recargar lista
      } else {
        alert("Error al cancelar el correo");
      }
    } catch (error) {
      console.error("Error cancelando correo:", error);
      alert("Error al cancelar el correo");
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="badge badge-warning gap-1"><IconClock size={14} />Pendiente</div>;
      case 'sent':
        return <div className="badge badge-success gap-1"><IconCheck size={14} />Enviado</div>;
      case 'cancelled':
        return <div className="badge badge-error gap-1"><IconX size={14} />Cancelado</div>;
      case 'failed':
        return <div className="badge badge-error gap-1"><IconAlertCircle size={14} />Fallido</div>;
      default:
        return <div className="badge">{status}</div>;
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4 flex items-center gap-2 text-primary">
          <IconCalendar size={24} />
          Correos Programados
        </h2>
        <p className="text-sm text-base-content/70 mb-4">
          Gestiona los correos de recordatorio programados para lecciones y cursos.
        </p>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`btn btn-sm ${filter === 'pending' ? 'btn-warning' : 'btn-outline'}`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`btn btn-sm ${filter === 'sent' ? 'btn-success' : 'btn-outline'}`}
          >
            Enviados
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`btn btn-sm ${filter === 'cancelled' ? 'btn-error' : 'btn-outline'}`}
          >
            Cancelados
          </button>
        </div>

        {/* Lista de correos */}
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : scheduledEmails.length === 0 ? (
          <div className="text-center py-8">
            <IconMail size={48} className="mx-auto mb-4 text-base-content/30" />
            <p className="text-base-content/60">No hay correos programados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledEmails.map((email) => (
              <div
                key={email.id}
                className="border border-base-300 rounded-lg p-4 hover:bg-base-200 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{email.lessonTitle}</h3>
                    {email.courseTitle && (
                      <p className="text-sm text-base-content/60">Curso: {email.courseTitle}</p>
                    )}
                  </div>
                  {getStatusBadge(email.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <IconClock size={16} className="text-base-content/60" />
                    <span className="text-base-content/70">
                      Programado: {formatDate(email.scheduledDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconMail size={16} className="text-base-content/60" />
                    <span className="text-base-content/70">
                      {email.recipients.length} destinatario(s)
                    </span>
                  </div>
                </div>

                {email.status === 'sent' && email.sentCount !== undefined && (
                  <div className="alert alert-success text-white text-sm py-2 mb-2">
                    <IconCheck size={16} />
                    <span>
                      Enviado a {email.sentCount} de {email.recipients.length} destinatarios
                      {email.failedCount && email.failedCount > 0 && ` (${email.failedCount} fallidos)`}
                    </span>
                  </div>
                )}

                {email.status === 'pending' && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleCancel(email.id)}
                      className="btn btn-sm btn-error text-white gap-1"
                      disabled={cancelling === email.id}
                    >
                      {cancelling === email.id ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <IconTrash size={16} />
                          Cancelar Envío
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
