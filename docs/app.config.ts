export default defineAppConfig({
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
		main: {
			padded: true,
			fluid: true,
		},
		aside: {
			level: 1,
		},
		navigation: [
			{
				icon: 'simple-icons:github',
				label: 'GitHub',
				to: 'https://github.com/baku89/gcnc',
				target: '_blank',
				'aria-label': 'GCNC on GitHub',
			},
			{
				icon: 'ph:book-open',
				label: 'Documentation',
				to: '/getting-started',
			},
			{
				icon: 'ph:play-circle',
				label: 'Demo',
				to: '/demo',
			},
		],
	},
})
