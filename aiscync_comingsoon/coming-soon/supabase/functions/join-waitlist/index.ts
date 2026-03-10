import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiting (best effort)
const rateLimit = new Map<string, { count: number; lastReset: number }>()
const MAX_REQUESTS = 3 // Per 10 minutes
const WINDOW_MS = 10 * 60 * 1000

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Get IP from headers (standard on Supabase)
  const ip = req.headers.get('x-real-ip') || 'unknown'
  const now = Date.now()
  
  // Apply rate limiting
  const currentLimit = rateLimit.get(ip) || { count: 0, lastReset: now }
  
  if (now - currentLimit.lastReset > WINDOW_MS) {
    currentLimit.count = 0
    currentLimit.lastReset = now
  }

  if (currentLimit.count >= MAX_REQUESTS) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429 
      }
    )
  }

  try {
    const payload = await req.json()
    const { email, organization, role, hp_field } = payload

    // 1. Honey-pot check: if hidden field is filled, it's a bot
    if (hp_field) {
      console.warn('Honey-pot triggered by IP:', ip)
      return new Response(JSON.stringify({ message: 'Success' }), { headers: corsHeaders }) // Fake success
    }

    // 2. Validate email
    if (!email || !email.includes('@') || email.length > 255) {
      throw new Error('Invalid email format')
    }

    // 3. Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Update rate limit count
    currentLimit.count++
    rateLimit.set(ip, currentLimit)

    // 5. Insert into waitlist table
    const { error } = await supabaseClient
      .from('waitlist')
      .insert([{ 
        email: email.trim().toLowerCase(), 
        organization: organization?.slice(0, 100), 
        role: role?.slice(0, 50) 
      }])

    if (error) {
      // Handle unique constraint (already on list)
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ message: 'You are already on the waitlist!' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({ message: 'Successfully joined waitlist!' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Waitlist Error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Submission failed. Please check your data.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
