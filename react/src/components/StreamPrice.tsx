import React from "react";

import {
  faArrowDown,
  faArrowUp,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import useSubscribeMessage from "../hooks/useSubscribeFirebase";
import { MessageFirebasePath } from "../utils/constant";

export const StreamPrice = () => {
  const { message: streamingData } = useSubscribeMessage(
    MessageFirebasePath.STREAMING,
  );

  const { ask = 0, bid = 0, symbol = "" } = streamingData || {};

  return (
    <>
      {streamingData && (
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-y-2 gap-x-6 py-2 px-4 rounded-lg bg-white shadow border border-gray-200 mb-2 w-full">
          <div className="flex items-center justify-center w-fit">
            <span className="text-gray-500 font-semibold flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} />
              {symbol}
            </span>
          </div>
          <div className="flex flex-1 items-center justify-evenly gap-y-2 gap-x-6">
            <div className="flex flex-col items-center w-fit">
              <span className="text-red-500 font-semibold flex items-center gap-2 mb-1">
                <FontAwesomeIcon icon={faArrowUp} />
                Ask
              </span>
              <span className="font-bold text-xl text-red-600">{ask}</span>
            </div>
            <div className="flex flex-col items-center w-fit">
              <span className="text-green-500 font-semibold flex items-center gap-2 mb-1">
                <FontAwesomeIcon icon={faArrowDown} />
                Bid
              </span>
              <span className="font-bold text-xl text-green-600">{bid}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
