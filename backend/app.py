from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import pandas as pd
from datetime import datetime, timedelta
import numpy as np
import os
import json 

# importaciones para el chatbot
import google.generativeai as genai
from dotenv import load_dotenv

# importaciones para Firebase (Base de Datos)
import firebase_admin
from firebase_admin import credentials, firestore

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    api_key = api_key.strip().strip('"').strip("'")

if not api_key:
    print("⚠️ ADVERTENCIA: No se encontró la variable GEMINI_API_KEY en el archivo .env")
else:
    genai.configure(api_key=api_key)
    print("✅ API Key de Gemini configurada correctamente")

db = None
try:
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), "firebase_credenciales.json")
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("🔥 Firebase conectado usando archivo local.")
        
        elif os.getenv("FIREBASE_CREDENTIALS"):
            cred_dict = json.loads(os.getenv("FIREBASE_CREDENTIALS"))
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("🔥 Firebase conectado usando Variable de Entorno.")
        else:
            print("⚠️ No se encontraron credenciales de Firebase via archivo ni entorno.")

    if firebase_admin._apps:
        db = firestore.client()
except Exception as e:
    print(f"❌ Error inicializando Firebase: {e}")

# carga del modelo keras
try:
    from tensorflow import keras
    MODELO_PATH = os.path.join(os.path.dirname(__file__), "Modelo01.keras")
    modelo = None
    
    def cargar_modelo():
        global modelo
        if modelo is None and os.path.exists(MODELO_PATH):
            modelo = keras.models.load_model(MODELO_PATH)
            print(f"✅ Modelo cargado desde: {MODELO_PATH}")
            try:
                input_shape = modelo.input_shape
                print(f"📊 El modelo espera input_shape: {input_shape}")
            except:
                pass
        return modelo
except ImportError:
    print("⚠️ TensorFlow no está instalado. Instala con: pip install tensorflow")
    modelo = None
    def cargar_modelo():
        return None

# 1. lógica del cálculo de riesgo de rancha
def calcular_riesgo_rancha(temp, hum):
    t = float(temp)
    h = float(hum)
    temp_ideal = 15 <= t <= 26
    temp_alerta = (12 <= t < 15) or (26 < t <= 28)

    if temp_ideal and h > 95: return "MUY FAVORABLE - EMERGENCIA", "muy_favorable"
    if temp_ideal and h > 90: return "FAVORABLE", "favorable"
    if (temp_alerta or temp_ideal) and h >= 80: return "ALERTA DE RANCHA", "rancha"
    return "POCO FAVORABLE", "optimo"

# 2. lógica de obtención de los datos (NASA)
def get_weekly_weather_summary(lat, lon):
    start_date_obj = datetime.now() - timedelta(days=8)
    start_date_str = start_date_obj.strftime("%Y%m%d")
    end_date_obj = start_date_obj + timedelta(days=6)
    end_date_str = end_date_obj.strftime("%Y%m%d")

    parameters = "T2M,RH2M,PRECTOTCORR"
    url = (
        f"https://power.larc.nasa.gov/api/temporal/hourly/point?"
        f"parameters={parameters}&latitude={lat}&longitude={lon}"
        f"&start={start_date_str}&end={end_date_str}&format=JSON"
        f"&community=SB"
    )
    
    print(f"--- Consultando NASA POWER ({start_date_str} al {end_date_str}) ---")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error NASA: {e}")
        return None

    if "properties" not in data or "parameter" not in data["properties"]: return None
    hourly = data["properties"]["parameter"]

    try:
        df = pd.DataFrame({
            "T2M": hourly["T2M"], "RH2M": hourly["RH2M"], "PRECTOTCORR": hourly["PRECTOTCORR"]
        })
        df.index = pd.to_datetime(df.index, format="%Y%m%d%H")
        df = df.replace(-999, float('nan')).dropna()
        df["DAY"] = df.index.date

        if df.empty: return None

        daily_df = df.groupby("DAY").agg({"T2M": "mean", "RH2M": "mean", "PRECTOTCORR": "sum"})
        final_averages = daily_df.mean()

        return {
            "t_avg": round(final_averages["T2M"], 2),
            "h_avg": round(final_averages["RH2M"], 2),
            "p_avg": round(final_averages["PRECTOTCORR"], 2),
            "periodo": f"{start_date_str} - {end_date_str}"
        }
    except Exception as e:
        print(f"Error procesando datos: {e}")
        return None

# 3. lógica de guardado en firebase
def guardar_datos_firebase(temp, hum, precip):
    if db is None:
        return

    try:
        fecha_hoy = datetime.now().strftime("%Y-%m-%d")
        doc_ref = db.collection('historial_diario').document(fecha_hoy)
        
        doc_ref.set({
            'fecha': fecha_hoy,
            'temp_suma': firestore.Increment(temp),
            'hum_suma': firestore.Increment(hum),
            'precip_total': firestore.Increment(precip), 
            'conteo': firestore.Increment(1),
            'ultima_actualizacion': firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        print(f"✅ Datos agregados a Firebase para el día: {fecha_hoy}")
    except Exception as e:
        print(f"❌ Error escribiendo en Firebase: {e}")


# 4. configuración API
app = FastAPI()

@app.get("/")
def home():
    return {"mensaje": "API funcionando correctamente y predicciones activas 🚀"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

class PredictRequest(BaseModel):
    lat: float
    lon: float

class ModelPredictRequest(BaseModel):
    temperatura: float
    humedad: float
    precipitacion: float

class ChatRequest(BaseModel):
    message: str

class SensorData(BaseModel):
    temp: float
    hum: float
    precip: float


@app.post('/api/predict')
async def predict(data: PredictRequest):
    if not data.lat or not data.lon: raise HTTPException(400, detail="Faltan coordenadas")
    weather_data = get_weekly_weather_summary(data.lat, data.lon)
    if not weather_data: raise HTTPException(502, detail="No se pudieron obtener datos climáticos de la NASA.")

    temp_real = weather_data["t_avg"]
    hum_real = weather_data["h_avg"]
    precip_real = weather_data["p_avg"]
    
    label, code = calcular_riesgo_rancha(temp_real, hum_real)
        
    return {
        "ubicacion": f"Lat: {data.lat:.4f}, Lon: {data.lon:.4f}",
        "datos_climaticos": {
            "fuente": "NASA POWER API",
            "periodo_analizado": weather_data["periodo"],
            "temp_promedio_semanal": temp_real,
            "humedad_promedio_semanal": hum_real,
            "precipitacion_diaria_promedio": precip_real
        },
        "analisis_riesgo": {
            "nivel": label, "codigo": code,
            "mensaje": f"Riesgo calculado con T={temp_real}°C y H={hum_real}%"
        }
    }

@app.post('/api/predict-model')
async def predict_model(data: ModelPredictRequest):
    temp, hum, precip = float(data.temperatura), float(data.humedad), float(data.precipitacion)
    modelo_cargado = cargar_modelo()
    
    if modelo_cargado is None: raise HTTPException(503, detail="Modelo no disponible.")
    
    try:
        input_shape = modelo_cargado.input_shape
        expected_features = input_shape[1] if input_shape and len(input_shape) > 1 else 3
        
        if expected_features == 9:
            input_data = np.array([[
                temp, temp+6, temp-6, hum, precip, 2.0, 200.0, 700.0, temp-5
            ]], dtype=np.float32)
        else:
            input_data = np.array([[temp, hum, precip]], dtype=np.float32)
        
        prediccion = modelo_cargado.predict(input_data, verbose=0)
        
        if prediccion.ndim == 2:
            idx = int(np.argmax(prediccion[0]))
            prob = float(prediccion[0][idx])
            clase = idx + 1
        elif prediccion.ndim == 1 and len(prediccion) > 1:
            idx = int(np.argmax(prediccion))
            prob = float(prediccion[idx])
            clase = idx + 1
        else:
            clase = int(round(float(prediccion)))
            prob = 1.0
        
        clase = max(1, min(4, clase))
        mapeo = {1: ("POCO FAVORABLE", "optimo"), 2: ("ALERTA DE RANCHA", "rancha"), 3: ("FAVORABLE", "favorable"), 4: ("MUY FAVORABLE", "muy_favorable")}
        nivel, codigo = mapeo.get(clase, ("POCO FAVORABLE", "optimo"))
        
        return {
            "prediccion_modelo": {
                "clase": clase, "score": round(prob, 4),
                "nivel_riesgo": nivel, "codigo_riesgo": codigo
            },
            "mensaje": f"Predicción generada por modelo de IA: {nivel}"
        }
    except Exception as e:
        print(f"Error modelo: {e}")
        raise HTTPException(500, detail=f"Error: {str(e)}")

# ENDPOINT PARA GUARDAR SENSOR (FIREBASE)
@app.post("/api/guardar-sensor")
async def guardar_sensor(data: SensorData):
    guardar_datos_firebase(data.temp, data.hum, data.precip)
    return {"status": "success", "mensaje": "Datos enviados a Firebase"}

# ENDPOINT PARA CONSULTAR HISTORIAL (CALCULA PROMEDIOS)
@app.get("/api/historial")
async def obtener_historial():
    if db is None: return {"error": "Firebase no conectado"}
    try:
        docs = db.collection('historial_diario').order_by('fecha').stream()
        historial = []
        for doc in docs:
            d = doc.to_dict()
            cnt = d.get('conteo', 1)
            historial.append({
                "fecha": d.get('fecha'),
                "temperatura": round(d.get('temp_suma', 0) / cnt, 1), # PROMEDIO
                "humedad": round(d.get('hum_suma', 0) / cnt, 1),      # PROMEDIO
                "precipitacion": round(d.get('precip_total', 0), 2),  # TOTAL
                "lecturas": cnt
            })
        return historial
    except Exception as e: return {"error": str(e)}

# ENDPOINT CHATBOT  
@app.post("/assistant_text")
async def assistant_text(req: ChatRequest):
    if not req.message or len(req.message.strip()) == 0: return {"error": "Mensaje vacío."}
    if not api_key: return {"error": "Falta API Key Gemini."}

    try:
        prompt_completo = f"""Eres el Asistente Experto de EcoGuardian.
Tienes DOS responsabilidades principales:
1. SER UN AGRÓNOMO EXPERTO: Responde dudas sobre papa y rancha.
2. SER EL GUÍA DE LA APP:
   - 'Satelital' (Verde 🛰️): Datos históricos NASA.
   - 'Hardware' (Morado 📡): Sensores IoT en tiempo real.
   - Botón 'Analizar Riesgo IA': Predicción inteligente.

REGLAS:
- Si es sobre cultivo: Sé agrónomo.
- Si es sobre la app: Guía qué botón presionar.
- MANTÉN LA RESPUESTA CORTA (Máximo 3 frases).

Usuario: {req.message}
Respuesta:"""
        
        try:
            available_models = genai.list_models()
            model_names = [m.name for m in available_models if 'generateContent' in m.supported_generation_methods]
            modelos_a_probar = ["models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/gemini-pro", "models/gemini-1.0-pro"]
            for m in model_names:
                if m not in modelos_a_probar and 'gemini' in m.lower(): modelos_a_probar.append(m)
        except:
            modelos_a_probar = ["models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/gemini-pro"]
        
        response = None
        last_error = None
        
        for modelo_nombre in modelos_a_probar:
            try:
                model = genai.GenerativeModel(model_name=modelo_nombre)
                response = model.generate_content(prompt_completo)
                break
            except Exception as e:
                last_error = e
                if "404" not in str(e): continue
        
        if response is None:
            try:
                model = genai.GenerativeModel()
                response = model.generate_content(prompt_completo)
            except Exception as e:
                raise Exception(f"Error final IA: {last_error}")

        assistant_text = response.text if hasattr(response, 'text') else str(response)
        return {"assistant_response": assistant_text}

    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg or "403" in error_msg: return {"error": "Error de autenticación API Key."}
        elif "429" in error_msg: return {"error": "Límite de solicitudes excedido."}
        else: return {"error": f"Error IA: {error_msg}"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True, reload_dirs=["backend"])