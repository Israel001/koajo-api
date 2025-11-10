import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';

export const createValidationExceptionFactory =
  () =>
  (errors: ValidationError[]): BadRequestException => {
    const messages = flattenValidationErrors(errors);
    return new BadRequestException(messages.length ? messages : undefined);
  };

const flattenValidationErrors = (
  errors: ValidationError[],
  parentPath = '',
  parentTarget?: object,
): string[] => {
  const result: string[] = [];
  for (const error of errors) {
    const displayName = getDisplayPropertyName(
      error,
      parentTarget ?? (error.target as object | undefined),
    );
    const fullPath = parentPath
      ? `${parentPath}.${displayName}`
      : displayName;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push(
          replacePropertyName(message, error.property, fullPath),
        );
      }
    }

    if (error.children && error.children.length) {
      result.push(
        ...flattenValidationErrors(
          error.children,
          fullPath,
          (error.target as object | undefined) ?? parentTarget,
        ),
      );
    }
  }
  return result;
};

const getDisplayPropertyName = (
  error: ValidationError,
  target?: object,
): string => {
  if (!target || !error.property) {
    return error.property ?? '';
  }

  const metadata = defaultMetadataStorage.findExposeMetadata(
    target.constructor,
    error.property,
  );

  const exposedName = metadata?.options?.name;
  return exposedName ?? error.property;
};

const replacePropertyName = (
  message: string,
  original: string | undefined,
  replacement: string,
): string => {
  if (!original || !replacement || original === replacement) {
    return message;
  }

  const pattern = new RegExp(escapeRegExp(original), 'g');
  return message.replace(pattern, replacement);
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
