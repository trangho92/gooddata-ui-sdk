// (C) 2019-2020 GoodData Corporation
import { IMeasureDescriptor } from "@gooddata/sdk-backend-spi";
import { ITotal, TotalType } from "@gooddata/sdk-model";
import invariant, { InvariantError } from "ts-invariant";
import { IMenuAggregationClickConfig } from "../types";

import { AVAILABLE_TOTALS, FIELD_TYPE_ATTRIBUTE, FIELD_TYPE_MEASURE } from "./agGridConst";
import intersection from "lodash/intersection";
import isEqual from "lodash/isEqual";
import sortBy from "lodash/sortBy";
import uniq from "lodash/uniq";
import { IColumnTotal } from "./aggregationsMenuTypes";

function getTotalsForMeasureAndType(totals: ITotal[], type: TotalType, measureLocalIdentifier: string) {
    return totals.filter(
        (total) => total.measureIdentifier === measureLocalIdentifier && total.type === type,
    );
}

function getAttributeIntersection(totals: ITotal[], type: TotalType, measureLocalIdentifiers: string[]) {
    const attributeGroups: string[][] = measureLocalIdentifiers.map((measure: string) => {
        const filteredTotals = getTotalsForMeasureAndType(totals, type, measure);
        return filteredTotals.map((total) => total.attributeIdentifier);
    });
    return intersection(...attributeGroups);
}

function getUniqueMeasures(totals: ITotal[], type: TotalType) {
    const totalsOfType = totals.filter((total) => total.type === type);
    return uniq(totalsOfType.map((total) => total.measureIdentifier));
}

function areMeasuresSame(measureLocalIdentifiers1: string[], measureLocalIdentifiers2: string[]) {
    const sameMeasureLocalIdentifiers: string[] = intersection(
        measureLocalIdentifiers1,
        measureLocalIdentifiers2,
    );
    return sameMeasureLocalIdentifiers.length === measureLocalIdentifiers2.length;
}

function getTotalsForAttributeHeader(totals: ITotal[], measureLocalIdentifiers: string[]): IColumnTotal[] {
    return AVAILABLE_TOTALS.reduce((columnTotals: IColumnTotal[], type: TotalType) => {
        const uniqueMeasureLocalIdentifiers = getUniqueMeasures(totals, type);
        if (areMeasuresSame(uniqueMeasureLocalIdentifiers, measureLocalIdentifiers)) {
            const attributeLocalIdentifiers = getAttributeIntersection(
                totals,
                type,
                uniqueMeasureLocalIdentifiers,
            );
            if (attributeLocalIdentifiers.length) {
                columnTotals.push({
                    type,
                    attributes: attributeLocalIdentifiers,
                });
            }
        }
        return columnTotals;
    }, []);
}

function getTotalsForMeasureHeader(totals: ITotal[], measureLocalIdentifier: string): IColumnTotal[] {
    return totals.reduce((turnedOnAttributes: IColumnTotal[], total: ITotal) => {
        if (total.measureIdentifier === measureLocalIdentifier) {
            const totalHeaderType = turnedOnAttributes.find((turned) => turned.type === total.type);
            if (totalHeaderType === undefined) {
                turnedOnAttributes.push({
                    type: total.type,
                    attributes: [total.attributeIdentifier],
                });
            } else {
                totalHeaderType.attributes.push(total.attributeIdentifier);
            }
        }
        return turnedOnAttributes;
    }, []);
}

function getHeaderMeasureLocalIdentifiers(
    measureGroupHeaderItems: IMeasureDescriptor[],
    lastFieldType: string,
    lastFieldId: string | number,
): string[] {
    if (lastFieldType === FIELD_TYPE_MEASURE) {
        if (measureGroupHeaderItems.length === 0 || !measureGroupHeaderItems[lastFieldId]) {
            invariant(false, `Measure header with index ${lastFieldId} was not found`);
        }
        const {
            measureHeaderItem: { localIdentifier },
        } = measureGroupHeaderItems[lastFieldId];
        return [localIdentifier];
    } else if (lastFieldType === FIELD_TYPE_ATTRIBUTE) {
        return measureGroupHeaderItems.map((item) => item.measureHeaderItem.localIdentifier);
    }

    throw new InvariantError(
        `Unknown field type '${lastFieldType}' provided (valid types: ${[
            FIELD_TYPE_MEASURE,
            FIELD_TYPE_ATTRIBUTE,
        ].join(",")})`,
    );
}

function isTotalEnabledForAttribute(
    attributeLocalIdentifier: string,
    totalType: TotalType,
    columnTotals: IColumnTotal[],
): boolean {
    return columnTotals.some((total: IColumnTotal) => {
        return total.type === totalType && total.attributes.includes(attributeLocalIdentifier);
    });
}

function includeTotals(columnTotals: ITotal[], columnTotalsChanged: ITotal[]) {
    const columnTotalsChangedUnique = columnTotalsChanged.filter(
        (totalChanged) => !columnTotals.some((total) => isEqual(total, totalChanged)),
    );

    return [...columnTotals, ...columnTotalsChangedUnique];
}

function excludeTotals(columnTotals: ITotal[], columnTotalsChanged: ITotal[]): ITotal[] {
    return columnTotals.filter(
        (total) => !columnTotalsChanged.find((totalChanged) => isEqual(totalChanged, total)),
    );
}

export function getUpdatedColumnTotals(
    columnTotals: ITotal[],
    menuAggregationClickConfig: IMenuAggregationClickConfig,
): ITotal[] {
    const { type, measureIdentifiers, attributeIdentifier, include } = menuAggregationClickConfig;

    const columnTotalsChanged = measureIdentifiers.map((measureIdentifier) => ({
        type,
        measureIdentifier,
        attributeIdentifier,
    }));

    const updatedColumnTotals = include
        ? includeTotals(columnTotals, columnTotalsChanged)
        : excludeTotals(columnTotals, columnTotalsChanged);

    return sortBy(updatedColumnTotals, (total) =>
        AVAILABLE_TOTALS.findIndex((rankedItem: string) => rankedItem === total.type),
    );
}

export default {
    getTotalsForAttributeHeader,
    getTotalsForMeasureHeader,
    getHeaderMeasureLocalIdentifiers,
    isTotalEnabledForAttribute,
    getUpdatedColumnTotals,
};
