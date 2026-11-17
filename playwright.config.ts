import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',timeout:45000,fullyParallel:false,workers:1,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:process.env.CAREROUTE_TEST_URL??'http://127.0.0.1:5173',headless:true,channel:'chrome',screenshot:'only-on-failure',trace:'retain-on-failure'}});
