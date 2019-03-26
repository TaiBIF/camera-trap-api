const config = require('config');
const format = require('string-template');

const ERROR_MESSAGE_REQUIRED = 'This field is required.';
const ERROR_MESSAGE_REGEXP = 'The value is not match the pattern {0}.';
const ERROR_MESSAGE_ID = 'The value should be a id.';
const ERROR_MESSAGE_EMAIL = 'The value should be a email.';
const ERROR_MESSAGE_ANY_OF = 'The value should be {0}.';
const ERROR_MESSAGE_LENGTH =
  'The length of the string should between {0} and {1}.';
const ERROR_MESSAGE_BYTE_LENGTH =
  'The length of the value should between {0} and {1} in byte.';
const ERROR_MESSAGE_MISSING_LANGUAGES = 'Missing some languages.';
const ERROR_MESSAGE_MISSING_LANGUAGE = 'Missing language {0}.';
const ERROR_MESSGAE_SHOULD_BE_OBJECT = 'This field should be an object.';

class Form {
  constructor(args = {}) {
    Object.keys(this.constructor._fields).forEach(fieldName => {
      const field = this.constructor._fields[fieldName];
      this[fieldName] = field.readValue(args[fieldName]);
    });
  }

  static define(fields = {}) {
    this._fields = {};
    Object.keys(fields).forEach(fieldName => {
      this._fields[fieldName] = fields[fieldName];
    });
  }

  validate(isReturnObject) {
    const errors = {};
    const fieldNames = Object.keys(this.constructor._fields);
    for (let fieldIndex = 0; fieldIndex < fieldNames.length; fieldIndex += 1) {
      const fieldName = fieldNames[fieldIndex];
      const field = this.constructor._fields[fieldName];
      // if the field is required we should let 0 pass
      if (
        field.required &&
        (this[fieldName] === '' || this[fieldName] == null)
      ) {
        errors[fieldName] = ERROR_MESSAGE_REQUIRED;
      } else if (
        !field.required &&
        (this[fieldName] === '' || this[fieldName] == null)
      ) {
        // Don't validate for null.
      } else {
        field.validators.forEach(validator => {
          const result = validator(this[fieldName]);
          if (result != null) {
            errors[fieldName] = result;
          }
        });
      }
    }
    if (isReturnObject) {
      return errors;
    }
    const errorFieldNames = Object.keys(errors);
    if (!errorFieldNames.length) {
      return;
    }
    return errorFieldNames
      .map(errorFieldName => `${errorFieldName}: ${errors[errorFieldName]}`)
      .join('\n');
  }
}

class Field {
  constructor(args = {}) {
    /*
    @param args {Object}
      required: {bool|null} The default is false.
      filter: {function|null} This filter will be called when the form initial with data.
        ex: const form = new LoginForm(req.body); <-- execute at this time.
      validators: {Array<function>} The validator should return null or the error message.
     */
    this.required = args.required || false;
    this.filter = args.filter || (x => x);
    this.validators = args.validators || [];
  }

  readValue(value) {
    return this.filter(value);
  }
}

class StringField extends Field {
  readValue(value) {
    let result;
    try {
      result = value != null ? value.toString().trim() : undefined;
    } catch (error) {
      result = undefined;
    }
    return this.filter(result);
  }
}

class BooleanField extends Field {
  /*
  '1', 'true' will convert to true.
  '0', 'false' will convert to false.
   */
  readValue(value) {
    let result;
    if (value != null) {
      if (typeof value === 'string') {
        if (value === '') {
          // result = undefined;
        } else if (['1', 'true'].indexOf(value) >= 0) {
          result = true;
        } else if (['0', 'false'].indexOf(value) >= 0) {
          result = false;
        } else {
          result = Boolean(value);
        }
      } else {
        result = Boolean(value);
      }
    }
    return this.filter(result);
  }
}

class IntegerField extends Field {
  readValue(value) {
    let result;
    try {
      result = value != null ? parseInt(value, 10) : undefined;
      if (Number.isNaN(result)) {
        result = undefined;
      }
    } catch (error) {
      result = undefined;
    }
    return this.filter(result);
  }
}

class FloatField extends Field {
  readValue(value) {
    let result;
    try {
      result = value != null ? parseFloat(value) : undefined;
      if (Number.isNaN(result)) {
        result = undefined;
      }
    } catch (error) {
      result = undefined;
    }
    return this.filter(result);
  }
}

class DateField extends Field {
  readValue(value) {
    let result;
    try {
      if (value != null) {
        result = new Date(value);
        if (Number.isNaN(result.getTime())) {
          result = undefined;
        }
      }
    } catch (error) {
      result = undefined;
    }
    return this.filter(result);
  }
}

class MultiLanguageField extends Field {
  constructor(args) {
    /*
    @param args {Object}
      required: {bool|null} The default is false.
      filter: {function|null} This filter will be called when the form initial with data.
        ex: const form = new LoginForm(req.body); <-- execute at this time.
      validators: {Array<function>} The validator should return null or the error message.
      subField: {Field} The instance of Field.
     */
    super(args);
    this.subField = args.subField;
    this.validators.push(values => {
      const result = [];
      if (typeof values !== 'object') {
        return ERROR_MESSGAE_SHOULD_BE_OBJECT;
      }
      const systemLanguageCodes = Object.keys(config.languages);
      if (Object.keys(values).length !== systemLanguageCodes.length) {
        return ERROR_MESSAGE_MISSING_LANGUAGES;
      }
      for (let index = 0; index < systemLanguageCodes.length; index += 1) {
        const languageCode = systemLanguageCodes[index];
        if (!(languageCode in values)) {
          return format(ERROR_MESSAGE_MISSING_LANGUAGE, languageCode);
        }
        this.subField.validators.forEach(validator => {
          // if the field is required we should let 0 pass
          if (
            this.subField.required &&
            (values[languageCode] === '' || values[languageCode] == null)
          ) {
            result.push(`${languageCode}: ${ERROR_MESSAGE_REQUIRED}`);
          } else if (
            !this.subField.required &&
            (values[languageCode] === '' || values[languageCode] == null)
          ) {
            // Don't validate for null.
          } else {
            const message = validator(values[languageCode]);
            if (message != null) {
              result.push(message);
            }
          }
        });
      }
      if (result.length) {
        return result.join('\n');
      }
    });
  }

  readValue(values = {}) {
    const result = {};
    const languageCodes = Object.keys(
      typeof values === 'object' ? values || {} : {},
    );
    if (languageCodes.length <= 0) {
      return this.filter(undefined);
    }
    languageCodes.forEach(languageCode => {
      result[languageCode] = this.subField.filter(
        this.subField.readValue(values[languageCode]),
      );
    });
    return this.filter(result);
  }
}

const validators = {
  regexp: (pattern, errorMessage = ERROR_MESSAGE_REGEXP) => {
    let regexp;
    if (pattern instanceof RegExp) {
      regexp = pattern;
    } else {
      regexp = new RegExp(pattern);
    }
    return value =>
      regexp.test(value) ? null : format(errorMessage, regexp.toString());
  },
  id: (errorMessage = ERROR_MESSAGE_ID) => {
    const regexp = /^[a-f\d]{24}$/;
    return value => (regexp.test(value) ? null : errorMessage);
  },
  email: (errorMessage = ERROR_MESSAGE_EMAIL) => {
    const regexp = /^.+@[^.].*\.[a-z]{2,10}$/;
    return value => (regexp.test(value) ? null : errorMessage);
  },
  anyOf: (options = [], errorMessage = ERROR_MESSAGE_ANY_OF) => value =>
    options.indexOf(value) >= 0
      ? null
      : format(errorMessage, [options.join(', ')]),
  length: (options = {}, errorMessage = ERROR_MESSAGE_LENGTH) =>
    /*
    Validate the string length.
    @param options {Object}
      min: {Number}
      max: {Number}
     */
    (value = '') => {
      const message = format(errorMessage, [
        options.min || '0',
        options.max || 'unlimited',
      ]);
      if (options.max != null && value.length > options.max) {
        return message;
      }
      if (options.min != null && value.length < options.min) {
        return message;
      }
    },
  byteLength: (options = {}, errorMessage = ERROR_MESSAGE_BYTE_LENGTH) =>
    /*
    The length validator in byte.
    @param options {Object}
      min: {Number}
      max: {Number}
     */
    value => {
      const length = Buffer.byteLength(value);
      const message = format(errorMessage, [
        options.min || '0',
        options.max || 'unlimited',
      ]);
      if (options.max != null && length > options.max) {
        return message;
      }
      if (options.min != null && length < options.min) {
        return message;
      }
    },
};

const filters = {
  integer: defaultValue => value => {
    /*
    Get the integer filter function.
    The filter function will return integer for any input.
    @param defaultValue {Number}
    @return {function}
     */
    if (value == null) {
      return defaultValue;
    }
    let result;
    try {
      result = parseInt(value, 10);
    } catch (error) {
      result = defaultValue;
    }
    if (Number.isNaN(result)) {
      return defaultValue;
    }
    return result;
  },
};

module.exports = {
  constants: {
    PAGE_SIZE_MAXIMUM: 100,
  },
  Form,
  validators,
  filters,
  fields: {
    Field,
    StringField,
    BooleanField,
    IntegerField,
    FloatField,
    DateField,
    MultiLanguageField,
  },
};
