import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./../landingPage/landing/landing').then((m) => m.Landing)
        },
    },
    {
        path: 'home',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./../homePage/home/home').then((m) => m.Home)
        },
    },
];