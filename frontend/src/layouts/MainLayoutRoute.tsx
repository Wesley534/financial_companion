import React from 'react';
import { Outlet } from 'react-router-dom';
// import MainLayout from '/MainLayout'; // Assuming MainLayout.tsx is in the same directory
import MainLayout from './MainLayout';

/**
 * A wrapper component that applies the MainLayout to all child routes.
 * It uses React Router's <Outlet /> to render the nested route's element.
 */
const MainLayoutRoute: React.FC = () => {
    return (
        <MainLayout>
            {/* The child route element will be rendered here */}
            <Outlet />
        </MainLayout>
    );
};

export default MainLayoutRoute;