import type { IncidentReport } from '../types/incident';
import { getDistanceKm } from './haversine';

export function getIncidentTitle(incident: IncidentReport): string {
  if (incident.title) {
    return incident.title;
  }

  if (incident.locationLabel) {
    return `${incident.type} at ${incident.locationLabel}`;
  }

  return `${incident.type} report`;
}

export function formatPostedAt(timePosted: string): string {
  return timePosted.includes(':') ? `Posted at: ${timePosted}` : `Posted at ${timePosted}`;
}

export function formatDistanceAway(
  incident: IncidentReport,
  userLatitude?: number,
  userLongitude?: number,
): string {
  if (userLatitude == null || userLongitude == null) {
    return '— km away';
  }
  const km = getDistanceKm(
    userLatitude,
    userLongitude,
    incident.latitude,
    incident.longitude,
  );
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}
