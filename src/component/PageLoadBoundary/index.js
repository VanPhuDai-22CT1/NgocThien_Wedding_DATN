import React, { Component } from "react";
import "./style.scss";

export const PageLoading = () => (
  <div className="page-load-state" role="status" aria-live="polite">
    <span className="page-load-spinner" aria-hidden="true" />
    <p>Đang tải trang…</p>
  </div>
);

export default class PageLoadBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="page-load-state" role="alert">
          <p>Không thể tải trang. Vui lòng kiểm tra kết nối và thử lại.</p>
          <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
        </div>
      );
    }
    return this.props.children;
  }
}
