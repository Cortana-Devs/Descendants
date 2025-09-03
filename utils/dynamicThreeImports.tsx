/**
 * Dynamic import utilities for Three.js components and modules
 * Handles SSR compatibility and loading states
 */

import dynamic from 'next/dynamic'
import React from 'react'
import type { LoadingProps } from '../types/animations'

/**
 * Options for dynamic Three.js component imports
 */
interface DynamicThreeOptions {
  /** Show loading component during import */
  loading?: React.ComponentType<LoadingProps>
  /** Custom fallback for SSR */
  ssrFallback?: React.ComponentType<any>
  /** Enable SSR (default: false for Three.js components) */
  ssr?: boolean
}

/**
 * Create a dynamic import for Three.js components with proper SSR handling
 */
export function createDynamicThreeComponent<P = {}>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: DynamicThreeOptions = {}
) {
  const {
    loading: LoadingComponent,
    ssrFallback: SSRFallbackComponent,
    ssr = false
  } = options

  return dynamic(importFn, {
    ssr,
    loading: LoadingComponent ? (loadingProps: LoadingProps) => React.createElement(LoadingComponent, loadingProps) : undefined,
  })
}

/**
 * Lazy load Three.js modules with error handling
 */
export async function loadThreeModule<T>(
  importFn: () => Promise<T>
): Promise<T | null> {
  try {
    // Only load on client-side
    if (typeof window === 'undefined') {
      return null
    }

    const module = await importFn()
    return module
  } catch (error) {
    console.warn('Failed to load Three.js module:', error)
    return null
  }
}

/**
 * Preload Three.js modules for better performance
 */
export function preloadThreeModules() {
  // Only preload on client-side
  if (typeof window === 'undefined') {
    return
  }

  // Preload common Three.js modules
  const preloadPromises = [
    import('three'),
    import('@react-three/fiber'),
    import('@react-three/drei'),
    import('three/examples/jsm/loaders/GLTFLoader.js')
  ]

  Promise.all(preloadPromises).catch((error) => {
    console.warn('Failed to preload Three.js modules:', error)
  })
}

/**
 * Utility to check if Three.js is available
 */
export function isThreeJSAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    // Try to access WebGL context
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

/**
 * Get WebGL capabilities for performance optimization
 */
export function getWebGLCapabilities() {
  if (!isThreeJSAvailable()) {
    return null
  }

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext
    
    if (!gl) return null

    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    }
  } catch (error) {
    console.warn('Failed to get WebGL capabilities:', error)
    return null
  }
}

/**
 * Initialize Three.js environment with error handling
 */
export async function initializeThreeJS() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Server-side environment' }
  }

  try {
    // Check WebGL support
    if (!isThreeJSAvailable()) {
      throw new Error('WebGL not supported')
    }

    // Load Three.js modules
    const [three, fiber, drei] = await Promise.all([
      import('three'),
      import('@react-three/fiber'),
      import('@react-three/drei')
    ])

    // Get WebGL capabilities
    const capabilities = getWebGLCapabilities()

    return {
      success: true,
      modules: { three, fiber, drei },
      capabilities
    }
  } catch (error) {
    console.error('Failed to initialize Three.js:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Error boundary for Three.js components
 */
export class ThreeJSErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Three.js component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
      
      if (FallbackComponent && this.state.error) {
        return React.createElement(FallbackComponent, { error: this.state.error })
      }

      return React.createElement('div',
        { className: "p-4 bg-red-100 border border-red-300 rounded text-red-700" },
        React.createElement('h3', { className: "font-semibold" }, "3D Rendering Error"),
        React.createElement('p', { className: "text-sm mt-1" },
          "Failed to render 3D content. Please refresh the page or check WebGL support."
        ),
        this.state.error && React.createElement('details', { className: "mt-2 text-xs" },
          React.createElement('summary', {}, "Error Details"),
          React.createElement('pre', 
            { className: "mt-1 whitespace-pre-wrap" }, 
            this.state.error.message
          )
        )
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component for SSR-safe Three.js components
 */
export function withSSRSafe<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<P>
) {
  return function SSRSafeComponent(props: P) {
    const [isClient, setIsClient] = React.useState(false)
    
    React.useEffect(() => {
      setIsClient(true)
    }, [])
    
    if (!isClient) {
      return FallbackComponent ? React.createElement(FallbackComponent, props) : null
    }
    
    return React.createElement(Component, props)
  }
}

/**
 * Hook to safely import Three.js modules only on client-side
 */
export function useThreeJSModule<T>(
  importFn: () => Promise<T>
): { module: T | null; loading: boolean; error: Error | null } {
  const [module, setModule] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  React.useEffect(() => {
    if (!isClient) return

    setLoading(true)
    setError(null)

    importFn()
      .then((mod) => {
        setModule(mod)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [isClient, importFn])

  return { module, loading, error }
}