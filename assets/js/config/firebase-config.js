// RedLink — configuración Firebase
// 1) Crea tu proyecto en Firebase.
// 2) Copia aquí la configuración web.
// 3) Cambia USE_FIREBASE a true.
// Mientras esté en false, la app funciona en modo demo local.

export const USE_FIREBASE = false;

export const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// El panel privado usa Firebase Authentication.
// Agrega aquí los correos permitidos. En modo demo local puedes dejarlo vacío.
export const ADMIN_EMAILS = [
  "admin@ejemplo.cl"
];
