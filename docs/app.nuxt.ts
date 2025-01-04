import {defineAppConfig} from 'nuxt/app'

export default defineAppConfig({
	docus: {
		title: 'Gcnc',
		description: 'Stream-based G-code sender',
		url: 'https://glisp.app/gcnc',
		image: '/social-card-preview.png',
		socials: {
			twitter: '@_baku89',
			github: 'baku89/gcnc',
			instagram: '@_baku89',
		},
		github: {
			root: 'content',
			edit: true,
			contributors: false,
		},
		layout: 'default',
		aside: {
			level: 1,
			filter: [],
		},
		header: {
			title: true,
			logo: true,
			showLinkIcon: true,
		},
		footer: {
			textLinks: [
				{
					text: 'Nuxt',
					href: 'https://nuxt.com',
					target: '_blank',
					rel: 'noopener',
				},
			],
			iconLinks: [
				{
					label: 'NuxtJS',
					href: 'https://nuxtjs.org',
					component: 'IconNuxtLabs',
				},
				{
					label: 'Vue Telescope',
					href: 'https://vuetelescope.com',
					component: 'IconVueTelescope',
				},
			],
		},
	},
})
