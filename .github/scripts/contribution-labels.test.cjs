const { test } = require('node:test');
const assert = require('node:assert/strict');
const { contributionLabels } = require('./contribution-labels.cjs');

test('fixes receive type and relevant backend/security areas', () => {
    assert.deepEqual(contributionLabels({ title: 'fix(auth): redact password hashes', files: ['backend/src/controllers/authController.js', 'backend/test/auth.test.js'] }), ['authentication', 'backend', 'bug', 'security', 'testing']);
});
test('features classify frontend and database changes without inventing bug labels', () => {
    assert.deepEqual(contributionLabels({ title: 'feat: task planning', files: ['frontend/src/components/TaskForm.jsx', 'backend/src/models/Task.js'] }), ['backend', 'database', 'enhancement', 'frontend', 'ui/ux']);
});
test('a contribution can declare both a feature and a bug fix', () => {
    const labels = contributionLabels({ body: '## Type\n- [x] Bug fix\n- [x] New feature\n- [ ] Documentation\n\n## Validation\nTests pass' });
    assert.deepEqual(labels, ['bug', 'enhancement']);
});
test('unchecked or quoted type options outside the type section do not classify work', () => {
    assert.deepEqual(contributionLabels({ body: '## Type\n- [ ] Bug fix\n## Example\n- [x] New feature\n' }), []);
});
test('workflow and dependency changes receive their own labels', () => {
    assert.deepEqual(contributionLabels({ title: 'ci: improve checks', files: ['.github/workflows/quality.yml', 'backend/package-lock.json'] }), ['automation', 'backend', 'ci', 'dependencies', 'testing']);
});
test('malicious-looking titles remain data and labels are deduplicated', () => {
    assert.deepEqual(contributionLabels({ title: '$(process.exit(1))', files: ['frontend/src/pages/Login.jsx', 'frontend/src/pages/Login.jsx'] }), ['frontend', 'ui/ux']);
});
test('issue form title prefixes classify bug reports and feature requests', () => {
    assert.deepEqual(contributionLabels({ title: '[Bug] Cannot open project' }), ['bug']);
    assert.deepEqual(contributionLabels({ title: '[Feature] Add a calendar' }), ['enhancement']);
});
