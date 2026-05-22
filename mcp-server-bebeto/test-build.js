#!/usr/bin/env node

/**
 * Test script to verify MCP Server "Bebeto" build integrity
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 MCP Server "Bebeto" - Build Verification Test\n');

// Check 1: Verify all files exist
console.log('✅ Check 1: Verify source files exist');
const sourceFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/clients/flashalpha-client.js',
  'dist/clients/theta-data-client.js',
  'dist/utils/types.js',
];

let allFilesExist = true;
sourceFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.error('\n❌ Some files are missing. Build may have failed.');
  process.exit(1);
}

// Check 2: Verify package.json
console.log('\n✅ Check 2: Verify package.json configuration');
const pkg = require('./package.json');
console.log(`   Package: ${pkg.name} v${pkg.version}`);
console.log(`   Description: ${pkg.description}`);
console.log(`   Main: ${pkg.main}`);
console.log(`   Build script: ${pkg.scripts.build}`);
console.log(`   Dependencies: ${Object.keys(pkg.dependencies).length} packages`);

// Check 3: Verify environment setup
console.log('\n✅ Check 3: Verify environment setup');
const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
const requiredVars = ['FLASHALPHA_API_KEY', 'FLASHALPHA_BASE_URL', 'THETA_DATA_API_KEY', 'THETA_DATA_BASE_URL'];
const hasAllVars = requiredVars.every(v => envExample.includes(v));
console.log(`   .env.example: ${hasAllVars ? '✓' : '✗'}`);
if (hasAllVars) {
  console.log(`   Required variables: ${requiredVars.join(', ')}`);
}

// Check 4: Verify documentation
console.log('\n✅ Check 4: Verify documentation');
const readmeExists = fs.existsSync(path.join(__dirname, 'README.md'));
const readmeSize = readmeExists ? fs.statSync(path.join(__dirname, 'README.md')).size : 0;
console.log(`   README.md: ${readmeExists ? '✓' : '✗'} (${readmeSize} bytes)`);

// Check 5: Verify compiled size
console.log('\n✅ Check 5: Verify compiled output size');
const distDir = path.join(__dirname, 'dist');
let totalSize = 0;

function getDirectorySize(dir) {
  const files = fs.readdirSync(dir);
  let size = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  });

  return size;
}

totalSize = getDirectorySize(distDir);
const sizeInKB = (totalSize / 1024).toFixed(2);
console.log(`   Total compiled size: ${sizeInKB} KB`);
console.log(`   Main bundle: ${(fs.statSync(path.join(distDir, 'index.js')).size / 1024).toFixed(2)} KB`);

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ BUILD VERIFICATION COMPLETE\n');
console.log('Next steps:');
console.log('1. Copy .env.example to .env');
console.log('2. Add your FlashAlpha API key');
console.log('3. Add your Theta Data API key');
console.log('4. Run: npm run dev (for development)');
console.log('5. Or run: npm start (for production)');
console.log('\nServer will listen on stdio transport (for MCP clients)');
console.log('='.repeat(50));
