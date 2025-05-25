const mercadopago = require("mercadopago");

mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ error: "userId es requerido" });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Access token no configurado" });
    }

    const preference = {
      items: [
        {
          title: "Suscripción Premium - Bajá un cambio",
          quantity: 1,
          unit_price: 1999,
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: `https://baja-jade.vercel.app/api/payment-success?user_id=${userId}`,
        failure: `https://baja-jade.vercel.app/?status=failure`,
        pending: `https://baja-jade.vercel.app/?status=pending`,
      },
      auto_return: "approved",
    };

    const result = await mercadopago.preferences.create(preference);
    res.status(200).json({ id: result.body.id });
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: error.message || "Error desconocido" });
  }
};
