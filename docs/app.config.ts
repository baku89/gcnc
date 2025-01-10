import type {AppConfig} from 'nuxt/schema'

export default {
	ui: {
		primary: 'red',
	},
	docus: {
		title: 'Gcnc',
		description: 'Stream-based G-code sender',
		url: 'https://glisp.app/gcnc',
		header: {
			title: 'Gcnc',
			logo: true,
		},
		socials: {
			github: 'baku89/gcnc',
		},
	},
} satisfies AppConfig
