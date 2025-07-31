// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore - Deno environment
const ZILLIZ_CLOUD_URI = Deno.env.get('ZILLIZ_CLOUD_URI');
// @ts-ignore - Deno environment
const ZILLIZ_CLOUD_API_KEY = Deno.env.get('ZILLIZ_CLOUD_API_KEY');
// @ts-ignore - Deno environment
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
// @ts-ignore - Deno environment
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, guest_token } = await req.json();
    // @ts-ignore - Deno environment
    const supabaseClient = createClient(
      // @ts-ignore - Deno environment
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore - Deno environment
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    let sessionId;
    let currentGuestToken = guest_token;

    if (user) {
      const { data, error } = await supabaseClient
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false })
        .limit(1);

      if (error) throw error;
      sessionId = data?.[0]?.id;

      if (!sessionId) {
        const { data: newSession, error: newSessionError } = await supabaseClient
          .from('chat_sessions')
          .insert({ 
            user_id: user.id,
            session_token: `admin_${user.id}_${Date.now()}` // Generate a unique session token
          })
          .select('id')
          .single();
        if (newSessionError) throw newSessionError;
        sessionId = newSession.id;
      }
    } else {
        if (currentGuestToken) {
            const { data, error } = await supabaseClient
              .from('chat_sessions')
              .select('id')
              .eq('guest_token', currentGuestToken)
              .single();
            if (error && error.code !== 'PGRST116') throw error; 
            sessionId = data?.id;
        }

        if (!sessionId) {
            const guestSessionToken = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const { data: newSession, error: newSessionError } = await supabaseClient
              .from('chat_sessions')
              .insert({
                session_token: guestSessionToken,
                guest_token: crypto.randomUUID() // Generate a new guest token
              }) 
              .select('id, guest_token')
              .single();

            if (newSessionError) throw newSessionError;
            sessionId = newSession.id;
            currentGuestToken = newSession.guest_token;
        }
    }

    await supabaseClient.from('chat_messages').insert({
      session_id: sessionId,
      message_type: 'user',
      content: message,
    });

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: message, model: 'text-embedding-ada-002' }),
    });
    if (!embeddingResponse.ok) throw new Error(`OpenAI API error: ${await embeddingResponse.text()}`);
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const zillizSearchResponse = await fetch(`${ZILLIZ_CLOUD_URI}/v1/vector/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ZILLIZ_CLOUD_API_KEY}` },
        body: JSON.stringify({
            collectionName: 'ftx_documents',
            vector: queryEmbedding,
            limit: 10, // Increased from 5 to get more options
            outputFields: ['primary_key', 'text', 'document_name', 'page_number'],
        }),
    });
    if (!zillizSearchResponse.ok) throw new Error(`Zilliz API error: ${await zillizSearchResponse.text()}`);
    const zillizData = await zillizSearchResponse.json();
    
    if (!zillizData || !Array.isArray(zillizData.data)) {
        console.error('Unexpected Zilliz API response structure:', zillizData);
        throw new Error('Failed to parse search results from vector database.');
    }
    
    const citations = zillizData.data
      .filter((r) => {
        const text = r.text.toLowerCase();
        // Filter out chunks that are mostly addresses, headers, or boilerplate
        const addressPatterns = [
          /united states department of justice/i,
          /attn:/i,
          /p\.o\.\sbox/i,
          /^\d+ [a-z\s]+(street|avenue|boulevard|lane|road)/i,
          /[a-z\s]+llp/i,
          /case no\.:/i,
          /filed:/i,
          /page \d+ of \d+/i
        ];
        
        const isMostlyBoilerplate = addressPatterns.some(pattern => 
          pattern.test(text) && text.length < 200
        );
        
        return !isMostlyBoilerplate && text.length > 100;
      })
      .slice(0, 5) // Take top 5 after filtering
      .map((r) => ({
        id: r.primary_key,
        documentTitle: r.document_name,
        pageNumber: r.page_number,
        excerpt: r.text,
        similarity: r.distance,
      }));

    const context = citations.map((c) => `Doc: ${c.documentTitle} (p${c.pageNumber}): "${c.excerpt}"`).join('\n\n');
    const prompt = `You are an expert legal AI assistant analyzing FTX bankruptcy court documents. 

IMPORTANT INSTRUCTIONS:
- Focus ONLY on substantive legal content, rulings, decisions, and case developments
- Ignore boilerplate text, addresses, headers, footers, and procedural information
- If the provided context contains mostly addresses, headers, or procedural text, say so and ask for a more specific question
- Prioritize content that discusses legal arguments, court decisions, financial details, or case developments
- Provide clear, concise answers based on the most relevant legal content available

Context from court documents:
${context}

Question: ${message}

Please provide a detailed answer based on the substantive legal content from the court documents. If the context appears to be mostly procedural or boilerplate text, please note this limitation.`;
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': CLAUDE_API_KEY as string, 
          'anthropic-version': '2023-06-01' 
        },
        body: JSON.stringify({ model: 'claude-3-opus-20240229', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!claudeResponse.ok) throw new Error(`Claude API error: ${await claudeResponse.text()}`);
    const claudeData = await claudeResponse.json();
    const assistantMessage = claudeData.content[0].text;

    await supabaseClient.from('chat_messages').insert({
      session_id: sessionId,
      message_type: 'assistant',
      content: assistantMessage,
      citations: citations,
    });
    
    return new Response(JSON.stringify({ message: assistantMessage, citations, guest_token: currentGuestToken }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('*** FUNCTION CRASH ***:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
