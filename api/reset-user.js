// api/reset-user.js
module.exports = async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }
    
    try {
        const { userId, adminKey } = req.body;
        
        // Clave de administrador simple (puedes cambiarla)
        if (adminKey !== 'admin123') {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        if (!userId) {
            return res.status(400).json({ error: 'userId requerido' });
        }
        
        // Importar Firebase Admin
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
        
        // Reiniciar usos del usuario
        await userRef.update({
            usesLeft: 3,
            subscriptionStatus: 'free',
            resetAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Usos reiniciados para usuario: ${userId}`);
        
        return res.status(200).json({
            success: true,
            message: 'Usos reiniciados exitosamente',
            usesLeft: 3
        });
        
    } catch (error) {
        console.error('Error reiniciando usos:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
};