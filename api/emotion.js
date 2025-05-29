export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { text } = req.body;

  if (!text || text.trim().length < 3) {
    return res.status(400).json({ error: 'Texto insuficiente para detectar emoción' });
  }

  // 🎯 Prompt para detección emocional con Gemini o IA usada
  const emotionPrompt = `
Tu tarea es analizar brevemente la emoción principal que transmite este mensaje. Podés elegir entre: enojo, tristeza, ansiedad, frustración, neutral. Solo respondé con una palabra exacta (sin explicaciones). 

Mensaje: "${text}"
`;

  try {
    const aiResponse = await fetch('https://generativa.tu-endpoint.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: emotionPrompt,
        max_tokens: 10
      })
    });

    const result = await aiResponse.text();
    const emotion = result.trim().toLowerCase();

    const followUps = {
      enojo: "Es normal sentirse así. Si querés, sigamos bajando un cambio juntos.",
      tristeza: "Lo que estás sintiendo merece ser escuchado.",
      ansiedad: "Dale, respiremos un poco juntos. No estás solo/a.",
      frustración: "Quizás no salió como esperabas, pero podés volver a intentarlo."
    };

    const followUp = followUps[emotion] || null;

    return res.status(200).json({ emotion, followUp });

  } catch (error) {
    console.error('Error al detectar emoción:', error);
    return res.status(500).json({ error: 'Error interno al detectar emoción' });
  }
}
