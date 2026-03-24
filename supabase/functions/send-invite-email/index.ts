import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'invites@slow-to-pro.app';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://slow-to-pro.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email service not configured.' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { inviteeEmail, spaceName, inviterEmail } = await req.json();

  const inviterLine = inviterEmail
    ? `<strong>${inviterEmail}</strong> has invited you`
    : 'You have been invited';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;">You've been invited!</h2>
      <p style="color:#334155;line-height:1.6;">
        ${inviterLine} to join <strong>"${spaceName}"</strong> on <strong>Slow to Pro</strong>.
      </p>
      <p style="color:#334155;line-height:1.6;">
        Open the app and sign in with <strong>${inviteeEmail}</strong>, then go to
        <strong>Settings → Shared Spaces → Invites</strong> to accept.
      </p>
      <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Open Slow to Pro
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
        Don't have an account yet? Sign up for free at
        <a href="${APP_URL}" style="color:#2563eb;">${APP_URL}</a>.
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: inviteeEmail,
      subject: `You've been invited to join "${spaceName}" on Slow to Pro`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(JSON.stringify({ error: body }), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
