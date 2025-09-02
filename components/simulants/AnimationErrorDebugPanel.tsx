/**
 * Animation Error Debug Panel
 * Shows error statistics, recovery attempts, and debugging information
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { animationErrorHandler } from '../../utils/animationErrorHandler';
import { fallbackAnimationSystem } from '../../utils/animationFallbackSystem';
import { animationPerformanceAdapter } from '../../utils/animationPerformanceAdapter';

interface AnimationErrorDebugPanelProps {
  className?: string;
  onClose?: () => void;
}

export default function AnimationErrorDebugPanel({
  className = "",
  onClose
}: AnimationErrorDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<any>(null);
  const [showUserMessages, setShowUserMessages] = useState(false);

  // Refresh error statistics
  const refreshStats = () => {
    setErrorStats(animationErrorHandler.getErrorStatistics());
    setDeviceCapabilities(animationPerformanceAdapter.getDeviceCapabilities());
  };

  // Auto-refresh
  useEffect(() => {
    refreshStats();
    
    if (!autoRefresh) return;

    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClearErrors = () => {
    animationErrorHandler.clearOldReports(0); // Clear all
    refreshStats();
  };

  const handleClearFallbackCache = () => {
    fallbackAnimationSystem.clearCache();
  };

  const handleForceAdaptation = () => {
    animationPerformanceAdapter.forceAdaptation();
  };

  const handleGenerateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      errorStats,
      deviceCapabilities,
      fallbackAnimations: fallbackAnimationSystem.getAvailableFallbacks(),
      performanceRecommendations: animationPerformanceAdapter.getPerformanceRecommendations()
    };
    
    console.log('📊 Animation System Debug Report:', report);
    
    // Also log user-friendly messages for common errors
    if (errorStats && errorStats.mostCommonErrors.length > 0) {
      console.log('🔍 Most Common Errors:');
      errorStats.mostCommonErrors.forEach((error: any, index: number) => {
        console.log(`${index + 1}. ${error.type}: ${error.count} occurrences`);
      });
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getDeviceTypeColor = (isLowEnd: boolean, isMobile: boolean): string => {
    if (isLowEnd) return 'text-red-400';
    if (isMobile) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getDeviceTypeLabel = (capabilities: any): string => {
    if (capabilities.isLowEnd) return 'LOW-END';
    if (capabilities.isMobile) return 'MOBILE';
    return 'DESKTOP';
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className={`fixed bottom-4 right-4 bg-black/90 text-white border-gray-700 max-w-md ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Animation Error Monitor</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '−' : '+'}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Total Errors</div>
            <div className={`text-xl font-mono ${errorStats?.totalErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {errorStats?.totalErrors || 0}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Recovery Rate</div>
            <div className={`text-xl font-mono ${(errorStats?.recoverySuccessRate || 0) > 0.8 ? 'text-green-400' : 'text-yellow-400'}`}>
              {((errorStats?.recoverySuccessRate || 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-gray-400">Device Type</div>
            <div className={`text-lg font-semibold ${deviceCapabilities ? getDeviceTypeColor(deviceCapabilities.isLowEnd, deviceCapabilities.isMobile) : 'text-gray-400'}`}>
              {deviceCapabilities ? getDeviceTypeLabel(deviceCapabilities) : 'UNKNOWN'}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Performance</div>
            <div className={`text-lg font-mono ${deviceCapabilities?.estimatedPerformanceScore > 70 ? 'text-green-400' : deviceCapabilities?.estimatedPerformanceScore > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {deviceCapabilities?.estimatedPerformanceScore || 0}/100
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4 text-sm">
          <div className={`flex items-center space-x-1 ${errorStats?.totalErrors > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            <div className={`w-2 h-2 rounded-full ${errorStats?.totalErrors > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />
            <span>Error System</span>
          </div>
          <div className={`flex items-center space-x-1 ${deviceCapabilities?.isLowEnd ? 'text-red-400' : 'text-green-400'}`}>
            <div className={`w-2 h-2 rounded-full ${deviceCapabilities?.isLowEnd ? 'bg-red-400' : 'bg-green-400'}`} />
            <span>Device</span>
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator className="bg-gray-700" />

            {/* Error Breakdown */}
            {errorStats && errorStats.totalErrors > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300">Error Breakdown</h4>
                <div className="space-y-2 text-xs">
                  {Object.entries(errorStats.errorsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between">
                      <span className={getSeverityColor(severity)}>{severity.toUpperCase()}</span>
                      <span className="font-mono">{count as number}</span>
                    </div>
                  ))}
                </div>
                
                {errorStats.mostCommonErrors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-gray-400">Most Common:</div>
                    {errorStats.mostCommonErrors.slice(0, 3).map((error: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-red-300">{error.type}</span>
                        <span className="font-mono">{error.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Device Capabilities */}
            {deviceCapabilities && (
              <>
                <Separator className="bg-gray-700" />
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300">Device Capabilities</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400">WebGL2</div>
                      <div className={deviceCapabilities.supportsWebGL2 ? 'text-green-400' : 'text-red-400'}>
                        {deviceCapabilities.supportsWebGL2 ? 'YES' : 'NO'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Max Texture</div>
                      <div className="font-mono">{deviceCapabilities.maxTextureSize}px</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Memory Limited</div>
                      <div className={deviceCapabilities.hasLimitedMemory ? 'text-yellow-400' : 'text-green-400'}>
                        {deviceCapabilities.hasLimitedMemory ? 'YES' : 'NO'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Mobile</div>
                      <div className={deviceCapabilities.isMobile ? 'text-yellow-400' : 'text-blue-400'}>
                        {deviceCapabilities.isMobile ? 'YES' : 'NO'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator className="bg-gray-700" />

            {/* Controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">Controls</h4>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh-errors"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh-errors" className="text-xs">Auto Refresh</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-user-messages"
                  checked={showUserMessages}
                  onCheckedChange={setShowUserMessages}
                />
                <Label htmlFor="show-user-messages" className="text-xs">Show User Messages</Label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearErrors}
                  className="text-xs"
                >
                  Clear Errors
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFallbackCache}
                  className="text-xs"
                >
                  Clear Fallbacks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceAdaptation}
                  className="text-xs"
                >
                  Force Adapt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshStats}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Debug Report */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">Debug Report</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateReport}
                className="text-xs w-full"
              >
                Generate & Log Report
              </Button>
            </div>

            {/* User Messages */}
            {showUserMessages && errorStats && errorStats.mostCommonErrors.length > 0 && (
              <>
                <Separator className="bg-gray-700" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-300">User Messages</h4>
                  <div className="space-y-1 text-xs">
                    {errorStats.mostCommonErrors.slice(0, 2).map((error: any, index: number) => {
                      const userMessage = animationErrorHandler.generateUserMessage({
                        type: error.type,
                        message: `${error.type} occurred ${error.count} times`,
                        path: ''
                      } as any);
                      return (
                        <div key={index} className="p-2 bg-blue-900/30 rounded text-blue-200">
                          {userMessage}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export type { AnimationErrorDebugPanelProps };