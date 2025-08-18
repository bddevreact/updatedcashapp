import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ReferralPayload {
  referrerId: string;
  referredId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { referrerId, referredId }: ReferralPayload = await req.json();

      // Validate input
      if (!referrerId || !referredId) {
        throw new Error('Missing required fields');
      }

      // Check if referred user exists
      const { data: referredUser, error: referredError } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('telegram_id', referredId)
        .single();

      if (referredError || !referredUser) {
        throw new Error('Referred user not found');
      }

      // Check if referral already exists
      const { data: existingReferral, error: referralCheckError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', referredId)
        .single();

      if (existingReferral) {
        throw new Error('User already referred');
      }

      // Create referral
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: referredId,
        })
        .select()
        .single();

      if (referralError) {
        throw referralError;
      }

      // Award bonus to both users
      const referralBonus = 10000; // 10,000 TRD tokens
      
      // Update referrer balance
      await supabase.rpc('increment_balance', {
        user_telegram_id: referrerId,
        amount: referralBonus
      });

      // Update referred user balance
      await supabase.rpc('increment_balance', {
        user_telegram_id: referredId,
        amount: referralBonus
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: referral,
          message: 'Referral processed successfully'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 405,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});