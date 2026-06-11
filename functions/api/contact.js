/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Single onRequest handler (no separate onRequestPost).
 * Always returns JSON. Reads Web3Forms key from env (Secret: Web3Forms).
 * The access key is never sent to the browser.
 */
export async function onRequest({ request, env }) {
  // Block non-POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.formData()

    // Build payload with server-side key
    const payload = new FormData()
    const key = env.Web3Forms ?? ''
    if (!key) {
      return new Response(
        JSON.stringify({ success: false, message: 'Server configuration error: missing API key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    payload.append('access_key', key)

    // Subject based on form source
    const formSource = String(body.get('form_source') ?? 'website')
    const subjects = {
      partnership: 'New Partnership Enquiry — Fengqi Group',
      contact:     'New Contact Enquiry — Fengqi Group',
    }
    payload.append('subject',   subjects[formSource] ?? 'New Website Enquiry — Fengqi Group')
    payload.append('from_name', 'Fengqi Group Website')

    // Forward all user fields (excluding access_key)
    for (const [key, value] of body.entries()) {
      if (key === 'access_key') continue
      payload.append(key, value)
    }

    // Call Web3Forms
    let w3Res
    try {
      w3Res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body:   payload,
      })
    } catch (networkErr) {
      return new Response(
        JSON.stringify({ success: false, message: `Network error reaching Web3Forms: ${networkErr}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Read response as text first — Web3Forms may return non-JSON on errors
    const rawText = await w3Res.text()
    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      // Web3Forms returned plain text (e.g. "error code: 1016")
      data = {
        success: false,
        message: `Web3Forms error: ${rawText.slice(0, 200)}`,
      }
    }

    return new Response(JSON.stringify(data), {
      status:  w3Res.ok && data.success ? 200 : 422,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: `Unexpected error: ${String(err)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
