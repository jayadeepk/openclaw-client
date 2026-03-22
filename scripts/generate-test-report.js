/**
 * Generates an HTML test report from Jest JSON output.
 * Usage: node scripts/generate-test-report.js test-results.json > tests/index.html
 */
const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { numPassedTests, numFailedTests, numTotalTests, numTotalTestSuites, testResults } = results;
const allPassed = numFailedTests === 0;
const duration = ((results.testResults.reduce((s, r) => s + (r.endTime - r.startTime), 0)) / 1000).toFixed(1);
const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const statusColor = allPassed ? '#4caf50' : '#f44336';
const statusText = allPassed ? 'All tests passed' : `${numFailedTests} test(s) failed`;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSuite(suite) {
  const relPath = path.relative(process.cwd(), suite.name);
  const tests = suite.assertionResults || [];
  const numPassing = tests.filter(t => t.status === 'passed').length;
  const numFailing = tests.filter(t => t.status === 'failed').length;
  const suitePassed = numFailing === 0;
  const icon = suitePassed ? '&#x2705;' : '&#x274C;';
  const time = ((suite.endTime - suite.startTime) / 1000).toFixed(2);

  let rows = '';
  for (const test of tests) {
    const passed = test.status === 'passed';
    const testIcon = passed ? '&#x2705;' : '&#x274C;';
    const ancestors = test.ancestorTitles.length ? test.ancestorTitles.join(' > ') + ' > ' : '';
    const failMsg = !passed && test.failureMessages.length
      ? `<pre class="fail-msg">${escapeHtml(test.failureMessages.join('\n'))}</pre>`
      : '';
    rows += `<tr class="${passed ? 'pass' : 'fail'}">
      <td>${testIcon}</td>
      <td>${escapeHtml(ancestors)}${escapeHtml(test.title)}${failMsg}</td>
      <td>${(test.duration || 0)}ms</td>
    </tr>`;
  }

  return `<div class="suite">
    <div class="suite-header" onclick="this.parentElement.classList.toggle('collapsed')">
      <span>${icon} <strong>${escapeHtml(relPath)}</strong></span>
      <span class="suite-meta">${numPassing}/${numPassing + numFailing} passed &middot; ${time}s</span>
    </div>
    <table class="tests">${rows}</table>
  </div>`;
}

const suiteHtml = testResults
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(renderSuite)
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Results - OpenClaw Client</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; padding: 24px; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; padding: 16px; background: #1a1a2e; border-radius: 8px; border-left: 4px solid ${statusColor}; }
  .summary .stat { display: flex; flex-direction: column; }
  .summary .stat .value { font-size: 1.4rem; font-weight: 700; }
  .summary .stat .label { font-size: 0.8rem; color: #888; text-transform: uppercase; }
  .status { color: ${statusColor}; font-weight: 600; font-size: 1.1rem; margin-bottom: 16px; }
  .suite { margin-bottom: 12px; background: #1a1a2e; border-radius: 8px; overflow: hidden; }
  .suite-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; user-select: none; }
  .suite-header:hover { background: #252540; }
  .suite-meta { color: #888; font-size: 0.85rem; }
  .suite.collapsed .tests { display: none; }
  table.tests { width: 100%; border-collapse: collapse; }
  table.tests tr { border-top: 1px solid #252540; }
  table.tests td { padding: 8px 16px; font-size: 0.9rem; }
  table.tests td:first-child { width: 30px; text-align: center; }
  table.tests td:last-child { width: 70px; text-align: right; color: #888; }
  tr.fail { background: #2a1520; }
  .fail-msg { margin-top: 8px; padding: 8px; background: #1a0a10; border-radius: 4px; font-size: 0.8rem; color: #ff6b6b; overflow-x: auto; white-space: pre-wrap; }
  .timestamp { color: #555; font-size: 0.8rem; margin-top: 24px; }
</style>
</head>
<body>
<h1>Test Results</h1>
<p class="status">${statusText}</p>
<div class="summary">
  <div class="stat"><span class="value">${numTotalTests}</span><span class="label">Tests</span></div>
  <div class="stat"><span class="value" style="color:#4caf50">${numPassedTests}</span><span class="label">Passed</span></div>
  <div class="stat"><span class="value" style="color:${numFailedTests ? '#f44336' : '#4caf50'}">${numFailedTests}</span><span class="label">Failed</span></div>
  <div class="stat"><span class="value">${numTotalTestSuites}</span><span class="label">Suites</span></div>
  <div class="stat"><span class="value">${duration}s</span><span class="label">Duration</span></div>
</div>
${suiteHtml}
<p class="timestamp">Generated ${timestamp}</p>
</body>
</html>`;

process.stdout.write(html);
