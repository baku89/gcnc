import {defineNuxtConfig} from 'nuxt/config'

export default defineNuxtConfig({
	modules: ['@nuxt/content'],
	extends: ['@nuxt-themes/docus'],
	content: {
		documentDriven: true,
		highlight: {
			theme: 'github-dark',
		},
	},
	app: {
		baseURL: '/gcnc/',
		head: {
			link: [
				{
					rel: 'icon',
					type: 'image/svg+xml',
					href: '/logo.svg',
				},
			],
		},
	},
	ssr: true,
	nitro: {
		preset: 'github-pages',
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
}) satisfies NuxtConfig
