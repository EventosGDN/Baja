const formidable = require('formidable');
const fs = require('fs');

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

    // Parsear el audio usando formidable
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Error parseando archivo:', err);
        return res.status(500).json({ error: 'Error procesando archivo de audio' });
      }

      const audioFile = files.audio;
      if (!audioFile) {
        return res.status(400).json({ error: 'Archivo de audio requerido' });
      }

      try {
        // Leer el archivo de audio
        const audioBuffer = fs.readFileSync(audioFile.filepath);
        const base64Audio = audioBuffer.toString('base64');

        console.log('Transcribiendo audio con Gemini...');

        // Llamar a Gemini para transcripción
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Transcribí este audio a texto. Devolvé solo el texto transcrito, sin explicaciones adicionales."
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
              maxOutputTokens: 500,
              topP: 0.8,
              topK: 40
            }
          })
        });

        console.log('Status de transcripción:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error de Gemini API:', errorData);
          return res.status(response.status).json({
            error: `Error de transcripción: ${errorData.error?.message || 'Error desconocido'}`
          });
        }

        const data = await response.json();
        console.log('Respuesta de transcripción:', JSON.stringify(data, null, 2));

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error('Respuesta inválida de Gemini:', data);
          return res.status(500).json({ error: 'Respuesta inválida de la API de transcripción' });
        }

        const transcription = data.candidates[0].content.parts[0].text.trim();
        console.log('Transcripción exitosa:', transcription);

        // Limpiar archivo temporal
        fs.unlinkSync(audioFile.filepath);

        res.status(200).json({
          transcription: transcription
        });

      } catch (error) {
        console.error('Error en transcripción:', error);
        res.status(500).json({
          error: 'Error interno del servidor',
          details: error.message
        });
      }
    });

  } catch (error) {
    console.error('Error en la función:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}