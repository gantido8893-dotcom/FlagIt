import type { User } from '@supabase/supabase-js';

import { PROFILE_USERNAME } from '../constants/profile';
import type { IncidentReport } from '../types/incident';
import type { UserProfile } from '../types/profile';
import { getSubmissionTimestamp } from '../utils/dateTime';
import { hasNearbySameTypeIncident } from '../utils/spamCheck';
import { supabase } from './authService';

type IncidentRow = {
  id: string;
  type?: IncidentReport['type'] | string | null;
  description?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  created_at?: string | null;
  location_label?: string | null;
  locationLabel?: string | null;
  title?: string | null;
  verify_count?: number | null;
  flag_count?: number | null;
  resolve_count?: number | null;
  image_url?: string | null;
};

function mapIncidentRow(row: IncidentRow): IncidentReport | null {
  const latitudeRaw = row.latitude ?? row.lat ?? null;
  const longitudeRaw = row.longitude ?? row.lng ?? null;
  const latitude =
    typeof latitudeRaw === 'string' ? Number(latitudeRaw) : latitudeRaw;
  const longitude =
    typeof longitudeRaw === 'string' ? Number(longitudeRaw) : longitudeRaw;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const { datePosted, timePosted } = getSubmissionTimestamp(createdAt);

  const incident: IncidentReport = {
    id: row.id,
    type: (row.type ?? 'Traffic') as IncidentReport['type'],
    description: row.description ?? '',
    latitude: latitude as number,
    longitude: longitude as number,
    datePosted,
    timePosted,
    placeholderImage: `${String(row.type ?? 'Traffic').toLowerCase()}-pin`,
  };

  const locationLabel = row.location_label ?? row.locationLabel ?? null;
  if (locationLabel != null) {
    incident.locationLabel = locationLabel;
  }

  if (row.title != null) {
    incident.title = row.title;
  }

  if (row.verify_count != null) {
    incident.verifyCount = row.verify_count;
  }

  if (row.flag_count != null) {
    incident.flagCount = row.flag_count;
  }

  if (row.resolve_count != null) {
    incident.resolveCount = row.resolve_count;
  }

  if (row.image_url != null) {
    incident.imageUrl = row.image_url;
  }

  return incident;
}

function isLocalImageUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('assets-library://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('data:')
  );
}

async function uploadIncidentPhoto(
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
      .from('incident-photos')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('[uploadIncidentPhoto]', error.message);
      return null;
    }

    const { data } = supabase.storage.from('incident-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('[uploadIncidentPhoto]', error);
    return null;
  }
}

export type CreateIncidentResult =
  | { success: true; incident: IncidentReport }
  | {
      success: false;
      error: 'NEARBY_DUPLICATE' | 'VALIDATION' | 'NOT_AUTHENTICATED' | 'SAVE_FAILED';
    };

export type CreateIncidentInput = {
  type: IncidentReport['type'];
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  title?: string | null;
  imageUrl?: string | null;
};

export type ResolveIncidentResult =
  | { success: true; deleted: true }
  | { success: true; deleted: false; incident: IncidentReport }
  | { success: false };

const RESOLVE_DELETE_THRESHOLD = 5;

/**
 * Increments resolve_count for an incident.
 * If the count reaches RESOLVE_DELETE_THRESHOLD, the incident is deleted entirely.
 */
export async function resolveIncident(
  incidentId: string,
  currentResolveCount: number,
): Promise<ResolveIncidentResult> {
  const newCount = currentResolveCount + 1;

  if (newCount >= RESOLVE_DELETE_THRESHOLD) {
    const { error: deleteError } = await supabase
      .from('incidents')
      .delete()
      .eq('id', incidentId);

    if (deleteError) {
      console.error('Delete incident error:', deleteError);
      return { success: false };
    }

    return { success: true, deleted: true };
  }

  const { data, error } = await supabase
    .from('incidents')
    .update({ resolve_count: newCount })
    .eq('id', incidentId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Resolve incident update error:', error);
    return { success: false };
  }

  const mapped = mapIncidentRow(data as IncidentRow);
  if (!mapped) {
    return { success: false };
  }

  return { success: true, deleted: false, incident: mapped };
}

export async function updateIncidentVotes(
  incidentId: string,
  updates: { verifyCount?: number; flagCount?: number; resolveCount?: number },
): Promise<{ success: true; incident: IncidentReport } | { success: false }> {
  const payload: Record<string, number> = {};
  if (updates.verifyCount != null) {
    payload.verify_count = updates.verifyCount;
  }
  if (updates.flagCount != null) {
    payload.flag_count = updates.flagCount;
  }
  if (updates.resolveCount != null) {
    payload.resolve_count = updates.resolveCount;
  }

  if (Object.keys(payload).length === 0) {
    return { success: false };
  }

  const { data, error } = await supabase
    .from('incidents')
    .update(payload)
    .eq('id', incidentId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Update incident votes error:', error);
    return { success: false };
  }

  const mapped = mapIncidentRow(data as IncidentRow);
  if (!mapped) {
    return { success: false };
  }

  return { success: true, incident: mapped };
}

export async function fetchIncidents(): Promise<IncidentReport[]> {
  const ordered = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordered.error) {
    console.error('Fetch incidents error:', ordered.error);
    const fallback = await supabase.from('incidents').select('*');
    if (fallback.error) {
      console.error('Fetch incidents fallback error:', fallback.error);
      return [];
    }

    return (fallback.data ?? [])
      .map<IncidentReport | null>((row) => mapIncidentRow(row as IncidentRow))
      .filter((incident): incident is IncidentReport => incident !== null);
  }

  return (ordered.data ?? [])
    .map<IncidentReport | null>((row) => mapIncidentRow(row as IncidentRow))
    .filter((incident): incident is IncidentReport => incident !== null);
}

export async function fetchUserPosts(): Promise<IncidentReport[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('incidents')
    .select(
      'id,type,description,latitude,longitude,created_at,location_label,title,verify_count,flag_count,resolve_count,image_url',
    )
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch user posts error:', error);
    return [];
  }

  return (data ?? [])
    .map<IncidentReport | null>((row) => mapIncidentRow(row as IncidentRow))
    .filter((incident): incident is IncidentReport => incident !== null);
}

function getDisplayNameFromUser(user: User): string {
  const metadata = user.user_metadata ?? {};
  return (
    metadata.full_name ||
    metadata.name ||
    metadata.username ||
    user.email?.split('@')[0] ||
    'Community member'
  );
}

function getAvatarUrlFromUser(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  return metadata.avatar_url || metadata.picture || null;
}

function getUsernameFromUser(user: User): string | null {
  const metadata = user.user_metadata ?? {};
  return metadata.username || null;
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }

  const user = userData.user;
  const fallbackDisplayName = getDisplayNameFromUser(user);
  const fallbackAvatarUrl = getAvatarUrlFromUser(user);
  const fallbackUsername = getUsernameFromUser(user);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, is_verified_contributor')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Fetch profile error:', profileError);
  }

  const needsCreate = !profile && !profileError;
  let merged = profile;

  if (needsCreate) {
    const { data: created, error: createError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username: fallbackUsername,
          display_name: fallbackDisplayName,
          avatar_url: fallbackAvatarUrl,
        },
        { onConflict: 'id' },
      )
      .select('id, display_name, avatar_url, is_verified_contributor')
      .single();

    if (createError) {
      console.error('Create profile error:', createError);
    } else {
      merged = created;
    }
  }

  return {
    id: user.id,
    displayName: merged?.display_name || fallbackDisplayName,
    avatarUrl: merged?.avatar_url ?? fallbackAvatarUrl ?? null,
    isVerifiedContributor: Boolean(merged?.is_verified_contributor),
  };
}

export async function createIncident(
  report: CreateIncidentInput,
): Promise<CreateIncidentResult> {
  const description = report.description?.trim() ?? '';
  const imageValue = report.imageUrl?.trim() ?? null;
  const shouldUploadImage = Boolean(imageValue && isLocalImageUri(imageValue));
  const hasCoords =
    typeof report.latitude === 'number' && typeof report.longitude === 'number';

  if (hasCoords) {
    const existing = await fetchIncidents();
    if (
      hasNearbySameTypeIncident(
        existing,
        report.type,
        report.latitude as number,
        report.longitude as number,
      )
    ) {
      return { success: false, error: 'NEARBY_DUPLICATE' };
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }

  const payload = {
    user_id: userData.user.id,
    type: report.type,
    description: description || null,
    latitude: hasCoords ? report.latitude : null,
    longitude: hasCoords ? report.longitude : null,
    location_label: report.locationLabel ?? null,
    title: report.title ?? null,
    image_url: shouldUploadImage ? null : imageValue,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('incidents')
    .insert(payload)
    .select(
      'id,type,description,latitude,longitude,created_at,location_label,title,verify_count,flag_count,resolve_count,image_url',
    )
    .single();

  if (error || !data) {
    console.error('Create incident error:', error);
    return { success: false, error: 'SAVE_FAILED' };
  }

  let storedImageUrl = data.image_url ?? null;

  if (shouldUploadImage && imageValue) {
    const uploadedUrl = await uploadIncidentPhoto(imageValue, data.id);
    if (uploadedUrl) {
      const { error: updateError } = await supabase
        .from('incidents')
        .update({ image_url: uploadedUrl })
        .eq('id', data.id);

      if (updateError) {
        console.error('Update incident image error:', updateError);
      } else {
        storedImageUrl = uploadedUrl;
      }
    }
  }

  const createdAt = data.created_at ? new Date(data.created_at) : new Date();
  const { datePosted, timePosted } = getSubmissionTimestamp(createdAt);

  const incident: IncidentReport = {
    id: data.id,
    type: data.type as IncidentReport['type'],
    description: data.description ?? '',
    latitude: data.latitude ?? 0,
    longitude: data.longitude ?? 0,
    datePosted,
    timePosted,
    locationLabel: data.location_label ?? undefined,
    title: data.title ?? undefined,
    verifyCount: data.verify_count ?? 0,
    flagCount: data.flag_count ?? 0,
    resolveCount: data.resolve_count ?? 0,
    imageUrl: storedImageUrl,
    placeholderImage: `${String(data.type).toLowerCase()}-pin`,
    postedBy: PROFILE_USERNAME,
  };

  return { success: true, incident };
}