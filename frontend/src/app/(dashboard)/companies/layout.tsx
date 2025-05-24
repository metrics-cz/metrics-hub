import React from "react";

export default function CompaniesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main style={{ padding: "2rem", background: "#f9f9f9", minHeight: "100vh" }}>
            <h1 style={{ marginBottom: "2rem" }}>Companies</h1>
            {children}
        </main>
    );
}