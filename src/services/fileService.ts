import { supabase } from './supabaseClient';

class FileService {
  async uploadDocumentChunks(fileName: string, chunks: string[], onProgress: (progress: number) => void) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to upload files.');
    }

    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { fileName, chunks },
    });

    if (error) {
      throw error;
    }

    // Since the expensive work is now on the client, the function call is fast.
    // We can just set progress to 100.
    onProgress(100);

    return data;
  }
}

export const fileService = new FileService();
