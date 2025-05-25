const { MercadoPagoConfig, Preference } = require("mercadopago");

// Configurar Mercado Pago con token de prueba
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN, // debe empezar con TEST-
});

// Crear instancia de preferencia
const preference = new Preference(mp);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Manejar preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ error: "userId es requerido" });
    }

    const preferenceData = {
      payer: {
        email: "eventosgdn@gmail.com", // evita que Mercado Pago te bloquee por intentar pagarte a vos mismo
      },
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

    const result = await preference.create({ body: preferenceData });

    res.status(200).json({ id: result.id });
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: error.message || "Error desconocido" });
  }
};
