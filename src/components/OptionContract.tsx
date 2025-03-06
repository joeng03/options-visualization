import React from "react";
import { PortfolioOption } from "../types";

interface OptionContractProps {
  option: PortfolioOption;
  index: number;
  updateOption: (
    index: number,
    field: keyof PortfolioOption,
    value: any
  ) => void;
  removeOption: (index: number) => void;
}

export const OptionContract: React.FC<OptionContractProps> = ({
  option,
  index,
  updateOption,
  removeOption,
}) => {
  // ... existing OptionContract code ...
};
