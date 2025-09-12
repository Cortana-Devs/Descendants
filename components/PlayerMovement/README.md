# Player Movement System

A comprehensive, modular first-person and third-person avatar movement system for React Three Fiber applications. This system provides WASD movement controls, physics simulation, animation management, and seamless integration with Zustand world state.

## 🎯 Features

- ✅ **First-person and third-person perspectives**
- ✅ **WASD movement controls with mouse look**
- ✅ **Physics-based movement** (gravity, friction, air resistance)
- ✅ **Jump, run, crouch mechanics**
- ✅ **GLB/GLTF avatar loading and animation**
- ✅ **Smooth animation transitions**
- ✅ **World store integration**
- ✅ **Modular and detachable architecture**
- ✅ **TypeScript support**
- ✅ **Debug-friendly with development tools**

## 📦 Installation

The system is already integrated into this project. If you want to use it elsewhere:

```bash
npm install three @react-three/fiber @react-three/drei zustand
```

## 🚀 Quick Start

```tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import PlayerMovementSystem, { PerspectiveMode } from './components/PlayerMovement';

function App() {
  return (
    <Canvas>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} />
      
      <PlayerMovementSystem
        perspectiveMode={PerspectiveMode.THIRD_PERSON}
        movementConfig={{ speed: 5, usePhysics: true }}
        avatarConfig={{ modelUrl: '/models/player.glb' }}
      />
    </Canvas>
  );
}
```

## 📁 Architecture

```
components/PlayerMovement/
├── index.tsx               // Main integration component
├── usePlayerMovement.ts    // Movement logic hook
├── PlayerAvatar.tsx        // Avatar rendering component
├── movementHelpers.ts      // Physics and math utilities
├── types.ts               // TypeScript type definitions
└── README.md              // This documentation
```

## 🎮 Controls

### Default Controls
- **WASD** / **Arrow Keys** - Move forward/backward/left/right
- **Space** - Jump
- **Shift** - Run (2x speed)
- **Ctrl** - Crouch (0.5x speed)
- **Mouse** - Look around (first-person mode, click to lock cursor)

### Perspective Modes
- **First Person** - Camera at eye level, avatar hidden (optional hands)
- **Third Person** - Camera behind avatar, full avatar visible

## 🔧 Configuration

### Movement Configuration

```tsx
const movementConfig = {
  speed: 5,                    // Base movement speed
  runSpeedMultiplier: 2,       // Speed multiplier when running
  crouchSpeedMultiplier: 0.5,  // Speed multiplier when crouching
  jumpForce: 8,                // Jump velocity
  cameraLock: true,            // Whether camera controls movement direction
  mouseSensitivity: 0.002,     // Mouse look sensitivity
  usePhysics: true,            // Enable physics simulation
  gravity: -20,                // Gravity force
  friction: 0.9,               // Ground friction
  airResistance: 0.95          // Air resistance
};
```

### Avatar Configuration

```tsx
const avatarConfig = {
  modelUrl: '/models/avatar.glb',     // Path to GLB model
  scale: 1,                           // Model scale factor
  yOffset: 0,                         // Y-position offset
  showInFirstPerson: false,           // Show avatar in first-person
  showHandsInFirstPerson: true,       // Show hands in first-person
  animationBlendTime: 0.2,            // Animation transition time
  animationMap: {                     // Map states to animation names
    idle: 'Idle',
    walk: 'Walk',
    run: 'Run',
    jump: 'Jump',
    crouch: 'Crouch'
  }
};
```

### Camera Configuration (Third-person)

```tsx
const cameraOffset = {
  distance: 5,        // Distance behind player
  height: 2,          // Height above player
  sideOffset: 0,      // Side offset for over-shoulder
  followSpeed: 0.1,   // Camera follow smoothness
  lookSpeed: 0.1      // Camera look smoothness
};
```

## 🎨 Animation System

The system automatically manages animations based on movement state:

- **Idle** - No movement
- **Walk** - Normal movement
- **Run** - Movement with Shift held
- **Jump** - During jump
- **Crouch** - With Ctrl held
- **Fall** - When airborne (falling)
- **Land** - When landing from jump/fall

### Custom Animation Mapping

```tsx
const customAnimationMap = {
  [AnimationState.IDLE]: 'CharacterIdle',
  [AnimationState.WALK]: 'CharacterWalk',
  [AnimationState.RUN]: 'CharacterRun',
  [AnimationState.JUMP]: 'CharacterJump',
  [AnimationState.CROUCH]: 'CharacterCrouch'
};
```

## 🌍 World Store Integration

The system integrates with Zustand world store automatically:

```tsx
// Access player state from anywhere
const { playerAvatar, updateAvatarPosition } = useWorldStore();

// Player state is automatically synced
console.log(playerAvatar?.position); // Current player position
console.log(playerAvatar?.currentAnimation); // Current animation
```

## 🔗 Hook Usage

For custom implementations, use the hook directly:

```tsx
import { usePlayerMovement } from './components/PlayerMovement';

function CustomPlayer() {
  const {
    movementState,
    inputState,
    updateConfig,
    reset,
    teleport,
    isMoving,
    getCurrentSpeed
  } = usePlayerMovement({
    speed: 6,
    usePhysics: true
  });
  
  // Custom logic here
  
  return (
    <mesh position={movementState.position}>
      <boxGeometry args={[1, 2, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}
```

## 🛠 API Reference

### PlayerMovementSystem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `movementConfig` | `Partial<PlayerMovementConfig>` | `{}` | Movement configuration |
| `avatarConfig` | `Partial<PlayerAvatarConfig>` | `{}` | Avatar configuration |
| `perspectiveMode` | `PerspectiveMode` | `THIRD_PERSON` | Camera perspective |
| `cameraOffset` | `Partial<CameraOffset>` | `{}` | Third-person camera offset |
| `enabled` | `boolean` | `true` | Enable/disable system |
| `spawnPosition` | `Vector3` | `(0,0,0)` | Initial spawn position |
| `syncWithStore` | `boolean` | `true` | Sync with world store |
| `onMove` | `function` | - | Movement callback |
| `onAnimationChange` | `function` | - | Animation change callback |

### usePlayerMovement Hook

```tsx
const {
  movementState,     // Current movement state
  inputState,        // Current input state
  updateConfig,      // Update configuration
  reset,             // Reset position and state
  getDirection,      // Get movement direction
  isMoving,          // Check if player is moving
  getCurrentSpeed,   // Get current speed
  teleport           // Teleport to position
} = usePlayerMovement(config);
```

## 🧪 Testing

Test the implementation at: `/player-movement-test`

Or run the example:

```tsx
import { PlayerMovementExample } from './examples/PlayerMovementExample';

<PlayerMovementExample />
```

**Note**: The debug panel uses React Portals to render outside the R3F Canvas, preventing "not part of THREE namespace" errors.

## 🎛 Debug Mode

In development, a debug panel shows:
- Current position and velocity
- Animation state
- Input state
- Performance metrics

## 🔧 Customization

### Custom Physics

```tsx
const customPhysics = {
  usePhysics: true,
  gravity: -30,        // Stronger gravity
  friction: 0.95,      // More friction
  airResistance: 0.98  // More air resistance
};
```

### Custom Controls

```tsx
// Extend the movement hook for custom controls
const movement = usePlayerMovement();

useEffect(() => {
  const handleCustomKey = (e) => {
    if (e.key === 'f') {
      movement.teleport(new Vector3(0, 10, 0));
    }
  };
  
  window.addEventListener('keydown', handleCustomKey);
  return () => window.removeEventListener('keydown', handleCustomKey);
}, []);
```

## 📱 Performance

- **Physics simulation** can be disabled for better performance
- **Animation blending** is optimized for smooth transitions
- **LOD system** ready for integration
- **Memory management** included for avatar assets

## 🚨 Troubleshooting

### Model Not Loading
- Check the model URL path
- Ensure the GLB file is accessible
- Check browser console for loading errors

### Animations Not Playing
- Verify animation names in the model
- Check the `animationMap` configuration
- Ensure animations exist in the GLB file

### Performance Issues
- Disable physics (`usePhysics: false`)
- Reduce animation blend time
- Lower movement update frequency

### Camera Issues
- Check perspective mode setting
- Verify camera offset configuration
- Ensure pointer lock is working (first-person)

## 🤝 Contributing

This system follows the modular architecture principles:
- Keep components isolated and testable
- Use TypeScript for type safety
- Follow React Three Fiber conventions
- Maintain performance optimizations

## 📄 License

Part of the Descendants project. See main project license.
