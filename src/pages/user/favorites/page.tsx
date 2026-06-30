"use client";

import { Navigate, useLocation } from 'react-router-dom';

const FavoritesPage = () => {
    const location = useLocation();

    return <Navigate to={`/user/saved${location.search}`} replace />;
};

export default FavoritesPage;
