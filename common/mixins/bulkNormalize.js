let md5 = require('md5');
let strFunc = {};
strFunc['uuid'] = require('uuid'); // 看起來 default 就是 v4
// let lb = require('loopback');

module.exports = function(Model, options) {
  'use strict';
  // console.log(Model.definition.rawProperties);

  let hasOwnProperty = Object.prototype.hasOwnProperty;

  function isEmpty(obj) {
  
    // null and undefined are "empty"
    if (obj == null) return true;
  
    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;
  
    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;
  
    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
  
    return true;
  }

  let err_messages = [];

  let dot_notation_array_index = {};
  let stringToObj = function (path, value, obj) {
    let parts = path.split("."), part;
    // let last = parts.pop();
    let prefix_parts = Model.definition.name;
    let prev_obj, prev_part, prev_prefix_parts;
    let last = parts[parts.length - 1];

    while (part = parts.shift()) {

      prefix_parts = prefix_parts + "." + part;

      if (Number(parseFloat(part) == part)) continue;  // this level is item of Array

      console.log(prefix_parts, parts[0]);

      if (typeof obj[part] != "object") {
        if (Number(parseFloat(parts[0]) == parts[0])) { // this level is Array
          obj[part] = [{}];
          dot_notation_array_index[prefix_parts] = [];
          dot_notation_array_index[prefix_parts].push(parts[0]);
        }
        else {
          obj[part] = {};
        }
      }
      else {
        if (Number(parseFloat(parts[0]) == parts[0])) { // this level is Array
          if (dot_notation_array_index[prefix_parts].indexOf(parts[0]) < 0) {
            obj[part].push({});
            dot_notation_array_index[prefix_parts].push(parts[0]);
          }
          /* 邏輯上應該不會發生？
          else {
            if (!obj[part][dot_notation_array_index[prefix_parts].indexOf(parts[0])]) {
              console.log("WTF");
              obj[part][dot_notation_array_index[prefix_parts].indexOf(parts[0])] = {};
            }
          }
          //*/
        }
      }

      console.log(dot_notation_array_index[prefix_parts]);

      prev_prefix_parts = prefix_parts;
      prev_part = part;
      prev_obj = obj;
      if (Array.isArray(obj[part])) {
        obj = obj[part][dot_notation_array_index[prefix_parts].indexOf(parts[0])];
      }
      else {
        obj = obj[part]; // update "pointer"
      }
    }

    console.log([obj, prev_obj]);
    if (Array.isArray(prev_obj[prev_part])) {
      if (last == -1) { // MongoDB addToSet operation
        if (isEmpty(prev_obj[prev_part][0]) && prev_obj[prev_part].length == 1) {
          prev_obj[prev_part][0] = value;
        }
        else {
          prev_obj[prev_part].push(value);
        }
      }
      else {
        prev_obj[prev_part][dot_notation_array_index[prev_prefix_parts].indexOf(last)] = value;
        // console.log(dot_notation_array_index);
      }
    }
    else {
      prev_obj[prev_part] = value;
    }

  }

  let generateInstanceWithUpdateSet = function(updateSet, instance = {}, addToSet = false) {
    // 試圖把 update 變成完整的 instance 再行驗證

    dot_notation_array_index = {};
    for (let propName in updateSet) {
      if (updateSet.hasOwnProperty(propName)) {
        if (!addToSet) {
          stringToObj(propName, updateSet[propName], instance);
        }
        else {
          stringToObj(propName + ".-1", updateSet[propName], instance);
        }
      }
    }

    return (instance);
  }

  let bulkUpdateCallback = function(context, user, next) {
    // console.log(Model.definition);

    err_messages = [];

    let err = new Error();
    let current_id = null;

    let BreakException= {};

    try {
      context.args.data.forEach(function(update, idx, arr){
  
        let defProps = Model.definition.rawProperties;

        if (!update._id || (!update['$set'] && !update['$addToSet'])) {
          err_messages.push("Missing _id or any of update operations from ($set, $addToSet) for update target.");
          throw BreakException;
        }

        current_id = update._id;
  
        // set timestamp
        let now = Date.now() / 1000;

        update['$set'].modified = now;

        // 處理 $set 
        let instance = generateInstanceWithUpdateSet(update['$set']);

        // 處理 $addToSet
        instance = generateInstanceWithUpdateSet(update['$addToSet'], instance, true);

        let updateOnly = true;

        if (update['$setOnInsert'] === true) {
          updateOnly = false;
        }

        instance = simpleValidate(instance, defProps, Model.definition.name,  updateOnly);
        instance.created = instance.modified;


        console.log("批次更新時僅供檢核參考用的資料");
        console.log(JSON.stringify(instance, null, 2));
        if (err_messages.length >= 1) throw BreakException;

        if (update['$setOnInsert'] === true) {

          // remove duplicate fields in "setOnInsert"
          for (let uprop in update['$set']) {
            if (update['$set'].hasOwnProperty(uprop)) {
              if (!!instance[uprop]) {
                delete instance[uprop];
              }
            }
          }

          // remove duplicate fields in "setOnInsert"
          for (let uprop in update['$addToSet']) {
            if (update['$addToSet'].hasOwnProperty(uprop)) {
              if (!!instance[uprop]) {
                delete instance[uprop];
              }
            }
          }

          if (!isEmpty(instance)) {
            update['$setOnInsert'] = instance;
          }
          else {
            // update['$setOnInsert'] remains ture;
          }
        }

        arr[idx] = update;
  
      });
    }
    catch(e) {
      if (e !== BreakException) {
        next(e);
        return;
      }
    }

    if (err_messages.length >= 1) {
      err_messages.sort();
      err.message = "Document `" + current_id + "`:\n" + err_messages.join("\n");
      err.name = "ValidationError";
      err.status = 422;
      next(err);
    }
    else {
      next();
    }

  }

  let simpleValidate = function (instance, defProps, instanceFrom, updateOnly = false) {

    if (!instance) instance = {};

    console.log("--------------------This instance is from: `" + instanceFrom + "`");
    // console.log(defProps);

    for (let propName in defProps) {
      if (defProps.hasOwnProperty(propName)) {


        if (!updateOnly) {
          let defaultFn = strFunc[defProps[propName].defaultFn];
  
          if (!!defProps[propName].defaultFn) {
            console.log("--------" + defProps[propName].defaultFn);
          }
  
          if (typeof defaultFn === 'function') {
            console.log("^^^ Default value of `" + propName + "` is from function `" + defaultFn + "`");
          }
  
          let defaultValue = undefined;
          if (typeof defProps[propName].default === 'function') {
            // ?????
            defaultValue = defProps[propName].default();
          }
          else {
            defaultValue = defProps[propName].default;
          }
  
  
          if (instance[propName] === undefined) instance[propName] = ((defaultValue !== undefined) ? defaultValue : ((typeof defaultFn === 'function') ? defaultFn() : undefined));

          // console.log("XXXXXXXXXXXXXXXX " + defProps[propName]);
        }


        let realType = undefined;
        if (Array.isArray(defProps[propName].type)) {
          realType = defProps[propName].type[0];
        }
        else {
          realType = defProps[propName].type;
        }

        // console.log("Property type of `" + propName + "` is `" + typeof realType + "`");
        if (typeof realType === 'function') {
          // console.log("XXXXXXXXXXXXXXXXXXXXXX ", realType.definition.rawProperties);

          // Is Transient
          if (!!realType.definition && !!realType.definition.rawProperties) {
            // recursive here
            if (Array.isArray(instance[propName])) {
              instance[propName].forEach(function(sub_instance, sub_idx, sub_arr) {
                sub_arr[sub_idx] = simpleValidate(sub_instance, realType.definition.rawProperties, propName, updateOnly);
              });
            }
            else {
              instance[propName] = simpleValidate(instance[propName], realType.definition.rawProperties, propName, updateOnly);
            }
          }
        }

        // Required Check
        if (!updateOnly && (instance[propName] === undefined) && !!defProps[propName].required) {
          // Error
          // console.log(defProps[propName]);
          console.log("Missing value for property `" + propName + "`");
          err_messages.push("Missing value for property `" + propName + "`");
        }

        // Type Check, 先放棄 array 跟 object, 太複雜了
        let typeAsString = undefined;
        if (typeof defProps[propName].type === 'function') {
          typeAsString = defProps[propName].type.name;
          // let validation = defProps[propName].type(instance[propName]);
          // console.log("Validate `" + propName + "`: " + validation); // don't know what will come out yet, don't know how to interpret return value
        }
        else {
          typeAsString = defProps[propName].type;
        }

        // console.log(typeAsString);
        switch(typeAsString) {
          case "boolean":
          case "Boolean":
            if ((instance[propName] !== undefined) && (typeof(instance[propName]) !== typeof(true))) {
              err_messages.push("Property `" + propName + "` (" + instance[propName]  + ") isn't a Boolean.");
            }
            break;
          case "number":
          case "Number":
            if ((instance[propName] !== undefined) && (Number(parseFloat(instance[propName])) != instance[propName])) {
              err_messages.push("Property `" + propName + "` (" + instance[propName]  + ") isn't a Number.");
            }
            break;
          case "string":
          case "String":
            if (typeof instance[propName] === 'string' || instance[propName] instanceof String) {}
            else if (instance[propName] !== undefined) {
              err_messages.push("Property `" + propName + "` (" + instance[propName]  + ") isn't a String.");
            }
            break;
          default:
            // 其他先不管了
            break;
        }

      }
    }

    return (instance);
  }

  let bulkInsertReplaceCallback = function(context, user, next) {
    // console.log(Model.definition);

    err_messages = [];

    let err = new Error();
    let current_id = null;

    let BreakException= {};

    try {
      context.args.data.forEach(function(instance, idx, arr){
  
        let defProps = Model.definition.rawProperties;
  
        // url_md5 as id 的情境
        if (!instance.url) instance.url = strFunc['uuid']();
        instance.url_md5 = md5(instance.url);
        instance._id = instance.url_md5;
        current_id = instance._id;
  
        // set timestamp
        let now = Date.now() / 1000;
        instance.created = now;
        instance.modified = now;
  
        instance = simpleValidate(instance, defProps, Model.definition.name);

        console.log(JSON.stringify(instance, null, 2));
        if (err_messages.length >= 1) throw BreakException;

        arr[idx] = instance;
  
      });
    }
    catch(e) {
      if (e !== BreakException) {
        next(e);
        return;
      }
    }

    if (err_messages.length >= 1) {
      err_messages.sort();
      err.message = "Document `" + current_id + ":\n" + err_messages.join("\n");
      err.name = "Validation Failed";
      err.status = 400;
      next(err);
    }
    else {
      next();
    }

  }


  Model.beforeRemote('bulkInsert', bulkInsertReplaceCallback);
  Model.beforeRemote('bulkReplace', bulkInsertReplaceCallback);
  Model.beforeRemote('bulkUpdate', bulkUpdateCallback);
}

