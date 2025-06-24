import React from "react";

export default function CompaniesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="p-8 bg-gray-50 dark:bg-gray-700 min-h-screen">
            {children}
        </main>
    );
}