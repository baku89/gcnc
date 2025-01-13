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
		respectPathCase: false,
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
					rel: 'preconnect',
					href: 'https://fonts.googleapis.com',
				},
				{
					rel: 'preconnect',
					href: 'https://fonts.gstatic.com',
					crossorigin: 'anonymous',
				},
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap',
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
