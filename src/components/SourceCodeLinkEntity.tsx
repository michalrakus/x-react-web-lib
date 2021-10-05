import React from "react";

export const SourceCodeLinkEntity = (props: {sourceCodeFile: string}) => {
    return (
        <div className="flex justify-content-center">
            <a className="source-code-link" href={`https://github.com/michalrakus/demo-nest-server-app/blob/master/src/model/${props.sourceCodeFile}`} target="_blank" rel="noopener noreferrer">Source code entity: {props.sourceCodeFile}</a>
        </div>
    );
}
