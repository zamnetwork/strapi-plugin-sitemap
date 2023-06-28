'use strict';

const { get } = require('lodash');
/**
 * Pattern service.
 */

/**
 * Get all field names allowed in the URL of a given content type.
 *
 * @param {string} contentType - The content type.
 *
 * @returns {string} The fields.
 */
const getAllowedFields = async (contentType) => {
  const fields = [];
  strapi.config.get('plugin.sitemap.allowedFields').map((fieldType) => {
    Object.entries(contentType.attributes).map(([fieldName, field]) => {
      if ((field.type === fieldType || fieldName === fieldType)) {
        fields.push(fieldName);
      }
    });
  });

  // Add id field manually because it is not on the attributes object of a content type.
  if (strapi.config.get('plugin.sitemap.allowedFields').includes('id')) {
    fields.push('id');
  }

  return fields;
};

/**
 * Get all fields from a pattern.
 *
 * @param {string} pattern - The pattern.
 *
 * @returns {array} The fields.
 */
const getFieldsFromPattern = (pattern) => {
  let fields = pattern.match(/[[\w\d\\.]+]/g); // Get all substrings between [] as array.
  if (fields) fields = fields.map((field) => RegExp(/(?<=\[)(.*?)(?=\])/).exec(field)[0]); // Strip [] from string.
  return fields;
};

/**
 * Resolve a pattern string from pattern to path for a single entity.
 *
 * @param {string} pattern - The pattern.
 * @param {object} entity - The entity.
 *
 * @returns {string} The path.
 */
const resolvePattern = (pattern, entity) => {
  const fields = getFieldsFromPattern(pattern);
  if (fields) {
    fields.map((field) => {
      pattern = pattern.replace(`[${field}]`, get(entity, field, ''));
    });

    pattern = pattern.replace(/([^:]\/)\/+/g, "$1"); // Remove duplicate forward slashes.
    pattern = pattern.startsWith('/') ? pattern : `/${pattern}`; // Add a starting slash.
  }
  return pattern;
};

/**
 * Validate if a pattern is correctly structured.
 *
 * @param {string} pattern - The pattern.
 * @param {array} allowedFieldNames - Fields allowed in this pattern.
 *
 * @returns {object} object.
 * @returns {boolean} object.valid Validation boolean.
 * @returns {string} object.message Validation string.
 */
const validatePattern = async (pattern, allowedFieldNames) => {
  if (!pattern) {
    return {
      valid: false,
      message: "Pattern can not be empty",
    };
  }

  const preCharCount = pattern.split("[").length - 1;
  const postCharount = pattern.split("]").length - 1;

  if (preCharCount < 1 || postCharount < 1) {
    return {
      valid: false,
      message: "Pattern should contain at least one field",
    };
  }

  if (preCharCount !== postCharount) {
    return {
      valid: false,
      message: "Fields in the pattern are not escaped correctly",
    };
  }

  let fieldsAreAllowed = true;
  getFieldsFromPattern(pattern).map((field) => {
    if (field.includes('.')) {
      field.split('.').map((part) => {
        if (Number.isNaN(part) && !allowedFieldNames.includes(part)) fieldsAreAllowed = false;
      });
    } else if (!allowedFieldNames.includes(field)) fieldsAreAllowed = false;
  });

  if (!fieldsAreAllowed) {
    return {
      valid: false,
      message: "Pattern contains forbidden fields",
    };
  }

  return {
    valid: true,
    message: "Valid pattern",
  };
};

module.exports = () => ({
  getAllowedFields,
  getFieldsFromPattern,
  resolvePattern,
  validatePattern,
});
