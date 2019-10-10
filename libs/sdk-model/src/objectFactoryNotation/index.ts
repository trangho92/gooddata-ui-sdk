// (C) 2019 GoodData Corporation
import flow = require("lodash/flow");
import identity = require("lodash/identity");
import isArray = require("lodash/isArray");
import isObject = require("lodash/isObject");
import isString = require("lodash/isString");
import stringifyObject = require("stringify-object");
import { ObjQualifier } from "../base";
import {
    isMeasureLocator,
    IAttributeLocatorItem,
    isAttributeSort,
    isMeasureSort,
    IAttributeSortItem,
    IMeasureSortItem,
    IMeasureLocatorItem,
} from "../base/sort";
import {
    IFilter,
    isAbsoluteDateFilter,
    isRelativeDateFilter,
    isPositiveAttributeFilter,
    isNegativeAttributeFilter,
    IAbsoluteDateFilter,
    IRelativeDateFilter,
    IPositiveAttributeFilter,
    INegativeAttributeFilter,
} from "../filter";
import {
    isMeasureDefinition,
    isArithmeticMeasureDefinition,
    isPoPMeasureDefinition,
    isPreviousPeriodMeasureDefinition,
    isMeasure,
    IMeasure,
    IMeasureDefinition,
    IArithmeticMeasureDefinition,
    IPoPMeasureDefinition,
    IPreviousPeriodMeasureDefinition,
} from "../measure";
import { isAttribute, IAttribute } from "../attribute";

const stringify = (input: any) =>
    stringifyObject(input, {
        singleQuotes: false,
        inlineCharacterLimit: 50,
        indent: "    ",
    });

const ARRAY_JOINER = ", ";

const getObjQualifierValue = (value: ObjQualifier): string => (value as any).uri || (value as any).identifier;

// dot suffix handling e. g. ".localIdentifier(...)"
// is curried explicitly to allow easier composition in cases where more than one dot suffix is supported
const addStringDotItem = (identifier: string, helperName = identifier) => (objToConvert: any) => (
    value: string,
) => (objToConvert[identifier] ? `${value}.${helperName}("${objToConvert[identifier]}")` : value);

const addAggregation = addStringDotItem("aggregation");
const addAlias = addStringDotItem("alias");
const addFormat = addStringDotItem("format");
const addTitle = addStringDotItem("title");

const addFilters = ({ filters }: { filters?: IFilter[] }) => (value: string) =>
    filters ? `${value}.filters(${filters.map(factoryNotationFor).join(ARRAY_JOINER)})` : value;

const addRatio = ({ computeRatio }: { computeRatio?: boolean }) => (value: string) =>
    computeRatio ? `${value}.ratio()` : value;

// converters for each supported object to Model notation string
type Converter<T> = (input: T) => string;
const getBuilder = <T>(defaultBuilder: string, decorators: Array<Converter<T>>) => {
    const builder = flow(decorators)(defaultBuilder);
    return builder === defaultBuilder ? "undefined" : builder;
};
const convertAttribute: Converter<IAttribute> = ({ attribute }) => {
    const builder = getBuilder("a => a", [addAlias(attribute)]);
    return `newAttribute("${getObjQualifierValue(attribute.displayForm)}", ${builder}, "${
        attribute.localIdentifier
    }")`;
};

const baseMeasureDotAdders = (measure: IMeasure["measure"]) => [
    addAlias(measure),
    addFormat(measure),
    addTitle(measure),
];

const convertSimpleMeasure = (measure: IMeasure["measure"], definition: IMeasureDefinition) => {
    const builder = getBuilder("m => m", [
        ...baseMeasureDotAdders(measure),
        addAggregation(definition.measureDefinition),
        addFilters(definition.measureDefinition),
        addRatio(definition.measureDefinition),
    ]);
    return `newMeasure("${getObjQualifierValue(definition.measureDefinition.item)}", ${builder}, "${
        measure.localIdentifier
    }")`;
};

const convertArithmeticMeasure = (measure: IMeasure["measure"], definition: IArithmeticMeasureDefinition) => {
    const builder = getBuilder("m => m", baseMeasureDotAdders(measure));
    return `newArithmeticMeasure(${stringify(definition.arithmeticMeasure.measureIdentifiers)}, "${
        definition.arithmeticMeasure.operator
    }", ${builder}, "${measure.localIdentifier}")`;
};

const convertPopMeasure = (measure: IMeasure["measure"], definition: IPoPMeasureDefinition) => {
    const builder = getBuilder("m => m", baseMeasureDotAdders(measure));
    return `newPopMeasure("${definition.popMeasureDefinition.measureIdentifier}", "${getObjQualifierValue(
        definition.popMeasureDefinition.popAttribute,
    )}", ${builder}, "${measure.localIdentifier}")`;
};

const convertPreviousPeriodMeasure = (
    measure: IMeasure["measure"],
    definition: IPreviousPeriodMeasureDefinition,
) => {
    const builder = getBuilder("m => m", baseMeasureDotAdders(measure));
    return `newPreviousPeriodMeasure("${definition.previousPeriodMeasure.measureIdentifier}", [${definition
        .previousPeriodMeasure.dateDataSets &&
        definition.previousPeriodMeasure.dateDataSets
            .map(s =>
                stringify({
                    dataSet: getObjQualifierValue(s.dataSet),
                    periodsAgo: s.periodsAgo,
                }),
            )
            .join(ARRAY_JOINER)}], ${builder}, "${measure.localIdentifier}")`;
};

const convertMeasure: Converter<IMeasure> = ({ measure }) => {
    const { definition } = measure;
    if (isMeasureDefinition(definition)) {
        return convertSimpleMeasure(measure, definition);
    } else if (isArithmeticMeasureDefinition(definition)) {
        return convertArithmeticMeasure(measure, definition);
    } else if (isPoPMeasureDefinition(definition)) {
        return convertPopMeasure(measure, definition);
    } else if (isPreviousPeriodMeasureDefinition(definition)) {
        return convertPreviousPeriodMeasure(measure, definition);
    }
    throw new Error("Unknown measure type");
};

const convertAttributeSortItem: Converter<IAttributeSortItem> = ({ attributeSortItem }) =>
    `newAttributeSort("${attributeSortItem.attributeIdentifier}", "${
        attributeSortItem.direction
    }", ${!!attributeSortItem.aggregation})`;

const convertMeasureSortItem: Converter<IMeasureSortItem> = ({ measureSortItem }) => {
    const locators = measureSortItem.locators || [];
    const measureLocator = locators.find(l => isMeasureLocator(l)) as IMeasureLocatorItem;
    const attributeLocators = locators.filter(l => !isMeasureLocator(l)) as IAttributeLocatorItem[];
    const unwrappedAttributeLocators = attributeLocators.map(a => a.attributeLocatorItem);

    return `newMeasureSort("${measureLocator.measureLocatorItem.measureIdentifier}", "${
        measureSortItem.direction
    }", ${stringify(unwrappedAttributeLocators)})`;
};

const convertAbsoluteDateFilter: Converter<IAbsoluteDateFilter> = ({
    absoluteDateFilter: { dataSet, from, to },
}) => {
    const args = [getObjQualifierValue(dataSet), from, to].filter(identity).map(stringify);
    return `newAbsoluteDateFilter(${args.join(ARRAY_JOINER)})`;
};

const convertRelativeDateFilter: Converter<IRelativeDateFilter> = ({
    relativeDateFilter: { dataSet, granularity, from, to },
}) => {
    const args = [getObjQualifierValue(dataSet), granularity, from, to].filter(identity).map(stringify);
    return `newRelativeDateFilter(${args.join(ARRAY_JOINER)})`;
};

const convertPositiveAttributeFilter: Converter<IPositiveAttributeFilter> = ({
    positiveAttributeFilter: { displayForm, in: inValues },
}) => {
    const args = [getObjQualifierValue(displayForm), inValues].filter(identity).map(stringify);
    return `newPositiveAttributeFilter(${args.join(ARRAY_JOINER)})`;
};

const convertNegativeAttributeFilter: Converter<INegativeAttributeFilter> = ({
    negativeAttributeFilter: { displayForm, notIn },
}) => {
    const args = [getObjQualifierValue(displayForm), notIn].filter(identity).map(stringify);
    return `newNegativeAttributeFilter(${args.join(ARRAY_JOINER)})`;
};

/**
 * Returns a code for generating the provided input using convenience factory methods where possible.
 * @param data - data to return the generating code for
 * @public
 */
export const factoryNotationFor = (data: any): string => {
    if (isArray(data)) {
        return `[${data.map(factoryNotationFor).join(ARRAY_JOINER)}]`;
    } else if (isAttribute(data)) {
        return convertAttribute(data);
    } else if (isMeasure(data)) {
        return convertMeasure(data);
    } else if (isAttributeSort(data)) {
        return convertAttributeSortItem(data);
    } else if (isMeasureSort(data)) {
        return convertMeasureSortItem(data);
    } else if (isAbsoluteDateFilter(data)) {
        return convertAbsoluteDateFilter(data);
    } else if (isRelativeDateFilter(data)) {
        return convertRelativeDateFilter(data);
    } else if (isPositiveAttributeFilter(data)) {
        return convertPositiveAttributeFilter(data);
    } else if (isNegativeAttributeFilter(data)) {
        return convertNegativeAttributeFilter(data);
    }

    return isObject(data) || isString(data) ? stringify(data) : data;
};
