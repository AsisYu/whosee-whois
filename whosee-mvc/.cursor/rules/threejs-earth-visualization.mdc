---
description: 
globs: 
alwaysApply: false
---
# Three.js Earth Visualization Guide

## Overview

This guide covers implementing a stunning Three.js earth globe with map data visualization as the homepage banner background for the Whosee WHOIS tool. The visualization will serve as an engaging backdrop representing global domain connectivity.

## Architecture & Integration

### Dependencies Required
Add to [package.json](mdc:package.json):
```json
{
  "dependencies": {
    "three": "^0.158.0",
    "@types/three": "^0.158.3", 
    "@react-three/fiber": "^8.15.11",
    "@react-three/drei": "^9.88.17"
  }
}
```

### Project Structure Integration
```
src/
├── components/
│   ├── three/                  # Three.js components
│   │   ├── earth-globe.tsx     # Main earth component
│   │   ├── earth-scene.tsx     # Three.js scene wrapper
│   │   └── earth-controls.tsx  # Interactive controls
│   └── ui/
└── assets/
    ├── textures/               # Earth texture maps
    │   ├── earth-diffuse.jpg   # Earth surface texture
    │   ├── earth-normal.jpg    # Normal mapping
    │   ├── earth-specular.jpg  # Ocean specular
    │   └── earth-clouds.png    # Cloud layer
    └── data/
        └── earth-topology.json # Geographic data
```

## Core Implementation

### 1. Earth Globe Component (`src/components/three/earth-globe.tsx`)

```typescript
'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, Mesh, MeshPhongMaterial } from 'three';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface EarthGlobeProps {
  theme?: 'light' | 'dark';
  autoRotate?: boolean;
  scale?: number;
}

export function EarthGlobe({ theme = 'light', autoRotate = true, scale = 1 }: EarthGlobeProps) {
  const meshRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);
  
  // Load earth textures
  const [diffuseMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [
    '/textures/earth-diffuse.jpg',
    '/textures/earth-normal.jpg', 
    '/textures/earth-specular.jpg',
    '/textures/earth-clouds.png'
  ]);

  // Create earth material
  const earthMaterial = useMemo(() => {
    return new MeshPhongMaterial({
      map: diffuseMap,
      normalMap: normalMap,
      specularMap: specularMap,
      shininess: theme === 'dark' ? 200 : 100,
      transparent: true,
      opacity: theme === 'dark' ? 0.9 : 0.8,
    });
  }, [diffuseMap, normalMap, specularMap, theme]);

  // Create clouds material
  const cloudsMaterial = useMemo(() => {
    return new MeshPhongMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: theme === 'dark' ? 0.4 : 0.6,
      depthWrite: false,
    });
  }, [cloudsMap, theme]);

  // Animation frame
  useFrame((state, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
    if (autoRotate && cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group scale={scale}>
      {/* Earth sphere */}
      <Sphere ref={meshRef} args={[2, 64, 64]} material={earthMaterial} />
      
      {/* Cloud layer */}
      <Sphere ref={cloudsRef} args={[2.01, 32, 32]} material={cloudsMaterial} />
      
      {/* Atmosphere glow */}
      <Sphere args={[2.1, 32, 32]}>
        <meshPhongMaterial
          color={theme === 'dark' ? '#4299e1' : '#60a5fa'}
          transparent
          opacity={theme === 'dark' ? 0.15 : 0.1}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}
```

### 2. Scene Wrapper Component (`src/components/three/earth-scene.tsx`)

```typescript
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import { useTheme } from 'next-themes';
import { EarthGlobe } from './earth-globe';

interface EarthSceneProps {
  className?: string;
  interactive?: boolean;
  autoRotate?: boolean;
}

export function EarthScene({ className = '', interactive = true, autoRotate = true }: EarthSceneProps) {
  const { theme } = useTheme();

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        gl={{ 
          antialias: true, 
          alpha: true, 
          powerPreference: "high-performance" 
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
        
        {/* Lighting */}
        <ambientLight intensity={theme === 'dark' ? 0.3 : 0.4} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={theme === 'dark' ? 1.2 : 1.5}
          castShadow
        />
        <pointLight 
          position={[-5, -3, -5]} 
          intensity={theme === 'dark' ? 0.5 : 0.3} 
          color={theme === 'dark' ? '#4299e1' : '#60a5fa'}
        />
        
        {/* Environment */}
        <Environment preset={theme === 'dark' ? 'night' : 'dawn'} />
        
        {/* Controls */}
        {interactive && (
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
            enableDamping
          />
        )}
        
        {/* Earth */}
        <Suspense fallback={null}>
          <EarthGlobe 
            theme={theme as 'light' | 'dark'} 
            autoRotate={!interactive || autoRotate}
            scale={1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

### 3. Enhanced Hero Section Integration

Update [src/app/page.tsx](mdc:src/app/page.tsx) hero section:

```typescript
import { EarthScene } from '@/components/three/earth-scene';

// In the hero section, replace the existing background:
<section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
  {/* Three.js Earth Background */}
  <div className="absolute inset-0 z-0">
    <EarthScene 
      className="opacity-20 dark:opacity-30" 
      interactive={false}
      autoRotate={true}
    />
  </div>
  
  {/* Gradient overlay for text readability */}
  <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 to-white/90 dark:from-gray-900/80 dark:to-gray-800/90 z-10" />
  
  {/* Content */}
  <div className="relative z-20 container mx-auto px-4 py-20">
    <div className="text-center max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
        {t('title')}
      </h1>
      {/* Rest of existing content */}
    </div>
  </div>
</section>
```

## Performance Optimization

### 1. Lazy Loading & Code Splitting
```typescript
// Use dynamic imports for Three.js components
import dynamic from 'next/dynamic';

const EarthScene = dynamic(() => import('@/components/three/earth-scene').then(mod => ({ default: mod.EarthScene })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800" />
});
```

### 2. Texture Optimization
- Use compressed texture formats (WEBP, KTX2)
- Implement progressive texture loading
- Add texture size optimization based on device capabilities

### 3. LOD (Level of Detail) System
```typescript
// Add to earth-globe.tsx
const geometry = useMemo(() => {
  const isMobile = window.innerWidth < 768;
  const segments = isMobile ? 32 : 64;
  return new THREE.SphereGeometry(2, segments, segments);
}, []);
```

## Interactive Features

### 1. Data Point Visualization
```typescript
// Add to earth-globe.tsx for domain location markers
const DomainMarkers = ({ domains }: { domains: Array<{lat: number, lng: number, domain: string}> }) => {
  return (
    <>
      {domains.map((domain, index) => (
        <mesh key={index} position={latLngToVector3(domain.lat, domain.lng, 2.05)}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ff6b6b" />
        </mesh>
      ))}
    </>
  );
};
```

### 2. Mouse Interaction Effects
```typescript
// Add hover effects and click interactions
const [hovered, setHovered] = useState(false);

useFrame(() => {
  if (hovered && meshRef.current) {
    meshRef.current.scale.setScalar(1.05);
  } else if (meshRef.current) {
    meshRef.current.scale.setScalar(1);
  }
});
```

## Responsive Design

### Mobile Optimization
```typescript
// Add responsive scaling based on screen size
const useResponsiveScale = () => {
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth < 640) setScale(0.6);
      else if (window.innerWidth < 1024) setScale(0.8);
      else setScale(1);
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  
  return scale;
};
```

## Theme Integration

### Dark/Light Mode Support
```typescript
// Theme-aware materials and lighting
const themeConfig = {
  light: {
    ambientIntensity: 0.4,
    directionalIntensity: 1.5,
    earthOpacity: 0.8,
    cloudsOpacity: 0.6,
    atmosphereColor: '#60a5fa'
  },
  dark: {
    ambientIntensity: 0.3,
    directionalIntensity: 1.2,
    earthOpacity: 0.9,
    cloudsOpacity: 0.4,
    atmosphereColor: '#4299e1'
  }
};
```

## Assets & Resources

### Required Earth Textures
1. **Earth Diffuse**: High-resolution earth surface texture (2048x1024)
2. **Normal Map**: Earth surface detail normals
3. **Specular Map**: Ocean reflectivity map
4. **Cloud Map**: Real-time cloud data (optional)

### Recommended Sources
- NASA Blue Marble textures
- Natural Earth data for geographic features
- Real-time cloud data APIs

## Implementation Checklist

- [ ] Install Three.js dependencies
- [ ] Create earth texture assets
- [ ] Implement EarthGlobe component
- [ ] Create EarthScene wrapper
- [ ] Integrate with homepage hero section
- [ ] Add performance optimizations
- [ ] Implement responsive design
- [ ] Add theme support
- [ ] Test across devices and browsers
- [ ] Optimize for accessibility

## Best Practices

1. **Performance**: Use `useFrame` sparingly, implement LOD system
2. **Accessibility**: Provide fallback static background for motion-sensitive users
3. **SEO**: Ensure Three.js doesn't block page rendering
4. **Progressive Enhancement**: Earth visualization enhances but doesn't replace core functionality
5. **Error Handling**: Graceful fallback if WebGL is not supported

## Integration with Existing Features

The earth visualization can be enhanced to show:
- Real-time domain query locations
- Popular domain distributions globally
- Network connectivity visualization
- Geographic DNS server locations

This creates a cohesive experience that ties the visual effect to the application's core WHOIS functionality.
