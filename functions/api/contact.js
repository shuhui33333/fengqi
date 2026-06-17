/**
 * Cloudflare Pages Function — POST /api/contact
 * Single onRequest handler. Always returns JSON.
 * Web3Forms key is read from env.Web3Forms (Cloudflare Secret).
 */
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405)
  }

  try {
    const body = await request.formData()

    const key = env.Web3Forms ?? ''
    if (!key) {
      return json({ success: false, message: 'Server configuration error: missing API key' }, 500)
    }

    // Build payload with server-side key injected
    const payload = new FormData()
    payload.append('access_key', key)

    // Subject based on form source
    const formSource = String(body.get('form_source') ?? 'website')
    const subject = formSource === 'partnership'
      ? 'New Partnership Enquiry — Fengqi Group'
      : 'New Contact Enquiry — Fengqi Group'
    payload.append('subject',   subject)
    payload.append('from_name', 'Fengqi Group Website')

    // Copy all user fields except access_key
    for (const [k, v] of body.entries()) {
      if (k === 'access_key') continue
      payload.append(k, v)
    }

    // Call Web3Forms
    let w3Res
    try {
      w3Res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: payload })
    } catch (netErr) {
      return json({ success: false, message: `Network error: ${netErr}` }, 502)
    }

    // Read as text first — Web3Forms can return non-JSON on errors
    const rawText = await w3Res.text()
    console.log('[contact] Web3Forms status:', w3Res.status, '| body:', rawText.slice(0, 200))

    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      // Non-JSON response from Web3Forms (e.g. "error code: 1016")
      data = { success: false, message: rawText.slice(0, 200) || 'Unknown error from Web3Forms' }
    }

    // Normalise success — Web3Forms may return true (bool) or 1 (int) or "true" (string)
    const isSuccess = data.success === true || data.success === 1 || data.success === 'true'
    const normalised = { ...data, success: isSuccess }

    return json(normalised, isSuccess ? 200 : 422)

  } catch (err) {
    return json({ success: false, message: `Unexpected error: ${String(err)}` }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
