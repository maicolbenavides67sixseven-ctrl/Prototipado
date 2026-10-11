import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Clock,
  Users,
  Stethoscope,
  Bell,
  CheckCircle2,
  XCircle,
  MapPin,
  Volume2,
  Timer,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  HeartPulse,
  FlaskConical,
  X,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { useNotificationSound } from '@/hooks/useSound';
import { useNow, formatCountdown } from '@/hooks/useNow';
import { COUNTDOWN_SECONDS, AREA_LABELS, SUB_AREA_LABELS } from '@/types';
import type { User as AppUser, Appointment, MedicalArea } from '@/types';

interface WaitingScreenProps {
  user: AppUser;
}

type Phase = 'waiting' | 'next' | 'called' | 'in-attendance' | 'attended' | 'absent' | 'rescheduled';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_LABELS: Record<string, string> = {
  'scheduled': 'Programada',
  'checked-in': 'En sala',
  'called': 'Llamado',
  'in-attendance': 'En consulta',
  'attended': 'Atendido',
  'absent': 'Ausente',
  'rescheduled': 'Reagendado',
  'cancelled': 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  'scheduled': 'bg-sky-50 text-sky-700 border-sky-200',
  'checked-in': 'bg-amber-50 text-amber-700 border-amber-200',
  'called': 'bg-orange-50 text-orange-700 border-orange-200',
  'in-attendance': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'attended': 'bg-slate-100 text-slate-600 border-slate-200',
  'absent': 'bg-red-50 text-red-600 border-red-200',
  'rescheduled': 'bg-purple-50 text-purple-700 border-purple-200',
  'cancelled': 'bg-red-50 text-red-600 border-red-200',
};

function getPhase(apt: Appointment | undefined, position: number): Phase {
  if (!apt) return 'waiting';
  if (apt.status === 'called') return 'called';
  if (apt.status === 'in-attendance') return 'in-attendance';
  if (apt.status === 'attended') return 'attended';
  if (apt.status === 'absent') return 'absent';
  if (apt.status === 'rescheduled') return 'rescheduled';
  if (position === 0) return 'next';
  return 'waiting';
}

function areaIcon(area?: MedicalArea) {
  if (area === 'medicina-general') return <HeartPulse className="w-4 h-4" />;
  if (area === 'laboratorios') return <FlaskConical className="w-4 h-4" />;
  return <Stethoscope className="w-4 h-4" />;
}

export function WaitingScreen({ user }: WaitingScreenProps) {
  const { data, getMyAppointment, getQueuePosition, getEstimatedWait, cancelAppointment } = useApp();
  const { showToast } = useToast();
  const { play } = useNotificationSound();
  const now = useNow(1000);
  const previousPhaseRef = useRef<Phase>('waiting');
  const soundPlayedRef = useRef(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const apt = getMyAppointment(user.cedula);
  const position = apt ? getQueuePosition(user.cedula) : -1;
  const estimatedWait = apt ? getEstimatedWait(user.cedula) : 0;
  const phase = getPhase(apt, position);

  const isCalled = phase === 'called';
  const countdownRemaining = isCalled && data.countdownEndsAt
    ? Math.max(0, Math.floor((data.countdownEndsAt - now) / 1000))
    : 0;
  const countdownProgress = isCalled
    ? ((COUNTDOWN_SECONDS - countdownRemaining) / COUNTDOWN_SECONDS) * 100
    : 0;

  useEffect(() => {
    if (isCalled && !soundPlayedRef.current && previousPhaseRef.current !== 'called') {
      play();
      soundPlayedRef.current = true;
    }
    if (!isCalled) {
      soundPlayedRef.current = false;
    }
    previousPhaseRef.current = phase;
  }, [isCalled, phase, play]);

  useEffect(() => {
    if (isCalled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [isCalled]);

  // Patient's scheduled appointments (not walk-in, with appointmentDate)
  const myScheduledAppointments = useMemo(
    () =>
      data.appointments.filter(
        (a) =>
          a.patientCedula === user.cedula &&
          a.appointmentDate &&
          a.status !== 'cancelled' &&
          a.status !== 'attended' &&
          a.status !== 'absent',
      ),
    [data.appointments, user.cedula],
  );

  const handleCancelClick = (id: string) => {
    setCancelTargetId(id);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId || cancelling) return;
    setCancelling(true);
    try {
      const ok = await cancelAppointment(cancelTargetId);
      if (ok) {
        showToast('Cita cancelada correctamente en Supabase', 'info');
      } else {
        showToast('Error al cancelar la cita. Revisa la conexión.', 'error');
      }
    } catch {
      showToast('Error al cancelar la cita. Revisa la conexión.', 'error');
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
      setCancelTargetId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] px-4 py-5 max-w-md mx-auto">
      {/* Patient Calendar — always visible */}
      <PatientCalendar
        user={user}
        appointments={data.appointments}
        users={data.users}
        onCancel={handleCancelClick}
      />

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center px-4 animate-slide-up">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800">Cancelar Cita</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              ¿Está seguro de cancelar su cita? Recuerde que deberá acercarse nuevamente a la instalación médica para solicitar que se le reagende.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelTargetId(null);
                }}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600
                           border border-slate-200 hover:bg-slate-50 transition-all
                           disabled:opacity-60"
              >
                No, mantener cita
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white
                           bg-red-500 hover:bg-red-600 transition-all
                           disabled:opacity-60 disabled:cursor-wait
                           flex items-center justify-center gap-1.5"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown Alert — when called */}
      {isCalled && (
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl p-6 shadow-xl shadow-red-200 mb-4 text-white text-center animate-bounce-in">
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring" />
            <div className="relative w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto">
              <Bell className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold mb-1">¡Has sido llamado!</h2>
          <p className="text-white/90 text-sm mb-4">Presentáte en el cubículo de atención</p>

          <div className="inline-flex items-center gap-2 bg-white/15 rounded-2xl px-5 py-3 mb-3">
            <Timer className="w-7 h-7" />
            <span className="text-4xl font-extrabold font-mono tracking-tight">
              {formatCountdown(countdownRemaining)}
            </span>
          </div>

          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${countdownProgress}%` }}
            />
          </div>
          <p className="text-white/80 text-xs flex items-center justify-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            Tienes {formatCountdown(countdownRemaining)} para presentarte
          </p>
        </div>
      )}

      {/* Ticket Card */}
      {apt && (
        <div
          className={`rounded-3xl p-6 shadow-lg mb-4 transition-all duration-500 animate-slide-up ${
            phase === 'in-attendance'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
              : isCalled
                ? 'bg-white text-slate-800 border border-slate-100'
                : phase === 'next'
                  ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
                  : phase === 'rescheduled'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-white text-slate-800 border border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={`text-sm ${phase === 'waiting' ? 'text-slate-500' : 'text-white/70'}`}>
                Tu número de turno
              </p>
              <div className="text-5xl font-extrabold tracking-tight mt-1">
                #{String(apt.ticketNumber).padStart(2, '0')}
              </div>
            </div>
            {phase === 'in-attendance' && (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Stethoscope className="w-7 h-7" />
              </div>
            )}
            {phase === 'next' && (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
            )}
            {phase === 'waiting' && (
              <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center">
                <Clock className="w-7 h-7 text-sky-600" />
              </div>
            )}
            {phase === 'rescheduled' && (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
            )}
          </div>

          <div className={`h-px ${phase === 'waiting' ? 'bg-slate-100' : 'bg-white/20'} mb-4`} />

          {phase === 'waiting' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Tu posición en la fila</span>
                <span className="font-bold text-slate-800">
                  {position >= 0 ? `#${position + 1}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Pacientes antes que tú</span>
                <span className="font-bold text-sky-600 text-lg">{position}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Tiempo estimado
                </span>
                <span className="font-bold text-slate-800">~{estimatedWait} min</span>
              </div>
            </div>
          )}

          {phase === 'next' && (
            <div className="text-center py-2">
              <p className="text-lg font-bold">¡Eres el siguiente!</p>
              <p className="text-white/80 text-sm mt-1">Prepárate para entrar al consultorio</p>
            </div>
          )}

          {phase === 'in-attendance' && (
            <div className="text-center py-2">
              <p className="text-xl font-extrabold">En atención</p>
              <p className="text-white/90 text-sm mt-1">Estás siendo atendido por el médico</p>
            </div>
          )}

          {phase === 'rescheduled' && (
            <div className="text-center py-2">
              <p className="text-lg font-bold">Turno reagendado</p>
              <p className="text-white/90 text-sm mt-1">
                Te has movido un turno hacia atrás. Nueva posición: #{position >= 0 ? position + 1 : '—'}
              </p>
              <p className="text-white/70 text-xs mt-2">
                Reagendado {apt.rescheduleCount} vez{apt.rescheduleCount !== 1 ? 'ces' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress bar (waiting states) */}
      {apt && (phase === 'waiting' || phase === 'next' || phase === 'rescheduled') && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 animate-slide-up">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Estado del turno
          </p>
          <div className="flex items-center gap-1">
            {[
              { key: 'waiting', label: 'En espera', icon: Clock },
              { key: 'next', label: 'Próximo', icon: Users },
              { key: 'called', label: 'Llamado', icon: Bell },
              { key: 'in-attendance', label: 'En consulta', icon: Stethoscope },
            ].map((step, i) => {
              const stepOrder = ['waiting', 'next', 'called', 'in-attendance'];
              const currentIdx = stepOrder.indexOf(phase);
              const isActive = i <= currentIdx;
              return (
                <div key={step.key} className="flex-1 flex items-center gap-1">
                  <div className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isActive ? 'bg-sky-500' : 'bg-slate-100'
                      }`}
                    />
                    <div className="flex items-center gap-1 mt-1.5">
                      <step.icon
                        className={`w-3.5 h-3.5 transition-colors ${
                          isActive ? 'text-sky-600' : 'text-slate-300'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-medium transition-colors ${
                          isActive ? 'text-sky-600' : 'text-slate-300'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue preview */}
      {apt && (phase === 'waiting' || phase === 'rescheduled') && (
        <QueuePreview apt={apt} user={user} appointments={data.appointments} />
      )}

      {/* No active ticket message */}
      {!apt && myScheduledAppointments.length === 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4 text-center animate-slide-up">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">
            No tienes un turno activo. Acércate a la instalación para realizar check-in.
          </p>
        </div>
      )}

      {/* Sede info */}
      <div className="bg-sky-50 rounded-2xl p-4 mb-4 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-700">{data.sede.name}</p>
          <p className="text-xs text-slate-500">{data.sede.address}</p>
        </div>
      </div>
    </div>
  );
}

function PatientCalendar({
  user,
  appointments,
  users,
  onCancel,
}: {
  user: AppUser;
  appointments: Appointment[];
  users: AppUser[];
  onCancel: (id: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => today.toISOString().split('T')[0]);

  const myAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.patientCedula === user.cedula &&
          a.appointmentDate &&
          a.status !== 'cancelled',
      ),
    [appointments, user.cedula],
  );

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const apt of myAppointments) {
      if (!apt.appointmentDate) continue;
      if (!map[apt.appointmentDate]) map[apt.appointmentDate] = [];
      map[apt.appointmentDate].push(apt);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    }
    return map;
  }, [myAppointments]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startWeekday = firstDayOfMonth.getDay();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formatDateKey = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d.toISOString().split('T')[0];
  };

  const selectedAppointments = appointmentsByDate[selectedDate] ?? [];
  const todayKey = today.toISOString().split('T')[0];

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  }, [selectedDate]);

  return (
    <div className="space-y-4 mb-4">
      {/* Calendar card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 justify-center">
              <CalendarDays className="w-5 h-5 text-sky-600" />
              Mis Citas
            </h3>
            <p className="text-xs text-slate-400">{MONTHS[viewMonth]} {viewYear}</p>
          </div>
          <button
            onClick={goToNextMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-semibold text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="aspect-square" />;
            }
            const dateKey = formatDateKey(day);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const hasAppointments = (appointmentsByDate[dateKey]?.length ?? 0) > 0;
            const aptCount = appointmentsByDate[dateKey]?.length ?? 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(dateKey)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-md'
                    : isToday
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : hasAppointments
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
                {hasAppointments && !isSelected && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                {hasAppointments && isSelected && (
                  <span className="absolute bottom-1 text-[8px] font-bold text-white/80">
                    {aptCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date appointments with full details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-sky-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">Citas del día</h3>
            <p className="text-xs text-slate-400">{selectedDateLabel}</p>
          </div>
          {selectedAppointments.length > 0 && (
            <span className="bg-sky-100 text-sky-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedAppointments.length}
            </span>
          )}
        </div>

        {selectedAppointments.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No tienes citas programadas para este día.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedAppointments.map((apt) => {
              const doctor = users.find((u) => u.cedula === apt.doctorCedula);
              return (
                <div
                  key={apt.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  {/* Time + status header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-sky-50 flex-shrink-0">
                        <Clock className="w-4 h-4 text-sky-500 mb-0.5" />
                        <span className="text-xs font-bold text-sky-700">{apt.scheduledTime}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {apt.patientName}
                        </p>
                        <p className="text-xs text-slate-400">
                          CC: {apt.patientCedula} · Ticket #{String(apt.ticketNumber).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border ${STATUS_COLORS[apt.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                    >
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </span>
                  </div>

                  {/* Area + Doctor details */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    {doctor?.area && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                          {areaIcon(doctor.area)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Área / Especialización</p>
                          <p className="text-sm font-medium text-slate-700">
                            {AREA_LABELS[doctor.area]}
                            {doctor.subArea && ` · ${SUB_AREA_LABELS[doctor.subArea]}`}
                          </p>
                        </div>
                      </div>
                    )}
                    {doctor && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Médico asignado</p>
                          <p className="text-sm font-medium text-slate-700 truncate">{doctor.name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cancel button */}
                  {apt.status === 'scheduled' && (
                    <button
                      onClick={() => onCancel(apt.id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-600
                                 border border-red-200 hover:bg-red-50 transition-all
                                 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar Cita
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QueuePreview({
  apt,
  user,
  appointments,
}: {
  apt: Appointment;
  user: AppUser;
  appointments: Appointment[];
}) {
  const waitingPatients = appointments
    .filter((a) => a.status === 'checked-in' || a.status === 'rescheduled')
    .sort((a, b) => a.ticketNumber - b.ticketNumber);

  if (waitingPatients.length <= 1) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 animate-slide-up">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Fila actual
      </p>
      <div className="space-y-2">
        {waitingPatients.slice(0, 6).map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              p.patientCedula === user.cedula ? 'bg-sky-50' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                p.patientCedula === user.cedula
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {String(p.ticketNumber).padStart(2, '0')}
            </div>
            <span
              className={`text-sm ${
                p.patientCedula === user.cedula ? 'font-semibold text-sky-700' : 'text-slate-600'
              }`}
            >
              {p.patientCedula === user.cedula ? 'Tú' : p.patientName}
              {p.status === 'rescheduled' && (
                <span className="text-amber-500 text-xs ml-1.5">(Reagendado)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
