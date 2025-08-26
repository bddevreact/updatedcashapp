import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { referrerId, referredId, referralCode } = await req.json()

    if (!referrerId || !referredId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Check if user already exists in database
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('telegram_id, created_at')
      .eq('telegram_id', referredId)
      .single()

    if (existingUser) {
      // User already exists - check if they were referred before
      const { data: existingReferral, error: referralCheckError } = await supabase
        .from('referrals')
        .select('id, referrer_id, status, created_at')
        .eq('referred_id', referredId)
        .single()

      if (existingReferral) {
        // User was already referred before - give warning to referrer
        const warningMessage = `⚠️ Warning: User @${referredId} has already joined before using referral link. No reward will be given for duplicate joins.`
        
        // Create notification for referrer
        await supabase
          .from('notifications')
          .insert({
            user_id: referrerId,
            title: 'Duplicate Join Warning',
            message: warningMessage,
            type: 'warning'
          })

        console.log(`Duplicate join detected for user ${referredId}. Warning sent to referrer ${referrerId}.`)
        return new Response(JSON.stringify({ 
          message: 'User already joined before. No reward given.',
          warning: warningMessage
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // Check if referral already exists (including re-joins)
    const { data: existingReferral, error: referralCheckError } = await supabase
      .from('referrals')
      .select('id, status, created_at, updated_at, bonus_amount, rejoin_count')
      .eq('referred_id', referredId)
      .single()

    if (existingReferral) {
      const lastJoinDate = new Date(existingReferral.updated_at || existingReferral.created_at)
      const currentDate = new Date()
      const daysSinceLastJoin = (currentDate.getTime() - lastJoinDate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceLastJoin < 1) {
        console.log(`User ${referredId} re-joined within 24 hours. No bonus awarded.`)
        return new Response(JSON.stringify({ message: 'User re-joined within 24 hours. No bonus awarded.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } else {
        const reJoinBonus = 1 // Half of original 2 taka
        await supabase.rpc('increment_balance', {
          user_telegram_id: referrerId,
          amount: reJoinBonus
        })

        await supabase
          .from('referrals')
          .update({
            status: 'verified',
            bonus_amount: (existingReferral.bonus_amount || 0) + reJoinBonus,
            updated_at: new Date().toISOString(),
            rejoin_count: (existingReferral.rejoin_count || 0) + 1,
            is_active: true,
            leave_date: null
          })
          .eq('id', existingReferral.id)

        console.log(`User ${referredId} re-joined after 24 hours. Referrer ${referrerId} awarded ${reJoinBonus} taka.`)
        return new Response(JSON.stringify({ message: `User re-joined. Referrer awarded ${reJoinBonus} taka.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // Create new referral record
    const { data: newReferral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: referredId,
        referral_code: referralCode || null,
        status: 'pending',
        bonus_amount: 0,
        rejoin_count: 0,
        is_active: true,
        last_join_date: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating referral:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create referral' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Award 2 taka to referrer for new referral
    const { error: balanceError } = await supabase.rpc('increment_balance', {
      user_telegram_id: referrerId,
      amount: 2
    })

    if (balanceError) {
      console.error('Error updating balance:', balanceError)
    }

    // Update referral status to verified and set bonus amount
    await supabase
      .from('referrals')
      .update({
        status: 'verified',
        bonus_amount: 2
      })
      .eq('id', newReferral.id)

    // Create earnings record for referrer
    await supabase
      .from('earnings')
      .insert({
        user_id: referrerId,
        amount: 2,
        type: 'referral_bonus',
        description: `Referral bonus for user @${referredId}`,
        referral_id: newReferral.id
      })

    // Update user level based on total referrals
    await supabase.rpc('update_user_level', { user_telegram_id: referrerId })

    console.log(`New referral created: ${referrerId} referred ${referredId}. Referrer awarded 2 taka.`)
    
    return new Response(JSON.stringify({ 
      message: 'Referral processed successfully',
      referrerReward: 2,
      referredReward: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing referral:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})