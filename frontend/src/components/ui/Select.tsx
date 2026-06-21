"use client";

import React from "react";
import { Select as AntSelect, type SelectProps } from "antd";

export type { SelectProps };

type SelectClassNames = Exclude<SelectProps["classNames"], undefined>;

function isStaticClassNames(value: SelectClassNames | undefined): value is Exclude<SelectClassNames, (...args: never[]) => unknown> {
  return typeof value === "object";
}

export function Select({
  className = "",
  popupClassName = "",
  classNames,
  ...props
}: SelectProps) {
  const dropdownClass = `select-sentry-dropdown ${popupClassName}`.trim();
  const staticClassNames = isStaticClassNames(classNames) ? classNames : undefined;

  return (
    <AntSelect
      className={`select-sentry ${className}`.trim()}
      classNames={
        typeof classNames === "function"
          ? classNames
          : {
              ...staticClassNames,
              popup: {
                ...staticClassNames?.popup,
                root: [dropdownClass, staticClassNames?.popup?.root].filter(Boolean).join(" ") || undefined,
              },
            }
      }
      {...props}
    />
  );
}
