'use strict';

const annotations = require('annotations');
const path = require('path');
const _ = require('lodash');

exports.require = requireModule;
exports.addValidator = addValidator;
exports.setErrorHandler = setErrorHandler;
// Exported for test purposes
exports.createHandlerForModule = createHandlerForModule;
exports.createValidatorsForFunction = createValidatorsForFunction;
exports.coalesceParams = coalesceParams;
exports.parseDocblockParam = parseDocblockParam;

// Error handler
let errorHandler = function(functionName, paramName, expectedType, value, desc) {
  throw new Error(`function ${functionName} - invalid argument type for ${paramName}, expected ${expectedType}`);
};
function setErrorHandler(fn) {
  if (typeof fn !== 'function') {
    throw new Error('Error handler must be a function');
  }

  errorHandler = function() {
    fn();
  };
}

// Validator map
const typeValidators = {};
function addValidator(type, validator) {
  typeValidators[type] = validator.bind(null);
}
addValidator('Array',   (arg) => Array.isArray(arg));
addValidator('String',  (arg) => typeof arg === 'string');
addValidator('Object',  (arg) => typeof arg === 'object');
addValidator('Number',  (arg) => !isNaN(parseFloat(arg)) && isFinite(arg));
addValidator('Integer', (arg) => !isNaN(parseInt(arg, 10)) && isFinite(arg));

function requireModule(filepath, mdl) {
  if (!mdl) {
    throw new Error('Module not defined');
  }
  if (!filepath) {
    throw new Error('Filepath not defined');
  }
  
  // Require module
  const userModule  = mdl.require(filepath);
  const userModulePath = path.join(path.dirname(mdl.id), filepath );

  // Construct handler
  const handler = createHandlerForModule(userModule, userModulePath);

  // Return proxied module
  return new Proxy(userModule, handler);
}

function createHandlerForModule(userModule, userModulePath) {
  const moduleAnnotations = annotations.getSync(userModulePath + '.js');
  const validators = Object.keys(userModule).reduce(createValidatorsForFunction.bind(null, userModule, moduleAnnotations), {});

  return {
    get: function(target, property, receiver) {
      return function() {
        const argsArray = Array.prototype.slice.call(arguments);
        if (validators[property]) {
          validators[property](argsArray);
        }

        return target[property].apply(null, argsArray);
      };
    }
  };
}

function createValidatorsForFunction(userModule, moduleAnnotations, validators, item) {
  if (!moduleAnnotations[item] || !moduleAnnotations[item].param) {
    return validators;
  }
  
  // Parse param args
  const annotationParams = Array.isArray(moduleAnnotations[item].param) ? 
    moduleAnnotations[item].param : [moduleAnnotations[item].param];
  const params = coalesceParams(annotationParams.map(parseDocblockParam));
  const paramIndices = Object.keys(params);

  // Create validators
  validators[item] = function(argsArray) {
    for (let i = 0; i < argsArray.length; i++) {
      const arg = argsArray[i];

      if (params[paramIndices[i]]) {
        if ( params[paramIndices[i]].type && 
             typeValidators[params[paramIndices[i]].type] && 
            !typeValidators[params[paramIndices[i]].type](arg)) {
          // Call error handler
          errorHandler(item, paramIndices[i], params[paramIndices[i]].type, arg, params[paramIndices[i]].desc);
        }
        
        if (params[paramIndices[i]].properties) {
          for (let j = 0; j < params[paramIndices[i]].properties.length; j++) {
            const propertyParam = params[paramIndices[i]].properties[j];
            const value = _.at(arg, propertyParam.property)[0];

            if ( typeValidators[propertyParam.type] && 
                !typeValidators[propertyParam.type](value)) {
              // Call error handler
              errorHandler(item, `${propertyParam.name}.${propertyParam.property}` , propertyParam.type, value, propertyParam.desc);
            }
          }
        }
      }
    }
  };

  return validators;
}

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
      out[param.name] = param;
    }

    return out;
  }, {});
}

const dbParamRegExp = /\{([a-zA-Z0-9]+)\}\s+\[([a-zA-Z0-9\.]+)\]\s*([\w\s]+)?/;
function parseDocblockParam(input) {
  const match = dbParamRegExp.exec(input);

  if (match) {
    if (!match[1] || !match[2]) {
      return false;
    }

    const nameElements = match[2].split('.');
    return {
      type: match[1],
      name: nameElements[0],
      property: nameElements.length > 1 ? nameElements.slice(1).join('') : false,
      desc: match[3] && match[3].trim() || ''
    };
  }

  return false;
}
