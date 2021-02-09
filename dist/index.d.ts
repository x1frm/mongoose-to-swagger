declare function documentModel(Model: any, options?: {
    props?: string[];
    omitId?: boolean;
}): any;
declare namespace documentModel {
    var adjustType: (type: any) => "string" | "number" | "boolean" | "object" | "array" | "map";
    var getFieldsFromMongooseSchema: (schema: {
        tree: Record<string, any>;
    }, options: {
        props: string[];
    }) => any[];
}
export = documentModel;
