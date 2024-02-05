import React from "react";
import styled from "@emotion/styled";

interface AlertRootProps {
  severity: "error" | "warning" | "info" | "success";
}
const AlertRoot = styled.div`
  background-color: ${(props: AlertRootProps) => {
    switch (props.severity) {
      case "error":
        return "#cc3300";
      case "warning":
        return "#ffcc00";
      case "info":
        return "#40a6ce";
      case "success":
        return "#99cc33"; // #339900
    }
  }};
  width: 100%;
  text-align: center;
`;

export interface AlertProps {
  text: string;
  severity: "error" | "warning" | "info" | "success";
}

export function Alert({ text, severity }: AlertProps): JSX.Element {
  return (
    <AlertRoot severity={severity}>
      <p style={{ color: "black" }}>{text}</p>
    </AlertRoot>
  );
}
