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
    const { message, guest_token, settings, new_session } = await req.json();
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
      if (new_session) {
        // Create a new session when explicitly requested (New Chat button)
        const { data: newSession, error: newSessionError } = await supabaseClient
          .from('chat_sessions')
          .insert({ 
            user_id: user.id,
            session_token: `admin_${user.id}_${Date.now()}`
          })
          .select('id')
          .single();
        if (newSessionError) throw newSessionError;
        sessionId = newSession.id;
      } else {
        // Try to use the most recent session, or create one if none exists
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
              session_token: `admin_${user.id}_${Date.now()}`
            })
            .select('id')
            .single();
          if (newSessionError) throw newSessionError;
          sessionId = newSession.id;
        }
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

    // Save user message
    const { error: userInsertError } = await supabaseClient.from('chat_messages').insert({
      session_id: sessionId,
      message_type: 'user',
      content: message,
    });

    if (userInsertError) {
      console.error('Failed to save user message:', userInsertError);
      throw new Error('Failed to save user message');
    }

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
            limit: 25, // Increased to get more diverse options for better context
            outputFields: ['primary_key', 'text', 'document_name', 'page_number'],
        }),
    });
    if (!zillizSearchResponse.ok) throw new Error(`Zilliz API error: ${await zillizSearchResponse.text()}`);
    const zillizData = await zillizSearchResponse.json();
    
    if (!zillizData || !Array.isArray(zillizData.data)) {
        console.error('Unexpected Zilliz API response structure:', zillizData);
        throw new Error('Failed to parse search results from vector database.');
    }
    
    // Helper function to calculate text similarity for deduplication
    const calculateSimilarity = (text1: string, text2: string): number => {
      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      return intersection.size / union.size; // Jaccard similarity
    };

    const filteredResults = zillizData.data
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
          pattern.test(text) && text.length < 300 // Increased threshold for larger chunks
        );
        
        return !isMostlyBoilerplate && text.length > 200; // Increased minimum length
      });

    // Deduplicate similar chunks to ensure diverse context
    const deduplicatedResults: any[] = [];
    const SIMILARITY_THRESHOLD = 0.7; // 70% similarity threshold
    
    for (const result of filteredResults) {
      const isDuplicate = deduplicatedResults.some((existing: any) => 
        calculateSimilarity(result.text, existing.text) > SIMILARITY_THRESHOLD
      );
      
      if (!isDuplicate) {
        deduplicatedResults.push(result);
      }
      
      // Stop when we have enough diverse chunks
      if (deduplicatedResults.length >= 4) break;
    }

    const citations = deduplicatedResults
      .map((r) => ({
        id: r.primary_key,
        documentTitle: r.document_name,
        pageNumber: r.page_number,
        excerpt: r.text,
        similarity: r.distance,
      }));

    const context = citations.map((c) => `Doc: ${c.documentTitle} (p${c.pageNumber}): "${c.excerpt}"`).join('\n\n');
    const prompt = `You are an expert legal AI assistant analyzing FTX bankruptcy court documents. 

RESPONSE GUIDELINES:
- Answer directly and concisely based on the most relevant information
- For simple questions, provide brief, focused answers
- For complex questions, provide more detailed analysis as needed
- Only cite the most relevant documents that directly address the question
- Avoid repetitive information across sources

Context from ${citations.length} court document excerpts:
${context}

Question: ${message}

Provide a clear, focused answer based on the most relevant information from the court documents. Be concise but thorough enough to address the question properly.`;
    // Extract settings with defaults
    const modelToUse = settings?.model || 'claude-3-opus-20240229';
    const temperatureToUse = settings?.temperature !== undefined ? settings.temperature : 0.7;
    const maxTokensToUse = settings?.max_tokens || 1000;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': CLAUDE_API_KEY as string, 
          'anthropic-version': '2023-06-01' 
        },
        body: JSON.stringify({ 
          model: modelToUse, 
          max_tokens: maxTokensToUse,
          temperature: temperatureToUse,
          messages: [{ role: 'user', content: prompt }] 
        }),
    });
    if (!claudeResponse.ok) throw new Error(`Claude API error: ${await claudeResponse.text()}`);
    const claudeData = await claudeResponse.json();
    const assistantMessage = claudeData.content[0].text;

    // Save assistant message
    const { error: assistantInsertError } = await supabaseClient.from('chat_messages').insert({
      session_id: sessionId,
      message_type: 'assistant',
      content: assistantMessage,
      citations: citations,
    });

    if (assistantInsertError) {
      console.error('Failed to save assistant message:', assistantInsertError);
      throw new Error(`Failed to save assistant message: ${assistantInsertError.message}`);
    }

    // Update session last_activity
    const { error: sessionUpdateError } = await supabaseClient
      .from('chat_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    if (sessionUpdateError) {
      console.error('Failed to update session activity:', sessionUpdateError);
    }
    
    return new Response(JSON.stringify({ 
      message: assistantMessage, 
      citations, 
      guest_token: currentGuestToken,
      session_id: sessionId // Return session ID for frontend tracking
    }), {
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
