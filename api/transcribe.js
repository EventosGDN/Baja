const formidable = require('formidable');
const fs = require('fs');

module.exports = async function handler(req, res) {
  console.log('=== INICIO TRANSCRIPCIÓN ===');
  console.log('Método:', req.method);
  console.log('Headers:', req.headers);
  
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

  let tempFilePath = null;

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    console.log('API_KEY disponible:', !!API_KEY);
    
    if (!API_KEY) {
      console.error('GEMINI_API_KEY no encontrada en variables de entorno');
      return res.status(500).json({ error: 'API Key no configurada' });
    }

    console.log('Iniciando parseo de archivo...');
    
    // Usar la forma más simple de formidable
    const form = new formidable.IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true
    });

    // Promisificar form.parse de forma más robusta
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          console.log('Parse result - err:', !!err, 'files:', Object.keys(files || {}));
          if (err) {
            console.error('Error en form.parse:', err);
            reject(err);
          } else {
            resolve({ fields, files });
          }
        });
      });
    };

    const { fields, files } = await parseForm();
    console.log('Archivos recibidos:', Object.keys(files));
    
    // Verificar que el archivo existe - manejo más robusto
    let audioFile = files.audio;
    console.log('Audio file info:', audioFile);
    
    if (!audioFile) {
      console.error('No se encontró archivo de audio');
      return res.status(400).json({ error: 'Archivo de audio requerido' });
    }

    // Si audioFile es un array, tomar el primero
    if (Array.isArray(audioFile)) {
      audioFile = audioFile[0];
    }

    // Verificar que tiene filepath
    if (!audioFile.filepath) {
      console.error('Archivo sin filepath válido');
      return res.status(400).json({ error: 'Archivo de audio inválido' });
    }

    tempFilePath = audioFile.filepath;
    console.log('Filepath del audio:', tempFilePath);
    
    // Verificar que el archivo existe físicamente
    if (!fs.existsSync(tempFilePath)) {
      console.error('Archivo no existe en:', tempFilePath);
      return res.status(400).json({ error: 'Archivo de audio no encontrado' });
    }

    // Leer el archivo de audio
    console.log('Leyendo archivo de audio...');
    const audioBuffer = fs.readFileSync(tempFilePath);
    console.log('Archivo leído, tamaño:', audioBuffer.length, 'bytes');
    
    if (audioBuffer.length === 0) {
      console.error('Archivo de audio vacío');
      return res.status(400).json({ error: 'Archivo de audio vacío' });
    }

    const base64Audio = audioBuffer.toString('base64');
    console.log('Audio convertido a base64, length:', base64Audio.length);

    console.log('Llamando a Gemini API...');

    // Llamar a Gemini para transcripción
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    
    const geminiPayload = {
      contents: [{
        parts: [
          {
            text: "Transcribí este audio a texto en español argentino. Devolvé solo el texto transcrito, sin explicaciones adicionales. Si detectás palabras fuertes o malas palabras, transcribí exactamente lo que escuchás."
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
    };

    console.log('Enviando request a Gemini...');
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload)
    });

    console.log('Status de Gemini:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response de Gemini:', response.status, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      return res.status(response.status).json({
        error: `Error de transcripción: ${errorData.error?.message || errorData.message || 'Error desconocido'}`,
        details: errorData
      });
    }

    const data = await response.json();
    console.log('Respuesta de Gemini recibida, candidates:', data.candidates?.length || 0);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Respuesta inválida de Gemini:', JSON.stringify(data, null, 2));
      return res.status(500).json({ 
        error: 'Respuesta inválida de la API de transcripción',
        geminiResponse: data
      });
    }

    const transcription = data.candidates[0].content.parts[0].text.trim();
    console.log('Transcripción exitosa:', transcription);

    // Limpiar archivo temporal
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Archivo temporal limpiado');
      } catch (cleanupError) {
        console.warn('No se pudo limpiar archivo temporal:', cleanupError);
      }
    }

    console.log('=== TRANSCRIPCIÓN EXITOSA ===');
    res.status(200).json({
      transcription: transcription
    });

  } catch (error) {
    console.error('=== ERROR EN TRANSCRIPCIÓN ===');
    console.error('Error completo:', error);
    console.error('Stack:', error.stack);
    
    // Limpiar archivo temporal en caso de error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Archivo temporal limpiado después de error');
      } catch (cleanupError) {
        console.warn('No se pudo limpiar archivo en error:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
      type: error.constructor.name
    });
  }
};