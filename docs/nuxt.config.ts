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
