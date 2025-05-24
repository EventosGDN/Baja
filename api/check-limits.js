// api/check-limits.js
module.exports = async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { userId, action } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }

        // Importar Firebase Admin (necesitamos instalarlo)
        const admin = require('firebase-admin');

        // Inicializar Firebase Admin si no está inicializado
        if (!admin.apps.length) {
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
            };

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
            });
        }

        const db = admin.firestore();
        const userRef = db.collection('users').doc(userId);

        if (action === 'check') {
            // VERIFICAR límites del usuario
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Usuario nuevo - crear con 3 usos gratis
                await userRef.set({
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    subscriptionExpiry: null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    totalUses: 0
                });

                return res.status(200).json({
                    canUse: true,
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    isNewUser: true
                });
            }

            const userData = userDoc.data();
            const canUse = userData.subscriptionStatus === 'premium' || userData.usesLeft > 0;

            return res.status(200).json({
                canUse,
                usesLeft: userData.usesLeft,
                subscriptionStatus: userData.subscriptionStatus,
                subscriptionExpiry: userData.subscriptionExpiry,
                isNewUser: false
            });

        } else if (action === 'consume') {
            // CONSUMIR un uso
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const userData = userDoc.data();

            // Si es premium, no consumir usos
            if (userData.subscriptionStatus === 'premium') {
                await userRef.update({
                    totalUses: admin.firestore.FieldValue.increment(1),
                    lastUsed: admin.firestore.FieldValue.serverTimestamp()
                });

                return res.status(200).json({
                    success: true,
                    usesLeft: 'unlimited',
                    subscriptionStatus: 'premium'
                });
            }

            // Usuario free - verificar y consumir uso
            if (userData.usesLeft <= 0) {
                return res.status(403).json({ 
                    error: 'Sin usos disponibles',
                    subscriptionStatus: 'free',
                    usesLeft: 0
                });
            }

            // Consumir un uso
            const newUsesLeft = userData.usesLeft - 1;
            await userRef.update({
                usesLeft: newUsesLeft,
                totalUses: admin.firestore.FieldValue.increment(1),
                lastUsed: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                usesLeft: newUsesLeft,
                subscriptionStatus: 'free'
            });

        } else {
            return res.status(400).json({ error: 'Acción no válida. Usar "check" o "consume"' });
        }

    } catch (error) {
        console.error('Error en check-limits:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
};