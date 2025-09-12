import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { Vector3 } from 'three';
import PlayerMovementSystem, { 
  PerspectiveMode, 
  AnimationState,
  PlayerMovementConfig,
  PlayerAvatarConfig,
  AdvancedCameraConfig,
  DEFAULT_ADVANCED_CAMERA_CONFIG
} from '../components/PlayerMovement';

/**
 * Complete example demonstrating the PlayerMovementSystem
 * This shows how to integrate first-person and third-person movement
 * with customizable settings and world integration.
 */
export default function PlayerMovementExample() {
  const [perspectiveMode, setPerspectiveMode] = useState<PerspectiveMode>(
    PerspectiveMode.THIRD_PERSON
  );
  const [useAdvancedCamera, setUseAdvancedCamera] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Movement configuration
  const movementConfig: Partial<PlayerMovementConfig> = {
    speed: 6,
    runSpeedMultiplier: 2.5,
    jumpForce: 10,
    mouseSensitivity: 0.003,
    usePhysics: true,
    gravity: -25,
    friction: 0.85,
    airResistance: 0.98
  };
  
  // Avatar configuration
  const avatarConfig: Partial<PlayerAvatarConfig> = {
    modelUrl: '/models/player_ReadyPlayerMe.glb',
    scale: 1,
    showInFirstPerson: false,
    showHandsInFirstPerson: true,
    animationBlendTime: 0.15
  };
  
  // Camera offset for third-person
  const cameraOffset = {
    distance: 8,
    height: 3,
    sideOffset: 1,
    followSpeed: 0.1,
    lookSpeed: 0.15
  };
  
  // Handle player movement events
  const handlePlayerMove = (position: Vector3, velocity: Vector3) => {
    setDebugInfo(prev => ({
      ...prev,
      position,
      velocity,
      speed: Math.sqrt(velocity.x ** 2 + velocity.z ** 2),
      lastMoveTime: Date.now()
    }));
  };
  
  const handleAnimationChange = (state: AnimationState) => {
    setDebugInfo(prev => ({
      ...prev,
      animationState: state
    }));
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Control Panel */}
      <ControlPanel
        perspectiveMode={perspectiveMode}
        onPerspectiveModeChange={setPerspectiveMode}
        isEnabled={isEnabled}
        onEnabledChange={setIsEnabled}
        debugInfo={debugInfo}
      />
      
      {/* 3D Scene */}
      <Canvas
        camera={{
          position: [10, 5, 10],
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        style={{ background: '#87CEEB' }}
      >
        {/* Basic scene setup */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        
        {/* Environment */}
        <Environment preset="sunset" />
        
        {/* Ground plane */}
        <mesh
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#4a7c59" />
        </mesh>
        
        {/* Grid for reference */}
        <Grid
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6fbf73"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#3a5f3d"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />
        
        {/* Sample environment objects */}
        <SampleEnvironment />
        
        {/* Player Movement System */}
        <PlayerMovementSystem
          movementConfig={movementConfig}
          avatarConfig={avatarConfig}
          perspectiveMode={perspectiveMode}
          cameraOffset={cameraOffset}
          useAdvancedCamera={useAdvancedCamera}
          advancedCameraConfig={{
            ...DEFAULT_ADVANCED_CAMERA_CONFIG,
            distance: 8,
            height: 3,
            smoothTime: 0.2,
            enableMouseControl: true,
            zoomMin: 3,
            zoomMax: 15
          }}
          enabled={isEnabled}
          spawnPosition={new Vector3(0, 0, 5)}
          syncWithStore={true}
          onMove={handlePlayerMove}
          onAnimationChange={handleAnimationChange}
        />
        
        {/* Orbit controls for third-person mode */}
        {perspectiveMode === PerspectiveMode.THIRD_PERSON && (
          <OrbitControls
            enabled={false} // Disabled when player movement is active
            target={[0, 0, 0]}
          />
        )}
      </Canvas>
      
      {/* Instructions */}
      <Instructions perspectiveMode={perspectiveMode} />
    </div>
  );
}

/**
 * Control panel for testing different configurations
 */
interface ControlPanelProps {
  perspectiveMode: PerspectiveMode;
  onPerspectiveModeChange: (mode: PerspectiveMode) => void;
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  debugInfo: any;
}

function ControlPanel({
  perspectiveMode,
  onPerspectiveModeChange,
  isEnabled,
  onEnabledChange,
  debugInfo
}: ControlPanelProps) {
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    left: 20,
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
    minWidth: 250,
    fontFamily: 'monospace'
  };
  
  return (
    <div style={panelStyle}>
      <h3>Player Movement Controls</h3>
      
      {/* Perspective Mode */}
      <div style={{ marginBottom: 15 }}>
        <label>Perspective Mode:</label>
        <div>
          <label>
            <input
              type="radio"
              checked={perspectiveMode === PerspectiveMode.FIRST_PERSON}
              onChange={() => onPerspectiveModeChange(PerspectiveMode.FIRST_PERSON)}
            />
            First Person
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              checked={perspectiveMode === PerspectiveMode.THIRD_PERSON}
              onChange={() => onPerspectiveModeChange(PerspectiveMode.THIRD_PERSON)}
            />
            Third Person
          </label>
        </div>
      </div>
      
      {/* Enable/Disable */}
      <div style={{ marginBottom: 15 }}>
        <label>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          Movement Enabled
        </label>
      </div>
      
      {/* Debug Info */}
      {debugInfo && (
        <div style={{ marginTop: 15, fontSize: 11 }}>
          <h4>Debug Info:</h4>
          <div>Position: {debugInfo.position ? 
            `(${debugInfo.position.x.toFixed(1)}, ${debugInfo.position.y.toFixed(1)}, ${debugInfo.position.z.toFixed(1)})` 
            : 'N/A'}</div>
          <div>Speed: {debugInfo.speed ? debugInfo.speed.toFixed(2) : '0.00'}</div>
          <div>Animation: {debugInfo.animationState || 'idle'}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Sample environment objects for testing collision and navigation
 */
function SampleEnvironment() {
  return (
    <>
      {/* Sample buildings/obstacles */}
      <mesh position={[10, 1, 10]} castShadow>
        <boxGeometry args={[4, 2, 4]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      <mesh position={[-8, 1.5, 15]} castShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#696969" />
      </mesh>
      
      <mesh position={[15, 0.5, -10]} castShadow>
        <boxGeometry args={[6, 1, 6]} />
        <meshStandardMaterial color="#D2691E" />
      </mesh>
      
      {/* Trees (cylinders) */}
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i}>
          <mesh
            position={[
              Math.sin(i * 2) * 20,
              1,
              Math.cos(i * 2) * 20
            ]}
            castShadow
          >
            <cylinderGeometry args={[0.3, 0.5, 2, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh
            position={[
              Math.sin(i * 2) * 20,
              3,
              Math.cos(i * 2) * 20
            ]}
            castShadow
          >
            <sphereGeometry args={[2, 8, 6]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/**
 * Instructions overlay
 */
interface InstructionsProps {
  perspectiveMode: PerspectiveMode;
}

function Instructions({ perspectiveMode }: InstructionsProps) {
  const instructionsStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 20,
    left: 20,
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: 15,
    borderRadius: 5,
    fontFamily: 'monospace',
    fontSize: 14,
    zIndex: 1000
  };
  
  return (
    <div style={instructionsStyle}>
      <h4>Controls:</h4>
      <div>WASD - Move</div>
      <div>Space - Jump</div>
      <div>Shift - Run</div>
      <div>Ctrl - Crouch</div>
      {perspectiveMode === PerspectiveMode.FIRST_PERSON && (
        <div>Mouse - Look around (click to lock cursor)</div>
      )}
      <div style={{ marginTop: 10 }}>
        Current Mode: <strong>{perspectiveMode}</strong>
      </div>
    </div>
  );
}

// Export for use in other examples
export { PlayerMovementExample };
