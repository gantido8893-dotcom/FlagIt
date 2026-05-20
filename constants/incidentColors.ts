import type { IncidentType } from '../types/incident';

/** Placeholder pin colors per incident type — swap for custom assets later */
export const INCIDENT_PIN_COLORS: Record<IncidentType, string> = {
  Traffic: '#F59E0B',
  Fire: '#EF4444',
  Flood: '#3B82F6',
  Construction: '#F97316',
};
