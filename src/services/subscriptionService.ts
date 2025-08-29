import { supabase } from '../utils/supabaseClient';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  max_reservations: number | null;
  max_zones: number | null;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  plan?: SubscriptionPlan;
}

export const subscriptionService = {
  // Učitaj sve dostupne planove
  async getPlans() {
    console.log('Getting subscription plans');
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Error getting plans:', error);
      throw error;
    }

    return data || [];
  },

  // Učitaj trenutnu pretplatu korisnika
  async getUserSubscription(userId: string) {
    console.log('Getting user subscription:', userId);
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user subscription:', error);
      throw error;
    }

    return data;
  },

  // Kreiraj ili ažuriraj pretplatu
  async createOrUpdateSubscription(userId: string, planId: string) {
    console.log('Creating/updating subscription:', { userId, planId });
    
    try {
      // Prvo otkaži postojeće aktivne pretplate
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');

      // Kreiraj novu pretplatu
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          starts_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Ažuriraj is_subscribed u profiles
      await supabase
        .from('profiles')
        .update({ is_subscribed: true })
        .eq('id', userId);

      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  },

  // Otkaži pretplatu
  async cancelSubscription(userId: string) {
    console.log('Cancelling subscription:', userId);
    
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'cancelled',
          ends_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      // Ažuriraj is_subscribed u profiles
      await supabase
        .from('profiles')
        .update({ is_subscribed: false })
        .eq('id', userId);

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  // Proveri limite pretplate
  async checkSubscriptionLimits(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription || !subscription.plan) {
      // Free plan limits
      return {
        canAddReservations: true,
        canAddZones: false,
        maxReservations: 50,
        maxZones: 1
      };
    }

    const plan = subscription.plan;
    
    // Prebroj trenutne rezervacije i zone
    const { count: reservationCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString());

    const { count: zoneCount } = await supabase
      .from('zones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      canAddReservations: !plan.max_reservations || (reservationCount || 0) < plan.max_reservations,
      canAddZones: !plan.max_zones || (zoneCount || 0) < plan.max_zones,
      maxReservations: plan.max_reservations,
      maxZones: plan.max_zones,
      currentReservations: reservationCount || 0,
      currentZones: zoneCount || 0
    };
  }
}; 