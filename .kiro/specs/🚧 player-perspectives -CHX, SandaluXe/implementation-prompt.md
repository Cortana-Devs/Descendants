## 🗂️ Project Goals & Constraints

- **Goal**: Add first-person/third-person avatar movement using GLB/GLTF characters, modular and swappable, supporting player and AI entities, minimal code tangling.
- **Environment**: React, React Three Fiber, Zustand (world store), modular folder structure, aiming at voxel/world systems.
- **Requirements**:  
  - Lightweight and clear public APIs (for agent use/reuse)  
  - Separatable into its own folder/module  
  - Side-effect-free, all external integration via props/state  
  - Testable and debug-friendly

***

## 1. 📦 Folder & File Structure

Place all new modules in a single directory (`components/PlayerMovement`) for easy detachment.

```
components/
├─ PlayerMovement/
│   ├─ index.tsx                // Entry-point component
│   ├─ usePlayerMovement.ts     // Custom movement logic hook
│   ├─ PlayerAvatar.tsx         // Model + animation loader
│   ├─ movementHelpers.ts       // Physics/math helpers
│   └─ types.ts                 // TypeScript types
```

***

## 2. ✅ Essential NPM Dependencies

```bash
npm install three @react-three/fiber @react-three/drei zustand
```

- If using character animation:  
  ```bash
  npm install drei @react-three/drei
  ```

***

## 3. 🧑‍💻 Core Functionalities (Step-by-step)

### a) **Player Movement Hook** (`usePlayerMovement.ts`)

- Handles movement input (WASD/mouse), applies physics, returns position/rotation.

```typescript
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';

export function usePlayerMovement({ speed = 5, cameraLock = true }) {
  const velocity = useRef([0, 0, 0]);
  const { camera } = useThree();

  // Keyboard event listeners
  useEffect(() => {
    // ...handle keydown/up, update velocity.current
    // Optionally support jump, crouch, etc.
    return () => { /* cleanup */ }
  }, []);

  // Frame update
  useFrame((_, delta) => {
    // Apply velocity to camera or controlled object
    // Optionally: update a ref, trigger animation state changes
  });

  return {
    velocity,
    // Expose for avatar/camera, e.g. `getDirection`, `reset`, etc.
  };
}
```

***

### b) **Player Avatar Loader** (`PlayerAvatar.tsx`)

- Loads the GLB character model, attaches the position/rotation from movement, manages animation states (`idle`, `walk`, `run`, etc.)

```typescript
import { useGLTF, useAnimations } from '@react-three/drei';

export function PlayerAvatar({ modelUrl, animationState, position, rotation }) {
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, scene);

  // Animation controller
  useEffect(() => {
    // Play correct animation based on animationState prop
    // Handle blending/transition
  }, [animationState]);

  // Update scene object position/rotation from props
  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      // Optional: support visibility, LOD, etc.
    />
  );
}
```

***

### c) **World Store Integration** (Zustand example)

- Store only `avatarState`, position, animation state, and API for updating—**no direct effect in store!**

```typescript
import create from 'zustand';

export const useWorldStore = create((set) => ({
  avatarState: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    animation: 'idle',
    modelUrl: '/models/default.glb'
  },
  setAvatarState: (newState) => set((state) => ({ avatarState: { ...state.avatarState, ...newState } })),
}));
```

***

### d) **Integration Component** (`index.tsx`)

- Container component: wires together movement, avatar, state updates

```typescript
export default function PlayerMovementSystem() {
  const { avatarState, setAvatarState } = useWorldStore();
  const movement = usePlayerMovement({ speed: 5, cameraLock: true });

  // Compute new animation state based on movement velocity
  useEffect(() => {
    let anim = 'idle';
    // ...logic to set 'walk', 'run', 'jump' etc.
    setAvatarState({ animation: anim, position: /* compute */, rotation: /* compute */ });
  }, [movement.velocity]);

  return (
    <PlayerAvatar
      modelUrl={avatarState.modelUrl}
      animationState={avatarState.animation}
      position={avatarState.position}
      rotation={avatarState.rotation}
    />
  );
}
```

***

## 4. 🧩 Usage in App/World

- Import and mount `<PlayerMovementSystem />` as a _child_ of your R3F `<Canvas>`.
- For first-person: hide avatar mesh when camera is at head position, show hands-only mesh if needed.
- For third-person: place camera behind/above avatar, always render avatar mesh.

***

## 5. 🛠 Key Technical Details & Customization

- **GLTF Models**: Use `@react-three/drei` for fast loading; use optimized RPM/Ready Player Me or Mixamo models for best results.
- **Animations**: Store animation names as string enums in state; drive transitions/blending using velocity/movement state; use `useAnimations` for blend trees if advanced blending is needed.
- **Detach/Attach**: Swap out `PlayerMovementSystem` in any R3F-based scene; all internals are props/state-based.
- **Performance**: Minimal state, cleanup listeners on unmount, LODs possible at `PlayerAvatar` level.
- **Testing**: Test as React components using Jest/React Testing Library; test input logic and state/prop updates.

***

## 6. 🚨 Troubleshooting & Edge Case Handling

- If model fails to load: fallback to cube/sphere (basic mesh) as placeholder.
- If state is out-of-sync: recompute position/rotation from source-of-truth movement hook.
- For multiplayer: do not hardwire any store structure – keep store/updater loosely coupled (e.g., pass as props).

***

## 7. 📖 Reference Links

- [Part 1 Tutorial: dev.to/jgcarrillo/create-a-first-person-movement-in-react-three-fiber-part-1-f0c][1]
- [Part 2 Tutorial: dev.to/jgcarrillo/create-a-first-person-movement-in-react-three-fiber-part-2-1jic]
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [drei Animation Docs](https://github.com/pmndrs/drei#useanimations)

***

## 8. 📝 Claude Coding Agent Notes

- Use the above modular system as a **single logical unit**; do not break the hook/component integration contracts.
- All public methods/props should be documented for agent use.
- For exporting: you may package this folder as a detachable npm package or internal module.
- Keep any additional dependencies peer only (do not hardwire to app-specific state outside world store/props).

