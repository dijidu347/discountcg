import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_TOKEN = Deno.env.get('INTERNAL_API_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const SUBJECT = 'Lancez votre dépôt-vente automobile avec MaJi Auto';
const FROM = 'MaJi Auto <noreply@discountcartegrise.fr>';
const REPLY_TO = 'contact@maji-auto.fr';

const HTML_TEMPLATE = `__HTML__`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || req.headers.get('x-admin-token');
    if (token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const dryRun = url.searchParams.get('dry') === '1';
    const testEmail = url.searchParams.get('test');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('garages')
      .select('email')
      .not('email', 'is', null);
    if (error) throw error;

    const set = new Set<string>();
    for (const row of data || []) {
      const e = (row.email || '').trim().toLowerCase();
      if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) set.add(e);
    }
    let recipients = [...set];
    if (testEmail) recipients = [testEmail.toLowerCase()];

    if (dryRun) {
      return new Response(JSON.stringify({ count: recipients.length, sample: recipients.slice(0, 5) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: { sent: number; failed: number; errors: any[] } = { sent: 0, failed: 0, errors: [] };
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const slice = recipients.slice(i, i + batchSize);
      const payload = slice.map((to) => ({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject: SUBJECT,
        html: HTML_TEMPLATE,
      }));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        results.failed += slice.length;
        results.errors.push({ batch: i, status: res.status, body: j });
      } else {
        results.sent += slice.length;
      }
      // Throttle 1s between batches to stay under Resend rate limits
      await new Promise((r) => setTimeout(r, 1100));
    }

    return new Response(JSON.stringify({ total: recipients.length, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
