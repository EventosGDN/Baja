import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'user_id requerido' });
  }

  try {
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'premium',
      subscriptionUpdatedAt: new Date(),
    });

    res.redirect('/?pago=ok'); // redireccionás al home con estado
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
}
