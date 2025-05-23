module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      console.error('GEMINI_API_KEY no encontrada en variables de entorno');
      return res.status(500).json({ error: 'API Key no configurada' });
    }

    // Leer el body como buffer
    const chunks = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        // Si es FormData, extraer solo los datos del audio
        let audioBuffer;
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
          // Buscar el inicio y fin de los datos del archivo
          const boundary = contentType.split('boundary=')[1];
          const boundaryBuffer = Buffer.from(`--${boundary}`);
          
          // Encontrar donde empiezan los datos del archivo (después de \r\n\r\n)
          const headerEnd = buffer.indexOf('\r\n\r\n');
          if (headerEnd === -1) {
            throw new Error('Formato de FormData inválido');
          }
          
          // Extraer solo los datos del archivo
          const startData = headerEnd + 4;
          const endBoundary = buffer.lastIndexOf(boundaryBuffer);
          audioBuffer = buffer.slice(startData, endBoundary - 2); // -2 para quitar \r\n
        } else {
          // Si viene como binary directo
          audioBuffer = buffer;
        }

        console.log('Audio buffer size:', audioBuffer.length, 'bytes');

        if (audioBuffer.length === 0) {
          return res.status(400).json({ error: 'Archivo de audio vacío' });
        }

        // Convertir a base64
        const base64Audio = audioBuffer.toString('base64');

        console.log('Llamando a Gemini API para transcripción...');

        // Llamar a Gemini API para transcripción
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Transcribe este audio a texto en español. Responde SOLO con el texto transcrito, sin explicaciones adicionales."
                },
                {
                  inline_data: {
                    mime_type: "audio/webm",
                    data: base64Audio
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
              topP: 0.8,
              topK: 40
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
          })
        });

        console.log('Status de Gemini API (transcripción):', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error de Gemini API:', errorData);
          return res.status(response.status).json({
            error: `Error de transcripción: ${errorData.error?.message || 'Error desconocido'}`
          });
        }

        const data = await response.json();
        console.log('Respuesta de transcripción recibida');

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error('Respuesta inválida de Gemini:', data);
          return res.status(500).json({ error: 'Respuesta inválida de la API de transcripción' });
        }

        const transcription = data.candidates[0].content.parts[0].text.trim();
        console.log('Transcripción exitosa:', transcription);

        res.status(200).json({
          transcription: transcription.replace(/^["']|["']$/g, '').trim()
        });

      } catch (error) {
        console.error('Error procesando audio:', error);
        res.status(500).json({
          error: 'Error procesando el audio',
          details: error.message
        });
      }
    });

  } catch (error) {
    console.error('Error en la transcripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};