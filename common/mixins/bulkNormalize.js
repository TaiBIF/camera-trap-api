'use strict';

let md5 = require('md5');
let strFunc = {};
strFunc['uuid'] = require('uuid'); // 看起來 default 就是 v4
// let lb = require('loopback');

module.exports = function(Model, options) {
  // console.log(Model.definition.rawProperties);

  let hasOwnProperty = Object.prototype.hasOwnProperty;

  function isEmpty(obj) {
    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0) return false;
    if (obj.length === 0) return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== 'object') return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
      if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
  }

  let errMessages = [];

  let dotNotationArrayIndex = {};

  let stringToObj = function(path, value, obj) {
    let parts = path.split('.');
    let part;
    // let last = parts.pop();
    let prefixParts = Model.definition.name;
    let prevObj,
      prevPart,
      prevPrefixParts;
    let last = parts[parts.length - 1];

    while (part = parts.shift()) {
      prefixParts = prefixParts + '.' + part;

      if (Number(parseFloat(part) == part)) continue; // this level is item of Array

      console.log(prefixParts, parts[0]);

      if (typeof obj[part] != 'object') {
        if (Number(parseFloat(parts[0]) == parts[0])) { // this level is Array
          obj[part] = [{}];
          dotNotationArrayIndex[prefixParts] = [];
          dotNotationArrayIndex[prefixParts].push(parts[0]);
        } else {
          obj[part] = {};
        }
      } else {
        if (Number(parseFloat(parts[0]) === parts[0])) { // this level is Array
          if (dotNotationArrayIndex[prefixParts].indexOf(parts[0]) < 0) {
            obj[part].push({});
            dotNotationArrayIndex[prefixParts].push(parts[0]);
          }
          /* 邏輯上應該不會發生？
          else {
            if (!obj[part][dotNotationArrayIndex[prefixParts].indexOf(parts[0])]) {
              console.log("WTF");
              obj[part][dotNotationArrayIndex[prefixParts].indexOf(parts[0])] = {};
            }
          }
          // */
        }
      }

      console.log(dotNotationArrayIndex[prefixParts]);

      prevPrefixParts = prefixParts;
      prevPart = part;
      prevObj = obj;
      if (Array.isArray(obj[part])) {
        obj = obj[part][dotNotationArrayIndex[prefixParts].indexOf(parts[0])];
      } else {
        obj = obj[part]; // update "pointer"
      }
    }

    console.log([obj, prevObj]);
    if (Array.isArray(prevObj[prevPart])) {
      if (last === -1) { // MongoDB addToSet operation
        if (isEmpty(prevObj[prevPart][0]) && prevObj[prevPart].length === 1) {
          prevObj[prevPart][0] = value;
        } else {
          prevObj[prevPart].push(value);
        }
      } else {
        prevObj[prevPart][dotNotationArrayIndex[prevPrefixParts].indexOf(last)] = value;
        // console.log(dotNotationArrayIndex);
      }
    } else {
      prevObj[prevPart] = value;
    }
  };

  let generateInstanceWithUpdateSet = (updateSet,
    instance = {}, addToSet = false) => {
    // 試圖把 update 變成完整的 instance 再行驗證

    dotNotationArrayIndex = {};
    for (let propName in updateSet) {
      if (updateSet.hasOwnProperty(propName)) {
        if (!addToSet) {
          stringToObj(propName, updateSet[propName], instance);
        } else {
          stringToObj(propName + '.-1', updateSet[propName], instance);
        }
      }
    }

    return (instance);
  };

  let bulkUpdateCallback = function(context, user, next) {
    // console.log(Model.definition);

    errMessages = [];

    let err = new Error();
    let currentId = null;

    let BreakException = {};
    let defProps = Model.definition.rawProperties;
    let modelName = Model.definition.name;
    let dataSourceName = Model.config.dataSource.name;

    try {
      let userId;
      if (!!context.req.session && !!context.req.session.user_info) {
        userId = context.req.session.user_info.userId;
      }

      context.args.data.forEach(function(update, idx, arr) {
        if (!update._id || (!update['$set'] && !update['$addToSet'] && !update['$push'])) {
          errMessages.push(JSON.stringify(update));
          errMessages.push('Missing _id or any of update operations from ($set, $addToSet) for update target.');
          throw BreakException;
        }

        currentId = update._id;

        // set timestamp
        let now = Date.now() / 1000;

        if (!update['$set']) update['$set'] = {};
        update['$set'].modified = now;

        if (modelName.match(/^MultimediaAnnotation/)) {
          if (userId && (update['$set'].modifiedBy !== userId)) {
            update['$set'].modifiedBy = userId;
          }
        }

        // 處理 $setOnInsert
        let instance = generateInstanceWithUpdateSet(update['$setOnInsert']);

        // 處理 $set, $set 優先權較高，所以放後面，可覆蓋前面
        instance = generateInstanceWithUpdateSet(update['$set'], instance);

        // 處理 $addToSet
        instance = generateInstanceWithUpdateSet(update['$addToSet'], instance, true);

        // 處理 $push
        instance = generateInstanceWithUpdateSet(update['$push'], instance, true);

        console.log(['$set', instance]);

        let updateOnly = true;

        if (!isEmpty(update['$setOnInsert']) || update['$upsert']) {
          updateOnly = false;
        }

        instance = simpleValidate(instance, defProps, modelName, dataSourceName, updateOnly);
        instance.created = instance.modified;

        console.log('批次更新時僅供檢核參考用的資料');
        console.log(JSON.stringify(instance, null, 2));

        if (errMessages.length >= 1) throw BreakException;

        if (!updateOnly) {
          // remove duplicate fields in "setOnInsert"
          for (let uprop in update['$set']) {
            if (update['$set'].hasOwnProperty(uprop)) {
              if (!!instance[uprop] || instance[uprop] === 0) {
                delete instance[uprop];
              }
            }
          }

          // remove duplicate fields in "setOnInsert"
          for (let uprop in update['$addToSet']) {
            if (update['$addToSet'].hasOwnProperty(uprop)) {
              if (!!instance[uprop] || instance[uprop] === 0) {
                delete instance[uprop];
              }
            }
          }

          // remove duplicate fields in "setOnInsert"
          for (let uprop in update['$push']) {
            if (update['$push'].hasOwnProperty(uprop)) {
              if (!!instance[uprop] || instance[uprop] === 0) {
                delete instance[uprop];
              }
            }
          }

          if (!isEmpty(instance)) {
            update['$setOnInsert'] = instance;
          } else {
            // update['$setOnInsert'] remains ture;
          }
        }

        arr[idx] = update;
      });
    } catch (e) {
      if (e !== BreakException) {
        next(e);
        return;
      }
    }

    if (errMessages.length >= 1) {
      errMessages.sort();
      err.message = 'Document `' + currentId + '`:\n' + errMessages.join('\n');
      err.name = 'ValidationError';
      err.status = 422;
      next(err);
    } else {
      next();
    }
  };

  let simpleValidate = (instance, defProps, instanceFrom, dataSourceName,
    updateOnly = false) => {
    if (!instance) instance = {};

    console.log('--------------------This instance is from: `' + instanceFrom + '`');
    // console.log(instance);
    // console.log(dataSourceName);
    // console.log(defProps);

    for (let propName in defProps) {
      if (defProps.hasOwnProperty(propName)) {
        if (!updateOnly) {
          let defaultFn = strFunc[defProps[propName].defaultFn];

          if (!!defProps[propName].defaultFn) {
            console.log('--------' + defProps[propName].defaultFn);
          }

          if (typeof defaultFn === 'function') {
            console.log('^^^ Default value of `' + propName + '` is from function `' + defaultFn + '`');
          }

          let defaultValue = undefined;
          if (typeof defProps[propName].default === 'function') {
            // ?????
            defaultValue = defProps[propName].default();
          } else {
            defaultValue = defProps[propName].default;
          }

          if (instance[propName] === undefined) instance[propName] = ((defaultValue !== undefined) ? defaultValue : ((typeof defaultFn === 'function') ? defaultFn() : undefined));

          // console.log("XXXXXXXXXXXXXXXX " + defProps[propName]);
        }

        let realType = undefined;
        let realTypeIsArray = false;
        if (Array.isArray(defProps[propName].type)) {
          realType = defProps[propName].type[0];
          realTypeIsArray = true;
        } else {
          realType = defProps[propName].type;
        }

        // console.log([propName, realType]);

        // console.log("Property type of `" + propName + "` is `" + typeof realType + "`");
        if (typeof realType === 'function') {
          // console.log("XXXXXXXXXXXXXXXXXXXXXX ", realType.definition.rawProperties);

          // Is Transient
          if (!!realType.definition && !!realType.definition.rawProperties) {
            let realTypeDataSourceName = realType.config.dataSource.name;
            // recursive here
            console.log(['isArrayTest', instance[propName], instance, propName]);
            if (Array.isArray(instance[propName])) {
              // console.log(realType);
              instance[propName].forEach(function(subInstance, subIdx, subArr) {
                subArr[subIdx] = simpleValidate(subInstance, realType.definition.rawProperties, propName, realTypeDataSourceName, updateOnly);
              });
            } else if (realTypeIsArray) {
              instance[propName] = [simpleValidate(instance[propName], realType.definition.rawProperties, propName, realTypeDataSourceName, updateOnly)];
            } else {
              // console.log(realType);
              instance[propName] = simpleValidate(instance[propName], realType.definition.rawProperties, propName, realTypeDataSourceName, updateOnly);
            }
          }
        }

        // Required Check
        if (!updateOnly && (instance[propName] === undefined) && !!defProps[propName].required) {
          // Error
          // console.log(defProps[propName]);
          console.log('Missing value for property `' + propName + '`');
          errMessages.push('Missing value for property `' + propName + '`');
        }

        // auto set _id field
        if (dataSourceName != 'transient') {
          if (!!defProps[propName].id) {
            instance._id = instance[propName];
          }
        }

        // Type Check, 先放棄 array 跟 object, 太複雜了
        let typeAsString = undefined;
        if (typeof defProps[propName].type === 'function') {
          typeAsString = defProps[propName].type.name;
          // let validation = defProps[propName].type(instance[propName]);
          // console.log("Validate `" + propName + "`: " + validation); // don't know what will come out yet, don't know how to interpret return value
        } else {
          typeAsString = defProps[propName].type;
        }

        // console.log(typeAsString);
        switch (typeAsString) {
          case 'boolean':
          case 'Boolean':
            if ((instance[propName] !== undefined) && (typeof(instance[propName]) !== typeof(true))) {
              errMessages.push('Property `' + propName + '` (' + instance[propName] + ") isn't a Boolean.");
            }
            break;
          case 'number':
          case 'Number':
            if ((instance[propName] !== undefined) && (Number(parseFloat(instance[propName])) != instance[propName])) {
              errMessages.push('Property `' + propName + '` (' + instance[propName] + ") isn't a Number.");
            }
            break;
          case 'string':
          case 'String':
            if (typeof instance[propName] === 'string' || instance[propName] instanceof String) {} else if (instance[propName] !== undefined) {
              errMessages.push('Property `' + propName + '` (' + instance[propName] + ") isn't a String.");
            }
            break;
          default:
            // 其他先不管了
            break;
        }
      }
    }

    return (instance);
  };

  let bulkInsertReplaceCallback = function(context, user, next) {
    // console.log(Model);

    errMessages = [];

    let err = new Error();
    let currentId = null;

    let BreakException = {};
    let defProps = Model.definition.rawProperties;

    let modelName = Model.definition.name;
    let dataSourceName = Model.config.dataSource.name;

    try {
      let userId;
      if (!!context.req.session && !!context.req.session.user_info) {
        userId = context.req.session.user_info.userId;
      }
      
      context.args.data.forEach(function(instance, idx, arr) {
        // 先這樣，觀察一下日後其他 Model 需求再決定是否搬回 MultimediaAnnotation
        if (modelName.match(/^MultimediaAnnotation/)) {
          if (userId && (instance.modifiedBy !== userId)) {
            instance.modifiedBy = userId;
          }

          // TODO: 這段其實應該要 throw error,
          // if (!instance.url) instance.url = strFunc['uuid']();
          // instance.url_md5 = md5(instance.url);
          // instance._id = instance.url_md5;
        }

        // set timestamp
        let now = Date.now() / 1000;
        instance.created = now;
        instance.modified = now;

        instance = simpleValidate(instance, defProps, modelName, dataSourceName);

        currentId = instance._id;

        console.log(JSON.stringify(instance, null, 2));
        if (errMessages.length >= 1) throw BreakException;

        arr[idx] = instance;
      });
    } catch (e) {
      if (e !== BreakException) {
        next(e);
        return;
      }
    }

    if (errMessages.length >= 1) {
      errMessages.sort();
      err.message = 'Document `' + currentId + ':\n' + errMessages.join('\n');
      err.name = 'Validation Failed';
      err.status = 400;
      next(err);
    } else {
      next();
    }
  };

  Model.beforeRemote('bulkInsert', bulkInsertReplaceCallback);
  Model.beforeRemote('bulkReplace', bulkInsertReplaceCallback);
  Model.beforeRemote('bulkUpdate', bulkUpdateCallback);
};

