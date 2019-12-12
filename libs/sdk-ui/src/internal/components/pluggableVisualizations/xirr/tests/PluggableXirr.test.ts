// (C) 2019 GoodData Corporation
import * as React from "react";
import * as ReactDom from "react-dom";
import cloneDeep = require("lodash/cloneDeep");
import { dummyBackend } from "@gooddata/sdk-backend-mockingbird";

import { PluggableXirr } from "../PluggableXirr";
import { IVisConstruct, IVisProps, IBucketOfFun, IFilters } from "../../../../interfaces/Visualization";
import * as referencePointMocks from "../../../../mocks/referencePointMocks";
import * as uiConfigMocks from "../../../../mocks/uiConfigMocks";
import * as testMocks from "../../../../mocks/testMocks";
import { CoreXirr } from "../../../../../charts/xirr/CoreXirr";
import { IDrillableItem } from "../../../../../base/interfaces/DrillEvents";

describe("PluggableXirr", () => {
    const defaultProps = {
        projectId: "PROJECTID",
        backend: dummyBackend(),
        element: "body",
        configPanelElement: "invalid",
        visualizationProperties: {},
        callbacks: {
            afterRender: jest.fn(),
            pushData: jest.fn(),
            onLoadingChanged: jest.fn(),
            onError: jest.fn(),
        },
    };

    const executionFactory = dummyBackend()
        .workspace("PROJECTID")
        .execution();

    function createComponent(customProps: Partial<IVisConstruct> = {}) {
        return new PluggableXirr({
            ...defaultProps,
            ...customProps,
        });
    }

    describe("init", () => {
        it("should not call pushData during init", () => {
            const pushData = jest.fn();

            createComponent({
                callbacks: {
                    pushData,
                },
            });

            expect(pushData).not.toHaveBeenCalled();
        });
    });

    describe("update", () => {
        function getTestOptions(): IVisProps {
            const drillableItems: IDrillableItem[] = [];
            return {
                dimensions: {
                    width: 12,
                    height: 14,
                },
                custom: {
                    stickyHeaderOffset: 0,
                    drillableItems,
                },
                locale: "en-US",
            };
        }

        it("should not render xirr when dataSource is missing", () => {
            const fakeElement: any = "fake element";
            const reactCreateElementSpy = jest
                .spyOn(React, "createElement")
                .mockImplementation(() => fakeElement);
            const reactRenderSpy = jest.spyOn(ReactDom, "render").mockImplementation(jest.fn());

            const xirr = createComponent();
            const options: IVisProps = getTestOptions();

            xirr.update({ ...options }, testMocks.emptyInsight, executionFactory);

            expect(reactRenderSpy).toHaveBeenCalledTimes(0);

            reactCreateElementSpy.mockReset();
            reactRenderSpy.mockReset();
        });

        it("should render XIRR by react to given element passing down properties", () => {
            const fakeElement: any = "fake element";
            const reactCreateElementSpy = jest
                .spyOn(React, "createElement")
                .mockImplementation(() => fakeElement);
            const reactRenderSpy = jest.spyOn(ReactDom, "render").mockImplementation(jest.fn());

            const xirr = createComponent();
            const options: IVisProps = getTestOptions();

            xirr.update(options, testMocks.insightWithSingleMeasure, executionFactory);

            expect(reactCreateElementSpy.mock.calls[0][0]).toBe(CoreXirr);
            expect(reactCreateElementSpy.mock.calls[0][1]).toMatchObject({
                config: undefined,
                drillableItems: options.custom.drillableItems,
                locale: options.locale,
                afterRender: defaultProps.callbacks.afterRender,
                onLoadingChanged: defaultProps.callbacks.onLoadingChanged,
                pushData: defaultProps.callbacks.pushData,
                onError: defaultProps.callbacks.onError,
                ErrorComponent: null,
                LoadingComponent: null,
                execution: expect.any(Object),
            });
            expect(reactRenderSpy).toHaveBeenCalledWith(
                fakeElement,
                document.querySelector(defaultProps.element),
            );

            reactCreateElementSpy.mockReset();
            reactRenderSpy.mockReset();
        });

        it("should correctly set config.disableDrillUnderline from FeatureFlag disableKpiDashboardHeadlineUnderline", () => {
            const fakeElement: any = "fake element";
            const reactCreateElementSpy = jest
                .spyOn(React, "createElement")
                .mockImplementation(() => fakeElement);
            const reactRenderSpy = jest.spyOn(ReactDom, "render").mockImplementation(jest.fn());

            const xirr = createComponent({
                featureFlags: {
                    disableKpiDashboardHeadlineUnderline: true,
                },
            });

            const options: IVisProps = getTestOptions();

            xirr.update(options, testMocks.insightWithSingleMeasure, executionFactory);

            expect(reactCreateElementSpy.mock.calls[0][0]).toBe(CoreXirr);
            expect(reactCreateElementSpy.mock.calls[0][1]).toMatchObject({
                config: {
                    disableDrillUnderline: true,
                },
                drillableItems: options.custom.drillableItems,
                locale: options.locale,
                afterRender: defaultProps.callbacks.afterRender,
                onLoadingChanged: defaultProps.callbacks.onLoadingChanged,
                pushData: defaultProps.callbacks.pushData,
                onError: defaultProps.callbacks.onError,
                ErrorComponent: null,
                LoadingComponent: null,
                execution: expect.any(Object),
            });

            reactCreateElementSpy.mockReset();
            reactRenderSpy.mockReset();
        });
    });

    describe("getExtendedReferencePoint", () => {
        it("should return proper extended reference point", async () => {
            const extendedReferencePoint = await createComponent().getExtendedReferencePoint(
                referencePointMocks.measuresAndDateReferencePoint,
            );

            const expectedBuckets: IBucketOfFun[] = [
                {
                    localIdentifier: "measures",
                    items: referencePointMocks.measuresAndDateReferencePoint.buckets[0].items.slice(0, 1),
                },
                {
                    localIdentifier: "attribute",
                    items: referencePointMocks.measuresAndDateReferencePoint.buckets[1].items.slice(0, 1),
                },
            ];

            const expectedFilters: IFilters = {
                localIdentifier: "filters",
                items: [],
            };

            expect(extendedReferencePoint).toEqual({
                buckets: expectedBuckets,
                filters: expectedFilters,
                properties: {},
                uiConfig: uiConfigMocks.fullySpecifiedXirrUiConfig,
            });
        });

        it("should correctly process empty reference point", async () => {
            const headline = createComponent();
            const extendedReferencePoint = await headline.getExtendedReferencePoint(
                referencePointMocks.emptyReferencePoint,
            );

            const expectedBuckets: IBucketOfFun[] = [
                {
                    localIdentifier: "measures",
                    items: [],
                },
                {
                    localIdentifier: "attribute",
                    items: [],
                },
            ];

            const expectedFilters: IFilters = {
                localIdentifier: "filters",
                items: [],
            };

            const expectedUiConfig = cloneDeep(uiConfigMocks.fullySpecifiedXirrUiConfig);
            expectedUiConfig.buckets.measures.canAddItems = true;
            expectedUiConfig.buckets.attribute.canAddItems = true;

            expect(extendedReferencePoint).toMatchObject({
                buckets: expectedBuckets,
                filters: expectedFilters,
                properties: {},
                uiConfig: expectedUiConfig,
            });
        });
    });
});