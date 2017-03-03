'use strict';

// Imports
const annotations = require('annotations');
const path = require('path');
const _ = require('lodash');

// Exports
exports.require = requireModule;
exports.addValidator = addValidator;
exports.setErrorHandler = setErrorHandler;
// Exported for test purposes
exports.createHandlerForModule = createHandlerForModule;
exports.createValidatorsForFunction = createValidatorsForFunction;
exports.coalesceParams = coalesceParams;
exports.parseDocblockParam = parseDocblockParam;

// Module constants
const dbParamRegExp = /\{([a-zA-Z0-9]+)\}\s+\[([a-zA-Z0-9\.]+)\]\s*([\w\s]+)?/;
const defaultErrorHandler = function(functionName, paramName, expectedType, value, desc) {
  throw new Error(`function ${functionName} - invalid argument type for ${paramName}, expected ${expectedType} got ${value}`);
};
let errorHandler = defaultErrorHandler;     // Set default error handler
const typeValidators = {                    // Validator map
  Array:    (arg) => Array.isArray(arg),
  String:   (arg) => typeof arg === 'string',
  Object:   (arg) => typeof arg === 'object',
  Number:   (arg) => !isNaN(parseFloat(arg)) && isFinite(arg),
  Integer:  (arg) => !isNaN(parseInt(arg, 10)) && isFinite(arg),
  Function: (arg) => typeof arg === 'function'
};                  

/**
 * Set a custom error handler function
 *
 * @param {Function} [fn] Error handler function
 */
function setErrorHandler(fn) {
  if (typeof fn !== 'function') {
    throw new Error('Error handler must be a function');
  }

  errorHandler = fn;
}

/**
 * Add an error handler function
 *
 * @param {Function} [type]      Parameter type, e.g. Array, String
 * @param {Function} [validator] Validation function - parameters: arg
 */
function addValidator(type, validator) {
  typeValidators[type] = validator.bind(null);
}

/**
 * Require a module
 *
 * @param {String} [filepath] Path to module to require
 * @param {Object} [mdl]      Module object
 */
function requireModule(filepath, mdl) {
  if (!filepath) {
    throw new Error('Filepath not defined');
  }
  if (!mdl) {
    throw new Error('Module not defined');
  }
  
  // Require module
  const userModule  = mdl.require(filepath);
  const userModulePath = filepath[0] === '/' ? filepath : path.join(path.dirname(mdl.id), filepath);
  const userModuleFile = require.resolve(userModulePath);

  // Construct handler
  const handler = createHandlerForModule(userModule, userModuleFile);

  // Return proxied module
  return new Proxy(userModule, handler);
}

/**
 * Creates a handler object for creating a proxy
 *
 * @private
 * @param {Object} [userModule]     A require'd user module
 * @param {String} [userModulePath] The path to the user module
 */
function createHandlerForModule(userModule, userModulePath) {
  const moduleAnnotations = annotations.getSync(userModulePath);
  const validators = Object.keys(userModule).reduce(createValidatorsForFunction.bind(null, userModule, moduleAnnotations), {});

  return {
    get: function(target, property, receiver) {
      return function() {
        const argsArray = Array.prototype.slice.call(arguments);
        if (validators[property]) {
          validators[property](argsArray);
        }

        if (!target[property] || typeof target[property] !== 'function') {
          throw new Error(`Method ${property} not defined or not a function`);
        }
        
        return target[property].apply(null, argsArray);
      };
    }
  };
}

/**
 * Creates a validator function for a module function - to be called from reduce 
 *
 * @private
 * @param {Object} [userModule]        A require'd user module
 * @param {Object} [moduleAnnotations] The path to the user module
 * @param {Object} [validators]        Output validator object
 * @param {String} [fname]             Function name
 */
function createValidatorsForFunction(userModule, moduleAnnotations, validators, fname) {
  if (!moduleAnnotations[fname] || !moduleAnnotations[fname].param) {
    return validators;
  }
  
  // Parse parameter docblock
  const annotationParams = Array.isArray(moduleAnnotations[fname].param) ? 
    moduleAnnotations[fname].param : [moduleAnnotations[fname].param];
  const params = coalesceParams(annotationParams.map(parseDocblockParam));
  const paramIndices = Object.keys(params);

  // Create validators
  validators[fname] = function(argsArray) {
    for (let i = 0; i < argsArray.length; i++) {
      const arg = argsArray[i];

      // Top-level arguments
      if (params[paramIndices[i]]) {
        if ( params[paramIndices[i]].type &&                        
             typeValidators[params[paramIndices[i]].type] && 
            !typeValidators[params[paramIndices[i]].type](arg)) {
          // Call error handler
          errorHandler(fname, paramIndices[i], params[paramIndices[i]].type, arg, params[paramIndices[i]].desc);
        }
        
        // Sub-level arguments, i.e. object properties
        if (params[paramIndices[i]].properties) {
          for (let j = 0; j < params[paramIndices[i]].properties.length; j++) {
            const propertyParam = params[paramIndices[i]].properties[j];
            const value = propertyParam.depth < 3 ? arg[propertyParam.property] : _.at(arg, propertyParam.property)[0];

            if ( typeValidators[propertyParam.type] && 
                !typeValidators[propertyParam.type](value)) {
              // Call error handler
              errorHandler(fname, `${propertyParam.name}.${propertyParam.property}` , propertyParam.type, value, propertyParam.desc);
            }
          }
        }
      }
    }
  };

  return validators;
}

/**
 * Collapses deeper parameters into their main parameter
 *
 * @private
 * @param {Array}  [paramsArray] Array of parameters
 */
function coalesceParams(paramsArray) {
  return paramsArray.reduce((out, param, index) => {
    if (!param) {
      return out;
    }

    if (param.property) {
      // Skip if parent is not defined yet
      if (out[param.name]) {
        out[param.name].properties = out[param.name].properties || [];
        out[param.name].properties.push(param);
      }
    } else {
      if (out[param.name]) {
        throw new Error(`Duplicate parameter definition for ${param.name}`);
      }
      out[param.name] = param;
    }

    return out;
  }, {});
}

/**
 * Parses a docblock param line into constituent parts
 *
 * @private
 * @param {String}  [input] Docblock param line
 */
function parseDocblockParam(input) {
  const match = dbParamRegExp.exec(input);

  if (match) {
    const nameElements = match[2].split('.');
    return {
      type: match[1],
      name: nameElements[0],
      property: nameElements.length > 1 ? nameElements.slice(1).join('.') : false,
      depth: nameElements.length,
      desc: match[3] && match[3].trim() || ''
    };
  }

  return false;
}
