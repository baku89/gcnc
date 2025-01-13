export function load(app) {
	app.renderer.on('endPage', page => {
		// Make source links smaller and exclude node_modules
		page.contents = page.contents.replace(
			/^Defined in: (.*)$/gm,
			(_, source) => {
				if (source.startsWith('node\\_modules')) return ''
				return `<small class="source-link">${source}</small>`
			}
		)

		page.contents = page.contents.replace(
			/### (.*?)\n\n### # (.*?)\n/gim,
			(_, _name, signature) => {
				return `### ${signature}\n\n`
			}
		)

		// Remove empty lines with just '#'
		page.contents = page.contents.replace(/#+\n/gm, '')

		// Remove horizontal rules '***'
		page.contents = page.contents.replace(/\*\*\*\n/gm, '')

		// Remove "Inherited from" sections
		page.contents = page.contents.replace(/### Inherited from\n\n.*\n/gm, '')
		page.contents = page.contents.replace(/### Overrides\n\n.*\n/gm, '')

		// Remove "Type Parameters" and "Parameters" headings
		page.contents = page.contents.replace(/#### Type Parameters\n/gm, '')
		page.contents = page.contents.replace(/#### Parameters\n/gm, '')
	})
}
