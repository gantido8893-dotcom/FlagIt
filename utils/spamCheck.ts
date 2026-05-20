import type { IncidentReport, IncidentType } from '../types/incident';
import { getDistanceKm } from './haversine';

export const SPAM_RADIUS_KM = 2;

/** True if an active incident of the same type exists within radiusKm */
export function hasNearbySameTypeIncident(
  incidents: IncidentReport[],
  type: IncidentType,
  latitude: number,
  longitude: number,
  radiusKm: number = SPAM_RADIUS_KM,
): boolean {
  return incidents.some((incident) => {
    if (incident.type !== type) {
      return false;
    }
    const distance = getDistanceKm(latitude, longitude, incident.latitude, incident.longitude);
    return distance <= radiusKm;
  });
}
