/*
# Update TurnoMédico Live: add medical areas, sub-areas, doctor assignment, and appointment dates

## Overview
This migration adds support for medical specializations (areas/sub-areas) on doctors,
doctor assignment on appointments, and appointment dates for calendar functionality.
It also seeds the admin user Maicol Benavides and 8 doctors across all areas.

## Changes to existing tables

### users table
- Added `area` (text, nullable) — Medical area for doctors: 'medicina-general', 'medico-especialista', 'laboratorios'
- Added `sub_area` (text, nullable) — Sub-area when area is 'laboratorios': 'resultados', 'ejecucion'

### appointments table
- Added `doctor_cedula` (text, nullable) — FK to users.cedula, the assigned doctor
- Added `appointment_date` (date, nullable) — The scheduled date for the appointment

## Seed Data
- Admin: Maicol Benavides (cedula 1082917595)
- 8 doctors: 2 per area/sub_area combination
  * Medicina General: Dr. Carlos Ramírez (1002003001), Dra. Laura Gómez (1002003002)
  * Médico Especialista: Dr. Andrés Torres (1002003003), Dra. Sofía Herrera (1002003004)
  * Laboratorios - Resultados: Dr. Javier Mendoza (1002003005), Dra. Carolina Vega (1002003006)
  * Laboratorios - Ejecución: Dr. Diego Castro (1002003007), Dra. Paula Ruiz (1002003008)

## Security
- RLS already enabled. Policies already grant anon, authenticated full CRUD.
- No policy changes needed.
*/

-- Add area columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_area text;

-- Add doctor_cedula and appointment_date to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_cedula text REFERENCES users(cedula) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date date;

-- Create index for doctor_cedula lookups
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_cedula ON appointments(doctor_cedula);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);

-- Seed admin: Maicol Benavides
INSERT INTO users (cedula, name, role, sede_name) VALUES
  ('1082917595', 'Maicol Benavides', 'admin', NULL)
ON CONFLICT (cedula) DO NOTHING;

-- Seed 8 doctors across all areas
INSERT INTO users (cedula, name, role, area, sub_area, sede_name) VALUES
  ('1002003001', 'Dr. Carlos Ramírez', 'doctor', 'medicina-general', NULL, 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003002', 'Dra. Laura Gómez', 'doctor', 'medicina-general', NULL, 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003003', 'Dr. Andrés Torres', 'doctor', 'medico-especialista', NULL, 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003004', 'Dra. Sofía Herrera', 'doctor', 'medico-especialista', NULL, 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003005', 'Dr. Javier Mendoza', 'doctor', 'laboratorios', 'resultados', 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003006', 'Dra. Carolina Vega', 'doctor', 'laboratorios', 'resultados', 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003007', 'Dr. Diego Castro', 'doctor', 'laboratorios', 'ejecucion', 'Batallón de Infantería N.5 Córdova - Santa Marta'),
  ('1002003008', 'Dra. Paula Ruiz', 'doctor', 'laboratorios', 'ejecucion', 'Batallón de Infantería N.5 Córdova - Santa Marta')
ON CONFLICT (cedula) DO NOTHING;