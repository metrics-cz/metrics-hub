import React from "react";

export default function CompaniesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="p-8 min-h-screen">
            {children}
        </main>
    );
}