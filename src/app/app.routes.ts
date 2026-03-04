import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./../landingPage/landing/landing').then((m) => m.Landing)
        },
    },{
        path: 'auth',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./../authPage/auth/auth').then((m) => m.Auth)
        },
    },
    {
        path: 'home/:userId',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./../homePage/home/home').then((m) => m.Home)
        },
    },
    {
        path: 'profile/:userId',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./../profilePage/profile/profile').then((m) => m.Profile)
        },
    },
];