// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

console.log('Booting up process-document function (v5 - client-side parsing)...');

// @ts-ignore - Deno environment
const ZILLIZ_CLOUD_URI = Deno.env.get('ZILLIZ_CLOUD_URI');
// @ts-ignore - Deno environment
const ZILLIZ_CLOUD_API_KEY = Deno.env.get('ZILLIZ_CLOUD_API_KEY');
// @ts-ignore - Deno environment
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 50; // Reduced batch size for larger chunks (3500 chars each)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ZILLIZ_CLOUD_URI || !ZILLIZ_CLOUD_API_KEY || !OPENAI_API_KEY) {
        throw new Error('Server configuration error: Missing API keys.');
    }

    const { fileName, chunks } = await req.json();
    if (!fileName || !chunks) {
        throw new Error('Invalid request body. "fileName" and "chunks" are required.');
    }
    
    console.log(`Processing ${chunks.length} chunks for file: ${fileName}`);
    console.log(`Average chunk size: ${Math.round(chunks.reduce((sum: number, chunk: string) => sum + chunk.length, 0) / chunks.length)} characters`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1}...`);

      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ input: batchChunks, model: 'text-embedding-ada-002' }),
      });
      if (!embeddingResponse.ok) throw new Error(`OpenAI API error: ${await embeddingResponse.text()}`);
      const embeddingData = await embeddingResponse.json();
      const embeddings = embeddingData.data.map((item: any) => item.embedding);

      const dataToInsert = batchChunks.map((chunk: string, j: number) => ({
        vector: embeddings[j],
        text: chunk,
        document_name: fileName,
        page_number: 1, // Placeholder
      }));

      const zillizInsertResponse = await fetch(`${ZILLIZ_CLOUD_URI}/v1/vector/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ZILLIZ_CLOUD_API_KEY}` },
          body: JSON.stringify({
              collectionName: 'ftx_documents',
              data: dataToInsert,
          }),
      });
      if (!zillizInsertResponse.ok) throw new Error(`Zilliz API error: ${await zillizInsertResponse.text()}`);
    }
    
    console.log('Successfully inserted all batches into Zilliz.');
    return new Response(JSON.stringify({ message: 'File processed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('*** FUNCTION CRASH in process-document ***:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
