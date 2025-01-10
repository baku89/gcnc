import {defineNuxtConfig} from 'nuxt/config'

export default defineNuxtConfig({
	modules: ['@nuxt/content'],
	extends: ['@nuxt-themes/docus'],
	colorMode: {
		preference: 'light',
	},
	css: ['~/assets/style.styl'],
	content: {
		documentDriven: true,
	},
	app: {
		baseURL: '/gcnc/',
		head: {
			link: [
				{
					rel: 'icon',
					type: 'image/svg+xml',
					href: './logo.svg',
				},
				{
					rel: 'stylesheet',
					type: 'text/css',
					href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap',
				},
			],
		},
	},
	ssr: true,
	nitro: {
		preset: 'github-pages',
		prerender: {
			failOnError: false,
		},
	},
	compatibilityDate: '2025-01-04',
	alias: {
		gcnc: '../src',
	},
	typescript: {
		tsConfig: {
			compilerOptions: {
				paths: {
					gcnc: ['../src'],
					'gcnc/*': ['../src/*'],
				},
			},
		},
	},
})
