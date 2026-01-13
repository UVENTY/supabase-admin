import { useEffect, useRef } from "react";
import { EMPTY_FUNC } from "../consts";
import { requestTimeout } from "./utils";

export const useCancelableScheduledWork = () => {
  const cancelCallback = useRef(EMPTY_FUNC)
  const registerCancel = fn => (cancelCallback.current = fn)
  const cancelScheduledWork = () => cancelCallback.current()

  useEffect(() => cancelScheduledWork, [])

  return [registerCancel, cancelScheduledWork]
}

export const useClickPrevention = ({ onClick, onDoubleClick, delay = 300 }) => {
  const [ registerCancel, cancelScheduledRaf ] = useCancelableScheduledWork()
  const handleClick = (e) => {
    cancelScheduledRaf()
    requestTimeout(onClick, [e], delay, registerCancel)
  }
  const handleDoubleClick = (e) => {
    cancelScheduledRaf()
    onDoubleClick(e)
  }
  return [handleClick, handleDoubleClick]
};