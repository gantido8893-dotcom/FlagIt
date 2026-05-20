import type { Region } from 'react-native-maps';

import type { IncidentReport } from '../types/incident';

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export function getRegionForIncidents(incidents: IncidentReport[]): Region {
  if (incidents.length === 0) {
    return DEFAULT_REGION;
  }

  const lats = incidents.map((i) => i.latitude);
  const lngs = incidents.map((i) => i.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max((maxLat - minLat) * 1.6, 0.02);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.6, 0.02);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export { DEFAULT_REGION };
