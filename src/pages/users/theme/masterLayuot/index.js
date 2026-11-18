import React, { memo } from "react";
import Header from "../header";
import Footer from "../footer";
import ChatBot from "component/chatbot";

const MasterLayout = ({ children, ...props }) => {
    return (
        <div className="master-layout" {...props}   >
            <Header />
            <main className="user-main-content">{children}</main>
            <Footer />
            <ChatBot />
        </div>
    );
};

export default memo(MasterLayout);
