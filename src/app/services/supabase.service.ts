import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  Session,
  User,
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

  getSession(): Promise<Session | null> {
    return this.supabase.auth.getSession().then(({ data }) => data.session);
  }

  getUser(): Promise<User | null> {
    return this.supabase.auth.getUser().then(({ data }) => data.user);
  }

  signInWithEmail(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signUpWithEmail(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/configurar` },
    });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, session) =>
      callback(session)
    );
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async getMyEvent(userId: string): Promise<ChaEvent | null> {
    const { data } = await this.supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }

  async getEventBySlug(slug: string): Promise<ChaEvent | null> {
    const { data } = await this.supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('paid', true)
      .single();
    return data;
  }

  async upsertEvent(payload: Partial<ChaEvent>): Promise<ChaEvent | null> {
    const { data } = await this.supabase
      .from('events')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    return data;
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async getItems(eventId: string): Promise<EventItem[]> {
    const { data } = await this.supabase
      .from('event_items')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order');
    return data ?? [];
  }

  async replaceItems(eventId: string, items: Omit<EventItem, 'id'>[]): Promise<void> {
    await this.supabase.from('event_items').delete().eq('event_id', eventId);
    if (items.length) {
      await this.supabase.from('event_items').insert(items);
    }
  }

  // ── Reservations ──────────────────────────────────────────────────────────

  async getReservationsByEvent(eventId: string): Promise<EventReservation[]> {
    const { data } = await this.supabase
      .from('event_reservations')
      .select('id, item_id, guest_name, created_at, event_items!inner(event_id, name, emoji, category)')
      .eq('event_items.event_id', eventId)
      .order('created_at', { ascending: false });
    return (data as unknown as EventReservation[]) ?? [];
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

  async activateEvent(userId: string): Promise<{ success: boolean }> {
    const { data } = await this.supabase.rpc('activate_event', {
      p_user_id: userId,
    });
    return data ?? { success: false };
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
