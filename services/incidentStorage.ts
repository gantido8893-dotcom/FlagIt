import { supabase } from './authService';

const INCIDENT_PHOTOS_BUCKET = 'incident-photos';

export async function uploadIncidentPhoto(
  localUri: string,
  incidentId: string,
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${incidentId}/${Date.now()}.${ext}`;

    const response = await fetch(localUri);
    if (!response.ok) {
      console.error('[uploadIncidentPhoto] Failed to read local image');
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(INCIDENT_PHOTOS_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('[uploadIncidentPhoto]', error.message);
      return null;
    }

    const { data } = supabase.storage.from(INCIDENT_PHOTOS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('[uploadIncidentPhoto]', error);
    return null;
  }
}
