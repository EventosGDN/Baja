// /api/create-preference.js
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
        success: `${process.env.BASE_URL}/api/payment-success?user_id=${userId}`,
        failure: `${process.env.BASE_URL}/?status=failure`,
        pending: `${process.env.BASE_URL}/?status=pending`,
      },
      auto_return: "approved",
    };

    const result = await mercadopago.preferences.create(preference);
    res.status(200).json({ id: result.body.id });
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: "No se pudo crear el pago" });
  }
};
