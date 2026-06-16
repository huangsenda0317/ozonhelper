"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";

interface UserMenuProps {
  displayName: string;
  isDark: boolean;
  onLogout: () => void;
}

export function UserMenu({ displayName, isDark, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const triggerClass = isDark
    ? "text-on-dark-muted hover:text-on-primary hover:bg-on-dark-faint"
    : "text-muted hover:text-ink-deep hover:bg-surface-elevated";

  const items: MenuProps["items"] = [
    {
      key: "stores",
      label: "店铺管理",
      onClick: () => {
        setOpen(false);
        router.push("/settings/stores");
      },
    },
    {
      key: "changelog",
      label: "更新日志",
      onClick: () => {
        setOpen(false);
        router.push("/changelog");
      },
    },
    {
      key: "logout",
      label: "登出",
      onClick: () => {
        setOpen(false);
        onLogout();
      },
    },
  ];

  return (
    <Dropdown
      menu={{ items }}
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center justify-center gap-xs h-8 px-2 text-caption leading-none rounded-md transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40 ${triggerClass}`}
      >
        <span className="max-w-[8rem] sm:max-w-[12rem] truncate">
          {displayName}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </Dropdown>
  );
}
