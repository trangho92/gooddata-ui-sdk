// (C) 2019 GoodData Corporation
import React from "react";
import { FormattedMessage } from "react-intl";
import Bubble from "@gooddata/goodstrap/lib/Bubble/Bubble";
import BubbleHoverTrigger from "@gooddata/goodstrap/lib/Bubble/BubbleHoverTrigger";
import get from "lodash/get";
import cx from "classnames";
import NameSubsection from "../configurationControls/axis/NameSubsection";

import ConfigurationPanelContent from "./ConfigurationPanelContent";
import ConfigSection from "../configurationControls/ConfigSection";
import DataLabelsControl from "../configurationControls/DataLabelsControl";
import {
    SHOW_DELAY_DEFAULT,
    HIDE_DELAY_DEFAULT,
    BUBBLE_ARROW_OFFSET_X,
    BUBBLE_ARROW_OFFSET_Y,
} from "../../constants/bubble";
import LabelSubsection from "../configurationControls/axis/LabelSubsection";
import { AxisType } from "../../interfaces/AxisType";
import { noRowsAndHasOneMeasure, noColumnsAndHasOneMeasure } from "../../utils/bucketHelper";
import { IInsightDefinition, insightBuckets } from "@gooddata/sdk-model";

export default class HeatMapConfigurationPanel extends ConfigurationPanelContent {
    protected renderConfigurationPanel(): React.ReactNode {
        const { featureFlags, propertiesMeta, properties, pushData } = this.props;
        const { xAxisVisible, yAxisVisible } = this.getControlProperties();

        const controlsDisabled = this.isControlDisabled();
        const xAxisDisabled = this.isAxisDisabled(controlsDisabled, "xaxis", this.props.insight);
        const yAxisDisabled = this.isAxisDisabled(controlsDisabled, "yaxis", this.props.insight);
        const isNameSubsectionVisible: boolean = featureFlags.enableAxisNameConfiguration as boolean;

        return (
            <BubbleHoverTrigger showDelay={SHOW_DELAY_DEFAULT} hideDelay={HIDE_DELAY_DEFAULT}>
                <div>
                    {this.renderColorSection()}
                    <ConfigSection
                        id="xaxis_section"
                        title="properties.xaxis.title"
                        valuePath="xaxis.visible"
                        canBeToggled={true}
                        toggledOn={xAxisVisible}
                        toggleDisabled={xAxisDisabled}
                        showDisabledMessage={!controlsDisabled && xAxisDisabled}
                        propertiesMeta={propertiesMeta}
                        properties={properties}
                        pushData={pushData}
                    >
                        {isNameSubsectionVisible && (
                            <NameSubsection
                                disabled={xAxisDisabled}
                                configPanelDisabled={controlsDisabled}
                                axis={"xaxis"}
                                properties={properties}
                                pushData={pushData}
                            />
                        )}

                        <LabelSubsection
                            disabled={xAxisDisabled}
                            configPanelDisabled={controlsDisabled}
                            axis={"xaxis"}
                            properties={properties}
                            pushData={pushData}
                        />
                    </ConfigSection>
                    <ConfigSection
                        id="yaxis_section"
                        title="properties.yaxis.title"
                        valuePath="yaxis.visible"
                        canBeToggled={true}
                        toggledOn={yAxisVisible}
                        toggleDisabled={yAxisDisabled}
                        showDisabledMessage={!controlsDisabled && yAxisDisabled}
                        propertiesMeta={propertiesMeta}
                        properties={properties}
                        pushData={pushData}
                    >
                        {isNameSubsectionVisible && (
                            <NameSubsection
                                disabled={yAxisDisabled}
                                configPanelDisabled={controlsDisabled}
                                axis={"yaxis"}
                                properties={properties}
                                pushData={pushData}
                            />
                        )}

                        <LabelSubsection
                            disabled={yAxisDisabled}
                            configPanelDisabled={controlsDisabled}
                            axis={"yaxis"}
                            properties={properties}
                            pushData={pushData}
                        />
                    </ConfigSection>
                    {this.renderLegendSection()}
                    <ConfigSection
                        id="canvas_section"
                        title="properties.canvas.title"
                        propertiesMeta={propertiesMeta}
                        properties={properties}
                        pushData={pushData}
                    >
                        <DataLabelsControl
                            pushData={pushData}
                            properties={properties}
                            isDisabled={controlsDisabled}
                            defaultValue="auto"
                        />
                    </ConfigSection>
                </div>
                <Bubble
                    className={this.getBubbleClassNames()}
                    arrowOffsets={{ "tc bc": [BUBBLE_ARROW_OFFSET_X, BUBBLE_ARROW_OFFSET_Y] }}
                    alignPoints={[{ align: "tc bc" }]}
                >
                    <FormattedMessage id="properties.config.not_applicable" />
                </Bubble>
            </BubbleHoverTrigger>
        );
    }

    private getBubbleClassNames() {
        return cx("bubble-primary", {
            invisible: !this.isControlDisabled(),
        });
    }

    private getControlProperties() {
        const xAxisVisible = get(this.props, "properties.controls.xaxis.visible", true);
        const yAxisVisible = get(this.props, "properties.controls.yaxis.visible", true);
        return {
            xAxisVisible,
            yAxisVisible,
        };
    }

    private isAxisDisabled(controlsDisabled: boolean, axis: AxisType, insight: IInsightDefinition): boolean {
        const isAxisDisabled =
            axis === "xaxis"
                ? noColumnsAndHasOneMeasure(insightBuckets(insight))
                : noRowsAndHasOneMeasure(insightBuckets(insight));

        return Boolean(controlsDisabled || isAxisDisabled);
    }
}
