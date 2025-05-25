// api/check-limits.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
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
        const { userId, action, adminKey } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }

        // Inicializar Firebase Admin si no está inicializado
        if (!getApps().length) {
            try {
                initializeApp({
                    credential: cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    }),
                });
                console.log('Firebase Admin inicializado correctamente');
            } catch (initError) {
                console.error('Error inicializando Firebase:', initError);
                return res.status(500).json({
                    error: 'Error de configuración de Firebase',
                    details: initError.message
                });
            }
        }

        const db = getFirestore();
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
                    createdAt: FieldValue.serverTimestamp(),
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
                    totalUses: FieldValue.increment(1),
                    lastUsed: FieldValue.serverTimestamp()
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
                totalUses: FieldValue.increment(1),
                lastUsed: FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                usesLeft: newUsesLeft,
                subscriptionStatus: 'free'
            });

        } else if (action === 'reset') {
            // NUEVA FUNCIÓN: REINICIAR USUARIO
            // Verificar clave de administrador para seguridad
            if (adminKey !== 'admin123' && adminKey !== process.env.ADMIN_KEY) {
                return res.status(403).json({ error: 'Clave de administrador incorrecta' });
            }

            // Verificar si el usuario existe
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Si no existe, crear usuario nuevo
                await userRef.set({
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    subscriptionExpiry: null,
                    createdAt: FieldValue.serverTimestamp(),
                    totalUses: 0,
                    resetAt: FieldValue.serverTimestamp(),
                    resetCount: 1
                });

                console.log(`Usuario creado y configurado: ${userId}`);
                
                return res.status(200).json({
                    success: true,
                    message: 'Usuario creado con 3 usos disponibles',
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    isNewUser: true
                });
            } else {
                // Si existe, reiniciar sus usos
                const userData = userDoc.data();
                const currentResetCount = userData.resetCount || 0;

                await userRef.update({
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    subscriptionExpiry: null,
                    resetAt: FieldValue.serverTimestamp(),
                    resetCount: currentResetCount + 1
                });

                console.log(`Usuario reiniciado: ${userId} (Reset #${currentResetCount + 1})`);

                return res.status(200).json({
                    success: true,
                    message: 'Usuario reiniciado exitosamente',
                    usesLeft: 3,
                    subscriptionStatus: 'free',
                    resetCount: currentResetCount + 1,
                    isNewUser: false
                });
            }

        } else {
            return res.status(400).json({ 
                error: 'Acción no válida. Usar "check", "consume" o "reset"' 
            });
        }

    } catch (error) {
        console.error('Error en check-limits:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}