import { useState, useMemo } from 'react';
import {
  Settings,
  MapPin,
  Users,
  Clock,
  Save,
  Plus,
  Trash2,
  CreditCard,
  Stethoscope,
  User,
  Shield,
  Navigation,
  CheckCircle2,
  RefreshCw,
  CalendarPlus,
  CalendarDays,
  FlaskConical,
  HeartPulse,
  Microscope,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import type { Role, User as AppUser, MedicalArea, LabSubArea, Appointment } from '@/types';
import { AREA_LABELS, SUB_AREA_LABELS, APPOINTMENT_TIME_SLOTS } from '@/types';

interface AdminPanelProps {
  user: AppUser;
}

type Tab = 'sede' | 'users' | 'appointments' | 'params';

const AREAS: { value: MedicalArea; label: string; icon: typeof HeartPulse }[] = [
  { value: 'medicina-general', label: 'Medicina General', icon: HeartPulse },
  { value: 'medico-especialista', label: 'Médico Especialista', icon: Stethoscope },
  { value: 'laboratorios', label: 'Laboratorios', icon: FlaskConical },
];

const SUB_AREAS: { value: LabSubArea; label: string }[] = [
  { value: 'resultados', label: 'Resultados' },
  { value: 'ejecucion', label: 'Ejecución' },
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
  'scheduled': 'bg-sky-50 text-sky-700',
  'checked-in': 'bg-amber-50 text-amber-700',
  'called': 'bg-orange-50 text-orange-700',
  'in-attendance': 'bg-emerald-50 text-emerald-700',
  'attended': 'bg-slate-100 text-slate-600',
  'absent': 'bg-red-50 text-red-600',
  'rescheduled': 'bg-purple-50 text-purple-700',
  'cancelled': 'bg-red-50 text-red-600',
};

export function AdminPanel({ user: _user }: AdminPanelProps) {
  const { data, updateSede, addUser, removeUser, resetAll, scheduleAppointment, getDoctorsByArea } = useApp();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('users');

  const handleRemoveUser = async (cedula: string) => {
    await removeUser(cedula);
    showToast('Usuario eliminado de Supabase', 'info');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] px-4 py-5 max-w-md mx-auto">
      {/* Admin header */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl p-5 shadow-lg mb-4 text-white animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-lg font-bold">Panel Administrador</p>
            <p className="text-white/60 text-sm">Configuración global del sistema</p>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {[
          { key: 'users' as Tab, label: 'Usuarios', icon: Users },
          { key: 'appointments' as Tab, label: 'Citas', icon: CalendarPlus },
          { key: 'sede' as Tab, label: 'Sede', icon: MapPin },
          { key: 'params' as Tab, label: 'Params', icon: Clock },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
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

      {tab === 'sede' && <SedeTab sede={data.sede} onSave={updateSede} showToast={showToast} />}
      {tab === 'users' && <UsersTab users={data.users} onAdd={addUser} onRemove={handleRemoveUser} showToast={showToast} />}
      {tab === 'appointments' && (
        <AppointmentsTab
          users={data.users}
          appointments={data.appointments}
          onSchedule={scheduleAppointment}
          getDoctorsByArea={getDoctorsByArea}
          showToast={showToast}
        />
      )}
      {tab === 'params' && <ParamsTab sede={data.sede} onSave={updateSede} onReset={resetAll} showToast={showToast} />}
    </div>
  );
}

function SedeTab({
  sede,
  onSave,
  showToast,
}: {
  sede: { name: string; address: string; lat: number; lng: number };
  onSave: (s: Partial<typeof sede>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [name, setName] = useState(sede.name);
  const [address, setAddress] = useState(sede.address);
  const [lat, setLat] = useState(String(sede.lat));
  const [lng, setLng] = useState(String(sede.lng));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        name,
        address,
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
      });
      setSaved(true);
      showToast('Datos de la sede guardados en Supabase', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast('Error al guardar los datos. Revisa la conexión con la base de datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up space-y-4">
      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
        <Settings className="w-5 h-5 text-sky-600" />
        Datos de la Sede
      </h3>

      <div>
        <label className="text-sm font-medium text-slate-600 mb-1.5 block">
          Nombre de la Clínica/Sede
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200
                     focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                     outline-none transition-all text-slate-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600 mb-1.5 block">
          Dirección
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200
                     focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                     outline-none transition-all text-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Latitud GPS
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200
                       focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                       outline-none transition-all text-slate-800"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Longitud GPS
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200
                       focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                       outline-none transition-all text-slate-800"
          />
        </div>
      </div>

      <div className="bg-sky-50 rounded-xl p-3 flex items-start gap-2.5">
        <Navigation className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          Estas coordenadas definen el punto de referencia para el check-in geolocalizado de los pacientes.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-sky-600 text-white font-semibold py-3.5 rounded-xl
                   hover:bg-sky-700 active:scale-[0.98] transition-all
                   disabled:opacity-60 disabled:cursor-wait
                   flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Guardando...
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Guardar cambios
          </>
        )}
      </button>
    </div>
  );
}

function UsersTab({
  users,
  onAdd,
  onRemove,
  showToast,
}: {
  users: AppUser[];
  onAdd: (u: AppUser) => Promise<void>;
  onRemove: (cedula: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [newName, setNewName] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newRole, setNewRole] = useState<Role>('patient');
  const [newArea, setNewArea] = useState<MedicalArea>('medicina-general');
  const [newSubArea, setNewSubArea] = useState<LabSubArea>('resultados');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingCedula, setRemovingCedula] = useState<string | null>(null);

  const resetForm = () => {
    setNewName('');
    setNewCedula('');
    setNewRole('patient');
    setNewArea('medicina-general');
    setNewSubArea('resultados');
    setError('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!newName.trim() || !newCedula.trim()) {
      setError('Completa nombre y cédula.');
      return;
    }
    if (users.some((u) => u.cedula === newCedula.trim())) {
      setError('Ya existe un usuario con esa cédula.');
      return;
    }
    if (newRole === 'doctor' && newArea === 'laboratorios' && !newSubArea) {
      setError('Debes seleccionar una subárea para Laboratorios.');
      return;
    }
    const user: AppUser = {
      cedula: newCedula.trim(),
      name: newName.trim(),
      role: newRole,
    };
    if (newRole === 'doctor') {
      user.area = newArea;
      if (newArea === 'laboratorios') {
        user.subArea = newSubArea;
      }
    }
    setSaving(true);
    try {
      await onAdd(user);
      showToast('Usuario guardado exitosamente en Supabase', 'success');
      resetForm();
    } catch {
      showToast('Error al guardar los datos. Revisa la conexión con la base de datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (cedula: string) => {
    if (removingCedula) return;
    setRemovingCedula(cedula);
    try {
      await onRemove(cedula);
    } catch {
      showToast('Error al eliminar el usuario.', 'error');
    } finally {
      setRemovingCedula(null);
    }
  };

  const roleIcon = (role: Role) => {
    if (role === 'doctor') return <Stethoscope className="w-4 h-4" />;
    if (role === 'admin') return <Shield className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const roleLabel = (role: Role) => {
    if (role === 'doctor') return 'Médico';
    if (role === 'admin') return 'Admin';
    return 'Paciente';
  };

  const roleColor = (role: Role) => {
    if (role === 'doctor') return 'bg-sky-50 text-sky-700';
    if (role === 'admin') return 'bg-slate-100 text-slate-700';
    return 'bg-emerald-50 text-emerald-700';
  };

  const areaIcon = (area?: MedicalArea) => {
    if (area === 'medicina-general') return <HeartPulse className="w-3 h-3" />;
    if (area === 'medico-especialista') return <Stethoscope className="w-3 h-3" />;
    if (area === 'laboratorios') return <FlaskConical className="w-3 h-3" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Add user form */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up space-y-3"
      >
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-sky-600" />
          Agregar Usuario
        </h3>

        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Nombre completo
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError('');
            }}
            placeholder="Ej. Dra. Pérez"
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl border border-slate-200
                       focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                       outline-none transition-all text-slate-800
                       disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Cédula de Ciudadanía
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              value={newCedula}
              onChange={(e) => {
                setNewCedula(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="Ej. 12345678"
              disabled={saving}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200
                         focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                         outline-none transition-all text-slate-800
                         disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">Rol</label>
          <div className="grid grid-cols-3 gap-2">
            {(['patient', 'doctor', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNewRole(r)}
                disabled={saving}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-60 ${
                  newRole === r
                    ? 'border-sky-400 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                {roleIcon(r)}
                {roleLabel(r)}
              </button>
            ))}
          </div>
        </div>

        {/* Area / Specialization for doctors */}
        {newRole === 'doctor' && (
          <div className="space-y-3 bg-sky-50/50 rounded-xl p-3 border border-sky-100">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">
                Área / Especialización <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {AREAS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setNewArea(a.value)}
                    disabled={saving}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-60 ${
                      newArea === a.value
                        ? 'border-sky-400 bg-white text-sky-700 shadow-sm'
                        : 'border-transparent bg-white/50 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <a.icon className="w-4 h-4" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {newArea === 'laboratorios' && (
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">
                  Subárea <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUB_AREAS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setNewSubArea(s.value)}
                      disabled={saving}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-60 ${
                        newSubArea === s.value
                          ? 'border-sky-400 bg-white text-sky-700 shadow-sm'
                          : 'border-transparent bg-white/50 text-slate-500 hover:bg-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-600 text-white font-semibold py-3 rounded-xl
                     hover:bg-sky-700 active:scale-[0.98] transition-all
                     disabled:opacity-60 disabled:cursor-wait
                     flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Agregar
            </>
          )}
        </button>
      </form>

      {/* User list */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
        <h3 className="font-semibold text-slate-800 mb-3">
          Usuarios registrados ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.cedula}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${roleColor(u.role)}`}>
                {roleIcon(u.role)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-400">CC: {u.cedula} · {roleLabel(u.role)}</span>
                  {u.role === 'doctor' && u.area && (
                    <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      {areaIcon(u.area)}
                      {AREA_LABELS[u.area]}
                      {u.subArea && ` · ${SUB_AREA_LABELS[u.subArea]}`}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(u.cedula)}
                disabled={removingCedula === u.cedula}
                className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Eliminar usuario"
              >
                {removingCedula === u.cedula ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppointmentsTab({
  users,
  appointments,
  onSchedule,
  getDoctorsByArea,
  showToast,
}: {
  users: AppUser[];
  appointments: Appointment[];
  onSchedule: (input: {
    patientCedula: string;
    patientName: string;
    doctorCedula: string;
    appointmentDate: string;
    scheduledTime: string;
  }) => Promise<Appointment | null>;
  getDoctorsByArea: (area: MedicalArea, subArea?: LabSubArea) => AppUser[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [patientName, setPatientName] = useState('');
  const [patientCedula, setPatientCedula] = useState('');
  const [selectedArea, setSelectedArea] = useState<MedicalArea>('medicina-general');
  const [selectedSubArea, setSelectedSubArea] = useState<LabSubArea>('resultados');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const patients = users.filter((u) => u.role === 'patient');
  const availableDoctors = useMemo(
    () => getDoctorsByArea(selectedArea, selectedArea === 'laboratorios' ? selectedSubArea : undefined),
    [getDoctorsByArea, selectedArea, selectedSubArea],
  );

  const handlePatientSelect = (cedula: string) => {
    setPatientCedula(cedula);
    const p = patients.find((p) => p.cedula === cedula);
    if (p) setPatientName(p.name);
  };

  const resetForm = () => {
    setPatientName('');
    setPatientCedula('');
    setSelectedDoctor('');
    setSelectedArea('medicina-general');
    setSelectedSubArea('resultados');
    setSelectedTime('08:00');
    setError('');
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (!patientName.trim() || !patientCedula.trim()) {
      setError('Selecciona o ingresa los datos del paciente.');
      return;
    }
    if (selectedArea === 'laboratorios' && !selectedSubArea) {
      setError('Selecciona una subárea de Laboratorios.');
      return;
    }
    if (!selectedDoctor) {
      setError('Selecciona un médico disponible para esta área.');
      return;
    }
    setSaving(true);
    try {
      const result = await onSchedule({
        patientCedula: patientCedula.trim(),
        patientName: patientName.trim(),
        doctorCedula: selectedDoctor,
        appointmentDate: selectedDate,
        scheduledTime: selectedTime,
      });
      if (result) {
        setSuccess(true);
        showToast('¡Cita programada con éxito en la nube!', 'success');
        setTimeout(() => setSuccess(false), 2500);
        resetForm();
      } else {
        showToast('Error al guardar los datos. Revisa la conexión con la base de datos.', 'error');
      }
    } catch {
      showToast('Error al guardar los datos. Revisa la conexión con la base de datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const scheduledAppointments = appointments
    .filter((a) => a.appointmentDate && a.doctorCedula)
    .sort((a, b) => (a.appointmentDate ?? '').localeCompare(b.appointmentDate ?? '') || a.scheduledTime.localeCompare(b.scheduledTime));

  return (
    <div className="space-y-4">
      {/* Schedule appointment form */}
      <form
        onSubmit={handleSchedule}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up space-y-3"
      >
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-sky-600" />
          Programar Nueva Cita
        </h3>

        {/* Patient selection */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Paciente
          </label>
          <select
            value={patientCedula}
            onChange={(e) => handlePatientSelect(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl border border-slate-200
                       focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                       outline-none transition-all text-slate-800 bg-white
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">Seleccionar paciente...</option>
            {patients.map((p) => (
              <option key={p.cedula} value={p.cedula}>
                {p.name} · CC: {p.cedula}
              </option>
            ))}
          </select>
          {patientCedula && (
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Nombre del paciente"
              disabled={saving}
              className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200
                         focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                         outline-none transition-all text-slate-800 text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed"
            />
          )}
          {!patientCedula && (
            <div className="grid grid-cols-1 gap-2 mt-2">
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="O ingresa nombre manualmente"
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200
                           focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                           outline-none transition-all text-slate-800 text-sm
                           disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                inputMode="numeric"
                value={patientCedula}
                onChange={(e) => setPatientCedula(e.target.value.replace(/\D/g, ''))}
                placeholder="Cédula del paciente"
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200
                           focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                           outline-none transition-all text-slate-800 text-sm
                           disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* Area selection */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Área / Especialización
          </label>
          <div className="space-y-2">
            {AREAS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => {
                  setSelectedArea(a.value);
                  setSelectedDoctor('');
                }}
                disabled={saving}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-60 ${
                  selectedArea === a.value
                    ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <a.icon className="w-4 h-4" />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-area for laboratorios */}
        {selectedArea === 'laboratorios' && (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Subárea
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUB_AREAS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setSelectedSubArea(s.value);
                    setSelectedDoctor('');
                  }}
                  disabled={saving}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-60 ${
                    selectedSubArea === s.value
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Doctor selection — filtered by area */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Médico disponible
            <span className="text-xs text-slate-400 ml-1">
              ({availableDoctors.length} encontrado{availableDoctors.length !== 1 ? 's' : ''})
            </span>
          </label>
          {availableDoctors.length === 0 ? (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
              <Microscope className="w-4 h-4" />
              No hay médicos registrados en esta área.
            </div>
          ) : (
            <div className="space-y-2">
              {availableDoctors.map((doc) => (
                <button
                  key={doc.cedula}
                  type="button"
                  onClick={() => setSelectedDoctor(doc.cedula)}
                  disabled={saving}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-60 ${
                    selectedDoctor === doc.cedula
                      ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-sky-500" />
                  <span className="flex-1 text-left">{doc.name}</span>
                  <span className="text-xs text-slate-400">CC: {doc.cedula}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date and time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-3 rounded-xl border border-slate-200
                         focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                         outline-none transition-all text-slate-800 text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Hora
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-3 rounded-xl border border-slate-200
                         focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                         outline-none transition-all text-slate-800 text-sm bg-white
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {APPOINTMENT_TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={availableDoctors.length === 0 || saving}
          className="w-full bg-sky-600 text-white font-semibold py-3.5 rounded-xl
                     hover:bg-sky-700 active:scale-[0.98] transition-all
                     disabled:opacity-40 disabled:cursor-wait
                     flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              ¡Cita Programada!
            </>
          ) : (
            <>
              <CalendarPlus className="w-5 h-5" />
              Programar Cita
            </>
          )}
        </button>
      </form>

      {/* Scheduled appointments list */}
      {scheduledAppointments.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            Citas Programadas ({scheduledAppointments.length})
          </h3>
          <div className="space-y-2">
            {scheduledAppointments.map((apt) => {
              const doctor = users.find((u) => u.cedula === apt.doctorCedula);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {apt.patientName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {apt.appointmentDate} · {apt.scheduledTime}
                      {doctor && ` · ${doctor.name}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${STATUS_COLORS[apt.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[apt.status] ?? apt.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ParamsTab({
  sede,
  onSave,
  onReset,
  showToast,
}: {
  sede: { consultationMinutes: number; geofenceRadius: number };
  onSave: (s: Partial<typeof sede>) => Promise<void>;
  onReset: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [consultationMinutes, setConsultationMinutes] = useState(String(sede.consultationMinutes));
  const [geofenceRadius, setGeofenceRadius] = useState(String(sede.geofenceRadius));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        consultationMinutes: parseInt(consultationMinutes) || 15,
        geofenceRadius: parseInt(geofenceRadius) || 200,
      });
      setSaved(true);
      showToast('Parámetros guardados en Supabase', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast('Error al guardar los datos. Revisa la conexión con la base de datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await onReset();
      showToast('Datos del sistema reiniciados correctamente', 'info');
      setConfirmReset(false);
    } catch {
      showToast('Error al reiniciar los datos.', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-sky-600" />
          Parámetros de Atención
        </h3>

        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Tiempo por consulta (minutos)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={consultationMinutes}
            onChange={(e) => setConsultationMinutes(e.target.value.replace(/\D/g, ''))}
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl border border-slate-200
                       focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                       outline-none transition-all text-slate-800
                       disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Se usa para calcular el tiempo estimado de espera de cada paciente.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">
            Radio de Check-in GPS (metros)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={geofenceRadius}
            onChange={(e) => setGeofenceRadius(e.target.value.replace(/\D/g, ''))}
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl border border-slate-200
                       focus:border-sky-400 focus:ring-2 focus:ring-sky-100
                       outline-none transition-all text-slate-800
                       disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            El paciente debe estar dentro de este radio para autorizar el check-in.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-sky-600 text-white font-semibold py-3.5 rounded-xl
                     hover:bg-sky-700 active:scale-[0.98] transition-all
                     disabled:opacity-60 disabled:cursor-wait
                     flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              ¡Guardado!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar parámetros
            </>
          )}
        </button>
      </div>

      {/* Reset */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-slide-up">
        <h3 className="font-semibold text-slate-800 mb-2">Datos del sistema</h3>
        <p className="text-sm text-slate-500 mb-3">
          Restablece las citas y el estado de la fila a los valores iniciales.
        </p>
        {confirmReset ? (
          <div className="bg-amber-50 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="text-sm text-amber-800">¿Confirmar reinicio?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="text-sm px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                No
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-sm px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 flex items-center gap-1.5"
              >
                {resetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Sí, reiniciar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full text-sm text-slate-400 py-2.5 flex items-center justify-center gap-1.5
                       hover:text-slate-600 border border-slate-200 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Reiniciar datos de prueba
          </button>
        )}
      </div>
    </div>
  );
}
