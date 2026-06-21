"use client";

import React from "react";
import { Select as AntSelect, type SelectProps } from "antd";

export type { SelectProps };

export function Select({
  className = "",
  popupClassName = "",
  classNames,
  ...props
}: SelectProps) {
  const dropdownClass = `select-sentry-dropdown ${popupClassName}`.trim();
  return (
    <AntSelect
      className={`select-sentry ${className}`.trim()}
      classNames={{
        ...classNames,
        popup: {
          ...classNames?.popup,
          root: [dropdownClass, classNames?.popup?.root].filter(Boolean).join(" ") || undefined,
        },
      }}
      {...props}
    />
  );
}
