require('dotenv').config();

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
    const { prompt, mode } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt requerido' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'API Key no configurada' });
    }

    console.log('Llamando a Gemini API...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error de Gemini API:', errorData);
      return res.status(response.status).json({ 
        error: `Error de API: ${errorData.error?.message || 'Error desconocido'}` 
      });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Respuesta inválida de Gemini:', data);
      return res.status(500).json({ error: 'Respuesta inválida de la API' });
    }

    const result = data.candidates[0].content.parts[0].text.trim();
    
    console.log('Transformación exitosa');
    
    res.status(200).json({ 
      result: result.replace(/^["']|["']$/g, '').trim() 
    });

  } catch (error) {
    console.error('Error en la función:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
}