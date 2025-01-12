<script setup lang="ts">
import {
	CNCDevice,
	CNCDeviceBambu,
	CNCDeviceWebSerialGrbl,
	CNCDeviceWebSocketGrbl,
} from 'gcnc'

const deviceType = ref<'serial' | 'websocket'>(
	import.meta.client && 'serial' in navigator ? 'serial' : 'websocket'
)

const websocketUrl = ref('ws://fluidnc.local:81')

const command = ref('')
const messages = ref<string[]>([])

const cnc = shallowRef<CNCDevice | null>(null)

const status = ref('')

async function toggleConnection() {
	if (cnc.value) {
		await cnc.value.close()
		cnc.value = null
		return
	}

	if (deviceType.value === 'serial') {
		const port = await (navigator as any).serial.requestPort()
		cnc.value = new CNCDeviceWebSerialGrbl(port)
	} else {
		cnc.value = new CNCDeviceWebSocketGrbl(websocketUrl.value)
	}

	cnc.value.on('disconnect', () => {
		cnc.value = null
	})

	cnc.value.on('status', _status => {
		status.value = JSON.stringify(_status)
	})

	cnc.value.on('message', msg => {
		messages.value.push(msg)
	})

	await cnc.value.open()
}

function sendCommand() {
	if (!cnc.value) return
	cnc.value.send(command.value)
	command.value = ''
}
</script>

<template>
	<div class="Demo">
		<div class="row">
			<select v-model="deviceType">
				<option value="serial">Serial</option>
				<option value="websocket">WebSocket</option>
				<option value="bambu">Bambu Lab</option>
			</select>
			<input
				v-if="deviceType === 'websocket'"
				v-model="websocketUrl"
				placeholder="ws://fluidnc.local:81"
			/>

			<button @click="toggleConnection">
				{{ cnc ? 'Disconnect' : 'Connect' }}
			</button>
		</div>
		<div class="row">
			<input
				type="text"
				v-model="command"
				:disabled="!cnc"
				@keydown.enter="sendCommand"
			/>
			<button @click="sendCommand" :disabled="!cnc">Send</button>
		</div>
		<ul class="messages">
			<li v-for="(message, i) in messages" :key="i">{{ message }}</li>
		</ul>
		<div class="status">Status: {{ status }}</div>
	</div>
</template>

<style lang="stylus" scoped>

.Demo
	padding-top var(--elements-container-padding-md)
	padding-bottom var(--elements-container-padding-md)
	font-size 14px

.row
	display flex
	gap 0.5rem

button, input, select
	display block
	border 1px solid black
	margin 0.5rem 0
	padding 0.3rem
	font-family var(--typography-font-display)
	border-radius 0.2rem

	&:disabled
		opacity 0.3
		cursor not-allowed

input
	font-family var(--typography-font-monospace)
	font-weight 400

.status, .messages
	font-family var(--typography-font-monospace)

.status
	margin-top .5rem
	border-top 1px solid var(--color-black)
	padding-top .5rem
</style>
