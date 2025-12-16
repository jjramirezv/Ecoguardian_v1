# Configuración del Chatbot con Gemini
   
## Pasos para configurar la API Key

1. **Obtén tu API Key de Google Gemini:**
   - Ve a: https://makersuite.google.com/app/apikey
   - Inicia sesión con tu cuenta de Google
   - Crea una nueva API key o usa una existente

2. **Crea el archivo .env en la carpeta backend:**
   - Crea un archivo llamado `.env` (sin extensión) en la carpeta `backend`
   - Agrega la siguiente línea:
   ```
   GEMINI_API_KEY=tu_api_key_aqui
   ```
   - Reemplaza `tu_api_key_aqui` con tu API key real

3. **Instala las dependencias necesarias:**
   ```bash
   pip install google-generativeai python-dotenv
   ```

4. **Reinicia el servidor:**
   - Detén el servidor (Ctrl+C)
   - Vuelve a ejecutar: `python app.py`

## Ejemplo de archivo .env

```
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Verificación

Si todo está configurado correctamente, al iniciar el servidor verás:
```
✅ API Key de Gemini configurada correctamente
```

Si ves una advertencia, verifica que:
- El archivo `.env` esté en la carpeta `backend`
- La variable se llame exactamente `GEMINI_API_KEY`
- No haya espacios alrededor del signo `=`

