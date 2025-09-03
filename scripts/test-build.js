#!/usr/bin/env node

/**
 * Build Test Script
 * Tests Next.js build process and SSR compatibility for animation system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Testing Next.js build process and SSR compatibility...\n');

// Test configuration
const testConfig = {
  buildTimeout: 300000, // 5 minutes
  testTimeout: 60000,   // 1 minute
  outputDir: '.next',
  testPages: [
    '/',
    // Add more pages as needed
  ]
};

async function runCommand(command, options = {}) {
  try {
    console.log(`📋 Running: ${command}`);
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: options.timeout || testConfig.testTimeout,
      ...options
    });
    console.log(`✅ Success: ${command}\n`);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Failed: ${command}`);
    console.error(`Error: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function checkFileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function testBuildProcess() {
  console.log('🔨 Testing build process...');
  
  // Clean previous build
  if (await checkFileExists(testConfig.outputDir)) {
    console.log('🧹 Cleaning previous build...');
    await runCommand(`rm -rf ${testConfig.outputDir}`);
  }

  // Run Next.js build
  const buildResult = await runCommand('pnpm build', {
    timeout: testConfig.buildTimeout
  });

  if (!buildResult.success) {
    throw new Error(`Build failed: ${buildResult.error}`);
  }

  // Check if build output exists
  const buildExists = await checkFileExists(testConfig.outputDir);
  if (!buildExists) {
    throw new Error('Build output directory not found');
  }

  console.log('✅ Build process completed successfully\n');
  return true;
}

async function testSSRCompatibility() {
  console.log('🖥️  Testing SSR compatibility...');

  // Check for SSR-related files
  const ssrFiles = [
    'components/simulants/SSRSafeReadyPlayerMeSimulant.tsx',
    'components/simulants/SSRSafeAnimationTestControls.tsx',
    'utils/useSSRSafeAnimations.ts',
    'utils/dynamicThreeImports.ts'
  ];

  for (const file of ssrFiles) {
    const exists = await checkFileExists(file);
    if (!exists) {
      throw new Error(`SSR file not found: ${file}`);
    }
    console.log(`✅ Found SSR file: ${file}`);
  }

  console.log('✅ SSR compatibility files verified\n');
  return true;
}

async function testTypeScript() {
  console.log('📝 Testing TypeScript compilation...');

  const typeCheckResult = await runCommand('pnpm type-check');
  
  if (!typeCheckResult.success) {
    throw new Error(`TypeScript compilation failed: ${typeCheckResult.error}`);
  }

  console.log('✅ TypeScript compilation successful\n');
  return true;
}

async function testAnimationSystemImports() {
  console.log('📦 Testing animation system imports...');

  // Test that animation components can be imported without errors
  const testImports = `
    // Test SSR-safe imports
    const { useSSRSafeExternalAnimations } = require('./utils/useSSRSafeAnimations');
    const { createDynamicThreeComponent } = require('./utils/dynamicThreeImports');
    
    console.log('✅ Animation system imports successful');
  `;

  const testFile = path.join(__dirname, '../test-imports.js');
  
  try {
    fs.writeFileSync(testFile, testImports);
    await runCommand(`node ${testFile}`);
    fs.unlinkSync(testFile);
  } catch (error) {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    throw error;
  }

  console.log('✅ Animation system imports verified\n');
  return true;
}

async function testProductionStart() {
  console.log('🚀 Testing production server start...');

  // Start production server in background
  const serverProcess = require('child_process').spawn('pnpm', ['start'], {
    stdio: 'pipe',
    detached: true
  });

  // Wait for server to start
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Server start timeout'));
    }, 30000);

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started server')) {
        clearTimeout(timeout);
        serverProcess.kill();
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('error')) {
        clearTimeout(timeout);
        serverProcess.kill();
        reject(new Error(`Server error: ${error}`));
      }
    });
  });

  console.log('✅ Production server starts successfully\n');
  return true;
}

async function runTests() {
  const startTime = Date.now();
  
  try {
    console.log('🧪 Starting Next.js build and SSR compatibility tests\n');

    // Run all tests
    await testTypeScript();
    await testSSRCompatibility();
    await testAnimationSystemImports();
    await testBuildProcess();
    await testProductionStart();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('🎉 All tests passed!');
    console.log(`⏱️  Total time: ${duration}s\n`);
    
    console.log('📋 Test Summary:');
    console.log('  ✅ TypeScript compilation');
    console.log('  ✅ SSR compatibility files');
    console.log('  ✅ Animation system imports');
    console.log('  ✅ Next.js build process');
    console.log('  ✅ Production server start');
    
    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('\n❌ Tests failed!');
    console.error(`⏱️  Time elapsed: ${duration}s`);
    console.error(`🚨 Error: ${error.message}\n`);
    
    // Cleanup
    if (await checkFileExists(testConfig.outputDir)) {
      console.log('🧹 Cleaning up build artifacts...');
      await runCommand(`rm -rf ${testConfig.outputDir}`);
    }
    
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testBuildProcess,
  testSSRCompatibility,
  testTypeScript,
  testAnimationSystemImports,
  testProductionStart
};