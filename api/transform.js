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

        // Prompts mejorados para evitar etiquetas no deseadas
        const PROMPTS = {
            formal: `Sos un experto en comunicación profesional argentina.
Transformá este mensaje enojado o frustrado en algo apropiado para el ámbito laboral, pero mantené la firmeza y la intención del mensaje original.

INSTRUCCIONES IMPORTANTES:
- Si el mensaje es complejo, podés dar 2 versiones diferentes separadas EXACTAMENTE por " ||| " 
- NO uses etiquetas como "Opción 1:", "Opción 2:", "Primera opción:", etc.
- Cada versión debe ser directa, sin prefijos ni numeración
- Máximo 2-3 oraciones por versión
- Tono firme pero profesional, estilo argentino formal

Mensaje a transformar: "${prompt}"

Transformá directamente, sin explicaciones ni etiquetas:`,

            amigable: `Transformá este mensaje en algo más amigable y cálido, manteniendo el estilo argentino.
Suavizá la forma pero no pierdas la intención ni la firmeza del mensaje original.

INSTRUCCIONES IMPORTANTES:
- Si hay diferentes enfoques, podés dar 2 versiones separadas EXACTAMENTE por " ||| "
- NO uses etiquetas como "Opción 1:", "Opción 2:", "Primera versión:", etc.
- Cada versión debe ser directa, sin prefijos ni numeración
- Máximo 2-3 oraciones por versión
- Estilo argentino cálido y copado

Mensaje a transformar: "${prompt}"

Transformá directamente, sin explicaciones ni etiquetas:`,

            directo: `Convertí este mensaje en algo directo pero respetuoso, sin rodeos pero sin agredir innecesariamente.
Mantené la claridad y la fuerza del mensaje original pero con mejor forma.

INSTRUCCIONES IMPORTANTES:
- Si hay diferentes formas de ser directo, podés dar 2 versiones separadas EXACTAMENTE por " ||| "
- NO uses etiquetas como "Opción 1:", "Opción 2:", "Primera forma:", etc.
- Cada versión debe ser directa, sin prefijos ni numeración
- Máximo 2-3 oraciones por versión
- Estilo argentino directo pero civilizado

Mensaje a transformar: "${prompt}"

Transformá directamente, sin explicaciones ni etiquetas:`,

            diplomatico: `Usá toda tu habilidad diplomática para transformar este mensaje en comunicación estratégica y táctica.
Mantené la firmeza del mensaje pero usá diplomacia y psicología comunicacional.

INSTRUCCIONES IMPORTANTES:
- Si hay diferentes estrategias, podés dar 2 versiones separadas EXACTAMENTE por " ||| "
- NO uses etiquetas como "Opción 1:", "Opción 2:", "Primera estrategia:", etc.
- Cada versión debe ser directa, sin prefijos ni numeración
- Máximo 2-3 oraciones por versión
- Diplomacia argentina con astucia

Mensaje a transformar: "${prompt}"

Transformá directamente, sin explicaciones ni etiquetas:`,

            reflexion: `Actuás como un guía empático y contenedor.
Recibiste el siguiente mensaje de una persona que atraviesa un momento emocional intenso y busca claridad emocional.
Tu tarea es ofrecerle una reflexión breve y contenedora, sin juzgar, sin corregir, solo ayudando a procesar lo que siente.

INSTRUCCIONES IMPORTANTES:
- Máximo 2 oraciones.
- No repitas el mensaje original.
- No des explicaciones, solo reflexión emocional.
- Estilo sereno, humano, con calidez.

Mensaje recibido: "${prompt}"

Respondé con una reflexión emocional sin etiquetas ni introducciones:`

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
                    temperature: 0.9,
                    maxOutputTokens: 400,
                    topP: 0.95,
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

        // FUNCIÓN PARA LIMPIAR PREFIJOS NO DESEADOS
        function cleanTextOption(text) {
            return text
                // Remover etiquetas numeradas en español
                .replace(/^(Opción\s*\d+\s*:?\s*)/i, '')
                .replace(/^(Primera\s*(opción|versión|alternativa)\s*:?\s*)/i, '')
                .replace(/^(Segunda\s*(opción|versión|alternativa)\s*:?\s*)/i, '')
                .replace(/^(Tercera\s*(opción|versión|alternativa)\s*:?\s*)/i, '')
                // Remover etiquetas numeradas en inglés (por si acaso)
                .replace(/^(Option\s*\d+\s*:?\s*)/i, '')
                .replace(/^(First\s*(option|version)\s*:?\s*)/i, '')
                .replace(/^(Second\s*(option|version)\s*:?\s*)/i, '')
                // Remover números al inicio
                .replace(/^(\d+\.\s*)/g, '')
                .replace(/^(\d+\)\s*)/g, '')
                .replace(/^(\d+\s*-\s*)/g, '')
                // Remover guiones al inicio
                .replace(/^(-\s*)/g, '')
                // Remover asteriscos al inicio
                .replace(/^(\*\s*)/g, '')
                // Remover comillas al inicio y final
                .replace(/^["']|["']$/g, '')
                // Remover espacios extra
                .trim();
        }

        // Procesar resultado para separar opciones
        const cleanResult = cleanTextOption(result);

        // Verificar si hay múltiples opciones separadas por |||
        if (cleanResult.includes('|||')) {
            const options = cleanResult.split('|||')
                .map(opt => cleanTextOption(opt))
                .filter(opt => opt.length > 0);

            // Conectores más humanos y variados según el contexto
            const connectorsByMode = {
                formal: [
                    "o mejor aún, probá con esto:",
                    "otra opción más suave:",
                    "si preferís algo más diplomático:",
                    "alternativamente podés decir:",
                    "una versión más estratégica:"
                ],
                amigable: [
                    "o sino, mejor así:",
                    "esperá! me gusta más este:",
                    "mejor probá con este que suena más copado:",
                    "nah, mejor decile esto:",
                    "se me ocurre algo mejor:"
                ],
                directo: [
                    "o directo al hueso:",
                    "más claro, imposible:",
                    "sin vueltas:",
                    "cortito y al pie:",
                    "directo pero sin ser hdp:"
                ],
                diplomatico: [
                    "estrategia nivel 2:",
                    "con más finesse:",
                    "jugada maestra:",
                    "modo ninja diplomático:",
                    "versión Maquiavelo:"
                ]
            };

            const connectors = connectorsByMode[mode] || [
                "o sino decile...",
                "esperá, tengo algo mejor:",
                "probá con esto otro:",
                "se me ocurre otra:",
                "mejor así:"
            ];

            const randomConnector = connectors[Math.floor(Math.random() * connectors.length)];

            // Tomar máximo 2 opciones
            const finalOptions = options.slice(0, 2);

            return res.status(200).json({
                result: finalOptions[0],
                hasSecondOption: finalOptions.length > 1,
                connector: randomConnector,
                secondOption: finalOptions[1] || null,
                mode: mode
            });
        } else {
            // Una sola opción
            return res.status(200).json({
                result: cleanResult,
                hasSecondOption: false,
                mode: mode
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