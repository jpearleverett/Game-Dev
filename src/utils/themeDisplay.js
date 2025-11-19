export function formatCaseOutlierThemes(caseData, { separator = ' • ' } = {}) {
  if (!caseData) {
    return null;
  }
  const branchingThemes = Array.isArray(caseData.branchingOutlierThemes)
    ? caseData.branchingOutlierThemes
        .map((theme) => {
          if (!theme) return null;
          const key = theme.optionKey || theme.key || null;
          const name = theme.name || (key ? `Path ${key}` : null);
          const icon = theme.icon || null;
          if (!name && !icon) return null;
          const prefix = icon ? `${icon} ` : '';
          return `${prefix}${name || ''}`.trim();
        })
        .filter(Boolean)
    : [];
  if (branchingThemes.length > 0) {
    return branchingThemes.join(separator);
  }
  if (caseData.outlierTheme?.name) {
    const icon = caseData.outlierTheme.icon ? `${caseData.outlierTheme.icon} ` : '';
    return `${icon}${caseData.outlierTheme.name}`.trim();
  }
  return null;
}
