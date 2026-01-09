/**
 * Visual Regression Testing Utilities
 *
 * Export all utilities for use in test suites.
 */

// Fixture loading
export {
  loadFixture,
  fixtureToSceneNode,
  getFixturesInCategory,
  resetNodeIdCounter,
  type TestFixture,
  type FixtureNode,
  type FixtureFill,
  type FixtureStroke,
  type FixtureEffect,
  type FixtureTextProps,
  type FixtureAutoLayout,
} from './fixture-loader';

// Design rendering
export {
  renderFixtureToPNG,
  renderNodeToPNG,
  renderFixturesBatch,
  createBlankCanvas,
  initBrowser as initDesignBrowser,
  closeBrowser as closeDesignBrowser,
  type RenderOptions,
  type RenderResult,
} from './design-renderer';

// Pixel comparison
export {
  compareImages,
  compareForTest,
  generateDiffImage,
  createSideBySideImage,
  verifyAgainstBaseline,
  calculateSSIM,
  type ComparisonResult,
  type ComparisonOptions,
} from './pixel-comparator';

// Report generation
export {
  generateHTMLReport,
  generateReportFromSnapshots,
  saveReport,
  type TestResult,
  type TestReport,
} from './report-generator';

// Configuration
export { default as config, getEffectiveThreshold } from '../visual-regression.config';
