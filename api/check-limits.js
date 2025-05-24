// api/check-limits.js - Versión con configuración directa
module.exports = async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { userId, action, adminKey } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }

        // Debug: mostrar qué variables están disponibles
        console.log('Variables disponibles:', {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            projectId: process.env.FIREBASE_PROJECT_ID
        });

        // OPCIÓN 1: Si las variables están configuradas correctamente
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            try {
                const admin = require('firebase-admin');

                if (!admin.apps.length) {
                    const serviceAccount = {
                        type: "service_account",
                        project_id: process.env.FIREBASE_PROJECT_ID,
                        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

                // Manejar las diferentes acciones
                if (action === 'reset') {
                    if (adminKey !== 'admin123') {
                        return res.status(403).json({ error: 'Clave de administrador incorrecta' });
                    }

                    await userRef.set({
                        usesLeft: 3,
                        subscriptionStatus: 'free',
                        subscriptionExpiry: null,
                        resetAt: admin.firestore.FieldValue.serverTimestamp(),
                        resetCount: admin.firestore.FieldValue.increment(1)
                    }, { merge: true });

                    console.log(`Usuario reiniciado: ${userId}`);

                    return res.status(200).json({
                        success: true,
                        message: 'Usuario reiniciado exitosamente',
                        usesLeft: 3,
                        subscriptionStatus: 'free'
                    });
                }

                // Otras acciones (check, consume)...
                if (action === 'check') {
                    const userDoc = await userRef.get();
                    
                    if (!userDoc.exists) {
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
                }

                return res.status(400).json({ error: 'Acción no válida' });

            } catch (firebaseError) {
                console.error('Error de Firebase:', firebaseError);
                throw firebaseError;
            }
        } else {
            // OPCIÓN 2: Modo simulación si las variables no están configuradas
            console.log('Variables de Firebase no encontradas, usando modo simulación');
            
            if (action === 'reset') {
                if (adminKey !== 'admin123') {
                    return res.status(403).json({ error: 'Clave de administrador incorrecta' });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Usuario reiniciado exitosamente (MODO SIMULACIÓN)',
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    note: 'Configurar variables de entorno para usar Firebase real'
                });
            }

            if (action === 'check') {
                return res.status(200).json({
                    canUse: true,
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    isNewUser: false,
                    note: 'Modo simulación activo'
                });
            }

            return res.status(400).json({ error: 'Acción no válida' });
        }

    } catch (error) {
        console.error('Error general:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message,
            note: 'Revisar configuración de variables de entorno en Vercel'
        });
    }
};