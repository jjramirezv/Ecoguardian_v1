import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. CONFIGURACIÓN DEL TERRENO (5x5) ---
const ROWS = 5; 
const COLS = 5;
const SPACING = 12.0; // Distancia entre plantas
const FREQ = (2 * Math.PI) / SPACING;
const AMP = 0.8; // Altura de los surcos

// Función matemática para la onda del suelo
function getSueloY(x) { return Math.cos(x * FREQ) * AMP; }

// --- 2. MAPA DE COLORES (Estado -> Color Visual) ---
const COLOR_MAP = {
  // Los 4 puntos de predicción
  'optimo': 0x2e7d32,          // POCO FAVORABLE (Verde Sano)
  'favorable': 0x9ccc65,       // FAVORABLE (Verde Claro / Amarillento)
  'muy_favorable': 0xff9800,   // MUY FAVORABLE (Naranja)
  'rancha': 0x5d4037,          // ALERTA DE RANCHA (Marrón Muerto)
  
  // Estados extra para el laboratorio
  'sequia': 0xe65100,          // Naranja Intenso (Seco)
  'helada': 0x81d4fa,          // Azul Pálido (Quemado por frío)
  'exceso': 0x1b5e20           // Verde Oscuro (Saturado)
};

// --- 3. GENERADORES DE GEOMETRÍA (Optimización) ---

function crearGeoSuelo() {
  // Creamos un bloque de tierra grande
  const geo = new THREE.BoxGeometry(65, 4, 65, 100, 1, 100);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  
  // Deformamos solo la cara superior para hacer los surcos
  for(let i=0; i<pos.count; i++) {
    if(norm.getY(i) > 0.9) {
      pos.setY(i, pos.getY(i) + getSueloY(pos.getX(i)) - AMP);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function crearMata() {
  const root = new THREE.Group();
  
  // Materiales (Vivos y Brillantes)
  const matTallo = new THREE.MeshStandardMaterial({color:0x66bb6a, roughness:0.5});
  const matHoja = new THREE.MeshStandardMaterial({color:0x2e7d32, side:2, roughness:0.3});
  const matFlor = new THREE.MeshStandardMaterial({color:0x9c27b0, emissive:0x4a148c, emissiveIntensity: 0.5}); // Flor Morada
  const matCentro = new THREE.MeshStandardMaterial({color:0xffeb3b});

  // Forma de la hoja (Extrusión detallada)
  const shape = new THREE.Shape();
  shape.moveTo(0,0); shape.bezierCurveTo(0.1,0.1,0.15,0.4,0,0.7); shape.bezierCurveTo(-0.15,0.4,-0.1,0.1,0,0);
  const geoHoja = new THREE.ExtrudeGeometry(shape, {depth:0.015, bevelEnabled:true, bevelThickness:0.005});
  geoHoja.translate(0,0,-0.0075);

  // Generar 6 ramas principales
  for(let i=0; i<6; i++) {
    const branch = new THREE.Group();
    const alt = 1.5 + Math.random()*0.4;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.035,alt,5), matTallo);
    stem.position.y = alt/2; stem.castShadow=true; branch.add(stem);
    
    // Hojas por rama
    for(let j=0; j<10; j++) {
      const g = new THREE.Group();
      // Peciolo
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.012,0.6,4), matTallo);
      p.rotation.z=Math.PI/2; p.position.x=0.3; g.add(p);
      
      // Foliolos (Hojitas)
      for(let k=0; k<3; k++){
        const h = new THREE.Mesh(geoHoja, matHoja.clone());
        h.userData.isFoliage=true; 
        h.position.set(0.15+k*0.16,0,0.04); h.rotation.set(-0.4,0,-1.5);
        const s=0.5+k*0.05; h.scale.set(s,s,s); h.castShadow=true; g.add(h);
        const h2 = h.clone(); h2.position.z=-0.04; h2.rotation.x=0.4; g.add(h2);
      }
      // Punta de la hoja
      const t = new THREE.Mesh(geoHoja, matHoja.clone());
      t.userData.isFoliage=true; t.position.set(0.68,0,0); t.rotation.z=-1.57; t.scale.set(0.8,0.8,0.8); t.castShadow=true; g.add(t);
      
      g.position.set(0, 0.4+j*0.15, 0); 
      g.rotation.y=j*2.5; 
      g.rotation.z=0.3+(Math.random()*0.4*(1-j/10));
      branch.add(g);
    }
    branch.rotation.set(0, (i/6)*Math.PI*2, 0.1+Math.random()*0.3);
    root.add(branch);
  }

  // Flores (Solo aparecen si está sano)
  const fGroup = new THREE.Group();
  for(let k=0; k<5; k++) {
    const f = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.06,5), matFlor);
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.03,8), matCentro);
    c.position.z=0.01; f.add(p); f.add(c);
    f.position.set((Math.random()-0.5)*0.3, 1.8+Math.random()*0.2, (Math.random()-0.5)*0.3);
    f.rotation.set(-1.5, Math.random(), 0); fGroup.add(f);
  }
  fGroup.userData.isFlower=true; root.add(fGroup);
  
  return root;
}

function crearSensor() {
  const g = new THREE.Group();
  // Materiales Sensor
  const matW = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.2});
  const matB = new THREE.MeshStandardMaterial({color:0x222222, roughness:0.8});
  const matM = new THREE.MeshStandardMaterial({color:0x888888, metalness:0.9});
  const matL = new THREE.MeshStandardMaterial({color:0x00e676, emissive:0x00e676, emissiveIntensity:2});

  // Caja
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.04,0.12), matW); box.position.y=0.075; g.add(box);
  const bump = new THREE.Mesh(new THREE.BoxGeometry(0.185,0.015,0.125), matB); bump.position.y=0.0475; g.add(bump);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.04,0.12), matW); base.position.y=0.02; g.add(base);
  // Sonda
  const sond = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.008,0.04), matM); sond.position.set(0.2,0.03,0); g.add(sond);
  // Antena
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.002,0.002,0.15), matM); ant.position.set(-0.06,0.15,-0.04); g.add(ant);
  // LED
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.04,0.02), matL); 
  led.position.set(0.05,0.096,0.03); led.rotation.x=-Math.PI/2; led.name="led"; g.add(led);
  return g;
}

// --- 4. COMPONENTES REACT (Lógica de Actualización) ---

function Plant({ x, z, status }) {
  const object = useMemo(() => crearMata(), []);
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    object.children.forEach(child => {
      if(!child.userData.isFlower) {
        // Animación de viento suave
        child.rotation.z = (child.userData.initRotZ || child.rotation.z) + Math.sin(t + x) * 0.015;
        
        // Efecto físico de marchitez en Sequía o Helada
        if(status === 'sequia' || status === 'helada') child.rotation.z = 1.6;
      } else {
        // Mostrar flores solo si el estado es bueno (Optimo, Favorable, Exceso)
        child.visible = ['optimo', 'favorable', 'exceso', 'muy_favorable'].includes(status);
      }
    });
  });

  // Cambio de Color Dinámico (Aquí ocurre la magia visual)
  useMemo(() => {
    // Buscamos el color en el mapa, o usamos verde por defecto
    const targetColor = COLOR_MAP[status] || COLOR_MAP['optimo'];
    
    object.traverse((c) => { 
      if(c.userData.isFoliage) { 
        c.material = c.material.clone(); // Clonar para no afectar a otras plantas
        c.material.color.setHex(targetColor); 
      }
    });
  }, [status, object]);

  // Guardamos la rotación inicial de las ramas para el viento
  useMemo(() => object.children.forEach(c => { if(!c.userData.isFlower) c.userData.initRotZ = c.rotation.z; }), [object]);

  // Posición Y=-0.3 para que el tallo nazca de la tierra
  return <primitive object={object} position={[x, -0.3, z]} rotation={[0, Math.random()*Math.PI*2, 0]} scale={[4.5, 4.5, 4.5]} />;
}

function Sensor() {
  const obj = useMemo(() => crearSensor(), []);
  const ledRef = useRef();
  
  // Posición Calculada: Fila 3, Col 4, desplazado a la ladera del surco
  const x = (-((ROWS-1)*SPACING)/2) + (3*SPACING) + 3.5; 
  const z = (-((COLS-1)*SPACING)/2) + (4*SPACING);
  
  // Animación del LED (Parpadeo)
  useFrame(({ clock }) => { if(ledRef.current) ledRef.current.emissiveIntensity = 1.5 + Math.sin(clock.getElapsedTime()*5)*0.5; });
  useMemo(() => obj.traverse(c => { if(c.name === 'led') ledRef.current = c.material; }), []);

  // Rotación: Mirando a la izquierda (Math.PI) e inclinado (-0.3)
  return <primitive object={obj} position={[x, getSueloY(x)-0.8, z]} rotation={[0, Math.PI, -0.3]} scale={[18, 18, 18]} />;
}

// --- 5. ESCENA PRINCIPAL ---
export default function Scene({ status }) {
  const soilGeo = useMemo(() => crearGeoSuelo(), []);
  const matSuelo = useMemo(() => new THREE.MeshStandardMaterial({color: 0x5d4037, roughness: 1}), []);

  // Calcular posiciones de la grilla
  const positions = useMemo(() => {
    const p=[]; 
    const sX=-((ROWS-1)*SPACING)/2; 
    const sZ=-((COLS-1)*SPACING)/2;
    for(let i=0; i<ROWS; i++) for(let j=0; j<COLS; j++) p.push({x:sX+i*SPACING, z:sZ+j*SPACING});
    return p;
  }, []);

  return (
    // Canvas ocupa el 100% del contenedor padre
    <Canvas shadows camera={{ position: [0, 30, 55], fov: 60 }} style={{width:'100%', height:'100%'}}>
      
      {/* ILUMINACIÓN "GOZUU" (VIVA) */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[50, 100, 50]} intensity={1.8} castShadow shadow-mapSize={[4096, 4096]} />
      
      {/* AMBIENTE (Cielo y Reflejos) */}
      <Sky sunPosition={[100, 30, 100]} />
      <Environment preset="park" />

      {/* SUELO */}
      <mesh geometry={soilGeo} position={[0, -2.5, 0]} receiveShadow material={matSuelo} />

      {/* PLANTAS */}
      {positions.map((p, i) => (
        <Plant key={i} x={p.x} z={p.z} status={status} />
      ))}

      {/* SENSOR */}
      <Sensor />

      {/* CONTROLES DE CÁMARA */}
      <OrbitControls maxPolarAngle={Math.PI/2 - 0.05} maxDistance={200} enableZoom={true} />
    </Canvas>
  );
}