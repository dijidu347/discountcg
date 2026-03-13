import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();

    // 1. Expire demarches past 30 days
    const { data: expired, error: expireError } = await supabase
      .from('demarches')
      .update({ status: 'expire', updated_at: now.toISOString() })
      .in('payment_mode', ['client_pays_all', 'split'])
      .eq('client_paid', false)
      .eq('status', 'en_attente_paiement_client')
      .lt('client_payment_token_expires_at', now.toISOString())
      .select('id, garage_id, garages(email, raison_sociale), immatriculation, numero_demarche, type');

    if (expireError) {
      console.error('❌ Error expiring demarches:', expireError);
    } else if (expired && expired.length > 0) {
      console.log(`✅ Expired ${expired.length} demarches`);
      // Notify pros about expired demarches
      for (const d of expired) {
        const garage = d.garages as any;
        if (garage?.email) {
          await sendEmail(supabase, 'client_payment_expired', garage.email, {
            garage_name: garage.raison_sociale,
            reference: d.numero_demarche,
            immatriculation: d.immatriculation,
            type: d.type,
          });
        }
      }
    }

    // 2. Send reminder 1 at J+15
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    await sendReminders(supabase, fifteenDaysAgo, 1);

    // 3. Send reminder 2 at J+25
    const twentyFiveDaysAgo = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    await sendReminders(supabase, twentyFiveDaysAgo, 2);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Error in process-payment-reminders:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendReminders(supabase: any, cutoffDate: Date, reminderNumber: number) {
  // Find demarches created before cutoff that haven't received this reminder yet
  const { data: demarches, error } = await supabase
    .from('demarches')
    .select('id, client_email, immatriculation, numero_demarche, type, client_payment_token, garages(raison_sociale)')
    .in('payment_mode', ['client_pays_all', 'split'])
    .eq('client_paid', false)
    .eq('status', 'en_attente_paiement_client')
    .lt('created_at', cutoffDate.toISOString());

  if (error || !demarches || demarches.length === 0) return;

  for (const d of demarches) {
    // Check if reminder already sent
    const { data: existing } = await supabase
      .from('payment_reminders')
      .select('id')
      .eq('demarche_id', d.id)
      .eq('reminder_number', reminderNumber)
      .single();

    if (existing) continue;

    // Send reminder email to client
    if (d.client_email) {
      const garage = d.garages as any;
      await sendEmail(supabase, 'client_payment_reminder', d.client_email, {
        garage_name: garage?.raison_sociale || '',
        immatriculation: d.immatriculation,
        reference: d.numero_demarche,
        type: d.type,
        payment_url: `https://discountcartegrise.fr/paiement-client/${d.client_payment_token}`,
        reminder_number: reminderNumber,
      });
    }

    // Record reminder
    await supabase.from('payment_reminders').insert({
      demarche_id: d.id,
      reminder_number: reminderNumber,
    });

    console.log(`✅ Reminder ${reminderNumber} sent for demarche ${d.id}`);
  }
}

async function sendEmail(supabase: any, type: string, to: string, data: Record<string, unknown>) {
  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({ type, to, data }),
      }
    );
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
  }
}
