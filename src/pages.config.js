/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Lazy-loaded para code-splitting: cada pagina vira um chunk separado,
// reduzindo o bundle inicial (o Admin, em especial, e enorme).
const Admin = lazy(() => import('./pages/Admin'));
const Feed = lazy(() => import('./pages/Feed'));
const Folders = lazy(() => import('./pages/Folders'));
const Home = lazy(() => import('./pages/Home'));
const Planner = lazy(() => import('./pages/Planner'));
const Profile = lazy(() => import('./pages/Profile'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
const Recipes = lazy(() => import('./pages/Recipes'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));


export const PAGES = {
    "Admin": Admin,
    "Feed": Feed,
    "Folders": Folders,
    "Home": Home,
    "Planner": Planner,
    "Profile": Profile,
    "RecipeDetail": RecipeDetail,
    "Recipes": Recipes,
    "ShoppingList": ShoppingList,
}

export const pagesConfig = {
    mainPage: "Feed",
    Pages: PAGES,
    Layout: __Layout,
};