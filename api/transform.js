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
      console.error('GEMINI_API_KEY no encontrada en variables de entorno');
      return res.status(500).json({ error: 'API Key no configurada' });
    }
    
    // Prompts mejorados para generar múltiples opciones cuando sea apropiado
    const PROMPTS = {
      formal: `Sos un experto en comunicación profesional argentina. Transformá este mensaje enojado o frustrado en algo apropiado para el ámbito laboral, pero mantené la firmeza y la intención del mensaje original. 

Si el mensaje es muy fuerte o hay varias formas de expresarlo profesionalmente, dame 2 opciones separadas por "|||". Si es simple, una sola opción.

Cada opción debe ser directa pero respetuosa, máximo 2-3 oraciones. Usá un tono firme pero profesional.

Mensaje: "${prompt}"`,

      amigable: `Transformá este mensaje en algo más amigable y cálido, manteniendo el estilo argentino. Suavizá la forma pero no pierdas la intención ni la firmeza del mensaje original.

Si el mensaje permite diferentes enfoques amigables, dame 2 opciones separadas por "|||". Si hay una forma clara, una sola opción.

Cada opción debe ser copada pero clara, máximo 2-3 oraciones. Que se entienda el punto pero de manera más friendly.

Mensaje: "${prompt}"`,

      directo: `Convertí este mensaje en algo directo pero respetuoso, sin rodeos pero sin agredir innecesariamente. Mantené la claridad y la fuerza del mensaje original pero con mejor forma.

Si hay diferentes formas de ser directo sin ser agresivo, dame 2 opciones separadas por "|||". Si es claro, una sola opción.

Cada opción debe ser directa y clara, máximo 2-3 oraciones. Estilo argentino directo pero civilizado.

Mensaje: "${prompt}"`,

      diplomatico: `Usá toda tu habilidad diplomática para transformar este mensaje en comunicación estratégica y táctica. Mantené la firmeza del mensaje pero usá diplomacia y psicología comunicacional.

Si el mensaje permite diferentes estrategias diplomáticas, dame 2 opciones separadas por "|||". Si hay una estrategia clara, una sola opción.

Cada opción debe ser inteligente y táctica, máximo 2-3 oraciones. Que se entienda el mensaje pero de forma muy hábil.

Mensaje: "${prompt}"`
    };
    
    console.log('Llamando a Gemini API...');
    console.log('Modo:', mode);
    console.log('Prompt length:', prompt.length);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: PROMPTS[mode]
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 300,
          topP: 0.9,
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
    
    console.log('Status de Gemini API:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error de Gemini API:', errorData);
      return res.status(response.status).json({
        error: `Error de API: ${errorData.error?.message || 'Error desconocido'}`
      });
    }
    
    const data = await response.json();
    console.log('Respuesta de Gemini:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Respuesta inválida de Gemini:', data);
      return res.status(500).json({ error: 'Respuesta inválida de la API' });
    }
    
    const result = data.candidates[0].content.parts[0].text.trim();
    console.log('Transformación exitosa:', result);
    
    // Procesar resultado para separar opciones si las hay
    const cleanResult = result.replace(/^["']|["']$/g, '').trim();
    
    // Verificar si hay múltiples opciones separadas por |||
    if (cleanResult.includes('|||')) {
      const options = cleanResult.split('|||').map(opt => opt.trim()).filter(opt => opt.length > 0);
      
      // Conectores humanos casuales
      const connectors = [
        "o sino decile...",
        "mirá! se me ocurrió algo mejor!",
        "mejor no... decile esto!",
        "te parece?... creo que este está joya!",
        "esperá, tengo algo mejor!",
        "o probá con esto...",
        "ahora que lo pienso, mejor así:",
        "no no no... mejor esto!",
        "se me ocurre otra:",
        "o podés ir por acá..."
      ];
      
      const randomConnector = connectors[Math.floor(Math.random() * connectors.length)];
      
      // Tomar máximo 2 opciones
      const finalOptions = options.slice(0, 2);
      
      res.status(200).json({
        result: finalOptions[0],
        hasSecondOption: finalOptions.length > 1,
        connector: randomConnector,
        secondOption: finalOptions[1] || null
      });
    } else {
      // Una sola opción
      res.status(200).json({
        result: cleanResult,
        hasSecondOption: false
      });
    }
    
  } catch (error) {
    console.error('Error en la función:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}