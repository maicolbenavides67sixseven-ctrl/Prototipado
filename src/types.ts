export type Role = 'doctor' | 'patient' | 'admin';

export type MedicalArea = 'medicina-general' | 'medico-especialista' | 'laboratorios';
export type LabSubArea = 'resultados' | 'ejecucion';

export const AREA_LABELS: Record<MedicalArea, string> = {
  'medicina-general': 'Medicina General',
  'medico-especialista': 'Médico Especialista',
  'laboratorios': 'Laboratorios',
};

export const SUB_AREA_LABELS: Record<LabSubArea, string> = {
  'resultados': 'Resultados',
  'ejecucion': 'Ejecución',
};

export interface User {
  cedula: string;
  name: string;
  role: Role;
  sedeName?: string;
  area?: MedicalArea;
  subArea?: LabSubArea;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'checked-in'
  | 'called'
  | 'in-attendance'
  | 'attended'
  | 'absent'
  | 'rescheduled'
  | 'cancelled';

export interface Appointment {
  id: string;
  patientCedula: string;
  patientName: string;
  scheduledTime: string;
  status: AppointmentStatus;
  ticketNumber: number;
  checkInTime?: number;
  calledAt?: number;
  gpsDistance?: number;
  attendanceStartAt?: number;
  attendanceEndAt?: number;
  rescheduleCount: number;
  doctorCedula?: string;
  appointmentDate?: string;
}

export interface SedeConfig {
  name: string;
  address: string;
  lat: number;
  lng: number;
  consultationMinutes: number;
  geofenceRadius: number;
}

export interface AppData {
  users: User[];
  appointments: Appointment[];
  sede: SedeConfig;
  nextTicketNumber: number;
  currentCalledId: string | null;
  countdownEndsAt: number | null;
  attendedCount: number;
  totalConsultationMinutes: number;
}

export const COUNTDOWN_SECONDS = 180;

export const APPOINTMENT_TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30',
];
