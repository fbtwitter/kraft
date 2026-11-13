import {
  Children,
  isValidElement,
  type ReactNode,
  type OptionHTMLAttributes,
} from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import "../styles/select.css";
interface Props {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}
export default function SelectField({
  value,
  onValueChange,
  children,
  className = "",
  id,
  disabled,
  "aria-label": label = "Preset",
}: Props) {
  const options = Children.toArray(children).filter(
    isValidElement<OptionHTMLAttributes<HTMLOptionElement>>,
  );
  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        className={`select-trigger ${className}`}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={16} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="select-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="select-scroll">
            <ChevronUp size={16} />
          </Select.ScrollUpButton>
          <Select.Viewport className="select-options">
            {options.map((option) => (
              <Select.Item
                className="select-option"
                key={String(option.props.value)}
                value={String(option.props.value)}
                data-value={String(option.props.value)}
                disabled={option.props.disabled}
              >
                <Select.ItemText>{option.props.children}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={16} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll">
            <ChevronDown size={16} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
