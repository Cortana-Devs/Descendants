import React, { useEffect, useRef, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Group, Vector3, Euler } from 'three';
import { useFrame } from '@react-three/fiber';
import { 
  AnimationState, 
  PlayerAvatarConfig, 
  PerspectiveMode,
  DEFAULT_AVATAR_CONFIG 
} from './types';

interface PlayerAvatarProps {
  /** Current position of the avatar */
  position: Vector3;
  /** Current rotation of the avatar */
  rotation: Euler;
  /** Current animation state */
  animationState: AnimationState;
  /** Avatar configuration */
  config?: Partial<PlayerAvatarConfig>;
  /** Current camera perspective mode */
  perspectiveMode?: PerspectiveMode;
  /** Whether the avatar should be visible */
  visible?: boolean;
  /** Scale factor for the avatar */
  scale?: number;
  /** Callback when model loads */
  onLoad?: () => void;
  /** Callback when model fails to load */
  onError?: (error: Error) => void;
}

/**
 * PlayerAvatar component that loads and displays a GLB/GLTF character model
 * with animation support and perspective-based visibility
 */
export function PlayerAvatar({
  position,
  rotation,
  animationState,
  config: userConfig = {},
  perspectiveMode = PerspectiveMode.THIRD_PERSON,
  visible = true,
  scale = 1,
  onLoad,
  onError
}: PlayerAvatarProps) {
  const groupRef = useRef<Group>(null);
  const prevAnimationState = useRef<AnimationState>(animationState);
  const hasLoaded = useRef(false);
  
  // Merge user config with defaults
  const config = useMemo<PlayerAvatarConfig>(() => ({
    ...DEFAULT_AVATAR_CONFIG,
    ...userConfig
  }), [userConfig]);
  
  // Load GLTF model
  const { scene, animations, error } = useGLTF(config.modelUrl, true);
  const { actions, mixer } = useAnimations(animations, scene);
  
  // Handle model loading (prevent multiple calls)
  useEffect(() => {
    if (scene && onLoad && !hasLoaded.current) {
      hasLoaded.current = true;
      onLoad();
    }
  }, [scene, onLoad]);
  
  // Handle loading errors
  useEffect(() => {
    if (error && onError) {
      onError(new Error(`Failed to load avatar model: ${config.modelUrl}`));
    }
  }, [error, config.modelUrl, onError]);
  
  // Animation management
  useEffect(() => {
    if (!actions || !mixer) return;
    
    const animationName = config.animationMap[animationState];
    if (!animationName) {
      console.warn(`No animation mapping found for state: ${animationState}`);
      return;
    }
    
    const newAction = actions[animationName];
    const prevAnimationName = config.animationMap[prevAnimationState.current];
    const prevAction = prevAnimationName ? actions[prevAnimationName] : null;
    
    if (!newAction) {
      console.warn(`Animation "${animationName}" not found in model`);
      return;
    }
    
    // Handle animation transitions
    if (prevAction && prevAction !== newAction && prevAction.isRunning()) {
      // Smooth transition between animations
      newAction.reset();
      newAction.setEffectiveTimeScale(1);
      newAction.setEffectiveWeight(1);
      newAction.play();
      
      // Crossfade from previous animation
      prevAction.crossFadeTo(newAction, config.animationBlendTime, true);
    } else {
      // Start new animation
      newAction.reset();
      newAction.setEffectiveTimeScale(1);
      newAction.setEffectiveWeight(1);
      newAction.play();
    }
    
    // Stop all other animations
    Object.entries(actions).forEach(([name, action]) => {
      if (name !== animationName && name !== prevAnimationName) {
        action?.stop();
      }
    });
    
    prevAnimationState.current = animationState;
  }, [animationState, actions, mixer, config.animationMap, config.animationBlendTime]);
  
  // Update position and rotation
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Update position with Y offset
    groupRef.current.position.copy(position);
    groupRef.current.position.y += config.yOffset;
    
    // Update rotation
    groupRef.current.rotation.copy(rotation);
    
    // Update mixer for animations
    if (mixer) {
      mixer.update(0.016); // Assume 60fps for smooth animations
    }
  });
  
  // Determine visibility based on perspective mode
  const shouldShowAvatar = useMemo(() => {
    if (!visible) return false;
    
    switch (perspectiveMode) {
      case PerspectiveMode.FIRST_PERSON:
        return config.showInFirstPerson;
      case PerspectiveMode.THIRD_PERSON:
        return true;
      default:
        return true;
    }
  }, [visible, perspectiveMode, config.showInFirstPerson]);
  
  // Show hands/arms in first person if configured
  const shouldShowHands = useMemo(() => {
    return perspectiveMode === PerspectiveMode.FIRST_PERSON && config.showHandsInFirstPerson;
  }, [perspectiveMode, config.showHandsInFirstPerson]);
  
  // Clone scene to avoid modifying the original
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    
    const cloned = scene.clone();
    
    // Apply scale
    const finalScale = scale * config.scale;
    cloned.scale.setScalar(finalScale);
    
    // Configure visibility for first-person mode
    if (perspectiveMode === PerspectiveMode.FIRST_PERSON && shouldShowHands) {
      // Hide body parts except hands/arms
      cloned.traverse((child) => {
        if (child.name.toLowerCase().includes('body') || 
            child.name.toLowerCase().includes('head') ||
            child.name.toLowerCase().includes('leg')) {
          child.visible = false;
        }
      });
    }
    
    return cloned;
  }, [scene, scale, config.scale, perspectiveMode, shouldShowHands]);
  
  // Fallback mesh if model fails to load
  const FallbackMesh = useMemo(() => {
    if (scene && !error) return null;
    
    return (
      <mesh>
        <boxGeometry args={[0.6, 1.8, 0.3]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    );
  }, [scene, error]);
  
  if (!shouldShowAvatar && !shouldShowHands) {
    return null;
  }
  
  return (
    <group ref={groupRef} visible={shouldShowAvatar || shouldShowHands}>
      {clonedScene ? (
        <primitive object={clonedScene} />
      ) : (
        FallbackMesh
      )}
    </group>
  );
}

// Performance optimization: preload common avatar models
export function preloadAvatarModel(modelUrl: string) {
  useGLTF.preload(modelUrl);
}

// Cleanup function for when avatar is unmounted
PlayerAvatar.displayName = 'PlayerAvatar';

export default PlayerAvatar;
