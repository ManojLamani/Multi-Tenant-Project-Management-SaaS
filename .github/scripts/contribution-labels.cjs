function contributionLabels({ title = '', body = '', files = [] }) {
    const labels = new Set();
    const types = [
        ['bug', /^fix(?:\([^)]*\))?!?:|^\[bug\]/i, /^\s*-\s*\[[xX]\]\s*Bug fix\b/m],
        ['enhancement', /^feat(?:\([^)]*\))?!?:|^\[feature\]/i, /^\s*-\s*\[[xX]\]\s*New feature\b/m],
        ['documentation', /^docs(?:\([^)]*\))?!?:/i, /^\s*-\s*\[[xX]\]\s*Documentation\b/m],
        ['testing', /^(?:test|ci)(?:\([^)]*\))?!?:/i, /^\s*-\s*\[[xX]\]\s*Tests or CI\b/m],
    ];
    // Only inspect the template's type section; quoted checkboxes elsewhere are not declarations.
    const typeSection = body.match(/^## Type\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] || '';
    for (const [label, titlePattern, checkedPattern] of types) {
        if (titlePattern.test(title) || checkedPattern.test(typeSection)) labels.add(label);
    }
    const rules = [
        ['backend', /^backend\//],
        ['frontend', /^frontend\//],
        ['database', /^backend\/src\/(?:models\/|config\/db\.js|utils\/activity\.js)|^compose\.ya?ml$/],
        ['testing', /(?:^|\/)(?:test|tests|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/],
        ['ci', /^\.github\/workflows\//],
        ['automation', /^\.github\/(?:workflows|scripts)\//],
        ['documentation', /(?:^|\/)[^/]+\.md$/i],
        ['configuration', /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.nvmrc|compose\.ya?ml|[^/]*config\.[cm]?[jt]s)$|^backend\/src\/config\//],
        ['authentication', /^backend\/src\/(?:controllers\/authController|routes\/authRoutes|config\/auth)\.js$/],
        ['authorization', /^backend\/src\/(?:middleware\/authMiddleware|controllers\/userController|routes\/(?:userRoutes|projectRoutes|taskRoutes))\.js$/],
        ['ui/ux', /^frontend\/src\/(?:components|pages)\//],
        ['dependencies', /(?:^|\/)package(?:-lock)?\.json$/],
    ];
    for (const [label, pattern] of rules) if (files.some(file => pattern.test(file))) labels.add(label);
    if (/\b(security|secure|password|jwt|isolation|permissions?|authorization)\b/i.test(title)) labels.add('security');
    if (/\b(tenant|tenancy)\b|workspace (?:boundaries|isolation)/i.test(title)) labels.add('multi-tenancy');
    if (/\b(accessibility|accessible|keyboard)\b/i.test(title)) labels.add('accessibility');
    if (/\b(performance|indexing|optimi[sz](?:e|ation))\b/i.test(title)) labels.add('performance');
    return [...labels].sort();
}

module.exports = { contributionLabels };
