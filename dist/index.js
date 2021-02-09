"use strict";
const util_1 = require("util");
const bson_1 = require("bson");
const mapMongooseTypeToSwaggerType = (type) => {
    if (!type) {
        return null;
    }
    if (type === Number || (util_1.isString(type) && type.toLowerCase() === 'number')) {
        return 'number';
    }
    if (type === String || (util_1.isString(type) && type.toLowerCase() === 'string')) {
        return 'string';
    }
    if (type.schemaName === 'Mixed') {
        return 'object';
    }
    if (type === 'ObjectId' || type === 'ObjectID') {
        return 'string';
    }
    if (type === bson_1.ObjectId) {
        return 'string';
    }
    if (type === Boolean || (util_1.isString(type) && type.toLowerCase() === 'boolean')) {
        return 'boolean';
    }
    if (type === Map) {
        return 'map';
    }
    if (type instanceof Function) {
        if (type.name === 'ObjectId' || type.name === 'ObjectID') {
            return 'string';
        }
        if (type.name === 'Date') {
            return 'string';
        }
        return type.name.toLowerCase();
    }
    if (type.type != null) {
        return mapMongooseTypeToSwaggerType(type.type);
    }
    if (type.instance) {
        switch (type.instance) {
            case 'Array':
            case 'DocumentArray':
                return 'array';
            case 'ObjectId':
            case 'ObjectID':
            case 'SchemaDate':
                return 'string';
            case 'Mixed':
                return 'object';
            case 'String':
            case 'SchemaString':
            case 'SchemaBuffer':
            case 'SchemaObjectId':
                return 'string';
            case 'SchemaArray':
                return 'array';
            case 'Boolean':
            case 'SchemaBoolean':
                return 'boolean';
            case 'Number':
            case 'SchemaNumber':
                return 'number';
            default:
        }
    }
    if (Array.isArray(type)) {
        return 'array';
    }
    if (type.$schemaType) {
        return mapMongooseTypeToSwaggerType(type.$schemaType.tree);
    }
    if (type.getters && Array.isArray(type.getters) && type.path != null) {
        return null;
    }
    return 'object';
};
const defaultSupportedMetaProps = [
    'enum',
    'required',
    'description',
];
const mapSchemaTypeToFieldSchema = ({ key = null, value, props, }) => {
    const swaggerType = mapMongooseTypeToSwaggerType(value);
    const meta = {};
    for (const metaProp of props) {
        if (value && value[metaProp] != null) {
            meta[metaProp] = value[metaProp];
        }
    }
    if (value === Date || value.type === Date) {
        meta.format = 'date-time';
    }
    else if (swaggerType === 'array') {
        const arraySchema = Array.isArray(value) ? value[0] : value.type[0];
        const items = mapSchemaTypeToFieldSchema({ value: arraySchema || {}, props });
        meta.items = items;
    }
    else if (swaggerType === 'object') {
        let fields = [];
        if (value && value.constructor && value.constructor.name === 'Schema') {
            fields = getFieldsFromMongooseSchema(value, { props });
        }
        else {
            const subSchema = value.type ? value.type : value;
            if (subSchema.obj && Object.keys(subSchema.obj).length > 0) {
                fields = getFieldsFromMongooseSchema({ tree: subSchema.tree ? subSchema.tree : subSchema }, { props });
            }
            else if (subSchema.schemaName !== 'Mixed') {
                fields = getFieldsFromMongooseSchema({ tree: subSchema.tree ? subSchema.tree : subSchema }, { props });
            }
        }
        const properties = {};
        for (const field of fields.filter(f => f.type != null)) {
            properties[field.field] = field;
            delete field.field;
        }
        meta.properties = properties;
    }
    else if (swaggerType === 'map') {
        const subSchema = mapSchemaTypeToFieldSchema({ value: value.of || {}, props });
        meta.type = 'object';
        meta.additionalProperties = subSchema;
    }
    const result = Object.assign({ type: swaggerType }, meta);
    if (key) {
        result.field = key;
    }
    return result;
};
const getFieldsFromMongooseSchema = (schema, options) => {
    const { props } = options;
    const tree = schema.tree;
    const keys = Object.keys(schema.tree);
    const fields = [];
    for (const key of keys) {
        const value = tree[key];
        const field = mapSchemaTypeToFieldSchema({ key, value, props });
        const required = [];
        if (field.type === 'object') {
            const { field: propName } = field;
            const fieldProperties = field.properties || field.additionalProperties;
            for (const f of Object.values(fieldProperties)) {
                if (f.required && propName != null) {
                    required.push(propName);
                    delete f.required;
                }
            }
        }
        if (field.type === 'array' && field.items.type === 'object') {
            field.items.required = [];
            for (const key in field.items.properties) {
                const val = field.items.properties[key];
                if (val.required) {
                    field.items.required.push(key);
                    delete val.required;
                }
            }
        }
        fields.push(field);
    }
    return fields;
};
let omitted = new Set(['__v', '_id']);
const removeOmitted = (swaggerFieldSchema) => {
    return swaggerFieldSchema.type != null && !omitted.has(swaggerFieldSchema.field);
};
function documentModel(Model, options = {}) {
    let { props = [], omitId = true, } = options;
    props = [...defaultSupportedMetaProps, ...props];
    omitted = new Set(omitId ? ['__v', '_id'] : ['__v']);
    const schema = Model.schema;
    const fields = getFieldsFromMongooseSchema(schema, { props });
    const obj = {
        title: Model.modelName,
        required: [],
        properties: {},
    };
    for (const field of fields.filter(removeOmitted)) {
        const { field: fieldName } = field;
        delete field.field;
        obj.properties[fieldName] = field;
        if (field.required && fieldName != null) {
            obj.required.push(fieldName);
            delete field.required;
        }
    }
    if (!obj.required || !obj.required.length) {
        delete obj.required;
    }
    return obj;
}
documentModel.adjustType = mapMongooseTypeToSwaggerType;
documentModel.getFieldsFromMongooseSchema = getFieldsFromMongooseSchema;
module.exports = documentModel;
//# sourceMappingURL=index.js.map