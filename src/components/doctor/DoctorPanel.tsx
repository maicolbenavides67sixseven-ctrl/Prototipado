import { useState, useMemo } from 'react';
import {
  Stethoscope,
  UserCheck,
  Clock,
  TrendingUp,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Users,
  Timer,
  CreditCard,
  RefreshCw,
  UserX,
  CalendarDays,
  ChevronLeft,
  HeartPulse,
  FlaskConical,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { useNow, formatCountdown } from '@/hooks/useNow';
import { COUNTDOWN_SECONDS, AREA_LABELS, SUB_AREA_LABELS } from '@/types';
import type { User as AppUser, Appointment } from '@/types';

interface DoctorPanelProps {
  user: AppUser;
}

type DoctorTab = 'queue' | 'calendar';

const STATUS_LABELS: Record<string, string> = {
  'scheduled': 'Programada',
  'checked-in': 'En sala',
  'called': 'Llamado',
  'in-attendance': 'En consulta',
  'attended': 'Atendido',
  'absent': 'Ausente',
  'rescheduled': 'Reagendado',
};

const STATUS_COLORS: Record<string, string> = {
  'scheduled': 'bg-sky-50 text-sky-700 border-sky-200',
  'checked-in': 'bg-amber-50 text-amber-700 border-amber-200',
  'called': 'bg-orange-50 text-orange-700 border-orange-200',
  'in-attendance': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'attended': 'bg-slate-100 text-slate-600 border-slate-200',
  'absent': 'bg-red-50 text-red-600 border-red-200',
  'rescheduled': 'bg-purple-50 text-purple-700 border-purple-200',
};

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function DoctorPanel({ user }: DoctorPanelProps) {
  const { data, callNext, markPresent, markAbsentAndReschedule, rotateQueuePosition, resetAll } = useApp();
  const { showToast } = useToast();
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DoctorTab>('queue');

  const handleCallNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await callNext();
      showToast('Paciente llamado correctamente', 'success');
    } catch {
      showToast('Error al llamar al paciente. Revisa la conexión.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePresent = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await markPresent();
      showToast('Paciente marcado como presente', 'success');
    } catch {
      showToast('Error al actualizar el estado. Revisa la conexión.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAbsent = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await markAbsentAndReschedule();
      showToast('Cita actualizada correctamente', 'info');
    } catch {
      showToast('Error al actualizar la cita. Revisa la conexión.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await rotateQueuePosition();
      showToast('Paciente movido un puesto atrás. Siguiente paciente en posición activa.', 'info');
    } catch {
      showToast('Error al reorganizar la cola. Revisa la conexión.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resetAll();
      showToast('Datos reiniciados correctamente', 'info');
    } catch {
      showToast('Error al reiniciar los datos.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const waitingPatients = data.appointments
    .filter((a) => a.status === 'checked-in' || a.status === 'rescheduled')
    .sort((a, b) => a.ticketNumber - b.ticketNumber);

  const calledPatient = data.appointments.find((a) => a.id === data.currentCalledId);
  const inAttendance = data.appointments.find((a) => a.status === 'in-attendance');

  const attendedToday = data.appointments.filter((a) => a.status === 'attended');
  const avgTime = data.attendedCount > 0
    ? Math.round(data.totalConsultationMinutes / data.attendedCount)
    : 0;

  const countdownRemaining = calledPatient && data.countdownEndsAt
    ? Math.max(0, Math.floor((data.countdownEndsAt - now) / 1000))
    : 0;
  const countdownProgress = calledPatient
    ? ((COUNTDOWN_SECONDS - countdownRemaining) / COUNTDOWN_SECONDS) * 100
    : 0;

  const attendanceElapsed = inAttendance?.attendanceStartAt
    ? Math.floor((now - inAttendance.attendanceStartAt) / 60000)
    : 0;

  const formatDistance = (m: number | undefined) => {
    if (m === undefined) return '—';
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
  };

  const areaIcon = user.area === 'medicina-general'
    ? <HeartPulse className="w-4 h-4" />
    : user.area === 'laboratorios'
      ? <FlaskConical className="w-4 h-4" />
      : <Stethoscope className="w-4 h-4" />;

  return (
    <div className="min-h-[calc(100vh-140px)] px-4 py-5 max-w-md mx-auto">
      {/* Doctor profile */}
      <div className="bg-gradient-to-br from-sky-600 to-blue-700 rounded-3xl p-5 shadow-lg shadow-sky-200 mb-4 text-white animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold">{user.name}</p>
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <CreditCard className="w-3.5 h-3.5" />
              CC: {user.cedula}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-white/80 text-sm bg-white/10 rounded-lg px-3 py-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{data.sede.name}</span>
          </div>
          {user.area && (
            <div className="flex items-center gap-1.5 text-white/90 text-xs bg-white/15 rounded-lg px-3 py-2 flex-shrink-0">
              {areaIcon}
              <span className="font-medium">
                {AREA_LABELS[user.area]}
                {user.subArea && ` · ${SUB_AREA_LABELS[user.subArea]}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {[
          { key: 'queue' as DoctorTab, label: 'Sala de Espera', icon: Users },
          { key: 'calendar' as DoctorTab, label: 'Mi Calendario', icon: CalendarDays },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <QueueTab
          waitingPatients={waitingPatients}
          calledPatient={calledPatient}
          inAttendance={inAttendance}
          attendedToday={attendedToday}
          attendedCount={data.attendedCount}
          avgTime={avgTime}
          countdownRemaining={countdownRemaining}
          countdownProgress={countdownProgress}
          attendanceElapsed={attendanceElapsed}
          busy={busy}
          onCallNext={handleCallNext}
          onPresent={handlePresent}
          onAbsent={handleAbsent}
          onRotate={handleRotate}
          onReset={handleReset}
          formatDistance={formatDistance}
        />
      )}

      {tab === 'calendar' && (
        <CalendarTab user={user} appointments={data.appointments} />
      )}
    </div>
  );
}

function QueueTab({
  waitingPatients,
  calledPatient,
  inAttendance,
  attendedToday,
  attendedCount,
  avgTime,
  countdownRemaining,
  countdownProgress,
  attendanceElapsed,
  busy,
  onCallNext,
  onPresent,
  onAbsent,
  onRotate,
  onReset,
  formatDistance,
}: {
  waitingPatients: Appointment[];
  calledPatient: Appointment | undefined;
  inAttendance: Appointment | undefined;
  attendedToday: Appointment[];
  attendedCount: number;
  avgTime: number;
  countdownRemaining: number;
  countdownProgress: number;
  attendanceElapsed: number;
  busy: boolean;
  onCallNext: () => void;
  onPresent: () => void;
  onAbsent: () => void;
  onRotate: () => void;
  onReset: () => void;
  formatDistance: (m: number | undefined) => string;
}) {
  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4 animate-slide-up">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-slate-500">Atendidos hoy</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{attendedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium text-slate-500">Tiempo promedio</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {avgTime}<span className="text-base font-medium text-slate-400"> min</span>
          </p>
        </div>
      </div>

      {/* In-attendance banner */}
      {inAttendance && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-md shadow-emerald-200 mb-4 text-white animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="w-5 h-5" />
            <span className="text-sm font-medium text-white/80">En consulta ahora</span>
          </div>
          <p className="text-xl font-bold">
            #{String(inAttendance.ticketNumber).padStart(2, '0')} · {inAttendance.patientName}
          </p>
          <div className="flex items-center gap-1.5 text-white/90 text-sm mt-2 bg-white/10 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4" />
            <span>En consulta: {attendanceElapsed} min</span>
          </div>
        </div>
      )}

      {/* Countdown card */}
      {calledPatient && (
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 shadow-lg shadow-red-200 mb-4 text-white text-center animate-bounce-in">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Timer className="w-5 h-5" />
            <span className="text-sm font-medium text-white/80">Llamado en curso</span>
          </div>
          <p className="text-lg font-bold mb-3">
            #{String(calledPatient.ticketNumber).padStart(2, '0')} · {calledPatient.patientName}
          </p>

          <div className="inline-flex items-center gap-2 bg-white/15 rounded-2xl px-5 py-2.5 mb-3">
            <span className="text-3xl font-extrabold font-mono tracking-tight">
              {formatCountdown(countdownRemaining)}
            </span>
          </div>

          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${countdownProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPresent}
              disabled={busy}
              className="bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all
                         font-semibold py-3 rounded-xl flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-wait"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {busy ? 'Procesando...' : 'Paciente Presente'}
            </button>
            <button
              onClick={onAbsent}
              disabled={busy}
              className="bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-all
                         font-semibold py-3 rounded-xl flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-wait"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserX className="w-5 h-5" />}
              {busy ? 'Procesando...' : 'Ausente / Reagendar'}
            </button>
          </div>

          {/* Rotate position button — appears when countdown reaches 3 min or less */}
          {countdownRemaining <= 180 && countdownRemaining > 0 && (
            <button
              onClick={onRotate}
              disabled={busy}
              className="mt-2 w-full bg-amber-500/30 hover:bg-amber-500/40 active:scale-[0.98] transition-all
                         font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm
                         border border-amber-300/50
                         disabled:opacity-50 disabled:cursor-wait"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reagendar / Mover al siguiente puesto
            </button>
          )}
        </div>
      )}

      {/* Call next button */}
      {!calledPatient && (
        <button
          onClick={onCallNext}
          disabled={waitingPatients.length === 0 || busy}
          className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl
                     hover:bg-emerald-600 active:scale-[0.98] transition-all
                     disabled:opacity-40 disabled:cursor-wait
                     flex items-center justify-center gap-2.5 shadow-md shadow-emerald-200 mb-4"
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserCheck className="w-6 h-6" />}
          {busy ? 'Procesando...' : inAttendance ? 'Finalizar y Llamar Siguiente' : 'Llamar Siguiente Paciente'}
        </button>
      )}

      {/* Appointment list */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            Citas en espera
            <span className="bg-sky-100 text-sky-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {waitingPatients.length}
            </span>
          </h3>
        </div>

        {waitingPatients.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No hay pacientes en espera.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waitingPatients.map((apt, idx) => (
              <AppointmentRow
                key={apt.id}
                apt={apt}
                position={idx + 1}
                isNext={idx === 0 && !calledPatient}
                distanceText={formatDistance(apt.gpsDistance)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Attended today */}
      {attendedToday.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Atendidos ({attendedToday.length})
          </h3>
          <div className="space-y-2">
            {attendedToday.slice(-4).reverse().map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-100"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">
                    #{String(p.ticketNumber).padStart(2, '0')} · {p.patientName}
                  </span>
                </div>
                {p.attendanceStartAt && p.attendanceEndAt && (
                  <span className="text-xs text-slate-400">
                    {Math.round((p.attendanceEndAt - p.attendanceStartAt) / 60000)} min
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        disabled={busy}
        className="w-full text-sm text-slate-400 py-2 flex items-center justify-center gap-1.5 hover:text-slate-600
                       disabled:opacity-50 disabled:cursor-wait"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Reiniciar con datos de prueba
      </button>
    </>
  );
}

function CalendarTab({ user, appointments }: { user: AppUser; appointments: Appointment[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => today.toISOString().split('T')[0]);

  // Filter appointments assigned to this doctor
  const myAppointments = useMemo(
    () => appointments.filter((a) => a.doctorCedula === user.cedula),
    [appointments, user.cedula],
  );

  // Group by date
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
    <div className="space-y-4">
      {/* Calendar card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-slate-800 text-base">
            {MONTHS[viewMonth]} {viewYear}
          </h3>
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

      {/* Selected date appointments */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-sky-600" />
          <div>
            <h3 className="font-semibold text-slate-800">Citas del día</h3>
            <p className="text-xs text-slate-400">{selectedDateLabel}</p>
          </div>
          {selectedAppointments.length > 0 && (
            <span className="ml-auto bg-sky-100 text-sky-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedAppointments.length}
            </span>
          )}
        </div>

        {selectedAppointments.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No tienes citas programadas para este día.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm animate-slide-in"
                style={{ borderColor: 'var(--tw-color, rgb(226 232 240))' }}
              >
                {/* Time badge */}
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-sky-50 flex-shrink-0">
                  <Clock className="w-4 h-4 text-sky-500 mb-0.5" />
                  <span className="text-xs font-bold text-sky-700">{apt.scheduledTime}</span>
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {apt.patientName}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    CC: {apt.patientCedula} · Ticket #{String(apt.ticketNumber).padStart(2, '0')}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border ${STATUS_COLORS[apt.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
                >
                  {STATUS_LABELS[apt.status] ?? apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AppointmentRowProps {
  apt: Appointment;
  position: number;
  isNext: boolean;
  distanceText: string;
}

function AppointmentRow({ apt, isNext, distanceText }: AppointmentRowProps) {
  return (
    <div
      className={`bg-white rounded-xl p-3 flex items-center gap-3 border transition-all animate-slide-in ${
        isNext ? 'border-sky-300 ring-1 ring-sky-100' : 'border-slate-100'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isNext ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {String(apt.ticketNumber).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{apt.patientName}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {apt.scheduledTime}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {distanceText}
          </span>
          {apt.status === 'rescheduled' && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              REAGENDADO
            </span>
          )}
          {isNext && (
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
              SIGUIENTE
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-200" />
    </div>
  );
}
