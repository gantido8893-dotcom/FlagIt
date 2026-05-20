export type IncidentType = 'Traffic' | 'Fire' | 'Flood' | 'Construction';

export interface IncidentReport {
  id: string;
  type: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  datePosted: string;
  timePosted: string;
  placeholderImage?: string;
  locationLabel?: string;
  title?: string;
  postedBy?: string;
  verifyCount?: number;
  flagCount?: number;
  resolveCount?: number;
  imageUrl?: string | null;
  heroImageSource?: number | { uri: string };
}
