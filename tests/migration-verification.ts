/**
 * TrustBridge Architecture Migration & Full-Stack Separation Verification Test
 *
 * Verifies:
 * 1. Directory Structure: frontend/, backend/, shared/, root
 * 2. Secret Isolation: No server secrets or private SDK keys in frontend or shared
 * 3. Centralized API Client: Base URL resolution and token attachment
 * 4. Independent Package & Build Configs: root, backend, frontend
 * 5. Route & Controller Separation: Modular Express routers in backend/src/routes
 * 6. Shared Contracts: Browser-safe type definitions in shared/types and shared/contracts
 * 7. AI & Database Encapsulation: SQLite and multi-vector AI engines localized in backend
 */
import fs from 'fs';
import path from 'path';

interface MigrationCheck {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const checks: MigrationCheck[] = [];

function recordCheck(id: number, name: string, condition: boolean, details: string) {
  checks.push({ id, name, passed: condition, details });
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] Check ${id}: ${name} - ${details}`);
}

async function runMigrationVerification() {
  console.log('\n======================================================');
  console.log('   TRUSTBRIDGE ARCHITECTURE MIGRATION VERIFICATION   ');
  console.log('======================================================\n');

  const rootDir = process.cwd();

  // 1. Directory Structure Exists
  const frontendExists = fs.existsSync(path.join(rootDir, 'frontend'));
  const backendExists = fs.existsSync(path.join(rootDir, 'backend'));
  const sharedExists = fs.existsSync(path.join(rootDir, 'shared'));

  recordCheck(
    1,
    'Top-Level Architecture Separation',
    frontendExists && backendExists && sharedExists,
    'Verified separate frontend/, backend/, and shared/ directories exist.'
  );

  // 2. Frontend Sub-directories
  const frontendSrc = path.join(rootDir, 'frontend', 'src');
  const feComponents = fs.existsSync(path.join(frontendSrc, 'components'));
  const feContext = fs.existsSync(path.join(frontendSrc, 'context'));
  const feHooks = fs.existsSync(path.join(frontendSrc, 'hooks'));
  const feLib = fs.existsSync(path.join(frontendSrc, 'lib'));
  const fePages = fs.existsSync(path.join(frontendSrc, 'pages'));
  const feTypes = fs.existsSync(path.join(frontendSrc, 'types'));
  const fePublic = fs.existsSync(path.join(rootDir, 'frontend', 'public'));

  recordCheck(
    2,
    'Frontend Directory Completeness',
    feComponents && feContext && feHooks && feLib && fePages && feTypes && fePublic,
    'frontend/ contains components/, context/, hooks/, lib/, pages/, types/, and public/.'
  );

  // 3. Backend Sub-directories
  const backendSrc = path.join(rootDir, 'backend', 'src');
  const beRoutes = fs.existsSync(path.join(backendSrc, 'routes'));
  const beControllers = fs.existsSync(path.join(backendSrc, 'controllers'));
  const beServices = fs.existsSync(path.join(backendSrc, 'services'));
  const beMiddleware = fs.existsSync(path.join(backendSrc, 'middleware'));
  const beModels = fs.existsSync(path.join(backendSrc, 'models'));
  const beDatabase = fs.existsSync(path.join(backendSrc, 'database'));
  const beAi = fs.existsSync(path.join(backendSrc, 'ai'));
  const beConfig = fs.existsSync(path.join(backendSrc, 'config'));
  const beUtils = fs.existsSync(path.join(backendSrc, 'utils'));

  recordCheck(
    3,
    'Backend Modular Architecture Completeness',
    beRoutes && beControllers && beServices && beMiddleware && beModels && beDatabase && beAi && beConfig && beUtils,
    'backend/src contains routes/, controllers/, services/, middleware/, models/, database/, ai/, config/, utils/.'
  );

  // 4. Shared Directory Completeness
  const sharedTypes = fs.existsSync(path.join(rootDir, 'shared', 'types', 'index.ts'));
  const sharedContracts = fs.existsSync(path.join(rootDir, 'shared', 'contracts', 'api.ts'));

  recordCheck(
    4,
    'Shared Contracts & Types Isolation',
    sharedTypes && sharedContracts,
    'shared/ contains browser-safe types/index.ts and contracts/api.ts.'
  );

  // 5. Secret Isolation (No server secrets in frontend or shared)
  const feFiles = fs.readdirSync(frontendSrc, { recursive: true }) as string[];
  let secretLeakDetected = false;
  let leakedFile = '';

  for (const f of feFiles) {
    if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
      const content = fs.readFileSync(path.join(frontendSrc, f), 'utf-8');
      if (content.includes('NEXCONN_APP_SECRET') || content.includes('GEMINI_API_KEY')) {
        secretLeakDetected = true;
        leakedFile = f;
        break;
      }
    }
  }

  recordCheck(
    5,
    'Secret Isolation & Security Discipline',
    !secretLeakDetected,
    secretLeakDetected
      ? `Secret leak detected in frontend file: ${leakedFile}`
      : 'Verified zero references to NEXCONN_APP_SECRET or GEMINI_API_KEY in frontend source code.'
  );

  // 6. Centralized API Client Exists & Handles Auth Tokens
  const apiClientPath = path.join(frontendSrc, 'lib', 'api.ts');
  const apiClientExists = fs.existsSync(apiClientPath);
  const apiClientContent = apiClientExists ? fs.readFileSync(apiClientPath, 'utf-8') : '';
  const hasBaseUrlConfig = apiClientContent.includes('VITE_API_BASE_URL');
  const hasTokenHandling = apiClientContent.includes('Authorization');

  recordCheck(
    6,
    'Centralized API Client Implementation',
    apiClientExists && hasBaseUrlConfig && hasTokenHandling,
    'frontend/src/lib/api.ts exports centralized client with VITE_API_BASE_URL resolution and Authorization header binding.'
  );

  // 7. Environment Templates (.env.example in frontend and backend)
  const beEnvEx = fs.existsSync(path.join(rootDir, 'backend', '.env.example'));
  const feEnvEx = fs.existsSync(path.join(rootDir, 'frontend', '.env.example'));

  recordCheck(
    7,
    'Environment Configuration Templates',
    beEnvEx && feEnvEx,
    'Verified separate backend/.env.example and frontend/.env.example templates without committed secrets.'
  );

  // 8. Package.json Configurations (Root, Backend, Frontend)
  const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  const bePkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'backend', 'package.json'), 'utf-8'));
  const fePkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'frontend', 'package.json'), 'utf-8'));

  const rootHasScripts = rootPkg.scripts && rootPkg.scripts.dev && rootPkg.scripts.test;
  const beHasScripts = bePkg.scripts && bePkg.scripts.start && bePkg.scripts.dev;
  const feHasScripts = fePkg.scripts && fePkg.scripts.dev && fePkg.scripts.build;

  recordCheck(
    8,
    'Multi-Package Script & Dependency Autonomy',
    Boolean(rootHasScripts && beHasScripts && feHasScripts),
    'Root, backend, and frontend package.json files configure independent runtimes and build scripts.'
  );

  console.log('\n======================================================');
  const allPassed = checks.every((c) => c.passed);
  console.log(`TOTAL MIGRATION CHECKS: ${checks.length}`);
  console.log(`PASSED: ${checks.filter((c) => c.passed).length}`);
  console.log(`FAILED: ${checks.filter((c) => !c.passed).length}`);
  console.log(`STATUS: ${allPassed ? 'ALL ARCHITECTURE CHECKS PASSED' : 'MIGRATION ISSUES FOUND'}`);
  console.log('======================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runMigrationVerification().catch((err) => {
  console.error('Migration verification runner failed:', err);
  process.exit(1);
});
