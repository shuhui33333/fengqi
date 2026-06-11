/**
 * Cloudflare Pages Function
 * POST /api/contact
 *
 * Reads the Web3Forms access key from env (Cloudflare Secret: Web3Forms),
 * injects it server-side, then proxies the submission to Web3Forms.
 * The browser never sees the access key.
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.formData()

    // Build a new FormData with the server-side key injected
    const payload = new FormData()
    payload.append('access_key', env.Web3Forms ?? '')
    // Subject line — includes source form for routing
    const formSource = body.get('form_source') ?? 'website'
    const subjectMap = { partnership: 'New Partnership Enquiry — Fengqi Group', contact: 'New Contact Enquiry — Fengqi Group' }
    payload.append('subject', subjectMap[formSource] ?? 'New Enquiry — Fengqi Group')
    payload.append('from_name',  'Fengqi Group Website')

    // Copy every user-submitted field
    for (const [key, value] of body.entries()) {
      // Skip if client somehow sent access_key (defence-in-depth)
      if (key === 'access_key') continue
      payload.append(key, value)
    }

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body:   payload,
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Block non-POST requests
export async function onRequest({ request }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
}
