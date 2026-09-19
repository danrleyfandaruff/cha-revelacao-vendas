import { Injectable } from '@angular/core';
import { EventType, BabySex } from '../models/event-types';
import {
  createClient,
  SupabaseClient,
  Session,
  User,
  AuthChangeEvent,
} from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChaEvent {
  id: string;
  user_id: string;
  slug: string;
  baby_name_1: string;
  baby_name_2: string;
  paid: boolean;
  expires_at: string | null;
  created_at: string;
  address: string | null;
  event_datetime: string | null;
  event_type?: EventType | null;
  baby_sex?: BabySex | null;
  archived_at?: string | null;
}

export interface EventItem {
  id: string;
  event_id: string;
  category: 'fraldas' | 'presentes';
  name: string;
  emoji: string;
  quantity_total: number;
  quantity_available: number;
  sort_order: number;
}

export interface EventReservation {
  id: string;
  item_id: string;
  guest_name: string;
  created_at: string;
  event_items?: EventItem;
}

export interface EventConfirmation {
  id: string;
  event_id: string;
  guest_name: string;
  confirmed_at: string;
}

export interface PreNatalTokenStatus {
  valid: boolean;
  active: boolean;
  downloads_used: number;
  max_downloads: number;
  can_download: boolean;
  downloaded_at: string | null;
}

export interface PreNatalDownloadResult {
  success: boolean;
  reason?: 'already_used' | 'invalid' | 'error';
  status?: PreNatalTokenStatus;
}

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  auth_provider: string | null;
  phone_source: string | null;
  created_at: string;
  updated_at: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  private readonly SUPABASE_URL = 'https://mpkrpzzcdqoaolxyrmit.supabase.co';
  private readonly SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wa3JwenpjZHFvYW9seHlybWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTgzNjQsImV4cCI6MjA4OTYzNDM2NH0.FlJnl0DTNIA6_HbiibWTwuayCjkUhBilWOsNOeSCBio';

  constructor() {
    this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  initializeAuth() {
    return this.supabase.auth.initialize();
  }

  getSession(): Promise<Session | null> {
    return this.supabase.auth.getSession().then(({ data }) => data.session);
  }

  getUser(): Promise<User | null> {
    return this.supabase.auth.getUser().then(({ data }) => data.user);
  }

  signInWithEmail(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signUpWithEmail(email: string, password: string, phone?: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: phone ? { phone } : undefined,
        emailRedirectTo: new URL('/login', window.location.origin).toString(),
      },
    });
  }

  signInWithGoogle(
    mode: 'entrar' | 'cadastrar' = 'cadastrar',
    next = '/configurar'
  ) {
    const redirectUrl = new URL('/login', window.location.origin);
    redirectUrl.searchParams.set('mode', mode);
    redirectUrl.searchParams.set('oauth', 'google');
    redirectUrl.searchParams.set('next', next);

    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl.toString() },
    });
  }

  async syncCurrentUserProfile(phoneOverride?: string | null): Promise<UserProfile | null> {
    const user = await this.getUser();
    if (!user) return null;

    const phoneFromMetadata = typeof user.user_metadata?.['phone'] === 'string'
      ? user.user_metadata['phone']
      : null;
    const profilePayload = {
      id: user.id,
      email: user.email ?? null,
      auth_provider: typeof user.app_metadata?.['provider'] === 'string'
        ? user.app_metadata['provider']
        : null,
      // Omitted fields stay untouched on conflict, preserving Google's manual phone.
      ...(phoneOverride ? { phone: phoneOverride, phone_source: 'manual' }
        : phoneFromMetadata ? { phone: phoneFromMetadata, phone_source: 'auth_metadata' } : {}),
    };

    const { data, error } = await this.supabase
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao sincronizar perfil do usuário:', error);
      return null;
    }

    return data as UserProfile;
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  onAuthStateChange(callback: (session: Session | null, event: AuthChangeEvent) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) =>
      callback(session, event)
    );
  }

  resetPassword(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('/redefinir-senha', window.location.origin).toString(),
    });
  }

  updatePassword(password: string) {
    return this.supabase.auth.updateUser({ password });
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async getMyEvent(userId: string): Promise<ChaEvent | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .is('archived_at', null)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getMyEvents(userId: string): Promise<ChaEvent[]> {
    const { data, error } = await this.supabase.from('events').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async archiveExpiredEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase.rpc('archive_expired_event', { p_event_id: eventId });
    if (error) throw error;
  }

  async getEventBySlug(slug: string): Promise<ChaEvent | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('paid', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Igual ao anterior, mas sem filtro de paid — usado no modo preview
  async getEventBySlugPreview(slug: string): Promise<ChaEvent | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertEvent(payload: Partial<ChaEvent>): Promise<ChaEvent | null> {
    const { id, paid, expires_at, archived_at, ...details } = payload;
    const query = id
      ? this.supabase.from('events').update(details).eq('id', id).is('archived_at', null)
      : this.supabase.from('events').insert({ ...details, paid: false, expires_at: null });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async getItems(eventId: string): Promise<EventItem[]> {
    const { data, error } = await this.supabase
      .from('event_items')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  // Sincroniza os itens do evento preservando o id de quem já existia — evita
  // que o CASCADE de event_reservations.item_id apague reservas de convidados
  // sempre que o dono só edita quantidade/nome de um item já existente.
  // `deletableIds` é decidido pelo chamador (só itens sem reserva) — o service
  // nunca apaga nada por conta própria além do que foi explicitamente permitido.
  async syncItems(items: EventItem[], deletableIds: string[]): Promise<void> {
    if (deletableIds.length) {
      const { error } = await this.supabase.from('event_items').delete().in('id', deletableIds);
      if (error) throw error;
    }

    if (items.length) {
      const { error } = await this.supabase.from('event_items').upsert(items, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // ── Reservations ──────────────────────────────────────────────────────────

  async getReservationsByEvent(eventId: string): Promise<EventReservation[]> {
    const { data, error } = await this.supabase
      .from('event_reservations')
      .select('id, item_id, guest_name, created_at, event_items!inner(event_id, name, emoji, category)')
      .eq('event_items.event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as EventReservation[]) ?? [];
  }

  // ── Confirmations ─────────────────────────────────────────────────────────

  async saveConfirmation(eventId: string, guestName: string): Promise<void> {
    const { error } = await this.supabase.from('event_confirmations').insert({
      event_id: eventId,
      guest_name: guestName,
    });
    if (error) throw error;
  }

  async getConfirmations(eventId: string): Promise<EventConfirmation[]> {
    const { data, error } = await this.supabase
      .from('event_confirmations')
      .select('*')
      .eq('event_id', eventId)
      .order('confirmed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ── RPC ───────────────────────────────────────────────────────────────────

  async reserveEventItem(
    itemId: string,
    guestName: string
  ): Promise<{ success: boolean; message?: string }> {
    const { data, error } = await this.supabase.rpc('reserve_event_item', {
      p_item_id: itemId,
      p_guest_name: guestName,
    });
    if (error) return { success: false, message: error.message };
    return data ?? { success: false };
  }

  // Retorna o token gerado pelo webhook do Stripe pra essa sessão de checkout,
  // ou null se ainda não processou (ou a sessão não existe).
  async claimPreNatalToken(sessionId: string): Promise<string | null> {
    const { data, error } = await this.supabase.rpc('claim_pre_natal_token', {
      p_session_id: sessionId,
    });
    if (error) return null;
    return data ?? null;
  }

  async verifyPreNatalToken(token: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('verify_pre_natal_token', {
      p_token: token,
    });
    if (error) return false;
    return !!data;
  }

  async getPreNatalTokenStatus(token: string): Promise<PreNatalTokenStatus> {
    const { data, error } = await this.supabase.rpc('get_pre_natal_token_status', {
      p_token: token,
    });

    if (error || !data) {
      const valid = await this.verifyPreNatalToken(token);
      return {
        valid,
        active: valid,
        downloads_used: 0,
        max_downloads: 1,
        can_download: valid,
        downloaded_at: null,
      };
    }

    return data as PreNatalTokenStatus;
  }

  async consumePreNatalDownload(token: string): Promise<PreNatalDownloadResult> {
    const { data, error } = await this.supabase.rpc('consume_pre_natal_download', {
      p_token: token,
    });

    if (error || !data) {
      return { success: false, reason: 'error' };
    }

    return data as PreNatalDownloadResult;
  }

  // ── Slug helper ───────────────────────────────────────────────────────────
  slugify(text: string, userId?: string): string {
    const base = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    // Adiciona sufixo único dos primeiros 6 chars do userId para evitar colisão
    const suffix = userId ? `-${userId.replace(/-/g, '').slice(0, 6)}` : '';
    return `${base}${suffix}`;
  }
}
