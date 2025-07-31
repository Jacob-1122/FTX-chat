import { supabase } from './supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

// This will hold the session state in memory.
let currentSession: Session | null = null;

class AuthService {

  constructor() {
    // Initialize session synchronously
    this.initializeSession();
  }

  private async initializeSession() {
    try {
      const session = await this.getSession();
      currentSession = session;
    } catch (error) {
      console.error('Error initializing session:', error);
    }
    
    // Set up auth state listener
    this.onAuthStateChange((_event, session) => {
        currentSession = session;
    });
  }

  /**
   * Signs in a user with their email and password.
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    currentSession = data.session;
    return data;
  }

  /**
   * Signs out the currently logged-in user.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentSession = null;
  }

  /**
   * Gets the current user's session asynchronously.
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;
    return session;
  }

  /**
   * Gets the current user's session synchronously from memory.
   */
  getSessionSync(): Session | null {
      return currentSession;
  }

  /**
   * Listens for changes in the authentication state (e.g., login, logout).
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Creates the admin user if it doesn't already exist.
   * This is intended to be run once during setup.
   */
  async createAdminUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error && error.message.includes('User already registered')) {
        console.log('Admin user already exists.');
        return;
    }
    
    if (error) {
        console.error('Error creating admin user:', error);
        throw error;
    }

    console.log('Admin user created successfully:', data);
  }
}

export const authService = new AuthService();
