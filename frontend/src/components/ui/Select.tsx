"use client";

import React from "react";
import { Select as AntSelect, type SelectProps } from "antd";

export type { SelectProps };

export function Select({ className = "", popupClassName = "", ...props }: SelectProps) {
  return (
    <AntSelect
      className={`select-sentry ${className}`.trim()}
      popupClassName={`select-sentry-dropdown ${popupClassName}`.trim()}
      {...props}
    />
  );
}
