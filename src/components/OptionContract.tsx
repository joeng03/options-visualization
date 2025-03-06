// OptionContract.tsx
import React from "react";
import { OptionContractProps } from "../utils/types";

const OptionContract: React.FC<OptionContractProps> = ({
  option,
  index,
  updateOption,
  removeOption,
}) => {
  return (
    <div className="border p-3 rounded-lg mb-2 bg-gray-50">
      <div className="flex justify-between mb-2">
        <h4 className="font-medium">Option #{index + 1}</h4>
        <button
          onClick={() => removeOption(index)}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-sm">Type</label>
          <select
            value={option.type}
            onChange={(e) =>
              updateOption(index, "type", e.target.value as "call" | "put")
            }
            className="border rounded p-1 w-full"
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Position</label>
          <select
            value={option.position}
            onChange={(e) =>
              updateOption(
                index,
                "position",
                e.target.value as "long" | "short"
              )
            }
            className="border rounded p-1 w-full"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Quantity</label>
          <input
            type="number"
            value={option.quantity}
            onChange={(e) =>
              updateOption(index, "quantity", parseInt(e.target.value) || 1)
            }
            min="1"
            className="border rounded p-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm">Strike</label>
          <input
            type="number"
            value={option.K}
            onChange={(e) =>
              updateOption(index, "K", parseFloat(e.target.value))
            }
            className="border rounded p-1 w-full"
            step="1"
          />
        </div>
      </div>
    </div>
  );
};

export default OptionContract;
