// (C) 2007-2020 GoodData Corporation
import React, { Component } from "react";
import { AttributeFilter } from "@gooddata/sdk-ui-filters";
import { attributeIdentifier } from "@gooddata/sdk-model";
import { Ldm } from "../../ldm";

export class AttributeFilterComponentExample extends Component {
    public onApply(...params) {
        // tslint:disable-next-line:no-console
        console.log("AttributeFilterComponentExample onApply", ...params);
    }

    public render() {
        return (
            <div>
                <AttributeFilter
                    identifier={attributeIdentifier(Ldm.EmployeeName.Default)}
                    fullscreenOnMobile={false}
                    onApply={this.onApply}
                />
            </div>
        );
    }
}

export default AttributeFilterComponentExample;