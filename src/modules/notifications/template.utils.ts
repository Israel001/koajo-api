const PLACEHOLDER_REGEX = /\{\{\s*\[?([a-zA-Z0-9_]+)\]?\s*\}\}/g;

export const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string | number>,
): string => {
  return template.replace(PLACEHOLDER_REGEX, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key]);
    }

    return '';
  });
};

export const stripHtml = (value: string): string => {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};
