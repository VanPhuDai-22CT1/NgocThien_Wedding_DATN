import React from "react";
import { toast } from "react-toastify";

const options = {
  position: "top-right",
  autoClose: 3200,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

const show = (type, message, extraOptions = {}) => {
  const text = String(message || "Có lỗi xảy ra");
  const fn = toast[type] || toast.info;
  return fn(text, { ...options, ...extraOptions });
};

export const notify = {
  success: (message, extraOptions) => show("success", message, extraOptions),
  error: (message, extraOptions) => show("error", message, extraOptions),
  warning: (message, extraOptions) => show("warning", message, extraOptions),
  info: (message, extraOptions) => show("info", message, extraOptions),
  confirm(message, confirmText = "Xác nhận", cancelText = "Hủy") {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const id = toast.warn(
        <div className="app-confirm-toast">
          <div className="app-confirm-toast__message">{message}</div>
          <div className="app-confirm-toast__actions">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(id);
                finish(true);
              }}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(id);
                finish(false);
              }}
            >
              {cancelText}
            </button>
          </div>
        </div>,
        {
          ...options,
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          onClose: () => finish(false),
        }
      );
    });
  },
};

export default notify;
