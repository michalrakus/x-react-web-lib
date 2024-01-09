import React, {useEffect, useState} from "react";
import {TreeTable} from "primereact/treetable";
import {Column} from "primereact/column";
import {XAssoc, XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {TreeNode} from "primereact/treenode";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export const XFieldSelector = (props: {entity: string; assocSelectable: boolean; selectionField?: string; onSelectionChange: (selectedField: string) => void;}) => {

    // poznamka: treeNodeList by sme mohli vypocitavat priamo, ale ked pouzijeme useState/useEffect tak sa createTreeNodeList zavola len raz pri vytvoreni komponentu
    const [treeNodeList, setTreeNodeList] = useState<TreeNode[]>([]);

    // parameter [] zabezpeci ze sa metoda zavola len po prvom renderingu (a nie po kazdej zmene stavu (zavolani setNieco()))
    useEffect(() => {
        setTreeNodeList(createTreeNodeList(props.entity, ""));
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const createTreeNodeList = (entity: string, keyPrefix: string): TreeNode[] => {
        const treeNodeList: TreeNode[] = [];
        const xEntity: XEntity = XUtilsMetadataCommon.getXEntity(entity);
        const xFieldList = XUtilsMetadataCommon.getXFieldList(xEntity);
        for (const xField of xFieldList) {
            treeNodeList.push({
                key: keyPrefix + xField.name,
                data: {name: xField.name, type: xField.type},
                children: []
            });
        }
        const assocToOneList: XAssoc[] = XUtilsMetadataCommon.getXAssocList(xEntity, ["many-to-one", "one-to-one"]);
        for (const xAssoc of assocToOneList) {
            const itemKey = keyPrefix + xAssoc.name;
            treeNodeList.push({
                key: itemKey,
                data: {name: xAssoc.name, type: "AssocToOne"},
                children: createTreeNodeList(xAssoc.entityName, itemKey + "."),
                selectable: props.assocSelectable
            });
        }
        return treeNodeList;
    }

    return (
        <TreeTable value={treeNodeList} selectionMode="single" selectionKeys={props.selectionField} onSelectionChange={e => props.onSelectionChange(Object.keys(e.value)[0])}
                   className="x-field-treetable p-treetable-sm" scrollable scrollHeight="20rem">
            <Column field="name" header="Field name" headerStyle={{width: "15.7rem"}} expander></Column>
            <Column field="type" header="Type" headerStyle={{width: "9.3rem"}}></Column>
        </TreeTable>
    );
}
